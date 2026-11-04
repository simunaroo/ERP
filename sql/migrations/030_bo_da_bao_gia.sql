-- Bo trang thai cham soc "Da bao gia" (gop vao "Quan tam": bao gia la mot buoc tu van, ghi o noi dung lan cham soc).
-- ENUM khong xoa duoc gia tri -> tao kieu moi, chuyen cot, xoa kieu cu, doi ten (giong migration 029).
CREATE TYPE trang_thai_cham_soc_moi AS ENUM
    ('moi', 'khong_nghe_may', 'thue_bao', 'hen_goi_lai', 'quan_tam', 'chot', 'khong_quan_tam', 'sai_so');

ALTER TABLE khach_hang_cham_soc DROP CONSTRAINT ck_cham_soc_hen_goi_lai;
DROP INDEX idx_kh_hen_goi_lai;
ALTER TABLE khach_hang ALTER COLUMN trang_thai_cham_soc DROP DEFAULT;
ALTER TABLE khach_hang ALTER COLUMN trang_thai_cham_soc TYPE trang_thai_cham_soc_moi USING
    (CASE trang_thai_cham_soc::text WHEN 'da_bao_gia' THEN 'quan_tam' ELSE trang_thai_cham_soc::text END)::trang_thai_cham_soc_moi;
ALTER TABLE khach_hang ALTER COLUMN trang_thai_cham_soc SET DEFAULT 'moi';
ALTER TABLE khach_hang_cham_soc ALTER COLUMN trang_thai TYPE trang_thai_cham_soc_moi USING
    (CASE trang_thai::text WHEN 'da_bao_gia' THEN 'quan_tam' ELSE trang_thai::text END)::trang_thai_cham_soc_moi;
DROP TYPE trang_thai_cham_soc_enum;
ALTER TYPE trang_thai_cham_soc_moi RENAME TO trang_thai_cham_soc_enum;

ALTER TABLE khach_hang_cham_soc ADD CONSTRAINT ck_cham_soc_hen_goi_lai
    CHECK (trang_thai <> 'hen_goi_lai' OR hen_goi_lai_luc IS NOT NULL);
CREATE INDEX idx_kh_hen_goi_lai ON khach_hang(sale_phu_trach_id, hen_goi_lai_luc) WHERE trang_thai_cham_soc = 'hen_goi_lai';
