import { query } from '../../config/db.js';

export async function khachHang(saleId) {
  const { rows } = await query(
    `SELECT id, ten, sdt, dia_chi FROM khach_hang
      WHERE ($1::int IS NULL OR sale_phu_trach_id = $1)
      ORDER BY ten`,
    [saleId],
  );
  return rows;
}

export async function vatTu() {
  const { rows } = await query(
    `SELECT vt.id, vt.ten, vt.don_vi_tinh, vt.quy_cach, lvt.ten AS loai, lvt.nguon_goc
       FROM vat_tu vt JOIN loai_vat_tu lvt ON lvt.id = vt.loai_vat_tu_id
      ORDER BY lvt.id, vt.ten`,
  );
  return rows;
}
