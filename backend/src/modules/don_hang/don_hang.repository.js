import { query } from '../../config/db.js';

export async function findAll({ saleId, trangThai, tuKhoa, limit, offset }) {
  const where = [];
  const params = [];
  if (saleId) {
    params.push(saleId);
    where.push(`dh.sale_id = $${params.length}`);
  }
  if (trangThai) {
    params.push(trangThai);
    where.push(`dh.trang_thai = $${params.length}`);
  }
  if (tuKhoa) {
    params.push(`%${tuKhoa}%`);
    where.push(`(dh.ma_don ILIKE $${params.length} OR kh.ten ILIKE $${params.length})`);
  }
  const from = `FROM don_hang dh
       JOIN khach_hang kh ON kh.id = dh.khach_hang_id
       JOIN users s ON s.id = dh.sale_id
       LEFT JOIN users vh ON vh.id = dh.vanhanh_phu_trach_id
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}`;

  const [{ rows }, { rows: dem }] = await Promise.all([
    query(
      `SELECT dh.id, dh.ma_don, dh.trang_thai, dh.dia_chi_cong_trinh, dh.created_at,
              kh.ten AS khach_hang, s.ho_ten AS sale, vh.ho_ten AS van_hanh
         ${from}
        ORDER BY dh.created_at DESC, dh.id DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    ),
    query(`SELECT count(*)::int AS tong ${from}`, params),
  ]);
  return { items: rows, tong: dem[0].tong };
}

export async function findById(id) {
  const { rows } = await query(
    `SELECT dh.*, kh.ten AS khach_hang, kh.sdt AS khach_hang_sdt,
            s.ho_ten AS sale, vh.ho_ten AS van_hanh
       FROM don_hang dh
       JOIN khach_hang kh ON kh.id = dh.khach_hang_id
       JOIN users s ON s.id = dh.sale_id
       LEFT JOIN users vh ON vh.id = dh.vanhanh_phu_trach_id
      WHERE dh.id = $1`,
    [id],
  );
  return rows[0] || null;
}

export async function findVatTu(donHangId) {
  const { rows } = await query(
    `SELECT dvt.id, dvt.vat_tu_id, vt.ten, vt.don_vi_tinh, dvt.so_luong_can,
            lvt.ten AS loai, lvt.nguon_goc
       FROM don_hang_vat_tu dvt
       JOIN vat_tu vt ON vt.id = dvt.vat_tu_id
       JOIN loai_vat_tu lvt ON lvt.id = vt.loai_vat_tu_id
      WHERE dvt.don_hang_id = $1
      ORDER BY dvt.id`,
    [donHangId],
  );
  return rows;
}

export async function findYeuCauSua(donHangId) {
  const { rows } = await query(
    `SELECT yc.id, yc.noi_dung, yc.trang_thai, yc.created_at, u.ho_ten AS nguoi_gui
       FROM don_hang_yeu_cau_sua yc
       JOIN users u ON u.id = yc.sale_id
      WHERE yc.don_hang_id = $1
      ORDER BY yc.created_at DESC`,
    [donHangId],
  );
  return rows;
}

// Khoa cap transaction de 2 request tao don cung luc khong sinh trung ma don.
export async function sinhMaDon(client) {
  await client.query('SELECT pg_advisory_xact_lock(1001)');
  const prefix = 'DH-' + new Date().toISOString().slice(2, 7).replace('-', '') + '-';
  const { rows } = await client.query(
    `SELECT COALESCE(MAX(SUBSTRING(ma_don FROM '\\d+$')::int), 0) + 1 AS so
       FROM don_hang WHERE ma_don LIKE $1`,
    [prefix + '%'],
  );
  return prefix + String(rows[0].so).padStart(3, '0');
}

export async function create(client, data) {
  const { rows } = await client.query(
    `INSERT INTO don_hang (ma_don, khach_hang_id, sale_id, dia_chi_cong_trinh)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [data.ma_don, data.khach_hang_id, data.sale_id, data.dia_chi_cong_trinh],
  );
  return rows[0];
}

export async function addVatTu(client, donHangId, items) {
  for (const it of items) {
    await client.query(
      `INSERT INTO don_hang_vat_tu (don_hang_id, vat_tu_id, so_luong_can) VALUES ($1, $2, $3)`,
      [donHangId, it.vat_tu_id, it.so_luong_can],
    );
  }
}

export async function updatePhuongAn(id, vanHanhId, data) {
  const { rows } = await query(
    `UPDATE don_hang
        SET phuong_an_van_chuyen = $2,
            phuong_an_thi_cong   = $3,
            vanhanh_phu_trach_id = $4,
            trang_thai = CASE WHEN trang_thai = 'moi' THEN 'dang_xu_ly' ELSE trang_thai END
      WHERE id = $1
      RETURNING *`,
    [id, data.phuong_an_van_chuyen, data.phuong_an_thi_cong, vanHanhId],
  );
  return rows[0] || null;
}

export async function createYeuCauSua(donHangId, saleId, noiDung) {
  const { rows } = await query(
    `INSERT INTO don_hang_yeu_cau_sua (don_hang_id, sale_id, noi_dung)
     VALUES ($1, $2, $3) RETURNING *`,
    [donHangId, saleId, noiDung],
  );
  return rows[0];
}

export async function danhDauDaXuLy(donHangId, yeuCauId) {
  const { rows } = await query(
    `UPDATE don_hang_yeu_cau_sua SET trang_thai = 'da_xu_ly'
      WHERE id = $1 AND don_hang_id = $2 AND trang_thai = 'cho_xu_ly'
      RETURNING *`,
    [yeuCauId, donHangId],
  );
  return rows[0] || null;
}

export async function khachHangThuocSale(khachHangId, saleId) {
  const { rows } = await query(
    `SELECT 1 FROM khach_hang WHERE id = $1 AND sale_phu_trach_id = $2`,
    [khachHangId, saleId],
  );
  return rows.length > 0;
}
