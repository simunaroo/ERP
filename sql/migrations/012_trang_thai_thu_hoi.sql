-- De xuat chi: them trang thai "thu_hoi" (huy duyet khi chua chi tien) - lam theo luong ERP.
-- Tach file rieng: gia tri ENUM vua ADD chua dung duoc trong cung transaction (013 se dung).
ALTER TYPE trang_thai_de_xuat_chi_enum ADD VALUE IF NOT EXISTS 'thu_hoi';
