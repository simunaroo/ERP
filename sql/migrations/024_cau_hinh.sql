-- Tham so nghiep vu Admin tu chinh, khong phai sua code (gia tri so; moi tham so 1 dong).
CREATE TABLE cau_hinh (
    khoa              VARCHAR(50) PRIMARY KEY,
    gia_tri           NUMERIC(14,2) NOT NULL,
    mo_ta             TEXT NOT NULL,
    don_vi            VARCHAR(20),
    toi_thieu         NUMERIC(14,2),
    toi_da            NUMERIC(14,2),
    nguoi_cap_nhat_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    cap_nhat_luc      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (toi_thieu IS NULL OR gia_tri >= toi_thieu),
    CHECK (toi_da IS NULL OR gia_tri <= toi_da)
);
INSERT INTO cau_hinh (khoa, gia_tri, mo_ta, don_vi, toi_thieu, toi_da) VALUES
  ('ty_le_gia_von_tu_sx', 60, 'Giá vốn ước tính của hàng tự sản xuất (cửa), tính trên giá bán — dùng cho báo cáo lãi/lỗ', '%', 0, 100);
