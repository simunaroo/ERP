import fs from 'fs/promises';
import { query, withTransaction } from '../../config/db.js';
import { AppError } from '../../utils/AppError.js';
import { luuAnhBase64, duongDanAnh } from '../../utils/luuAnh.js';
import { linkVietQr } from '../cong_no/cong_no.service.js';
import * as thongBao from '../thong_bao/thong_bao.service.js';

// Cong no khach hang: Sale/Van hanh ghi nhan "khach da tra" (chuyen khoan bat buoc kem bill) -> Ke toan xac nhan tien ve.
// Da thu = coc luc chot + phieu DA XAC NHAN + tho thu ho. Phieu cho xac nhan CHUA tinh (chua chac tien da ve).
const LOAI = ['tam_ung', 'quyet_toan', 'khac'];
const HINH_THUC = ['chuyen_khoan', 'tien_mat'];
const TRUOC_GIAO = ['len_phuong_an', 'boc_khoi_luong', 'mua_hang']; // chua giao hang -> dang thu tam ung
const DEN_HAN = ['quyet_toan', 'hoan_tat']; // da quyet toan / hoan tat ma con no -> den han thu
const so = (v) => Number(v);
const homNay = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
const chu = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);

// Tong hop tien cua 1 don (dung chung: chi tiet don, dieu kien dang ky giao hang, tao phieu).
export async function tomTat(donHangId, client = { query }) {
  const { rows } = await client.query(
    `SELECT dh.id, dh.ma_don, dh.trang_thai, dh.giai_doan, dh.sale_id, dh.vanhanh_phu_trach_id, dh.ty_le_tam_ung, dh.tien_coc,
            t.tong_don, t.con_phai_thu, t.da_thu_khach, t.tho_thu_ho,
            (SELECT COALESCE(sum(so_tien), 0) FROM thanh_toan_khach WHERE don_hang_id = dh.id AND trang_thai = 'cho_xac_nhan') AS cho_xac_nhan
       FROM don_hang dh JOIN v_don_hang_tien t ON t.don_hang_id = dh.id WHERE dh.id = $1`,
    [donHangId],
  );
  const d = rows[0];
  if (!d) return null;
  const tong = so(d.tong_don);
  const daThu = so(d.tien_coc) + so(d.da_thu_khach) + so(d.tho_thu_ho);
  const canTamUng = Math.round((tong * so(d.ty_le_tam_ung)) / 100);
  const choXacNhan = so(d.cho_xac_nhan);
  const truocGiao = TRUOC_GIAO.includes(d.giai_doan);
  // Goi y khoan can thu tiep: truoc giao hang -> phan tam ung con thieu; sau do -> toan bo con lai.
  const goiY = Math.max(0, Math.round((truocGiao ? canTamUng - daThu : so(d.con_phai_thu)) - choXacNhan));
  return {
    ...d, tong_don: tong, con_phai_thu: so(d.con_phai_thu), tien_coc: so(d.tien_coc), da_thu: daThu,
    can_tam_ung: canTamUng, du_tam_ung: daThu >= canTamUng, cho_xac_nhan: choXacNhan,
    goi_y: { so_tien: goiY, loai: truocGiao ? 'tam_ung' : 'quyet_toan' },
  };
}

// Ai xem/ghi nhan duoc tien cua don: Sale cua don, Van hanh phu trach, Ke toan, Admin.
function damBaoXem(user, d) {
  if (!d || d.trang_thai === 'nhap') throw new AppError(404, 'Không tìm thấy đơn hàng');
  if (user.vai_tro === 'sale' && d.sale_id !== user.id) throw new AppError(403, 'Bạn không phụ trách đơn hàng này');
  if (user.vai_tro === 'van_hanh' && d.vanhanh_phu_trach_id !== user.id) throw new AppError(403, 'Bạn không phụ trách đơn hàng này');
}

