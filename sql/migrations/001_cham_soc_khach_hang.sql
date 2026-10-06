-- Them trang thai cham soc khach hang + lich su cham soc.
-- Chi THEM, khong xoa; chay lai nhieu lan van an toan (idempotent).

DO $$ BEGIN
  CREATE TYPE trang_thai_cham_soc_enum AS ENUM ('moi', 'dang_tu_van', 'da_bao_gia', 'chot', 'khong_mua');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE khach_hang
  ADD COLUMN IF NOT EXISTS trang_thai_cham_soc trang_thai_cham_soc_enum NOT NULL DEFAULT 'moi';

CREATE TABLE IF NOT EXISTS khach_hang_cham_soc (
    id              SERIAL PRIMARY KEY,
    khach_hang_id   INTEGER NOT NULL REFERENCES khach_hang(id) ON DELETE CASCADE,
    sale_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    trang_thai      trang_thai_cham_soc_enum NOT NULL,
    noi_dung        TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_kh_cham_soc_khach ON khach_hang_cham_soc(khach_hang_id);
CREATE INDEX IF NOT EXISTS idx_khach_hang_sale ON khach_hang(sale_phu_trach_id);

-- Khach da co don hang thi coi nhu da chot.
UPDATE khach_hang kh SET trang_thai_cham_soc = 'chot'
 WHERE trang_thai_cham_soc = 'moi'
   AND EXISTS (SELECT 1 FROM don_hang dh WHERE dh.khach_hang_id = kh.id);
