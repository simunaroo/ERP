import { Router } from 'express';
import { query } from '../../config/db.js';
import { xacThuc, coQuyen } from '../../middlewares/auth.js';
import { AppError } from '../../utils/AppError.js';

// Xem nhat ky thay doi (trigger fn_ghi_nhat_ky ghi). Chi Admin.
export const BANG = ['don_hang', 'don_hang_vat_tu', 'khach_hang', 'mua_hang_dong', 'de_xuat_chi', 'thanh_toan_khach', 'thi_cong',
  'phat_sinh_thi_cong', 'ncc_bang_gia', 'vat_tu', 'nha_cung_cap', 'users', 'cau_hinh', 'ty_le_chia_so', 'vai_tro_quyen', 'giao_dich_ngan_hang'];
const NGAY = /^\d{4}-\d{2}-\d{2}$/;

async function danhSach(q) {
  if (q.bang && !BANG.includes(q.bang)) throw new AppError(400, 'Bảng không hợp lệ');
  if (q.hanh_dong && !['INSERT', 'UPDATE', 'DELETE'].includes(q.hanh_dong)) throw new AppError(400, 'Hành động không hợp lệ');
  if ((q.tu && !NGAY.test(q.tu)) || (q.den && !NGAY.test(q.den))) throw new AppError(400, 'Ngày không hợp lệ');
  const trang = Math.max(1, parseInt(q.page, 10) || 1);
  const where = [];
  const p = [];
  const them = (sql, v) => { p.push(v); where.push(sql.replace('?', `$${p.length}`)); };
  if (q.bang) them('n.bang = ?', q.bang);
  if (q.ban_ghi) them('n.ban_ghi = ?', String(q.ban_ghi));
  if (q.hanh_dong) them('n.hanh_dong = ?', q.hanh_dong);
  if (q.nguoi_id) them('n.nguoi_id = ?', Number(q.nguoi_id));
  if (q.tu) them(`n.thoi_gian >= (?::date)::timestamptz`, q.tu);
  if (q.den) them(`n.thoi_gian < (?::date + 1)::timestamptz`, q.den);
  // Tim theo ma don: gom ca dong cua bang con tro ve don do (vat tu don, phieu thu, de xuat chi, thi cong...).
  if (q.don_hang_id) {
    p.push(String(q.don_hang_id));
    where.push(`((n.bang = 'don_hang' AND n.ban_ghi = $${p.length}) OR COALESCE(n.du_lieu_moi, n.du_lieu_cu) ->> 'don_hang_id' = $${p.length})`);
  }
  const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [{ rows }, { rows: dem }] = await Promise.all([
    query(`SELECT n.*, u.ho_ten AS nguoi FROM nhat_ky_thay_doi n LEFT JOIN users u ON u.id = n.nguoi_id ${w}
            ORDER BY n.id DESC LIMIT 50 OFFSET $${p.length + 1}`, [...p, (trang - 1) * 50]),
    query(`SELECT count(*)::int AS tong FROM nhat_ky_thay_doi n ${w}`, p),
  ]);
  return { items: rows, tong: dem[0].tong, page: trang, soTrang: Math.max(1, Math.ceil(dem[0].tong / 50)) };
}

const router = Router();
router.use(xacThuc, coQuyen('he_thong.quan_tri'));
router.get('/', async (req, res) => res.json(await danhSach(req.query)));

export default router;
