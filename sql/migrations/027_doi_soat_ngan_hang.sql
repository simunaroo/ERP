-- Doi soat ngan hang tu dong: dich vu bao giao dich (SePay...) goi webhook moi khi tai khoan cong ty co tien vao/ra.
-- He thong doc noi dung chuyen khoan de khop: tien vao -> phieu thu khach (theo ma don); tien ra -> de xuat chi da duyet.
-- Khong khop duoc -> 'chua_khop' cho Ke toan xu ly tay. Moi giao dich chi xu ly 1 lan (UNIQUE nguon + ma giao dich).
CREATE TABLE giao_dich_ngan_hang (
    id                  SERIAL PRIMARY KEY,
    nguon               VARCHAR(10) NOT NULL CHECK (nguon IN ('sepay', 'gia_lap')),
    ma_gd_ngoai         VARCHAR(60) NOT NULL,
    ngan_hang           VARCHAR(40),
    so_tk               VARCHAR(30),
    loai                VARCHAR(3) NOT NULL CHECK (loai IN ('vao', 'ra')),
    so_tien             NUMERIC(14,2) NOT NULL CHECK (so_tien > 0),
    noi_dung            TEXT,
    ma_tham_chieu       VARCHAR(60),
    thoi_gian_gd        TIMESTAMPTZ NOT NULL,
    trang_thai          VARCHAR(12) NOT NULL DEFAULT 'chua_khop' CHECK (trang_thai IN ('da_khop', 'chua_khop', 'bo_qua')),
    cach_khop           VARCHAR(20) CHECK (cach_khop IN ('xac_nhan_phieu', 'tao_phieu', 'da_chi', 'thu_cong')),
    don_hang_id         INTEGER REFERENCES don_hang(id) ON DELETE SET NULL,
    thanh_toan_khach_id INTEGER REFERENCES thanh_toan_khach(id) ON DELETE SET NULL,
    de_xuat_chi_id      INTEGER REFERENCES de_xuat_chi(id) ON DELETE SET NULL,
    ghi_chu             TEXT,
    nguoi_xu_ly_id      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    du_lieu_goc         JSONB NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (nguon, ma_gd_ngoai),
    CONSTRAINT ck_gd_da_khop CHECK (trang_thai <> 'da_khop' OR cach_khop IS NOT NULL),
    CONSTRAINT ck_gd_bo_qua CHECK (trang_thai <> 'bo_qua' OR ghi_chu IS NOT NULL)
);
CREATE INDEX idx_gd_ngan_hang_trang_thai ON giao_dich_ngan_hang(trang_thai, thoi_gian_gd DESC);

-- Phieu thu tao/xac nhan tu sao ke ngan hang: giao dich ngan hang thay cho anh bill va nguoi xac nhan.
ALTER TABLE thanh_toan_khach ADD COLUMN giao_dich_id INTEGER REFERENCES giao_dich_ngan_hang(id) ON DELETE SET NULL;
ALTER TABLE thanh_toan_khach DROP CONSTRAINT ck_ttk_bill;
ALTER TABLE thanh_toan_khach ADD CONSTRAINT ck_ttk_bill CHECK (hinh_thuc <> 'chuyen_khoan' OR bill_anh IS NOT NULL OR giao_dich_id IS NOT NULL);
ALTER TABLE thanh_toan_khach DROP CONSTRAINT ck_ttk_xac_nhan;
ALTER TABLE thanh_toan_khach ADD CONSTRAINT ck_ttk_xac_nhan CHECK (trang_thai <> 'da_xac_nhan'
    OR (xac_nhan_luc IS NOT NULL AND (nguoi_xac_nhan_id IS NOT NULL OR giao_dich_id IS NOT NULL)));

CREATE TRIGGER tg_nhat_ky AFTER INSERT OR UPDATE OR DELETE ON giao_dich_ngan_hang FOR EACH ROW EXECUTE FUNCTION fn_ghi_nhat_ky();
