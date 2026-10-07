import { query } from '../../config/db.js';

export async function khachHang(saleId) {
  const { rows } = await query(
    `SELECT id, ten, sdt, dia_chi, nhom_khach_hang, trang_thai_cham_soc FROM khach_hang
      WHERE ($1::int IS NULL OR sale_phu_trach_id = $1)
      ORDER BY ten`,
    [saleId],
  );
  return rows;
}

export async function sale() {
  const { rows } = await query(`SELECT id, ho_ten FROM users WHERE vai_tro = 'sale' ORDER BY ho_ten`);
  return rows;
}

// Mac dinh chi vat tu dang kinh doanh (form tao don, AI, bang gia). tatCa = man quan ly danh muc.
export async function vatTu({ tatCa = false } = {}) {
  const { rows } = await query(
    `SELECT vt.id, vt.ten, vt.don_vi_tinh, vt.quy_cach, vt.trang_thai, vt.loai_vat_tu_id, lvt.ten AS loai, lvt.nguon_goc
            ${tatCa ? `, (SELECT count(DISTINCT don_hang_id) FROM don_hang_vat_tu x WHERE x.vat_tu_id = vt.id)::int AS so_don,
              (SELECT count(DISTINCT g.ncc_id) FROM ncc_bang_gia g WHERE g.vat_tu_id = vt.id
                 AND g.ngay_hieu_luc <= CURRENT_DATE AND (g.ngay_het_hieu_luc IS NULL OR g.ngay_het_hieu_luc >= CURRENT_DATE))::int AS so_ncc_bao_gia` : ''}
       FROM vat_tu vt JOIN loai_vat_tu lvt ON lvt.id = vt.loai_vat_tu_id
      WHERE $1 OR vt.trang_thai = 'active'
      ORDER BY vt.trang_thai, lvt.id, vt.ten`,
    [tatCa],
  );
  return rows;
}

export async function vanHanh() {
  const { rows } = await query(
    `SELECT u.id, u.ho_ten, (SELECT count(*) FROM don_hang d WHERE d.vanhanh_phu_trach_id = u.id AND d.trang_thai <> 'nhap'
              AND d.giai_doan NOT IN ('hoan_tat', 'huy'))::int AS so_don_dang_mo
       FROM users u WHERE u.vai_tro = 'van_hanh' AND u.trang_thai = 'active' ORDER BY u.ho_ten`,
  );
  return rows;
}

export async function loaiVatTu() {
  const { rows } = await query(
    `SELECT l.id, l.ten, l.nguon_goc, (SELECT count(*) FROM vat_tu v WHERE v.loai_vat_tu_id = l.id)::int AS so_vat_tu
       FROM loai_vat_tu l ORDER BY l.id`,
  );
  return rows;
}

export async function taoLoaiVatTu(ten, nguonGoc) {
  const { rows } = await query('INSERT INTO loai_vat_tu (ten, nguon_goc) VALUES ($1, $2) RETURNING *', [ten, nguonGoc]);
  return rows[0];
}

export async function findVatTu(id) {
  const { rows } = await query(
    `SELECT vt.*, (SELECT count(*) FROM don_hang_vat_tu x WHERE x.vat_tu_id = vt.id)::int AS so_dong_don
       FROM vat_tu vt WHERE vt.id = $1`,
    [id],
  );
  return rows[0] || null;
}

export async function luuVatTu(id, d) {
  const cot = [d.ten, d.loai_vat_tu_id, d.don_vi_tinh, d.quy_cach];
  const { rows } = id
    ? await query(`UPDATE vat_tu SET ten = $2, loai_vat_tu_id = $3, don_vi_tinh = $4, quy_cach = $5, trang_thai = $6 WHERE id = $1 RETURNING *`, [id, ...cot, d.trang_thai])
    : await query('INSERT INTO vat_tu (ten, loai_vat_tu_id, don_vi_tinh, quy_cach) VALUES ($1, $2, $3, $4) RETURNING *', cot);
  return rows[0];
}

// Cac vat tu da ngung kinh doanh trong danh sach id (de chan don/bao gia moi dung chung).
export async function vatTuDaNgung(ids) {
  if (!ids.length) return [];
  const { rows } = await query(`SELECT ten FROM vat_tu WHERE id = ANY($1) AND trang_thai <> 'active'`, [ids]);
  return rows.map((r) => r.ten);
}
