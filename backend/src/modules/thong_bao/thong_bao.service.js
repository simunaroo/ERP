import { query } from '../../config/db.js';
import { AppError } from '../../utils/AppError.js';

const tien = (n) => `${Math.round(Number(n)).toLocaleString('vi-VN')} đ`;
const LOAI_CHI = { coc: 'Cọc', quyet_toan: 'Quyết toán', chi_bo_sung: 'Chi bổ sung', tra_cong: 'Trả công', ung_cong: 'Ứng công' };
const BUOC = {
  len_phuong_an: 'Lên phương án', boc_khoi_luong: 'Bóc khối lượng', mua_hang: 'Mua hàng', giao_hang: 'Giao hàng',
  thi_cong: 'Thi công', nghiem_thu: 'Nghiệm thu', quyet_toan: 'Quyết toán', hoan_tat: 'Hoàn tất', huy: 'Huỷ',
};

// Gui thong bao trong CUNG transaction voi thao tac goc (truyen client). Nguoi nhan = theo id va/hoac theo vai tro,
// chi tai khoan dang hoat dong, khong gui cho chinh nguoi vua thao tac.
export async function gui(client, { nguoiIds = [], vaiTro = [], nguoiGayId = null, loai, tieuDe, noiDung = null, link = null }) {
  const ids = nguoiIds.filter(Boolean);
  if (!ids.length && !vaiTro.length) return 0;
  const { rowCount } = await client.query(
    `INSERT INTO thong_bao (nguoi_nhan_id, nguoi_gay_id, loai, tieu_de, noi_dung, link)
     SELECT u.id, $3, $4, $5, $6, $7 FROM users u
      WHERE u.trang_thai = 'active' AND (u.id = ANY($1::int[]) OR u.vai_tro::text = ANY($2::text[]))
        AND u.id IS DISTINCT FROM $3`,
    [ids, vaiTro, nguoiGayId, loai, tieuDe, noiDung, link],
  );
  return rowCount;
}

// ---------- Cac su kien dung chung (goi tu cac module) ----------

// De xuat chi: moi / gui lai / duyet / tu choi / thu hoi / da chi.
export async function deXuatChi(client, id, suKien, { nguoiGayId = null, ghiChu = null } = {}) {
  const { rows } = await client.query(
    `SELECT c.id, c.loai_chi, c.so_tien, c.nguoi_tao_id, dh.ma_don, dh.vanhanh_phu_trach_id, COALESCE(n.ten, t.ten) AS nguoi_nhan_tien
       FROM de_xuat_chi c LEFT JOIN don_hang dh ON dh.id = c.don_hang_id
       LEFT JOIN nha_cung_cap n ON n.id = c.ncc_id LEFT JOIN doi_tho t ON t.id = c.doi_tho_id
      WHERE c.id = $1`,
    [id],
  );
  const c = rows[0];
  if (!c) return;
  const ten = `DXC-${c.id} · ${LOAI_CHI[c.loai_chi]} ${c.nguoi_nhan_tien || ''} ${tien(c.so_tien)}`.replace(/\s+/g, ' ');
  const link = `/cong-no${c.ma_don ? `?q=${encodeURIComponent(c.ma_don)}` : ''}`;
  const noiDung = [c.ma_don && `Đơn ${c.ma_don}`, ghiChu].filter(Boolean).join(' — ') || null;
  const CAU_HINH = {
    moi: { vaiTro: ['admin'], tieuDe: `Đề xuất chi chờ duyệt: ${ten}` },
    gui_lai: { vaiTro: ['admin'], tieuDe: `Đề xuất chi gửi lại, chờ duyệt: ${ten}` },
    duyet: { vaiTro: ['ke_toan'], nguoiIds: [c.nguoi_tao_id], tieuDe: `Đã duyệt — cần chuyển khoản: ${ten}` },
    duyet_0d: { nguoiIds: [c.nguoi_tao_id], tieuDe: `Đã duyệt (0 đ, cọc đã trừ hết): ${ten}` },
    tu_choi: { vaiTro: ['ke_toan'], nguoiIds: [c.nguoi_tao_id], tieuDe: `Bị từ chối: ${ten}` },
    thu_hoi: { vaiTro: ['ke_toan'], nguoiIds: [c.nguoi_tao_id], tieuDe: `Admin thu hồi duyệt: ${ten}` },
    da_chi: { nguoiIds: [c.nguoi_tao_id, c.vanhanh_phu_trach_id], tieuDe: `Đã chi: ${ten}` },
  };
  const ch = CAU_HINH[suKien];
  await gui(client, { nguoiIds: ch.nguoiIds || [], vaiTro: ch.vaiTro || [], nguoiGayId, loai: `de_xuat_${suKien}`, tieuDe: ch.tieuDe, noiDung, link });
}

