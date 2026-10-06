-- Module Nha cung cap & bang gia.
-- (1) Bang gia luu theo thoi gian (gia cu khong xoa, chi "dong" lai) -> CSDL tu chan 2 muc gia
--     cua cung NCC + vat tu co khoang hieu luc chong nhau, ke ca khi code co bug hoac 2 nguoi nhap cung luc.
-- (2) Ma so thue khong trung giua cac NCC.
-- Chay lai nhieu lan van an toan.

-- btree_gist cho phep dung toan tu "=" (so nguyen) chung voi "&&" (khoang ngay) trong rang buoc EXCLUDE.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Cho phep gia ap dung dung 1 ngay (het hieu luc = ngay hieu luc).
ALTER TABLE ncc_bang_gia DROP CONSTRAINT IF EXISTS ncc_bang_gia_check;
DO $$ BEGIN
  ALTER TABLE ncc_bang_gia ADD CONSTRAINT ck_bang_gia_khoang_ngay
    CHECK (ngay_het_hieu_luc IS NULL OR ngay_het_hieu_luc >= ngay_hieu_luc);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- '[]' = tinh ca 2 dau mut; ngay_het_hieu_luc NULL = con hieu luc vo thoi han.
DO $$ BEGIN
  ALTER TABLE ncc_bang_gia ADD CONSTRAINT ex_bang_gia_khong_chong
    EXCLUDE USING gist (
      ncc_id WITH =,
      vat_tu_id WITH =,
      daterange(ngay_hieu_luc, ngay_het_hieu_luc, '[]') WITH &&
    );
-- EXCLUDE tao kem mot index cung ten -> khi da ton tai, PG bao duplicate_table (42P07) chu khong phai duplicate_object.
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_ncc_ma_so_thue ON nha_cung_cap (ma_so_thue) WHERE ma_so_thue IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ncc_stk_ncc ON ncc_stk (ncc_id);
