import { query } from '../../config/db.js';
import { AppError } from '../../utils/AppError.js';

// Doc 1 tham so (tra so); thieu dong trong DB thi dung gia tri mac dinh truyen vao.
export async function lay(khoa, macDinh, client = { query }) {
  const { rows } = await client.query('SELECT gia_tri FROM cau_hinh WHERE khoa = $1', [khoa]);
  return rows[0] ? Number(rows[0].gia_tri) : macDinh;
}

export async function danhSach() {
  const { rows } = await query(
    `SELECT c.khoa, c.gia_tri::float AS gia_tri, c.mo_ta, c.don_vi, c.toi_thieu::float AS toi_thieu, c.toi_da::float AS toi_da,
            c.cap_nhat_luc, u.ho_ten AS nguoi_cap_nhat
       FROM cau_hinh c LEFT JOIN users u ON u.id = c.nguoi_cap_nhat_id ORDER BY c.khoa`,
  );
  return rows;
}

export async function capNhat(user, khoa, { gia_tri }) {
  const v = Number(gia_tri);
  if (gia_tri === '' || gia_tri === null || gia_tri === undefined || !Number.isFinite(v)) throw new AppError(400, 'Giá trị phải là số');
  const { rows } = await query('SELECT toi_thieu, toi_da FROM cau_hinh WHERE khoa = $1', [khoa]);
  if (!rows[0]) throw new AppError(404, 'Không có tham số này');
  const min = rows[0].toi_thieu === null ? null : Number(rows[0].toi_thieu);
  const max = rows[0].toi_da === null ? null : Number(rows[0].toi_da);
  if ((min !== null && v < min) || (max !== null && v > max)) throw new AppError(400, `Giá trị phải từ ${min ?? '-∞'} đến ${max ?? '∞'}`);
  await query('UPDATE cau_hinh SET gia_tri = $2, nguoi_cap_nhat_id = $3, cap_nhat_luc = now() WHERE khoa = $1', [khoa, v, user.id]);
  return danhSach();
}
