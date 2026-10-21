import { query, withTransaction } from '../../config/db.js';
import { AppError } from '../../utils/AppError.js';
import * as thongBao from '../thong_bao/thong_bao.service.js';
import { daChi } from '../cong_no/cong_no.service.js';

const so = (v) => Math.round(Number(v) || 0);
const tien = (n) => `${so(n).toLocaleString('vi-VN')} đ`;
const GIAI_DOAN_QT = ['quyet_toan', 'hoan_tat'];

// Ma don trong noi dung CK: ngan hang hay bo dau gach/them dau cach -> "DH-2610-125", "DH2610125", "DH 2610 125" deu nhan.
export function timMaDon(noiDung) {
  const m = /DH[\s\-_.]?(\d{4})[\s\-_.]?(\d{3,4})(?!\d)/i.exec(String(noiDung || ''));
  return m ? `DH-${m[1]}-${m[2]}` : null;
}
const chiChuSo = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

// Chuan hoa payload webhook SePay (https://docs.sepay.vn) ve 1 dong giao dich.
function tuSepay(p, nguon) {
  const soTien = Number(p.transferAmount);
  if (!p.id || !Number.isFinite(soTien) || soTien <= 0 || !['in', 'out'].includes(p.transferType)) {
    throw new AppError(400, 'Dữ liệu giao dịch không hợp lệ');
  }
  const t = p.transactionDate ? new Date(String(p.transactionDate).replace(' ', 'T') + (/[zZ+]/.test(p.transactionDate) ? '' : '+07:00')) : new Date();
  return {
    nguon, maGd: String(p.id), nganHang: p.gateway || null, soTk: p.accountNumber || null, loai: p.transferType === 'in' ? 'vao' : 'ra',
    soTien, noiDung: p.content || p.description || '', maThamChieu: p.referenceCode || null, thoiGian: Number.isNaN(t.getTime()) ? new Date() : t, goc: p,
  };
}

// Tien vao: khop phieu thu theo ma don. Uu tien phieu dang cho xac nhan dung so tien; khong co thi tao phieu moi
// (neu khong vuot qua so con phai thu). Tra ve ket qua khop hoac null (chua khop).
async function khopTienVao(client, gd, gdId) {
  const maDon = timMaDon(gd.noiDung);
  if (!maDon) return { ghiChu: 'Nội dung chuyển khoản không có mã đơn' };
  const { rows } = await client.query(
    `SELECT dh.id, dh.ma_don, dh.sale_id, dh.vanhanh_phu_trach_id, dh.giai_doan, t.con_phai_thu
       FROM don_hang dh JOIN v_don_hang_tien t ON t.don_hang_id = dh.id WHERE dh.ma_don = $1 AND dh.trang_thai <> 'nhap' FOR UPDATE OF dh`, [maDon]);
  const d = rows[0];
  if (!d) return { ghiChu: `Không tìm thấy đơn ${maDon}` };
  if (d.giai_doan === 'huy') return { donHangId: d.id, ghiChu: `Đơn ${maDon} đã huỷ` };

  const cho = (await client.query(
    `SELECT id FROM thanh_toan_khach WHERE don_hang_id = $1 AND trang_thai = 'cho_xac_nhan' AND hinh_thuc = 'chuyen_khoan' AND so_tien = $2
      ORDER BY id LIMIT 1 FOR UPDATE`, [d.id, gd.soTien])).rows[0];
  let phieuId; let cach;
  if (cho) {
    await client.query(`UPDATE thanh_toan_khach SET trang_thai = 'da_xac_nhan', xac_nhan_luc = now(), giao_dich_id = $2 WHERE id = $1`, [cho.id, gdId]);
    phieuId = cho.id; cach = 'xac_nhan_phieu';
  } else {
    if (gd.soTien > so(d.con_phai_thu)) return { donHangId: d.id, ghiChu: `Số tiền ${tien(gd.soTien)} lớn hơn số đơn ${maDon} còn phải thu (${tien(d.con_phai_thu)})` };
    phieuId = (await client.query(
      `INSERT INTO thanh_toan_khach (don_hang_id, loai, so_tien, hinh_thuc, ngay_thu, ghi_chu, trang_thai, nguoi_tao_id, xac_nhan_luc, giao_dich_id)
       VALUES ($1, $2, $3, 'chuyen_khoan', ($4::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh')::date, $5, 'da_xac_nhan', $6, now(), $7) RETURNING id`,
      [d.id, GIAI_DOAN_QT.includes(d.giai_doan) ? 'quyet_toan' : 'tam_ung', gd.soTien, gd.thoiGian, `Tự ghi nhận từ sao kê ngân hàng: ${gd.noiDung}`, d.sale_id, gdId],
    )).rows[0].id;
    cach = 'tao_phieu';
  }
  await thongBao.gui(client, {
    nguoiIds: [d.sale_id, d.vanhanh_phu_trach_id], vaiTro: ['ke_toan'], loai: 'thu_tien_xac_nhan',
    tieuDe: `Tiền về ${tien(gd.soTien)} — đơn ${d.ma_don} (ngân hàng tự xác nhận)`, noiDung: gd.noiDung, link: `/don-hang/${d.id}`,
  });
  return { khop: true, cach, donHangId: d.id, phieuId };
}

