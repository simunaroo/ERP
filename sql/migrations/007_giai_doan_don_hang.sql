-- Tien do don hang (may trang thai):
--   Chot don -> Len phuong an -> Boc khoi luong* -> Mua hang -> Giao hang -> Thi cong* -> Nghiem thu* -> Quyet toan -> Hoan tat
--   (* chi don Hoan thien). Huy duoc truoc khi giao hang.
-- Chay lai nhieu lan van an toan.

DO $$ BEGIN
  CREATE TYPE giai_doan_don_enum AS ENUM (
    'len_phuong_an', 'boc_khoi_luong', 'mua_hang', 'giao_hang', 'thi_cong', 'nghiem_thu', 'quyet_toan', 'hoan_tat', 'huy');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE don_hang ADD COLUMN IF NOT EXISTS giai_doan giai_doan_don_enum;

-- Lich su chuyen giai doan: ai chuyen, luc nao, ly do (tu_giai_doan NULL = luc chot don).
CREATE TABLE IF NOT EXISTS don_hang_giai_doan_log (
    id              SERIAL PRIMARY KEY,
    don_hang_id     INTEGER NOT NULL REFERENCES don_hang(id) ON DELETE CASCADE,
    tu_giai_doan    giai_doan_don_enum,
    den_giai_doan   giai_doan_don_enum NOT NULL,
    nguoi_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    ghi_chu         TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_giai_doan_log_don ON don_hang_giai_doan_log(don_hang_id);

-- Suy ra giai doan cho don cu tu du lieu that: dang thi cong / con de xuat mua chua giao...
UPDATE don_hang dh SET giai_doan = CASE
    WHEN dh.trang_thai = 'moi' THEN 'len_phuong_an'
    WHEN dh.trang_thai = 'hoan_tat' THEN 'hoan_tat'
    WHEN dh.trang_thai = 'huy' THEN 'huy'
    WHEN dh.hinh_thuc = 'hoan_thien' AND EXISTS (
      SELECT 1 FROM thi_cong tc WHERE tc.don_hang_id = dh.id AND tc.trang_thai = 'dang_thi_cong') THEN 'thi_cong'
    WHEN EXISTS (
      SELECT 1 FROM de_xuat_mua_hang m WHERE m.don_hang_id = dh.id AND m.trang_thai <> 'da_giao') THEN 'mua_hang'
    ELSE 'giao_hang'
  END::giai_doan_don_enum
 WHERE dh.trang_thai <> 'nhap' AND dh.giai_doan IS NULL;

-- Rang buoc o muc CSDL: don nhap chua co giai doan, don da chot bat buoc co;
-- don Vat tu khong bao gio o buoc chi danh cho Hoan thien.
DO $$ BEGIN
  ALTER TABLE don_hang ADD CONSTRAINT ck_don_hang_giai_doan
    CHECK ((trang_thai = 'nhap') = (giai_doan IS NULL));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE don_hang ADD CONSTRAINT ck_don_hang_giai_doan_vat_tu
    CHECK (hinh_thuc = 'hoan_thien' OR giai_doan IS NULL OR giai_doan NOT IN ('boc_khoi_luong', 'thi_cong', 'nghiem_thu'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
