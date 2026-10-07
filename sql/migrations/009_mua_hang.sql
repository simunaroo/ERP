-- Module Mua hang: ghi lai MOC thoi gian cua tung trang thai (dat hang, nhan hang).
-- Ngay nhan hang = ngay phat sinh cong no voi NCC (module Cong no tinh tuoi no tu day).
-- Chay lai nhieu lan van an toan.
ALTER TABLE de_xuat_mua_hang
  ADD COLUMN IF NOT EXISTS ngay_dat_hang  DATE,
  ADD COLUMN IF NOT EXISTS ngay_nhan_hang DATE,
  ADD COLUMN IF NOT EXISTS ghi_chu        TEXT;

UPDATE de_xuat_mua_hang SET ngay_dat_hang = created_at::date
 WHERE trang_thai IN ('da_dat', 'da_giao') AND ngay_dat_hang IS NULL;
UPDATE de_xuat_mua_hang SET ngay_nhan_hang = created_at::date + 2
 WHERE trang_thai = 'da_giao' AND ngay_nhan_hang IS NULL;

-- Moc thoi gian phai khop trang thai (CSDL tu bao ve, khong chi dua vao code).
DO $$ BEGIN
  ALTER TABLE de_xuat_mua_hang ADD CONSTRAINT ck_dxm_moc_thoi_gian CHECK (
    (trang_thai = 'cho_duyet' AND ngay_dat_hang IS NULL AND ngay_nhan_hang IS NULL)
    OR (trang_thai = 'da_dat' AND ngay_dat_hang IS NOT NULL AND ngay_nhan_hang IS NULL)
    OR (trang_thai = 'da_giao' AND ngay_dat_hang IS NOT NULL AND ngay_nhan_hang IS NOT NULL));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_dxm_ct_dxm ON de_xuat_mua_hang_ct (de_xuat_mua_hang_id);
