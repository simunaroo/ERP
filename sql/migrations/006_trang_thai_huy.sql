-- Them trang thai 'huy' cho don hang.
-- Tach file rieng: gia tri ENUM vua ADD chua dung duoc trong cung transaction (007 se dung no).
ALTER TYPE trang_thai_don_hang_enum ADD VALUE IF NOT EXISTS 'huy';
