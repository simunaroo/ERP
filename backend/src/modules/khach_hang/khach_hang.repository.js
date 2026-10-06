import { query } from '../../config/db.js';

export async function findAll({ saleId, trangThai, tuKhoa, limit, offset }) {
  const where = [];
  const params = [];
  if (saleId) {
    params.push(saleId);
    where.push(`kh.sale_phu_trach_id = $${params.length}`);
  }
  if (trangThai) {
    params.push(trangThai);
    where.push(`kh.trang_thai_cham_soc = $${params.length}`);
  }
  if (tuKhoa) {
    params.push(`%${tuKhoa}%`);
    where.push(`(kh.ten ILIKE $${params.length} OR kh.sdt ILIKE $${params.length})`);
  }
  const from = `FROM khach_hang kh JOIN users s ON s.id = kh.sale_phu_trach_id
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}`;
  const [{ rows }, { rows: dem }] = await Promise.all([
    query(
      `SELECT kh.id, kh.ten, kh.sdt, kh.dia_chi, kh.nhom_khach_hang, kh.trang_thai_cham_soc, s.ho_ten AS sale,
              (SELECT max(cs.created_at) FROM khach_hang_cham_soc cs WHERE cs.khach_hang_id = kh.id) AS lan_cham_soc_cuoi,
              (SELECT count(*)::int FROM don_hang dh WHERE dh.khach_hang_id = kh.id) AS so_don
         ${from}
        ORDER BY lan_cham_soc_cuoi DESC NULLS FIRST, kh.id DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    ),
    query(`SELECT count(*)::int AS tong ${from}`, params),
  ]);
  return { items: rows, tong: dem[0].tong };
}

export async function findById(id) {
  const { rows } = await query(
    `SELECT kh.*, s.ho_ten AS sale FROM khach_hang kh JOIN users s ON s.id = kh.sale_phu_trach_id WHERE kh.id = $1`,
    [id],
  );
  return rows[0] || null;
}

export async function findLichSu(khachHangId) {
  const { rows } = await query(
    `SELECT cs.id, cs.trang_thai, cs.noi_dung, cs.created_at, u.ho_ten AS nguoi_cham_soc
       FROM khach_hang_cham_soc cs JOIN users u ON u.id = cs.sale_id
      WHERE cs.khach_hang_id = $1 ORDER BY cs.created_at DESC, cs.id DESC`,
    [khachHangId],
  );
  return rows;
}

export async function findDonHang(khachHangId) {
  const { rows } = await query(
    `SELECT id, ma_don, trang_thai, created_at FROM don_hang WHERE khach_hang_id = $1 ORDER BY created_at DESC`,
    [khachHangId],
  );
  return rows;
}

export async function create(data) {
  const { rows } = await query(
    `INSERT INTO khach_hang (ten, sdt, dia_chi, nhom_khach_hang, sale_phu_trach_id) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [data.ten, data.sdt, data.dia_chi, data.nhom_khach_hang, data.sale_phu_trach_id],
  );
  return rows[0];
}

export async function ghiChamSoc(client, { khachHangId, saleId, trangThai, noiDung }) {
  await client.query(
    `UPDATE khach_hang SET trang_thai_cham_soc = $2 WHERE id = $1`,
    [khachHangId, trangThai],
  );
  const { rows } = await client.query(
    `INSERT INTO khach_hang_cham_soc (khach_hang_id, sale_id, trang_thai, noi_dung)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [khachHangId, saleId, trangThai, noiDung],
  );
  return rows[0];
}
