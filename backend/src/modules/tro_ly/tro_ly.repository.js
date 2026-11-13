import { query } from '../../config/db.js';

// Danh sach tro ly = moi loai san pham mot tro ly (loai chua co ho so thi kien thuc rong).
export async function dsTroLy() {
  const { rows } = await query(
    `SELECT l.id, l.ten, length(COALESCE(t.kien_thuc, ''))::int AS so_ky_tu, t.cap_nhat_luc, u.ho_ten AS nguoi_cap_nhat
       FROM loai_vat_tu l
       LEFT JOIN tro_ly_san_pham t ON t.loai_vat_tu_id = l.id
       LEFT JOIN users u ON u.id = t.nguoi_cap_nhat_id
      ORDER BY l.id`,
  );
  return rows;
}

export async function troLy(sanPhamId) {
  const { rows } = await query(
    `SELECT l.id, l.ten, COALESCE(t.kien_thuc, '') AS kien_thuc, t.cap_nhat_luc, u.ho_ten AS nguoi_cap_nhat
       FROM loai_vat_tu l
       LEFT JOIN tro_ly_san_pham t ON t.loai_vat_tu_id = l.id
       LEFT JOIN users u ON u.id = t.nguoi_cap_nhat_id
      WHERE l.id = $1`,
    [sanPhamId],
  );
  return rows[0] || null;
}

export async function luuKienThuc(sanPhamId, kienThuc, nguoiId) {
  await query(
    `INSERT INTO tro_ly_san_pham (loai_vat_tu_id, kien_thuc, nguoi_cap_nhat_id) VALUES ($1, $2, $3)
     ON CONFLICT (loai_vat_tu_id) DO UPDATE SET kien_thuc = EXCLUDED.kien_thuc, nguoi_cap_nhat_id = EXCLUDED.nguoi_cap_nhat_id, cap_nhat_luc = now()`,
    [sanPhamId, kienThuc, nguoiId],
  );
}

// Vat tu dang ban cua san pham: dua vao prompt de tro ly biet chinh xac ten mau / quy cach (KHONG gui gia nhap NCC).
export async function vatTuDangBan(sanPhamId) {
  const { rows } = await query(
    `SELECT ten, don_vi_tinh, quy_cach FROM vat_tu WHERE loai_vat_tu_id = $1 AND trang_thai = 'active' ORDER BY ten`,
    [sanPhamId],
  );
  return rows;
}

export async function dsHoiThoai(nguoiId, sanPhamId) {
  const { rows } = await query(
    `SELECT h.id, h.tieu_de, h.cap_nhat_luc, h.khach_hang_id, k.ten AS khach_hang
       FROM tro_ly_hoi_thoai h LEFT JOIN khach_hang k ON k.id = h.khach_hang_id
      WHERE h.nguoi_id = $1 AND h.loai_vat_tu_id = $2
      ORDER BY h.cap_nhat_luc DESC LIMIT 30`,
    [nguoiId, sanPhamId],
  );
  return rows;
}

export async function hoiThoai(id) {
  const { rows } = await query(
    `SELECT h.*, k.ten AS khach_hang FROM tro_ly_hoi_thoai h LEFT JOIN khach_hang k ON k.id = h.khach_hang_id WHERE h.id = $1`,
    [id],
  );
  return rows[0] || null;
}

export async function tinNhan(hoiThoaiId, gioiHan = 200) {
  const { rows } = await query(
    `SELECT * FROM (SELECT id, vai_tro, noi_dung, so_anh, created_at FROM tro_ly_tin_nhan
                     WHERE hoi_thoai_id = $1 ORDER BY id DESC LIMIT $2) x ORDER BY id`,
    [hoiThoaiId, gioiHan],
  );
  return rows;
}

export async function taoHoiThoai(client, { nguoiId, sanPhamId, khachHangId, tieuDe }) {
  const { rows } = await client.query(
    `INSERT INTO tro_ly_hoi_thoai (nguoi_id, loai_vat_tu_id, khach_hang_id, tieu_de) VALUES ($1, $2, $3, $4) RETURNING id`,
    [nguoiId, sanPhamId, khachHangId, tieuDe],
  );
  return rows[0].id;
}

// Ghi ca cau hoi + cau tra loi cung luc (sau khi AI tra loi thanh cong) -> khong de lai cau hoi "mo coi" khi AI loi.
export async function ghiLuot(client, hoiThoaiId, { cauHoi, soAnh, traLoi }) {
  await client.query(
    `INSERT INTO tro_ly_tin_nhan (hoi_thoai_id, vai_tro, noi_dung, so_anh) VALUES ($1, 'user', $2, $3), ($1, 'model', $4, 0)`,
    [hoiThoaiId, cauHoi, soAnh, traLoi],
  );
  await client.query('UPDATE tro_ly_hoi_thoai SET cap_nhat_luc = now() WHERE id = $1', [hoiThoaiId]);
}

export async function xoaHoiThoai(id) {
  await query('DELETE FROM tro_ly_hoi_thoai WHERE id = $1', [id]);
}