// Tien ra: tim de xuat chi DA DUYET co noi dung CK nam trong noi dung giao dich va dung so tien.
async function timDxcTienRa(gd) {
  const nd = chiChuSo(gd.noiDung);
  if (!nd) return null;
  const { rows } = await query(
    `SELECT id, noi_dung_ck FROM de_xuat_chi WHERE trang_thai = 'da_duyet' AND so_tien = $1 AND noi_dung_ck IS NOT NULL ORDER BY id`, [gd.soTien]);
  return rows.find((c) => chiChuSo(c.noi_dung_ck) && nd.includes(chiChuSo(c.noi_dung_ck)))?.id ?? null;
}

// Diem vao chung cho webhook that va gia lap.
export async function xuLyGiaoDich(payload, nguon = 'sepay') {
  const gd = tuSepay(payload, nguon);
  const daCo = (await query('SELECT id, trang_thai FROM giao_dich_ngan_hang WHERE nguon = $1 AND ma_gd_ngoai = $2', [nguon, gd.maGd])).rows[0];
  if (daCo) return { id: daCo.id, trang_thai: daCo.trang_thai, trung: true }; // ngan hang gui lai -> khong xu ly 2 lan

  const ghi = (client) => client.query(
    `INSERT INTO giao_dich_ngan_hang (nguon, ma_gd_ngoai, ngan_hang, so_tk, loai, so_tien, noi_dung, ma_tham_chieu, thoi_gian_gd, du_lieu_goc)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT (nguon, ma_gd_ngoai) DO NOTHING RETURNING id`,
    [gd.nguon, gd.maGd, gd.nganHang, gd.soTk, gd.loai, gd.soTien, gd.noiDung, gd.maThamChieu, gd.thoiGian, gd.goc]);

  if (gd.loai === 'vao') {
    return withTransaction(async (client) => {
      const moi = (await ghi(client)).rows[0];
      if (!moi) return { trung: true };
      const kq = await khopTienVao(client, gd, moi.id);
      await client.query(
        `UPDATE giao_dich_ngan_hang SET trang_thai = $2, cach_khop = $3, don_hang_id = $4, thanh_toan_khach_id = $5, ghi_chu = $6 WHERE id = $1`,
        [moi.id, kq.khop ? 'da_khop' : 'chua_khop', kq.cach ?? null, kq.donHangId ?? null, kq.phieuId ?? null, kq.ghiChu ?? null]);
      if (!kq.khop) {
        await thongBao.gui(client, { vaiTro: ['ke_toan'], loai: 'ngan_hang_chua_khop', tieuDe: `Tiền về ${tien(gd.soTien)} chưa khớp đơn nào`, noiDung: kq.ghiChu, link: '/cong-no/ngan-hang' });
      }
      return { id: moi.id, trang_thai: kq.khop ? 'da_khop' : 'chua_khop', ...kq };
    });
  }

  // Tien ra: ghi giao dich truoc, roi xac nhan "da chi" qua dung luong nghiep vu cua de xuat chi (coc -> san hang, so tho...).
  const moi = await withTransaction(async (client) => (await ghi(client)).rows[0]);
  if (!moi) return { trung: true };
  const dxcId = await timDxcTienRa(gd);
  if (dxcId) {
    try {
      await daChi(null, dxcId, { giaoDichId: moi.id }, 'ngan_hang');
      await query(`UPDATE giao_dich_ngan_hang SET trang_thai = 'da_khop', cach_khop = 'da_chi', de_xuat_chi_id = $2 WHERE id = $1`, [moi.id, dxcId]);
      return { id: moi.id, trang_thai: 'da_khop', cach: 'da_chi', deXuatChiId: dxcId };
    } catch (e) {
      await query(`UPDATE giao_dich_ngan_hang SET ghi_chu = $2 WHERE id = $1`, [moi.id, `Khớp DXC-${dxcId} nhưng không ghi nhận được: ${e.message}`]);
      return { id: moi.id, trang_thai: 'chua_khop' };
    }
  }
  await query(`UPDATE giao_dich_ngan_hang SET ghi_chu = 'Không có đề xuất chi đã duyệt khớp nội dung và số tiền' WHERE id = $1`, [moi.id]);
  return { id: moi.id, trang_thai: 'chua_khop' };
}

