-- Dong bo DB da chay migration voi sql/schema.sql (phat hien khi so sanh pg_dump --schema-only 2 ben).
-- Khong doi du lieu. Chay lai nhieu lan van an toan.

-- Don moi mac dinh la nhap (code luon ghi trang_thai, day chi la gia tri du phong cho khop schema.sql).
ALTER TABLE don_hang ALTER COLUMN trang_thai SET DEFAULT 'nhap';

-- ENUM con sot tu cac bang cu da bo o migration 013 (de_xuat_mua_hang, nghiem_thu) - khong con cot nao dung.
DROP TYPE IF EXISTS trang_thai_mua_hang_enum;
DROP TYPE IF EXISTS ket_qua_nghiem_thu_enum;
