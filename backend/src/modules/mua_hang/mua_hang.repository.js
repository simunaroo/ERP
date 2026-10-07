import { query } from '../../config/db.js';

// Tao dong mua (neu chua co) cho moi dong vat tu MUA NGOAI cua don da chot. Goi truoc khi doc danh sach.
export async function dongBo(donHangId = null) {
  await query(
    `INSERT INTO mua_hang_dong (don_hang_vat_tu_id)
     SELECT dvt.id FROM don_hang_vat_tu dvt
       JOIN don_hang dh ON dh.id = dvt.don_hang_id AND dh.trang_thai NOT IN ('nhap', 'huy')
       JOIN vat_tu vt ON vt.id = dvt.vat_tu_id
       JOIN loai_vat_tu l ON l.id = vt.loai_vat_tu_id AND l.nguon_goc = 'mua_ngoai'
      WHERE ($1::int IS NULL OR dh.id = $1)
     ON CONFLICT (don_hang_vat_tu_id) DO NOTHING`,
    [donHangId],
  );
}

const SAN_SANG = `('san_hang', 'da_lay_hang', 'da_giao_hang')`;

// Danh sach don can mua: x/y dong da san hang; loc: san_sang | dang_chuan_bi | chua_xu_ly.
export async function dsDon({ loc, tuKhoa, vanHanhId }) {
  const { rows } = await query(
    `WITH d AS (
       SELECT dh.id, dh.ma_don, dh.giai_doan, dh.tinh_thanh, dh.ngay_yc_lap_dat, dh.created_at, kh.ten AS khach_hang, s.ho_ten AS sale,
              count(m.id) FILTER (WHERE m.trang_thai <> 'huy')::int AS tong_dong,
              count(m.id) FILTER (WHERE m.trang_thai IN ${SAN_SANG})::int AS dong_san_sang,
              count(m.id) FILTER (WHERE m.trang_thai = 'cho_xu_ly')::int AS dong_chua_xu_ly
         FROM don_hang dh
         JOIN khach_hang kh ON kh.id = dh.khach_hang_id
         JOIN users s ON s.id = dh.sale_id
         JOIN don_hang_vat_tu dvt ON dvt.don_hang_id = dh.id
         JOIN mua_hang_dong m ON m.don_hang_vat_tu_id = dvt.id
        WHERE dh.giai_doan IN ('len_phuong_an', 'boc_khoi_luong', 'mua_hang', 'giao_hang')
          AND ($1::text IS NULL OR dh.ma_don ILIKE $1 OR kh.ten ILIKE $1)
          AND ($3::int IS NULL OR dh.vanhanh_phu_trach_id = $3)
        GROUP BY dh.id, kh.ten, s.ho_ten
     )
     SELECT * FROM d
      WHERE tong_dong > 0
        AND ($2::text IS NULL
          OR ($2 = 'san_sang' AND dong_san_sang = tong_dong)
          OR ($2 = 'chua_xu_ly' AND dong_chua_xu_ly = tong_dong)
          OR ($2 = 'dang_chuan_bi' AND dong_san_sang < tong_dong AND dong_chua_xu_ly < tong_dong))
      ORDER BY (dong_san_sang = tong_dong) DESC, ngay_yc_lap_dat NULLS LAST, id`,
    [tuKhoa ? `%${tuKhoa}%` : null, loc || null, vanHanhId],
  );
  return rows;
}

export async function donCoBan(id, client = { query }) {
  const { rows } = await client.query(
    `SELECT dh.id, dh.ma_don, dh.giai_doan, dh.hinh_thuc, dh.trang_thai, dh.tinh_thanh, dh.dia_chi_cong_trinh, dh.ngay_yc_lap_dat,
            kh.ten AS khach_hang FROM don_hang dh JOIN khach_hang kh ON kh.id = dh.khach_hang_id WHERE dh.id = $1`,
    [id],
  );
  return rows[0] || null;
}

