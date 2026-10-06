-- (1) Dieu khoan nghiem thu: tu o chu tu do -> 3 lua chon co dinh nhu form thuc te.
-- (2) Dong vat tu: loai thi cong + kich thuoc dai x rong (mm).
-- (3) Link bao gia gui khach: ma ngau nhien, khong doan duoc (khac id so tang dan).
-- Chay lai nhieu lan van an toan.

DO $$ BEGIN
  CREATE TYPE dieu_khoan_nghiem_thu_enum AS ENUM ('vat_tu_tieu_hao', 'so_m2_thi_cong', 'theo_hop_dong');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE loai_thi_cong_enum AS ENUM ('op_tran_phang', 'op_tran_giat_cap', 'op_tuong_khong_xuong', 'op_tuong_co_xuong', 'khac');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  IF (SELECT data_type FROM information_schema.columns
       WHERE table_name = 'don_hang' AND column_name = 'dieu_khoan_nghiem_thu') = 'text' THEN
    ALTER TABLE don_hang ALTER COLUMN dieu_khoan_nghiem_thu TYPE dieu_khoan_nghiem_thu_enum USING (
      CASE
        WHEN dieu_khoan_nghiem_thu IS NULL AND hinh_thuc = 'vat_tu' THEN 'vat_tu_tieu_hao'
        WHEN dieu_khoan_nghiem_thu IS NULL THEN NULL
        WHEN dieu_khoan_nghiem_thu ILIKE '%hợp đồng%' THEN 'theo_hop_dong'
        WHEN dieu_khoan_nghiem_thu ILIKE '%tiêu hao%' THEN 'vat_tu_tieu_hao'
        ELSE 'so_m2_thi_cong'
      END)::dieu_khoan_nghiem_thu_enum;
  END IF;
END $$;

ALTER TABLE don_hang_vat_tu
  ADD COLUMN IF NOT EXISTS loai_thi_cong loai_thi_cong_enum,
  ADD COLUMN IF NOT EXISTS dai_mm INTEGER CHECK (dai_mm > 0),
  ADD COLUMN IF NOT EXISTS rong_mm INTEGER CHECK (rong_mm > 0);

ALTER TABLE don_hang
  ADD COLUMN IF NOT EXISTS bao_gia_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS bao_gia_tao_luc TIMESTAMPTZ;
