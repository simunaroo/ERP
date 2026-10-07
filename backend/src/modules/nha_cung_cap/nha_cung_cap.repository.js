import { query } from '../../config/db.js';

export async function findAll({ tuKhoa, trangThai, vatTuId }) {
  const where = [];
  const params = [];
  const them = (sql, v) => { params.push(v); where.push(sql.replaceAll('?', `$${params.length}`)); };
  if (tuKhoa) them('(n.ten ILIKE ? OR n.ma_so_thue ILIKE ?)', `%${tuKhoa}%`);
  if (trangThai) them('n.trang_thai = ?', trangThai);
  if (vatTuId) {
    them(`EXISTS (SELECT 1 FROM ncc_bang_gia g WHERE g.ncc_id = n.id AND g.vat_tu_id = ?
                   AND g.ngay_hieu_luc <= CURRENT_DATE AND (g.ngay_het_hieu_luc IS NULL OR g.ngay_het_hieu_luc >= CURRENT_DATE))`, vatTuId);
  }
  const { rows } = await query(
    `SELECT n.id, n.ten, n.dia_chi, n.ma_so_thue, n.trang_thai,
            count(g.id)::int AS so_mat_hang, max(g.ngay_hieu_luc) AS cap_nhat_gia
       FROM nha_cung_cap n
       LEFT JOIN ncc_bang_gia g ON g.ncc_id = n.id
            AND g.ngay_hieu_luc <= CURRENT_DATE AND (g.ngay_het_hieu_luc IS NULL OR g.ngay_het_hieu_luc >= CURRENT_DATE)
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      GROUP BY n.id
      ORDER BY n.trang_thai, n.ten`,
    params,
  );
  return rows;
}

export async function findById(id) {
  const { rows } = await query('SELECT * FROM nha_cung_cap WHERE id = $1', [id]);
  return rows[0] || null;
}

export async function findStk(nccId) {
  const { rows } = await query('SELECT id, so_tk, ten_ngan_hang, chu_tk FROM ncc_stk WHERE ncc_id = $1 ORDER BY id', [nccId]);
  return rows;
}

// Toan bo lich su gia; trang_thai_gia: dang_ap_dung / sap_ap_dung / het_hieu_luc (so voi hom nay).
export async function findBangGia(nccId) {
  const { rows } = await query(
    `SELECT g.id, g.vat_tu_id, vt.ten AS vat_tu, vt.don_vi_tinh, vt.quy_cach, g.don_gia, g.ngay_hieu_luc, g.ngay_het_hieu_luc,
            CASE WHEN g.ngay_hieu_luc > CURRENT_DATE THEN 'sap_ap_dung'
                 WHEN g.ngay_het_hieu_luc IS NOT NULL AND g.ngay_het_hieu_luc < CURRENT_DATE THEN 'het_hieu_luc'
                 ELSE 'dang_ap_dung' END AS trang_thai_gia
       FROM ncc_bang_gia g JOIN vat_tu vt ON vt.id = g.vat_tu_id
      WHERE g.ncc_id = $1
      ORDER BY vt.ten, g.ngay_hieu_luc DESC`,
    [nccId],
  );
  return rows;
}

export async function create(data) {
  const { rows } = await query(
    'INSERT INTO nha_cung_cap (ten, dia_chi, ma_so_thue) VALUES ($1, $2, $3) RETURNING *',
    [data.ten, data.dia_chi, data.ma_so_thue],
  );
  return rows[0];
}

export async function update(id, data) {
  const { rows } = await query(
    'UPDATE nha_cung_cap SET ten = $2, dia_chi = $3, ma_so_thue = $4 WHERE id = $1 RETURNING *',
    [id, data.ten, data.dia_chi, data.ma_so_thue],
  );
  return rows[0] || null;
}

export async function datTrangThai(id, trangThai) {
  const { rows } = await query('UPDATE nha_cung_cap SET trang_thai = $2 WHERE id = $1 RETURNING *', [id, trangThai]);
  return rows[0] || null;
}

export async function themStk(nccId, data) {
  const { rows } = await query(
    'INSERT INTO ncc_stk (ncc_id, so_tk, ten_ngan_hang, chu_tk) VALUES ($1, $2, $3, $4) RETURNING id, so_tk, ten_ngan_hang, chu_tk',
    [nccId, data.so_tk, data.ten_ngan_hang, data.chu_tk],
  );
  return rows[0];
}

export async function xoaStk(nccId, stkId) {
  const { rowCount } = await query('DELETE FROM ncc_stk WHERE id = $1 AND ncc_id = $2', [stkId, nccId]);
  return rowCount > 0;
}

export async function vatTuMuaNgoai(vatTuId) {
  const { rows } = await query(
    `SELECT vt.id, vt.ten, vt.trang_thai, lvt.nguon_goc FROM vat_tu vt JOIN loai_vat_tu lvt ON lvt.id = vt.loai_vat_tu_id WHERE vt.id = $1`,
    [vatTuId],
  );
  return rows[0] || null;
}

// Gia "dang mo" (chua co ngay ket thuc) cua NCC cho vat tu. FOR UPDATE: khoa dong nay den het transaction,
// nguoi thu hai cap nhat cung luc phai doi -> khong co 2 gia cung mo.
export async function giaDangMo(client, nccId, vatTuId) {
  const { rows } = await client.query(
    `SELECT * FROM ncc_bang_gia WHERE ncc_id = $1 AND vat_tu_id = $2 AND ngay_het_hieu_luc IS NULL FOR UPDATE`,
    [nccId, vatTuId],
  );
  return rows[0] || null;
}

export async function dongGia(client, giaId, ngayHet) {
  await client.query('UPDATE ncc_bang_gia SET ngay_het_hieu_luc = $2 WHERE id = $1', [giaId, ngayHet]);
}

export async function themGia(client, { nccId, vatTuId, donGia, ngayHieuLuc }) {
  const { rows } = await client.query(
    `INSERT INTO ncc_bang_gia (ncc_id, vat_tu_id, don_gia, ngay_hieu_luc) VALUES ($1, $2, $3, $4) RETURNING *`,
    [nccId, vatTuId, donGia, ngayHieuLuc],
  );
  return rows[0];
}

// Gia hieu luc tai mot ngay cua moi vat tu mua ngoai, tu moi NCC dang hop tac (dung cho so sanh + Mua hang).
export async function giaTaiNgay(ngay) {
  const { rows } = await query(
    `SELECT vt.id AS vat_tu_id, vt.ten AS vat_tu, vt.don_vi_tinh, lvt.ten AS loai,
            n.id AS ncc_id, n.ten AS ncc, g.don_gia, g.ngay_hieu_luc
       FROM vat_tu vt
       JOIN loai_vat_tu lvt ON lvt.id = vt.loai_vat_tu_id AND lvt.nguon_goc = 'mua_ngoai'
       LEFT JOIN ncc_bang_gia g ON g.vat_tu_id = vt.id
            AND g.ngay_hieu_luc <= $1 AND (g.ngay_het_hieu_luc IS NULL OR g.ngay_het_hieu_luc >= $1)
            AND EXISTS (SELECT 1 FROM nha_cung_cap x WHERE x.id = g.ncc_id AND x.trang_thai = 'active')
       LEFT JOIN nha_cung_cap n ON n.id = g.ncc_id
      ORDER BY lvt.id, vt.ten, g.don_gia`,
    [ngay],
  );
  return rows;
}