export async function danhSach({ trang_thai, loai, page }) {
  if (trang_thai && !['da_khop', 'chua_khop', 'bo_qua'].includes(trang_thai)) throw new AppError(400, 'Trạng thái không hợp lệ');
  if (loai && !['vao', 'ra'].includes(loai)) throw new AppError(400, 'Loại không hợp lệ');
  const trang = Math.max(1, parseInt(page, 10) || 1);
  const w = `WHERE ($1::text IS NULL OR g.trang_thai = $1) AND ($2::text IS NULL OR g.loai = $2)`;
  const p = [trang_thai || null, loai || null];
  const [{ rows }, { rows: dem }, { rows: tk }] = await Promise.all([
    query(`SELECT g.id, g.nguon, g.loai, g.so_tien::float AS so_tien, g.noi_dung, g.ngan_hang, g.thoi_gian_gd, g.trang_thai, g.cach_khop, g.ghi_chu,
                  g.don_hang_id, dh.ma_don, g.thanh_toan_khach_id, g.de_xuat_chi_id, u.ho_ten AS nguoi_xu_ly
             FROM giao_dich_ngan_hang g LEFT JOIN don_hang dh ON dh.id = g.don_hang_id LEFT JOIN users u ON u.id = g.nguoi_xu_ly_id
             ${w} ORDER BY g.thoi_gian_gd DESC, g.id DESC LIMIT 30 OFFSET $3`, [...p, (trang - 1) * 30]),
    query(`SELECT count(*)::int AS tong FROM giao_dich_ngan_hang g ${w}`, p),
    query(`SELECT trang_thai, count(*)::int AS so FROM giao_dich_ngan_hang GROUP BY 1`),
  ]);
  return { items: rows, tong: dem[0].tong, page: trang, soTrang: Math.max(1, Math.ceil(dem[0].tong / 30)), dem: Object.fromEntries(tk.map((r) => [r.trang_thai, r.so])) };
}

