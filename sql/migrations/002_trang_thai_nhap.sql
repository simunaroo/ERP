-- Tach rieng: gia tri ENUM moi khong duoc dung trong cung transaction da them no.
ALTER TYPE trang_thai_don_hang_enum ADD VALUE IF NOT EXISTS 'nhap' BEFORE 'moi';
