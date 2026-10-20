-- Admin chon Sale nhan khi nhap so (khong qua ty le) va chuyen so/khach sang Sale khac.
-- Ca hai ghi vao chia_so_log; chi kieu 'tu_dong' duoc tinh vao ty le chia.
ALTER TABLE chia_so_log DROP CONSTRAINT chia_so_log_kieu_check;
ALTER TABLE chia_so_log ADD CONSTRAINT chia_so_log_kieu_check CHECK (kieu IN ('tu_dong', 'sale_tu_nhap', 'admin_chon', 'chuyen'));
ALTER TABLE chia_so_log
    ADD COLUMN tu_sale_id INTEGER REFERENCES users(id) ON DELETE RESTRICT,
    ADD COLUMN ly_do      TEXT;
-- Chuyen phai biet chuyen tu ai va vi sao.
ALTER TABLE chia_so_log ADD CONSTRAINT chia_so_log_chuyen_check
    CHECK (kieu <> 'chuyen' OR (tu_sale_id IS NOT NULL AND ly_do IS NOT NULL));
CREATE INDEX idx_chia_so_log_khach ON chia_so_log(khach_hang_id);
