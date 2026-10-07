import { query } from '../../config/db.js';

const COT = 'id, ho_ten, username, vai_tro, trang_thai, doi_mat_khau_luc, created_at';

export async function findAll() {
  const { rows } = await query(
    `SELECT ${COT},
            (SELECT count(*) FROM don_hang d WHERE d.sale_id = u.id)::int AS so_don_sale,
            (SELECT count(*) FROM khach_hang k WHERE k.sale_phu_trach_id = u.id)::int AS so_khach
       FROM users u ORDER BY u.trang_thai, u.vai_tro, u.ho_ten`,
  );
  return rows;
}

export async function findById(client, id) {
  const { rows } = await client.query(`SELECT ${COT} FROM users WHERE id = $1 FOR UPDATE`, [id]);
  return rows[0] || null;
}

// So admin con hoat dong (khoa cac dong admin: 2 nguoi khong the cung luc khoa 2 admin cuoi cung).
export async function demAdminHoatDong(client) {
  const { rows } = await client.query(`SELECT id FROM users WHERE vai_tro = 'admin' AND trang_thai = 'active' FOR UPDATE`);
  return rows.length;
}

export async function tao(d) {
  const { rows } = await query(
    `INSERT INTO users (ho_ten, username, password_hash, vai_tro) VALUES ($1, $2, $3, $4) RETURNING ${COT}`,
    [d.ho_ten, d.username, d.hash, d.vai_tro],
  );
  return rows[0];
}

// Doi vai tro / khoa / dat lai mat khau -> tang phien_ban_token: moi token dang dung cua nguoi do het hieu luc ngay.
export async function capNhat(client, id, d) {
  const { rows } = await client.query(
    `UPDATE users SET ho_ten = $2, vai_tro = $3, trang_thai = $4,
            password_hash = COALESCE($5, password_hash),
            phien_ban_token = phien_ban_token + CASE WHEN $6 THEN 1 ELSE 0 END
      WHERE id = $1 RETURNING ${COT}`,
    [id, d.ho_ten, d.vai_tro, d.trang_thai, d.hash ?? null, d.tangPhienBan],
  );
  return rows[0];
}
