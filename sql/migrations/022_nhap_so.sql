-- Nhap so (khach tiem nang) tu form hoac API tu dong; so duoc chia cho Sale theo ty le Admin cau hinh.
-- Mot so = mot khach hang trang thai 'moi' (khong tach bang lead rieng -> khong co buoc chuyen doi, khong trung du lieu).

ALTER TABLE khach_hang
    ADD COLUMN nguon         VARCHAR(30),
    ADD COLUMN nhu_cau       TEXT,
    ADD COLUMN nguoi_nhap_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN chia_luc      TIMESTAMPTZ;

-- Chong trung so khi nhap (kiem tra trong service, duoi advisory lock).
CREATE INDEX idx_kh_sdt ON khach_hang(sdt);

-- Ty le (%) chia so cho tung Sale. Bang rong = chia deu cho moi Sale dang hoat dong.
CREATE TABLE ty_le_chia_so (
    sale_id           INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    ty_le             SMALLINT NOT NULL CHECK (ty_le BETWEEN 0 AND 100),
    nguoi_cap_nhat_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    cap_nhat_luc      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Nhat ky nhap/chia so: dem so da chia trong thang de giu dung ty le, va thong ke hieu qua theo Sale/nguon.
CREATE TABLE chia_so_log (
    id             SERIAL PRIMARY KEY,
    khach_hang_id  INTEGER NOT NULL REFERENCES khach_hang(id) ON DELETE CASCADE,
    sale_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    kieu           VARCHAR(20) NOT NULL CHECK (kieu IN ('tu_dong', 'sale_tu_nhap')),
    kenh           VARCHAR(10) NOT NULL CHECK (kenh IN ('form', 'api')),
    nguoi_nhap_id  INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_chia_so_log_thoi_gian ON chia_so_log(created_at);
CREATE INDEX idx_chia_so_log_sale ON chia_so_log(sale_id, created_at);
