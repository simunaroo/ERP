-- Tro ly AI nha cung cap: hoi dap ve gia nhap, chon NCC cho vat tu, lich su gia, cong no NCC (function calling).
-- Bi mat kinh doanh khong gui ra AI: ten NCC -> ma NCC-<id>, so tien -> ma [[Tn]]; code doi lai sau khi AI tra loi.
-- noi_dung_ai: ban da an danh cua tin nhan (gui lai lam lich su cho AI); noi_dung: ban nguoi dung xem (ten, so tien that).
SET LOCAL app.bo_qua_nhat_ky = '1';

ALTER TABLE tro_ly_hoi_thoai DROP CONSTRAINT tro_ly_hoi_thoai_loai_check;
ALTER TABLE tro_ly_hoi_thoai ADD CONSTRAINT tro_ly_hoi_thoai_loai_check CHECK (loai IN ('san_pham', 'quan_ly', 'ncc'));
ALTER TABLE tro_ly_tin_nhan ADD COLUMN noi_dung_ai TEXT;
-- ma_tien: gia tri cac ma [[Tn]] co trong cau tra loi (de luot hoi sau AI nhac lai ma cu van doi dung so).
ALTER TABLE tro_ly_tin_nhan ADD COLUMN ma_tien JSONB;

INSERT INTO quyen (ma, ten, nhom, thu_tu, chi_admin) VALUES
  ('tro_ly.ncc', 'Hỏi trợ lý AI nhà cung cấp (giá nhập, chọn NCC, công nợ NCC)', 'Danh mục & báo cáo', 44, false)
ON CONFLICT (ma) DO NOTHING;
INSERT INTO vai_tro_quyen (vai_tro, ma_quyen) VALUES ('admin', 'tro_ly.ncc')
ON CONFLICT DO NOTHING;
