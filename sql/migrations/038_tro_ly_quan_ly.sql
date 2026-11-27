-- Tro ly AI cho quan ly: hoi dap tu do ve tinh hinh cham soc khach hang cua cac Sale, dua tren du lieu that.
-- Gemini tu chon "cong cu" (function calling) de backend truy van CSDL roi moi tra loi -> con so do CSDL tinh.
-- Dung chung bang hoi thoai / tin nhan voi tro ly san pham: them cot loai, tro ly quan ly khong gan san pham.
SET LOCAL app.bo_qua_nhat_ky = '1';

ALTER TABLE tro_ly_hoi_thoai
    ADD COLUMN loai VARCHAR(10) NOT NULL DEFAULT 'san_pham' CHECK (loai IN ('san_pham', 'quan_ly'));
ALTER TABLE tro_ly_hoi_thoai ALTER COLUMN loai_vat_tu_id DROP NOT NULL;
ALTER TABLE tro_ly_hoi_thoai
    ADD CONSTRAINT ck_tro_ly_ht_loai CHECK ((loai = 'san_pham') = (loai_vat_tu_id IS NOT NULL));

INSERT INTO quyen (ma, ten, nhom, thu_tu, chi_admin) VALUES
  ('tro_ly.quan_ly', 'Hỏi trợ lý AI quản lý (tình hình chăm sóc khách của Sale)', 'Bán hàng', 17, false)
ON CONFLICT (ma) DO NOTHING;
INSERT INTO vai_tro_quyen (vai_tro, ma_quyen) VALUES ('admin', 'tro_ly.quan_ly')
ON CONFLICT DO NOTHING;
