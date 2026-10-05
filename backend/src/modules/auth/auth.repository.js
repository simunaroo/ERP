import { query } from '../../config/db.js';

export async function findByUsername(username) {
  const { rows } = await query(
    `SELECT id, ho_ten, username, password_hash, vai_tro, trang_thai
       FROM users WHERE username = $1`,
    [username],
  );
  return rows[0] || null;
}

export async function findById(id) {
  const { rows } = await query(
    `SELECT id, ho_ten, username, vai_tro, trang_thai FROM users WHERE id = $1`,
    [id],
  );
  return rows[0] || null;
}
