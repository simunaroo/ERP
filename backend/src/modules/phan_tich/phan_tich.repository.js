import { query } from '../../config/db.js';

// Ky phan tich [tu, den] va ky truoc cung do dai [tuTruoc, denTruoc]; tinh theo ngay chot don.
// Don nhap/huy khong tinh.
export async function banChay({ tu, den, tuTruoc, denTruoc }) {
  const { rows } = await query(
    `WITH ban AS (
       SELECT dvt.vat_tu_id,
              sum(dvt.so_luong_can) FILTER (WHERE dh.ngay_chot BETWEEN $1 AND $2) AS so_luong,
              sum(dvt.so_luong_can * dvt.don_gia) FILTER (WHERE dh.ngay_chot BETWEEN $1 AND $2) AS doanh_thu,
              count(DISTINCT dh.id) FILTER (WHERE dh.ngay_chot BETWEEN $1 AND $2) AS so_don,
              sum(dvt.so_luong_can) FILTER (WHERE dh.ngay_chot BETWEEN $3 AND $4) AS so_luong_truoc,
              sum(dvt.so_luong_can * dvt.don_gia) FILTER (WHERE dh.ngay_chot BETWEEN $3 AND $4) AS doanh_thu_truoc
         FROM don_hang_vat_tu dvt
         JOIN don_hang dh ON dh.id = dvt.don_hang_id
        WHERE dh.trang_thai NOT IN ('nhap', 'huy') AND dh.ngay_chot BETWEEN $3 AND $2
        GROUP BY dvt.vat_tu_id
     )
     SELECT vt.id AS vat_tu_id, vt.ten, vt.don_vi_tinh, lvt.ten AS loai, lvt.nguon_goc,
            COALESCE(b.so_luong, 0) AS so_luong, COALESCE(b.doanh_thu, 0) AS doanh_thu, COALESCE(b.so_don, 0)::int AS so_don,
            COALESCE(b.so_luong_truoc, 0) AS so_luong_truoc, COALESCE(b.doanh_thu_truoc, 0) AS doanh_thu_truoc
       FROM ban b
       JOIN vat_tu vt ON vt.id = b.vat_tu_id
       JOIN loai_vat_tu lvt ON lvt.id = vt.loai_vat_tu_id
      ORDER BY doanh_thu DESC, vt.ten`,
    [tu, den, tuTruoc, denTruoc],
  );
  return rows;
}

export async function tongDon({ tu, den, tuTruoc, denTruoc }) {
  const { rows } = await query(
    `SELECT count(*) FILTER (WHERE dh.ngay_chot BETWEEN $1 AND $2)::int AS so_don,
            count(*) FILTER (WHERE dh.ngay_chot BETWEEN $3 AND $4)::int AS so_don_truoc
       FROM don_hang dh WHERE dh.trang_thai NOT IN ('nhap', 'huy')`,
    [tu, den, tuTruoc, denTruoc],
  );
  return rows[0];
}

// Gia thi truong cua tung vat tu mua ngoai tai ngay `den`: trung vi + re nhat (+ NCC re nhat).
export async function giaThiTruong(den) {
  const { rows } = await query(
    `WITH gia AS (
       SELECT g.ncc_id, n.ten AS ncc, g.vat_tu_id, g.don_gia
         FROM ncc_bang_gia g JOIN nha_cung_cap n ON n.id = g.ncc_id AND n.trang_thai = 'active'
        WHERE g.ngay_hieu_luc <= $1 AND (g.ngay_het_hieu_luc IS NULL OR g.ngay_het_hieu_luc >= $1)
     )
     SELECT vat_tu_id, percentile_cont(0.5) WITHIN GROUP (ORDER BY don_gia) AS trung_vi,
            min(don_gia) AS re_nhat, count(*)::int AS so_ncc,
            (array_agg(ncc ORDER BY don_gia, ncc_id))[1] AS ncc_re_nhat
       FROM gia GROUP BY vat_tu_id`,
    [den],
  );
  return rows;
}

// Moi NCC dang hop tac: chi so gia (gia / trung vi thi truong, 100 = ngang trung vi), so mat hang re nhat,
// doi gia trong ky (so lan, % trung binh) va tien da mua trong ky.
export async function giaNcc({ tu, den }) {
  const { rows } = await query(
    `WITH gia AS (
       SELECT g.ncc_id, g.vat_tu_id, g.don_gia
         FROM ncc_bang_gia g JOIN nha_cung_cap n ON n.id = g.ncc_id AND n.trang_thai = 'active'
        WHERE g.ngay_hieu_luc <= $2 AND (g.ngay_het_hieu_luc IS NULL OR g.ngay_het_hieu_luc >= $2)
     ), tv AS (
       SELECT vat_tu_id, percentile_cont(0.5) WITHIN GROUP (ORDER BY don_gia) AS trung_vi,
              min(don_gia) AS re_nhat, count(*) AS so_ncc
         FROM gia GROUP BY vat_tu_id
     ), doi AS (
       SELECT m.ncc_id, count(*)::int AS so_lan, avg((m.don_gia - c.don_gia) / c.don_gia * 100) AS tb_pct
         FROM ncc_bang_gia m
         JOIN ncc_bang_gia c ON c.ncc_id = m.ncc_id AND c.vat_tu_id = m.vat_tu_id AND c.ngay_het_hieu_luc = m.ngay_hieu_luc - 1
        WHERE m.ngay_hieu_luc BETWEEN $1 AND $2
        GROUP BY m.ncc_id
     ), mua AS (
       -- Tien hang da mua = de xuat quyet toan / chi bo sung DA DUYET trong ky (giong cach ERP ghi nhan tien hang).
       SELECT c.ncc_id, sum(c.gia_tri_hang) AS tien, count(*)::int AS so_lan
         FROM de_xuat_chi c
        WHERE c.loai_chi IN ('quyet_toan', 'chi_bo_sung') AND c.trang_thai IN ('da_duyet', 'da_thanh_toan')
          AND c.created_at >= $1::date AND c.created_at < $2::date + 1
        GROUP BY c.ncc_id
     )
     SELECT n.id AS ncc_id, n.ten AS ncc, count(*)::int AS so_mat_hang,
            round(avg(g.don_gia / tv.trung_vi) * 100)::int AS chi_so_gia,
            count(*) FILTER (WHERE g.don_gia = tv.re_nhat AND tv.so_ncc > 1)::int AS so_mat_hang_re_nhat,
            COALESCE(doi.so_lan, 0) AS so_lan_doi_gia, round(doi.tb_pct, 1) AS doi_gia_tb_pct,
            COALESCE(mua.tien, 0) AS tien_mua, COALESCE(mua.so_lan, 0) AS so_lan_mua
       FROM gia g
       JOIN nha_cung_cap n ON n.id = g.ncc_id
       JOIN tv ON tv.vat_tu_id = g.vat_tu_id
       LEFT JOIN doi ON doi.ncc_id = n.id
       LEFT JOIN mua ON mua.ncc_id = n.id
      GROUP BY n.id, n.ten, doi.so_lan, doi.tb_pct, mua.tien, mua.so_lan
      ORDER BY chi_so_gia, n.ten`,
    [tu, den],
  );
  return rows;
}