// QR thu tien: tai khoan cong ty (.env) + so tien goi y + noi dung CK = ma don (doi soat sao ke theo noi dung nay).
function qrThuTien(d) {
  const nh = { ten_ngan_hang: process.env.CONG_TY_NGAN_HANG, so_tk: process.env.CONG_TY_STK, chu_tk: process.env.CONG_TY_CHU_TK };
  const noiDung = `${d.ma_don} THANH TOAN`;
  if (!nh.ten_ngan_hang || !nh.so_tk) return { qr: null, noi_dung_ck: noiDung, ly_do: 'Chưa cấu hình tài khoản công ty (CONG_TY_NGAN_HANG, CONG_TY_STK trong .env)' };
  if (d.goi_y.so_tien <= 0) return { qr: null, noi_dung_ck: noiDung, ngan_hang: nh, ly_do: null };
  const qr = linkVietQr(nh, d.goi_y.so_tien, noiDung);
  return { qr, noi_dung_ck: noiDung, ngan_hang: nh, ly_do: qr ? null : `Ngân hàng "${nh.ten_ngan_hang}" chưa hỗ trợ tạo QR` };
}

const COT = `k.id, k.don_hang_id, k.loai, k.so_tien, k.hinh_thuc, k.ngay_thu, k.bill_anh IS NOT NULL AS co_bill, k.ghi_chu, k.trang_thai,
             k.ly_do_tu_choi, k.xac_nhan_luc, k.created_at, u.ho_ten AS nguoi_tao, COALESCE(x.ho_ten, CASE WHEN k.giao_dich_id IS NOT NULL THEN 'Ngân hàng (tự động)' END) AS nguoi_xac_nhan, k.giao_dich_id`;
const TU = `FROM thanh_toan_khach k JOIN users u ON u.id = k.nguoi_tao_id LEFT JOIN users x ON x.id = k.nguoi_xac_nhan_id`;
const chuanPhieu = (r) => ({ ...r, so_tien: so(r.so_tien) });

export async function theoDon(user, donHangId) {
  const d = await tomTat(donHangId);
  damBaoXem(user, d);
  const { rows } = await query(`SELECT ${COT} ${TU} WHERE k.don_hang_id = $1 ORDER BY k.created_at DESC, k.id DESC`, [donHangId]);
  return { tom_tat: d, phieu: rows.map(chuanPhieu), ...qrThuTien(d) };
}

