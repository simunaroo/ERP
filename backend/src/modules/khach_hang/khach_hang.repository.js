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
  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const from = `FROM khach_hang kh JOIN users s ON s.id = kh.sale_phu_trach_id`;
  const [{ rows }, { rows: dem }] = await Promise.all([
    query(
      `SELECT kh.id, kh.ten, kh.sdt, kh.dia_chi, kh.nhom_khach_hang, kh.trang_thai_cham_soc, kh.hen_goi_lai_luc, s.ho_ten AS sale,
              COALESCE(kh.chia_luc, kh.created_at) AS nhan_so_luc,
              cs.created_at AS lan_cham_soc_cuoi, cs.noi_dung AS ghi_chu_cuoi, cs.so_lan AS so_lan_cham_soc,
              (SELECT count(*)::int FROM don_hang dh WHERE dh.khach_hang_id = kh.id) AS so_don
         ${from}
         -- Lan cham soc gan nhat (kem ghi chu) de Sale thay lan truoc da tu van gi ngay tren danh sach.
         LEFT JOIN LATERAL (
           SELECT c.created_at, c.noi_dung, count(*) OVER()::int AS so_lan
             FROM khach_hang_cham_soc c WHERE c.khach_hang_id = kh.id
            ORDER BY c.created_at DESC, c.id DESC LIMIT 1
         ) cs ON true
         ${whereSql}
        -- Mac dinh: so moi day ve (chia/chuyen cho Sale) len dau; khach cu khong co chia_luc dung thoi diem tao.
        ORDER BY nhan_so_luc DESC, kh.id DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    ),
    query(`SELECT count(*)::int AS tong ${from} ${whereSql}`, params),
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
    `SELECT cs.id, cs.trang_thai, cs.noi_dung, cs.hen_goi_lai_luc, cs.created_at, u.ho_ten AS nguoi_cham_soc
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

export async function ghiChamSoc(client, { khachHangId, saleId, trangThai, noiDung, henGoiLaiLuc = null }) {
  // Hen goi lai: luu gio hen o khach (de nhac); trang thai khac thi xoa lich hen cu.
  await client.query(
    `UPDATE khach_hang SET trang_thai_cham_soc = $2, hen_goi_lai_luc = $3 WHERE id = $1`,
    [khachHangId, trangThai, henGoiLaiLuc],
  );
  const { rows } = await client.query(
    `INSERT INTO khach_hang_cham_soc (khach_hang_id, sale_id, trang_thai, noi_dung, hen_goi_lai_luc)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [khachHangId, saleId, trangThai, noiDung, henGoiLaiLuc],
  );
  return rows[0];
}
