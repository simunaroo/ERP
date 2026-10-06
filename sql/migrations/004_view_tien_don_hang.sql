-- Nguon tinh tien DUY NHAT cho don hang: khong luu cung tong don, tinh lai tu dong vat tu + phi.
CREATE OR REPLACE VIEW v_don_hang_tien AS
SELECT dh.id AS don_hang_id,
       t.tong_vat_tu,
       round(t.tong_vat_tu * dh.chiet_khau_pct / 100) AS tien_chiet_khau,
       round(t.tong_vat_tu * (1 - dh.chiet_khau_pct / 100)) + dh.phi_van_chuyen + dh.phu_thu AS tong_don,
       round(t.tong_vat_tu * (1 - dh.chiet_khau_pct / 100)) + dh.phi_van_chuyen + dh.phu_thu - dh.tien_coc AS con_phai_thu
  FROM don_hang dh
  CROSS JOIN LATERAL (
    SELECT COALESCE(sum(dvt.so_luong_can * dvt.don_gia), 0) AS tong_vat_tu
      FROM don_hang_vat_tu dvt WHERE dvt.don_hang_id = dh.id
  ) t;