// Ke toan khop tay giao dich tien vao chua khop vao 1 don (tao phieu thu da xac nhan).
export async function khopTay(user, id, { don_hang_id, ma_don }) {
  return withTransaction(async (client) => {
    const g = (await client.query('SELECT * FROM giao_dich_ngan_hang WHERE id = $1 FOR UPDATE', [id])).rows[0];
    if (!g) throw new AppError(404, 'Không tìm thấy giao dịch');
    if (g.trang_thai !== 'chua_khop') throw new AppError(409, 'Giao dịch đã được xử lý');
    if (g.loai !== 'vao') throw new AppError(400, 'Tiền ra: hãy xác nhận "đã chi" ở đề xuất chi tương ứng');
    const d = (await client.query(
      `SELECT dh.id, dh.ma_don, dh.sale_id, dh.giai_doan, t.con_phai_thu FROM don_hang dh JOIN v_don_hang_tien t ON t.don_hang_id = dh.id
        WHERE (dh.id = $1 OR dh.ma_don = $2) AND dh.trang_thai <> 'nhap' AND dh.giai_doan <> 'huy'`,
      [Number(don_hang_id) || 0, timMaDon(ma_don) || ''])).rows[0];
    if (!d) throw new AppError(400, 'Không tìm thấy đơn (đơn nháp / đã huỷ không nhận tiền)');
    if (Number(g.so_tien) > so(d.con_phai_thu)) throw new AppError(400, `Số tiền lớn hơn số đơn ${d.ma_don} còn phải thu (${tien(d.con_phai_thu)})`);
    const phieu = (await client.query(
      `INSERT INTO thanh_toan_khach (don_hang_id, loai, so_tien, hinh_thuc, ngay_thu, ghi_chu, trang_thai, nguoi_tao_id, nguoi_xac_nhan_id, xac_nhan_luc, giao_dich_id)
       VALUES ($1, $2, $3, 'chuyen_khoan', (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date, $4, 'da_xac_nhan', $5, $5, now(), $6) RETURNING id`,
      [d.id, GIAI_DOAN_QT.includes(d.giai_doan) ? 'quyet_toan' : 'tam_ung', g.so_tien, `Khớp tay từ sao kê: ${g.noi_dung}`, user.id, id])).rows[0];
    await client.query(
      `UPDATE giao_dich_ngan_hang SET trang_thai = 'da_khop', cach_khop = 'thu_cong', don_hang_id = $2, thanh_toan_khach_id = $3, nguoi_xu_ly_id = $4 WHERE id = $1`,
      [id, d.id, phieu.id, user.id]);
    await thongBao.gui(client, { nguoiIds: [d.sale_id], nguoiGayId: user.id, loai: 'thu_tien_xac_nhan', tieuDe: `Đã nhận ${tien(g.so_tien)} của khách — đơn ${d.ma_don}`, link: `/don-hang/${d.id}` });
    return { id, don_hang_id: d.id, thanh_toan_khach_id: phieu.id };
  });
}

export async function boQua(user, id, { ly_do }) {
  const lyDo = typeof ly_do === 'string' ? ly_do.trim() : '';
  if (!lyDo) throw new AppError(400, 'Vui lòng ghi lý do');
  const { rowCount } = await query(
    `UPDATE giao_dich_ngan_hang SET trang_thai = 'bo_qua', ghi_chu = $2, nguoi_xu_ly_id = $3 WHERE id = $1 AND trang_thai = 'chua_khop'`, [id, lyDo, user.id]);
  if (!rowCount) throw new AppError(409, 'Giao dịch không tồn tại hoặc đã được xử lý');
  return { id, trang_thai: 'bo_qua' };
}

// Gia lap: dung payload giong het SePay gui, chay qua cung ham xu ly (khong co tai khoan ngan hang that van demo duoc).
export async function giaLap({ loai, so_tien, noi_dung }) {
  return xuLyGiaoDich({
    id: `GL${Date.now()}${Math.floor(Math.random() * 1000)}`, gateway: process.env.CONG_TY_NGAN_HANG || 'Vietcombank',
    transactionDate: new Date().toISOString(), accountNumber: process.env.CONG_TY_STK || '0000000000',
    content: noi_dung, transferType: loai === 'ra' ? 'out' : 'in', transferAmount: Number(so_tien), referenceCode: `FT${Date.now()}`,
  }, 'gia_lap');
}
