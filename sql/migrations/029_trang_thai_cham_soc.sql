-- Trang thai cham soc theo quy trinh goi so cua Sale: them khong nghe may / thue bao / hen goi lai / sai so;
-- doi ten: dang_tu_van -> quan_tam, khong_mua -> khong_quan_tam. PostgreSQL khong xoa/doi ten gia tri ENUM trong
-- mot buoc gon -> tao kieu moi, chuyen cot (USING anh xa gia tri cu), xoa kieu cu, doi ten kieu moi.
CREATE TYPE trang_thai_cham_soc_moi AS ENUM
    ('moi', 'khong_nghe_may', 'thue_bao', 'hen_goi_lai', 'quan_tam', 'da_bao_gia', 'chot', 'khong_quan_tam', 'sai_so');

ALTER TABLE khach_hang ALTER COLUMN trang_thai_cham_soc DROP DEFAULT;
ALTER TABLE khach_hang ALTER COLUMN trang_thai_cham_soc TYPE trang_thai_cham_soc_moi USING
    (CASE trang_thai_cham_soc::text WHEN 'dang_tu_van' THEN 'quan_tam' WHEN 'khong_mua' THEN 'khong_quan_tam'
     ELSE trang_thai_cham_soc::text END)::trang_thai_cham_soc_moi;
ALTER TABLE khach_hang ALTER COLUMN trang_thai_cham_soc SET DEFAULT 'moi';
ALTER TABLE khach_hang_cham_soc ALTER COLUMN trang_thai TYPE trang_thai_cham_soc_moi USING
    (CASE trang_thai::text WHEN 'dang_tu_van' THEN 'quan_tam' WHEN 'khong_mua' THEN 'khong_quan_tam'
     ELSE trang_thai::text END)::trang_thai_cham_soc_moi;

DROP TYPE trang_thai_cham_soc_enum;
ALTER TYPE trang_thai_cham_soc_moi RENAME TO trang_thai_cham_soc_enum;

-- Hen goi lai: luu thoi diem hen o lan cham soc va o khach (de "Viec can lam" nhac dung gio).
ALTER TABLE khach_hang ADD COLUMN hen_goi_lai_luc TIMESTAMPTZ;
ALTER TABLE khach_hang_cham_soc ADD COLUMN hen_goi_lai_luc TIMESTAMPTZ;
ALTER TABLE khach_hang_cham_soc ADD CONSTRAINT ck_cham_soc_hen_goi_lai
    CHECK (trang_thai <> 'hen_goi_lai' OR hen_goi_lai_luc IS NOT NULL);
CREATE INDEX idx_kh_hen_goi_lai ON khach_hang(sale_phu_trach_id, hen_goi_lai_luc) WHERE trang_thai_cham_soc = 'hen_goi_lai';