// Don hang chuyen buoc (tay hoac tu dong) -> bao Sale phu trach don.
export async function tienDoDon(client, donHangId, den, { nguoiGayId = null, ghiChu = null } = {}) {
  const { rows } = await client.query('SELECT ma_don, sale_id FROM don_hang WHERE id = $1', [donHangId]);
  if (!rows[0]) return;
  await gui(client, {
    nguoiIds: [rows[0].sale_id], nguoiGayId, loai: den === 'huy' ? 'don_huy' : 'tien_do',
    tieuDe: den === 'huy' ? `Đơn ${rows[0].ma_don} đã bị huỷ` : `Đơn ${rows[0].ma_don} chuyển sang «${BUOC[den]}»`,
    noiDung: ghiChu, link: `/don-hang/${donHangId}`,
  });
}

// Giao / chuyen don cho Van hanh.
export async function giaoDon(client, donHangId, { den, tu = null, nguoiGayId = null, lyDo = null }) {
  const { rows } = await client.query('SELECT ma_don FROM don_hang WHERE id = $1', [donHangId]);
  const ma = rows[0]?.ma_don;
  await gui(client, { nguoiIds: [den], nguoiGayId, loai: 'giao_don', tieuDe: `Bạn được giao phụ trách đơn ${ma}`, noiDung: lyDo, link: `/don-hang/${donHangId}` });
  if (tu) await gui(client, { nguoiIds: [tu], nguoiGayId, loai: 'chuyen_don', tieuDe: `Đơn ${ma} đã chuyển cho người khác phụ trách`, noiDung: lyDo, link: '/don-hang' });
}

// ---------- API cho nguoi dung ----------
export async function cuaToi(user, { chuaDoc } = {}) {
  const [ds, dem] = await Promise.all([
    query(
      `SELECT t.id, t.loai, t.tieu_de, t.noi_dung, t.link, t.da_doc_luc, t.created_at, u.ho_ten AS nguoi_gay
         FROM thong_bao t LEFT JOIN users u ON u.id = t.nguoi_gay_id
        WHERE t.nguoi_nhan_id = $1 AND (NOT $2 OR t.da_doc_luc IS NULL)
        ORDER BY t.created_at DESC, t.id DESC LIMIT 30`,
      [user.id, !!chuaDoc],
    ),
    query('SELECT count(*)::int AS n FROM thong_bao WHERE nguoi_nhan_id = $1 AND da_doc_luc IS NULL', [user.id]),
  ]);
  return { items: ds.rows, chua_doc: dem.rows[0].n };
}

export async function demChuaDoc(user) {
  const { rows } = await query('SELECT count(*)::int AS n FROM thong_bao WHERE nguoi_nhan_id = $1 AND da_doc_luc IS NULL', [user.id]);
  return { chua_doc: rows[0].n };
}

// Chi danh dau duoc thong bao CUA MINH (WHERE nguoi_nhan_id) — khong doc/sua thong bao nguoi khac qua id.
export async function danhDauDaDoc(user, id) {
  const { rowCount } = await query('UPDATE thong_bao SET da_doc_luc = COALESCE(da_doc_luc, now()) WHERE id = $1 AND nguoi_nhan_id = $2', [id, user.id]);
  if (!rowCount) throw new AppError(404, 'Không tìm thấy thông báo');
}

export async function docHet(user) {
  const { rowCount } = await query('UPDATE thong_bao SET da_doc_luc = now() WHERE nguoi_nhan_id = $1 AND da_doc_luc IS NULL', [user.id]);
  return { da_doc: rowCount };
}
