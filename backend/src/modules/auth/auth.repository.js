import { query } from '../../config/db.js';

export async function findByUsername(username) {
  const { rows } = await query(
    `SELECT id, ho_ten, username, password_hash, vai_tro, trang_thai, phien_ban_token FROM users WHERE username = $1`,
    [username],
  );
  return rows[0] || null;
}

export async function findById(id) {
  const { rows } = await query(
    `SELECT id, ho_ten, username, vai_tro, trang_thai, doi_mat_khau_luc FROM users WHERE id = $1`,
    [id],
  );
  return rows[0] || null;
}

export async function layHash(id) {
  const { rows } = await query('SELECT password_hash FROM users WHERE id = $1', [id]);
  return rows[0]?.password_hash || null;
}

// Doi mat khau + tang phien ban token (dang xuat moi thiet bi khac).
export async function doiMatKhau(id, hash) {
  const { rows } = await query(
    `UPDATE users SET password_hash = $2, phien_ban_token = phien_ban_token + 1, doi_mat_khau_luc = now()
      WHERE id = $1 RETURNING id, ho_ten, username, vai_tro, trang_thai, phien_ban_token`,
    [id, hash],
  );
  return rows[0];
}