export async function tao(user, body) {
  const donHangId = Number(body.don_hang_id);
  const loai = LOAI.includes(body.loai) ? body.loai : null;
  const hinhThuc = HINH_THUC.includes(body.hinh_thuc) ? body.hinh_thuc : null;
  const soTien = Math.round(Number(body.so_tien));
  const ngay = /^\d{4}-\d{2}-\d{2}$/.test(body.ngay_thu || '') ? body.ngay_thu : homNay();
  if (!loai || !hinhThuc) throw new AppError(400, 'Chọn loại thanh toán và hình thức');
  if (!(soTien > 0)) throw new AppError(400, 'Số tiền phải lớn hơn 0');
  if (ngay > homNay()) throw new AppError(400, 'Ngày thu không được ở tương lai');
  if (hinhThuc === 'chuyen_khoan' && !body.bill) throw new AppError(400, 'Chuyển khoản phải kèm ảnh bill');
  // Ke toan/Admin tu nhap (vd tien mat nhan tai van phong, da doi chieu sao ke) -> xac nhan luon.
  const tuXacNhan = ['ke_toan', 'admin'].includes(user.vai_tro);
  const ten = body.bill ? await luuAnhBase64(body.bill, 'thu_tien') : null;
  try {
    const id = await withTransaction(async (client) => {
      await client.query('SELECT id FROM don_hang WHERE id = $1 FOR UPDATE', [donHangId]); // 2 phieu cung luc khong cung vuot so con no
      const d = await tomTat(donHangId, client);
      damBaoXem(user, d);
      if (d.giai_doan === 'huy') throw new AppError(409, 'Đơn đã huỷ');
      const conDuocThu = d.con_phai_thu - d.cho_xac_nhan;
      if (soTien > conDuocThu + 1) throw new AppError(400, `Số tiền vượt số còn phải thu (${Math.max(0, conDuocThu).toLocaleString('vi-VN')} đ, đã trừ phiếu chờ xác nhận)`);
      const { rows } = await client.query(
        `INSERT INTO thanh_toan_khach (don_hang_id, loai, so_tien, hinh_thuc, ngay_thu, bill_anh, ghi_chu, trang_thai, nguoi_tao_id, nguoi_xac_nhan_id, xac_nhan_luc)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
        [donHangId, loai, soTien, hinhThuc, ngay, ten, chu(body.ghi_chu), tuXacNhan ? 'da_xac_nhan' : 'cho_xac_nhan', user.id,
          tuXacNhan ? user.id : null, tuXacNhan ? new Date() : null],
      );
      const tien = `${soTien.toLocaleString('vi-VN')} đ`;
      if (tuXacNhan) {
        await thongBao.gui(client, { nguoiIds: [d.sale_id, d.vanhanh_phu_trach_id], nguoiGayId: user.id, loai: 'thu_tien_xac_nhan', tieuDe: `Đã nhận ${tien} của khách — đơn ${d.ma_don}`, link: `/don-hang/${donHangId}` });
      } else {
        await thongBao.gui(client, { vaiTro: ['ke_toan'], nguoiGayId: user.id, loai: 'thu_tien_moi', tieuDe: `Xác nhận tiền về: ${tien} — đơn ${d.ma_don}`, noiDung: `${user.ho_ten} ghi nhận khách ${hinhThuc === 'tien_mat' ? 'trả tiền mặt' : 'chuyển khoản'}`, link: '/cong-no/khach' });
      }
      return rows[0].id;
    });
    return { id, trang_thai: tuXacNhan ? 'da_xac_nhan' : 'cho_xac_nhan' };
  } catch (e) {
    if (ten) await fs.unlink(duongDanAnh(ten).file).catch(() => {}); // loi -> xoa anh vua luu
    throw e;
  }
}

async function xuLy(user, id, den, lyDo) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `UPDATE thanh_toan_khach SET trang_thai = $2, nguoi_xac_nhan_id = $3, xac_nhan_luc = now(), ly_do_tu_choi = $4
        WHERE id = $1 AND trang_thai = 'cho_xac_nhan' RETURNING don_hang_id, so_tien, nguoi_tao_id`,
      [id, den, user.id, lyDo],
    );
    if (!rows[0]) throw new AppError(409, 'Phiếu không tồn tại hoặc đã được xử lý');
    const p = rows[0];
    const d = await tomTat(p.don_hang_id, client);
    const tien = `${so(p.so_tien).toLocaleString('vi-VN')} đ`;
    await thongBao.gui(client, den === 'da_xac_nhan'
      ? { nguoiIds: [p.nguoi_tao_id, d.sale_id, d.vanhanh_phu_trach_id], nguoiGayId: user.id, loai: 'thu_tien_xac_nhan', tieuDe: `Kế toán xác nhận đã nhận ${tien} — đơn ${d.ma_don}`, link: `/don-hang/${p.don_hang_id}` }
      : { nguoiIds: [p.nguoi_tao_id], nguoiGayId: user.id, loai: 'thu_tien_tu_choi', tieuDe: `Kế toán chưa thấy tiền về ${tien} — đơn ${d.ma_don}`, noiDung: lyDo, link: `/don-hang/${p.don_hang_id}` });
    return { id, trang_thai: den, tom_tat: d };
  });
}
export const xacNhan = (user, id) => xuLy(user, id, 'da_xac_nhan', null);
export function tuChoi(user, id, { ly_do }) {
  const lyDo = chu(ly_do);
  if (!lyDo) throw new AppError(400, 'Ghi lý do (vd: chưa thấy tiền về tài khoản)');
  return xuLy(user, id, 'tu_choi', lyDo);
}

export async function anhBill(user, id) {
  const { rows } = await query('SELECT don_hang_id, bill_anh FROM thanh_toan_khach WHERE id = $1', [id]);
  if (!rows[0]?.bill_anh) throw new AppError(404, 'Phiếu không có ảnh bill');
  damBaoXem(user, await tomTat(rows[0].don_hang_id));
  const f = duongDanAnh(rows[0].bill_anh);
  if (!f) throw new AppError(404, 'Không tìm thấy ảnh');
  return f;
}

// Ke toan: phieu cho xac nhan (cu nhat truoc).
export async function choXacNhan() {
  const { rows } = await query(
    `SELECT ${COT}, dh.ma_don, kh.ten AS khach_hang, s.ho_ten AS sale ${TU}
       JOIN don_hang dh ON dh.id = k.don_hang_id JOIN khach_hang kh ON kh.id = dh.khach_hang_id JOIN users s ON s.id = dh.sale_id
      WHERE k.trang_thai = 'cho_xac_nhan' ORDER BY k.created_at, k.id`,
  );
  return rows.map(chuanPhieu);
}

// Danh sach don con no. loc = 'den_han' (da quyet toan / hoan tat ma con no) | '' (moi don dang no).
export async function congNo({ loc, q }, { toiDa = 100 } = {}) {
  const { rows } = await query(
    `SELECT dh.id, dh.ma_don, dh.giai_doan, dh.hinh_thuc, dh.ngay_chot, dh.quyet_toan_luc, kh.ten AS khach_hang, kh.sdt AS khach_hang_sdt, s.ho_ten AS sale,
            t.tong_don, t.con_phai_thu, dh.tien_coc + t.da_thu_khach + t.tho_thu_ho AS da_thu,
            (SELECT COALESCE(sum(so_tien), 0) FROM thanh_toan_khach WHERE don_hang_id = dh.id AND trang_thai = 'cho_xac_nhan') AS cho_xac_nhan,
            dh.giai_doan = ANY($1) AS den_han
       FROM don_hang dh JOIN v_don_hang_tien t ON t.don_hang_id = dh.id
       JOIN khach_hang kh ON kh.id = dh.khach_hang_id JOIN users s ON s.id = dh.sale_id
      WHERE dh.trang_thai <> 'nhap' AND dh.giai_doan <> 'huy' AND t.con_phai_thu > 0
        AND ($2::text IS NULL OR dh.giai_doan = ANY($1))
        AND ($3::text IS NULL OR dh.ma_don ILIKE $3 OR kh.ten ILIKE $3)
      ORDER BY (dh.giai_doan = ANY($1)) DESC, t.con_phai_thu DESC LIMIT $4`,
    [DEN_HAN, loc === 'den_han' ? 'x' : null, chu(q) ? `%${chu(q)}%` : null, toiDa],
  );
  const tong = await query(
    `SELECT COALESCE(sum(t.con_phai_thu) FILTER (WHERE dh.giai_doan = ANY($1)), 0) AS den_han, COALESCE(sum(t.con_phai_thu), 0) AS tat_ca, count(*) AS so_don
       FROM don_hang dh JOIN v_don_hang_tien t ON t.don_hang_id = dh.id
      WHERE dh.trang_thai <> 'nhap' AND dh.giai_doan <> 'huy' AND t.con_phai_thu > 0`,
    [DEN_HAN],
  );
  return {
    items: rows.map((r) => ({ ...r, tong_don: so(r.tong_don), con_phai_thu: so(r.con_phai_thu), da_thu: so(r.da_thu), cho_xac_nhan: so(r.cho_xac_nhan) })),
    tong: { den_han: so(tong.rows[0].den_han), tat_ca: so(tong.rows[0].tat_ca), so_don: Number(tong.rows[0].so_don) },
  };
}

export async function excelCongNo(q) {
  const { items } = await congNo(q, { toiDa: 10000 });
  return {
    tenFile: `cong-no-khach_${new Date().toISOString().slice(0, 10)}.xlsx`, tieuDe: 'CÔNG NỢ PHẢI THU KHÁCH HÀNG',
    moTa: `${items.length} đơn còn nợ${q.loc === 'den_han' ? ' (chỉ đơn đến hạn)' : ''}. Đến hạn = đơn đã quyết toán / hoàn tất.`,
    cot: [
      { key: 'ma_don', nhan: 'Mã đơn', rong: 14 }, { key: 'khach_hang', nhan: 'Khách hàng', rong: 24 }, { key: 'khach_hang_sdt', nhan: 'SĐT', rong: 13 },
      { key: 'sale', nhan: 'Sale', rong: 18 }, { key: 'han', nhan: 'Đến hạn', rong: 10 }, { key: 'tong_don', nhan: 'Tổng đơn', kieu: 'tien' },
      { key: 'da_thu', nhan: 'Đã thu', kieu: 'tien' }, { key: 'cho_xac_nhan', nhan: 'Chờ xác nhận', kieu: 'tien' }, { key: 'con_phai_thu', nhan: 'Còn phải thu', kieu: 'tien' },
    ],
    dong: items.map((x) => ({ ...x, han: x.den_han ? 'Có' : '' })),
    tong: { ma_don: 'Tổng', ...Object.fromEntries(['tong_don', 'da_thu', 'cho_xac_nhan', 'con_phai_thu'].map((k) => [k, items.reduce((a, x) => a + x[k], 0)])) },
  };
}
