-- Form nhap don day du theo nghiep vu thuc te: hinh thuc don, nhom khach, dia chi 2 cap,
-- gia ban tung dong, tai chinh don hang. Chi THEM, chay lai nhieu lan van an toan.

DO $$ BEGIN
  CREATE TYPE hinh_thuc_don_enum AS ENUM ('hoan_thien', 'vat_tu');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE nhom_khach_hang_enum AS ENUM ('nha_dan', 'nha_thau', 'doi_tac', 'khac');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE khach_hang
  ADD COLUMN IF NOT EXISTS nhom_khach_hang nhom_khach_hang_enum NOT NULL DEFAULT 'nha_dan';

ALTER TABLE don_hang
  ADD COLUMN IF NOT EXISTS hinh_thuc hinh_thuc_don_enum NOT NULL DEFAULT 'hoan_thien',
  ADD COLUMN IF NOT EXISTS ma_hop_dong TEXT,
  ADD COLUMN IF NOT EXISTS ngay_chot DATE,
  ADD COLUMN IF NOT EXISTS ngay_yc_lap_dat DATE,
  ADD COLUMN IF NOT EXISTS tinh_thanh TEXT,
  ADD COLUMN IF NOT EXISTS phuong_xa TEXT,
  ADD COLUMN IF NOT EXISTS phi_van_chuyen NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (phi_van_chuyen >= 0),
  ADD COLUMN IF NOT EXISTS phu_thu NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (phu_thu >= 0),
  ADD COLUMN IF NOT EXISTS chiet_khau_pct NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (chiet_khau_pct BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS tien_coc NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (tien_coc >= 0),
  ADD COLUMN IF NOT EXISTS ngay_coc DATE,
  ADD COLUMN IF NOT EXISTS ty_le_tam_ung SMALLINT NOT NULL DEFAULT 80 CHECK (ty_le_tam_ung BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS dieu_khoan_nghiem_thu TEXT,
  ADD COLUMN IF NOT EXISTS ghi_chu_van_chuyen TEXT;

ALTER TABLE don_hang_vat_tu
  ADD COLUMN IF NOT EXISTS don_gia NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (don_gia >= 0),
  ADD COLUMN IF NOT EXISTS ghi_chu TEXT;

-- Dien du lieu cu: don da qua buoc chot thi co ngay chot; tinh/thanh lay tu doan cuoi dia chi.
UPDATE don_hang SET ngay_chot = created_at::date WHERE ngay_chot IS NULL AND trang_thai <> 'nhap';
UPDATE don_hang SET tinh_thanh = CASE
    WHEN dia_chi_cong_trinh ILIKE '%TP.HCM%' OR dia_chi_cong_trinh ILIKE '%Bình Dương%' OR dia_chi_cong_trinh ILIKE '%Thủ Đức%' THEN 'TP. Hồ Chí Minh'
    WHEN dia_chi_cong_trinh ILIKE '%Hà Nội%' THEN 'Hà Nội'
    WHEN dia_chi_cong_trinh ILIKE '%Đồng Nai%' THEN 'Đồng Nai'
    WHEN dia_chi_cong_trinh ILIKE '%Hưng Yên%' THEN 'Hưng Yên'
  END
 WHERE tinh_thanh IS NULL;

-- Gia ban uoc tinh cho dong vat tu cu chua co gia: hang mua ngoai = gia NCC trung binh x 1,35; cua tu san xuat = gia co dinh.
UPDATE don_hang_vat_tu dvt SET don_gia = COALESCE(
    (SELECT round(avg(bg.don_gia) * 1.35, -3) FROM ncc_bang_gia bg WHERE bg.vat_tu_id = dvt.vat_tu_id),
    CASE WHEN vt.loai_vat_tu_id = 1 THEN 4500000 ELSE 250000 END)
  FROM vat_tu vt
 WHERE vt.id = dvt.vat_tu_id AND dvt.don_gia = 0;