// Dong mua cua don + de xuat quyet toan con hieu luc dang giu dong (neu co).
export async function dongCuaDon(donHangId) {
  const { rows } = await query(
    `SELECT m.id, m.ncc_id, n.ten AS ncc, m.gia_chot, m.vat_pct, m.trang_thai, m.ghi_chu, m.cap_nhat_luc,
            dvt.id AS don_hang_vat_tu_id, dvt.vat_tu_id, vt.ten AS vat_tu, vt.don_vi_tinh, vt.quy_cach, dvt.so_luong_can,
            dvt.dai_mm, dvt.rong_mm,
            (SELECT c.id FROM de_xuat_chi_dong x JOIN de_xuat_chi c ON c.id = x.de_xuat_chi_id
              WHERE x.mua_hang_dong_id = m.id AND c.trang_thai <> 'thu_hoi' LIMIT 1) AS dxc_quyet_toan_id,
            (SELECT c.trang_thai FROM de_xuat_chi_dong x JOIN de_xuat_chi c ON c.id = x.de_xuat_chi_id
              WHERE x.mua_hang_dong_id = m.id AND c.trang_thai <> 'thu_hoi' LIMIT 1) AS dxc_quyet_toan_trang_thai
       FROM mua_hang_dong m
       JOIN don_hang_vat_tu dvt ON dvt.id = m.don_hang_vat_tu_id
       JOIN vat_tu vt ON vt.id = dvt.vat_tu_id
       LEFT JOIN nha_cung_cap n ON n.id = m.ncc_id
      WHERE dvt.don_hang_id = $1 ORDER BY dvt.id`,
    [donHangId],
  );
  return rows;
}

// Khoa 1 dong mua (FOR UPDATE) kem trang thai don va de xuat chi dang giu dong.
export async function khoaDong(client, id) {
  const { rows } = await client.query(
    `SELECT m.*, dvt.don_hang_id, dvt.vat_tu_id, dh.giai_doan,
            EXISTS (SELECT 1 FROM de_xuat_chi_dong x JOIN de_xuat_chi c ON c.id = x.de_xuat_chi_id
                     WHERE x.mua_hang_dong_id = m.id AND c.trang_thai NOT IN ('thu_hoi', 'tu_choi')) AS khoa_quyet_toan,
            EXISTS (SELECT 1 FROM de_xuat_chi c WHERE c.loai_chi = 'coc' AND c.don_hang_id = dvt.don_hang_id
                     AND c.ncc_id = m.ncc_id AND c.trang_thai IN ('cho_duyet', 'da_duyet', 'da_thanh_toan')) AS khoa_coc
       FROM mua_hang_dong m
       JOIN don_hang_vat_tu dvt ON dvt.id = m.don_hang_vat_tu_id
       JOIN don_hang dh ON dh.id = dvt.don_hang_id
      WHERE m.id = $1 FOR UPDATE OF m`,
    [id],
  );
  return rows[0] || null;
}

export async function khoaDon(client, donHangId) {
  const { rows } = await client.query('SELECT id, trang_thai, giai_doan FROM don_hang WHERE id = $1 FOR UPDATE', [donHangId]);
  return rows[0] || null;
}

// Doi trang thai moi dong (con hieu luc) cua 1 NCC trong don. boQuaQuyetToan: khong dong vao dong da nam trong de xuat quyet toan.
export async function doiTrangThaiTheoNcc(client, { donHangId, nccId, tu, den, nguoiId, boQuaQuyetToan = false }) {
  const { rowCount } = await client.query(
    `UPDATE mua_hang_dong m SET trang_thai = $4, nguoi_cap_nhat_id = $5, cap_nhat_luc = now()
       FROM don_hang_vat_tu dvt
      WHERE dvt.id = m.don_hang_vat_tu_id AND dvt.don_hang_id = $1 AND m.ncc_id = $2 AND m.trang_thai::text = ANY($3)
        AND (NOT $6 OR NOT EXISTS (SELECT 1 FROM de_xuat_chi_dong x JOIN de_xuat_chi c ON c.id = x.de_xuat_chi_id
                                    WHERE x.mua_hang_dong_id = m.id AND c.trang_thai NOT IN ('thu_hoi', 'tu_choi')))`,
    [donHangId, nccId, tu, den, nguoiId, boQuaQuyetToan],
  );
  return rowCount;
}

