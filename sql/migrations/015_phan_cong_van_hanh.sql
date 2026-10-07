-- Moi don da chot co 1 Van hanh phu trach (tu dong phan cho nguoi it viec nhat luc chot; Admin doi duoc).
-- Chi nguoi phu trach + Admin thao tac tren don. Lich su phan cong luu rieng.
-- Chay lai nhieu lan van an toan.

CREATE TABLE IF NOT EXISTS don_hang_phan_cong_log (
    id              SERIAL PRIMARY KEY,
    don_hang_id     INTEGER NOT NULL REFERENCES don_hang(id) ON DELETE CASCADE,
    tu_van_hanh_id  INTEGER REFERENCES users(id) ON DELETE RESTRICT,   -- NULL = phan lan dau
    den_van_hanh_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    nguoi_id        INTEGER REFERENCES users(id) ON DELETE RESTRICT,   -- NULL = he thong tu phan
    ly_do           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_phan_cong_don ON don_hang_phan_cong_log (don_hang_id);
CREATE INDEX IF NOT EXISTS idx_don_hang_van_hanh ON don_hang (vanhanh_phu_trach_id);

-- Du lieu cu: don da chot chua co nguoi phu trach -> chia quay vong cho cac Van hanh dang hoat dong.
WITH vh AS (
  SELECT id, row_number() OVER (ORDER BY id) - 1 AS stt, count(*) OVER () AS tong
    FROM users WHERE vai_tro = 'van_hanh' AND trang_thai = 'active'
), don AS (
  SELECT id, row_number() OVER (ORDER BY id) - 1 AS stt FROM don_hang
   WHERE trang_thai <> 'nhap' AND vanhanh_phu_trach_id IS NULL
)
UPDATE don_hang dh SET vanhanh_phu_trach_id = vh.id
  FROM don, vh
 WHERE dh.id = don.id AND vh.stt = don.stt % vh.tong;
