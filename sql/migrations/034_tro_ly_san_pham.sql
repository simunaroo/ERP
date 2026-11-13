-- Tro ly AI theo san pham: moi loai san pham (Cửa / Sàn / Tấm ốp...) la mot tro ly rieng voi ho so kien thuc rieng.
-- Gemini KHONG duoc "huan luyen" lai: moi cau hoi gui kem ho so kien thuc cua dung san pham do (context injection).
-- Bo use case "Lên đơn nhanh bằng AI": quyen tro_ly.ai doi nghia thanh "Hỏi trợ lý AI sản phẩm".
SET LOCAL app.bo_qua_nhat_ky = '1';

-- Ho so kien thuc cua tung tro ly (Admin soan / nap tu file). Co id rieng de trigger nhat ky ghi duoc ban_ghi.
CREATE TABLE tro_ly_san_pham (
    id                  SERIAL PRIMARY KEY,
    loai_vat_tu_id      INTEGER NOT NULL UNIQUE REFERENCES loai_vat_tu(id) ON DELETE CASCADE,
    kien_thuc           TEXT NOT NULL DEFAULT '',
    cap_nhat_luc        TIMESTAMPTZ NOT NULL DEFAULT now(),
    nguoi_cap_nhat_id   INTEGER REFERENCES users(id) ON DELETE SET NULL
);
CREATE TRIGGER tg_nhat_ky AFTER INSERT OR UPDATE OR DELETE ON tro_ly_san_pham FOR EACH ROW EXECUTE FUNCTION fn_ghi_nhat_ky();

-- Cuoc tro chuyen cua Sale voi mot tro ly (co the gan voi khach dang tu van).
CREATE TABLE tro_ly_hoi_thoai (
    id              SERIAL PRIMARY KEY,
    nguoi_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    loai_vat_tu_id  INTEGER NOT NULL REFERENCES loai_vat_tu(id) ON DELETE CASCADE,
    khach_hang_id   INTEGER REFERENCES khach_hang(id) ON DELETE SET NULL,
    tieu_de         TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    cap_nhat_luc    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tro_ly_hoi_thoai_nguoi ON tro_ly_hoi_thoai(nguoi_id, loai_vat_tu_id, cap_nhat_luc DESC);

-- Tin nhan: chi luu chu + so anh (khong luu anh: nhe CSDL, tranh luu anh khach ngoai y muon).
CREATE TABLE tro_ly_tin_nhan (
    id              BIGSERIAL PRIMARY KEY,
    hoi_thoai_id    INTEGER NOT NULL REFERENCES tro_ly_hoi_thoai(id) ON DELETE CASCADE,
    vai_tro         VARCHAR(5) NOT NULL CHECK (vai_tro IN ('user', 'model')),
    noi_dung        TEXT NOT NULL,
    so_anh          SMALLINT NOT NULL DEFAULT 0 CHECK (so_anh BETWEEN 0 AND 3),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tro_ly_tin_nhan_hoi_thoai ON tro_ly_tin_nhan(hoi_thoai_id, id);

-- Moi loai san pham hien co mot ho so (rong). Loai them sau: service tu tao ho so khi Admin luu lan dau.
INSERT INTO tro_ly_san_pham (loai_vat_tu_id) SELECT id FROM loai_vat_tu ON CONFLICT DO NOTHING;

UPDATE quyen SET ten = 'Hỏi trợ lý AI sản phẩm' WHERE ma = 'tro_ly.ai';
INSERT INTO quyen (ma, ten, nhom, thu_tu, chi_admin) VALUES
  ('tro_ly.kien_thuc', 'Soạn kiến thức cho trợ lý AI sản phẩm', 'Bán hàng', 16, false)
ON CONFLICT (ma) DO NOTHING;
INSERT INTO vai_tro_quyen (vai_tro, ma_quyen) VALUES ('admin', 'tro_ly.ai'), ('admin', 'tro_ly.kien_thuc')
ON CONFLICT DO NOTHING;
