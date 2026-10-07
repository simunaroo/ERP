-- Module Thi cong & nghiem thu.
--   lap_lich -> dang_thi_cong (ngay_thuc_hien) -> bao hoan thanh (ngay_hoan_thanh) -> nghiem thu dat -> da_nghiem_thu
--   Nghiem thu khong dat: quay ve dang_thi_cong (xoa ngay_hoan_thanh) de sua.
-- Chay lai nhieu lan van an toan.

DO $$ BEGIN
  CREATE TYPE ket_qua_nghiem_thu_enum AS ENUM ('dat', 'dat_co_chinh_sua', 'khong_dat');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE thi_cong
  ADD COLUMN IF NOT EXISTS ngay_hoan_thanh DATE,
  ADD COLUMN IF NOT EXISTS ghi_chu TEXT;

ALTER TABLE nghiem_thu
  ADD COLUMN IF NOT EXISTS khoi_luong_thuc_te NUMERIC(12,2) CHECK (khoi_luong_thuc_te > 0),
  ADD COLUMN IF NOT EXISTS nguoi_nghiem_thu_id INTEGER REFERENCES users(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- ket_qua: chu tu do -> ENUM (anh xa du lieu cu).
DO $$ BEGIN
  IF (SELECT data_type FROM information_schema.columns WHERE table_name = 'nghiem_thu' AND column_name = 'ket_qua') = 'text' THEN
    ALTER TABLE nghiem_thu ALTER COLUMN ket_qua TYPE ket_qua_nghiem_thu_enum USING (
      CASE WHEN ket_qua ILIKE '%không đạt%' THEN 'khong_dat'
           WHEN ket_qua ILIKE '%chỉnh sửa%' THEN 'dat_co_chinh_sua'
           ELSE 'dat' END)::ket_qua_nghiem_thu_enum;
  END IF;
END $$;

-- Du lieu cu: dot da nghiem thu / don dang o buoc Nghiem thu thi coi nhu da bao hoan thanh.
UPDATE thi_cong SET ngay_hoan_thanh = COALESCE(ngay_thuc_hien, ngay_du_kien)
 WHERE ngay_hoan_thanh IS NULL AND trang_thai = 'da_nghiem_thu';
UPDATE thi_cong tc SET ngay_hoan_thanh = COALESCE(tc.ngay_thuc_hien, tc.ngay_du_kien)
  FROM don_hang dh
 WHERE dh.id = tc.don_hang_id AND dh.giai_doan = 'nghiem_thu' AND tc.trang_thai = 'dang_thi_cong' AND tc.ngay_hoan_thanh IS NULL;

-- Moi don chi co toi da 1 dot thi cong "dang mo" (unique index mot phan).
CREATE UNIQUE INDEX IF NOT EXISTS ux_thi_cong_dang_mo ON thi_cong (don_hang_id) WHERE trang_thai <> 'da_nghiem_thu';
CREATE INDEX IF NOT EXISTS idx_thi_cong_lich ON thi_cong (doi_tho_id, ngay_du_kien);
CREATE INDEX IF NOT EXISTS idx_nghiem_thu_tc ON nghiem_thu (thi_cong_id);

-- Moc thoi gian khop trang thai.
DO $$ BEGIN
  ALTER TABLE thi_cong ADD CONSTRAINT ck_thi_cong_moc CHECK (
    (trang_thai = 'lap_lich' AND ngay_thuc_hien IS NULL AND ngay_hoan_thanh IS NULL)
    OR (trang_thai = 'dang_thi_cong' AND ngay_thuc_hien IS NOT NULL)
    OR (trang_thai = 'da_nghiem_thu' AND ngay_hoan_thanh IS NOT NULL));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