export async function coCocHieuLuc(client, donHangId, nccId) {
  const { rows } = await client.query(
    `SELECT 1 FROM de_xuat_chi WHERE loai_chi = 'coc' AND don_hang_id = $1 AND ncc_id = $2 AND trang_thai IN ('cho_duyet', 'da_duyet', 'da_thanh_toan') LIMIT 1`,
    [donHangId, nccId],
  );
  return rows.length > 0;
}

export async function capNhatDong(client, id, d) {
  const { rows } = await client.query(
    `UPDATE mua_hang_dong SET ncc_id = $2, gia_chot = $3, vat_pct = $4, trang_thai = $5, ghi_chu = $6,
            nguoi_cap_nhat_id = $7, cap_nhat_luc = now()
      WHERE id = $1 RETURNING *`,
    [id, d.ncc_id, d.gia_chot, d.vat_pct, d.trang_thai, d.ghi_chu, d.nguoiId],
  );
  return rows[0];
}

// Gia hien hanh cua moi NCC dang hop tac cho cac vat tu (re nhat truoc).
export async function giaHomNay(vatTuIds, ngay) {
  const { rows } = await query(
    `SELECT g.vat_tu_id, g.ncc_id, n.ten AS ncc, g.don_gia FROM ncc_bang_gia g
       JOIN nha_cung_cap n ON n.id = g.ncc_id AND n.trang_thai = 'active'
      WHERE g.vat_tu_id = ANY($1) AND g.ngay_hieu_luc <= $2 AND (g.ngay_het_hieu_luc IS NULL OR g.ngay_het_hieu_luc >= $2)
      ORDER BY g.vat_tu_id, g.don_gia, n.ten`,
    [vatTuIds, ngay],
  );
  return rows;
}

export async function giaMot(client, nccId, vatTuId, ngay) {
  const { rows } = await client.query(
    `SELECT g.don_gia FROM ncc_bang_gia g JOIN nha_cung_cap n ON n.id = g.ncc_id AND n.trang_thai = 'active'
      WHERE g.ncc_id = $1 AND g.vat_tu_id = $2 AND g.ngay_hieu_luc <= $3 AND (g.ngay_het_hieu_luc IS NULL OR g.ngay_het_hieu_luc >= $3)`,
    [nccId, vatTuId, ngay],
  );
  return rows[0] ? Number(rows[0].don_gia) : null;
}

// Don sang dang Giao hang: hang cua 1 NCC da duoc lay (san_hang -> da_lay_hang).
export async function layHang(donHangId, nccId) {
  const { rowCount } = await query(
    `UPDATE mua_hang_dong m SET trang_thai = 'da_lay_hang', cap_nhat_luc = now()
       FROM don_hang_vat_tu dvt
      WHERE dvt.id = m.don_hang_vat_tu_id AND dvt.don_hang_id = $1 AND m.ncc_id = $2 AND m.trang_thai = 'san_hang'`,
    [donHangId, nccId],
  );
  return rowCount;
}

// ---------- Mua bo sung ----------
export async function dsMuaBoSung({ trangThai, donHangId, vanHanhId }) {
  const { rows } = await query(
    `SELECT b.id, b.don_hang_id, dh.ma_don, b.loai_phat_sinh, b.ly_do, b.trang_thai, b.ncc_id, n.ten AS ncc, b.ngay_mua,
            b.created_at, u.ho_ten AS nguoi_tao,
            (SELECT COALESCE(sum(d.so_luong * d.don_gia), 0) FROM mua_bo_sung_dong d WHERE d.mua_bo_sung_id = b.id) AS tong_tien,
            (SELECT json_agg(json_build_object('id', d.id, 'vat_tu_id', d.vat_tu_id, 'vat_tu', vt.ten, 'don_vi_tinh', vt.don_vi_tinh,
                     'so_luong', d.so_luong, 'don_gia', d.don_gia) ORDER BY d.id)
               FROM mua_bo_sung_dong d JOIN vat_tu vt ON vt.id = d.vat_tu_id WHERE d.mua_bo_sung_id = b.id) AS dong,
            (SELECT json_agg(json_build_object('nguon', t.nguon, 'so_tien', t.so_tien) ORDER BY t.id)
               FROM mua_bo_sung_trach_nhiem t WHERE t.mua_bo_sung_id = b.id) AS trach_nhiem,
            (SELECT c.trang_thai FROM de_xuat_chi c WHERE c.mua_bo_sung_id = b.id AND c.trang_thai NOT IN ('thu_hoi') ORDER BY c.id DESC LIMIT 1) AS trang_thai_chi
       FROM mua_bo_sung b
       JOIN don_hang dh ON dh.id = b.don_hang_id
       JOIN users u ON u.id = b.nguoi_tao_id
       LEFT JOIN nha_cung_cap n ON n.id = b.ncc_id
      WHERE ($1::trang_thai_mbs_enum IS NULL OR b.trang_thai = $1) AND ($2::int IS NULL OR b.don_hang_id = $2)
        AND ($3::int IS NULL OR dh.vanhanh_phu_trach_id = $3)
      ORDER BY b.created_at DESC, b.id DESC LIMIT 200`,
    [trangThai || null, donHangId || null, vanHanhId || null],
  );
  return rows;
}

export async function taoMuaBoSung(client, d) {
  const { rows } = await client.query(
    'INSERT INTO mua_bo_sung (don_hang_id, loai_phat_sinh, ly_do, nguoi_tao_id) VALUES ($1, $2, $3, $4) RETURNING id',
    [d.donHangId, d.loai, d.lyDo, d.nguoiId],
  );
  const id = rows[0].id;
  for (const x of d.dong) {
    await client.query('INSERT INTO mua_bo_sung_dong (mua_bo_sung_id, vat_tu_id, so_luong) VALUES ($1, $2, $3)', [id, x.vat_tu_id, x.so_luong]);
  }
  for (const n of d.nguon) {
    await client.query('INSERT INTO mua_bo_sung_trach_nhiem (mua_bo_sung_id, nguon, so_tien) VALUES ($1, $2, 0)', [id, n]);
  }
  return id;
}

export async function khoaMuaBoSung(client, id) {
  const { rows } = await client.query('SELECT * FROM mua_bo_sung WHERE id = $1 FOR UPDATE', [id]);
  return rows[0] || null;
}

export async function dongMuaBoSung(client, id) {
  const { rows } = await client.query('SELECT * FROM mua_bo_sung_dong WHERE mua_bo_sung_id = $1 ORDER BY id', [id]);
  return rows;
}

export async function chotMuaBoSung(client, id, { nccId, gia, trachNhiem }) {
  for (const [dongId, donGia] of gia) await client.query('UPDATE mua_bo_sung_dong SET don_gia = $2 WHERE id = $1', [dongId, donGia]);
  await client.query('DELETE FROM mua_bo_sung_trach_nhiem WHERE mua_bo_sung_id = $1', [id]);
  for (const t of trachNhiem) {
    await client.query('INSERT INTO mua_bo_sung_trach_nhiem (mua_bo_sung_id, nguon, so_tien) VALUES ($1, $2, $3)', [id, t.nguon, t.so_tien]);
  }
  await client.query(`UPDATE mua_bo_sung SET trang_thai = 'da_mua', ncc_id = $2, ngay_mua = CURRENT_DATE WHERE id = $1`, [id, nccId]);
}

export async function huyMuaBoSung(id) {
  const { rowCount } = await query(`UPDATE mua_bo_sung SET trang_thai = 'huy' WHERE id = $1 AND trang_thai = 'cho_xu_ly'`, [id]);
  return rowCount > 0;
}

// De xuat chi (NCC) cua don - de hien bang tong theo NCC tren man chon NCC.
export async function deXuatChiCuaDon(donHangId) {
  const { rows } = await query(
    `SELECT c.id, c.loai_chi, c.ncc_id, c.gia_tri_hang, c.coc_da_tru, c.so_tien, c.trang_thai, c.ly_do_tu_choi, c.mua_bo_sung_id, c.created_at
       FROM de_xuat_chi c WHERE c.don_hang_id = $1 AND c.ncc_id IS NOT NULL ORDER BY c.id`,
    [donHangId],
  );
  return rows;
}
