-- Du lieu mau GIA LAP cho demo (khong phai du lieu that). Mat khau moi tai khoan: 123456

INSERT INTO users (ho_ten, username, password_hash, vai_tro) VALUES
  ('Quản trị viên',   'admin',    '$2b$10$UEwUsyxonOHE/Xnxy56azuGbw42mqhooshMQqO6DKEGi/cIFQu1W6', 'admin'),
  ('Đỗ Thu Hà',       'sale1',    '$2b$10$UEwUsyxonOHE/Xnxy56azuGbw42mqhooshMQqO6DKEGi/cIFQu1W6', 'sale'),
  ('Hoàng Gia Huy',   'sale2',    '$2b$10$UEwUsyxonOHE/Xnxy56azuGbw42mqhooshMQqO6DKEGi/cIFQu1W6', 'sale'),
  ('Bùi Văn Quân',    'vanhanh1', '$2b$10$UEwUsyxonOHE/Xnxy56azuGbw42mqhooshMQqO6DKEGi/cIFQu1W6', 'van_hanh'),
  ('Ngô Thanh Hương', 'ketoan1',  '$2b$10$UEwUsyxonOHE/Xnxy56azuGbw42mqhooshMQqO6DKEGi/cIFQu1W6', 'ke_toan');

INSERT INTO khach_hang (ten, sdt, dia_chi, sale_phu_trach_id) VALUES
  ('Nguyễn Văn Hùng', '0901000001', 'Căn hộ B2-1205, Quận 7, TP.HCM', 2),
  ('Trần Thị Mai',    '0901000002', 'Ngõ 45 Trần Thái Tông, Cầu Giấy, Hà Nội', 2),
  ('Lê Quốc Bảo',     '0901000003', 'Khu đô thị Sala, TP. Thủ Đức', 3),
  ('Phạm Minh Tuấn',  '0901000004', 'Văn Quán, Hà Đông, Hà Nội', 3);

INSERT INTO loai_vat_tu (ten, nguon_goc) VALUES
  ('Cửa',    'tu_san_xuat'),
  ('Sàn',    'mua_ngoai'),
  ('Tấm ốp', 'mua_ngoai');

INSERT INTO vat_tu (ten, loai_vat_tu_id, don_vi_tinh, quy_cach) VALUES
  ('Cửa nhôm Xingfa 2 cánh', 1, 'bộ', '1200x2200'),
  ('Cửa gỗ công nghiệp',     1, 'bộ', '900x2200'),
  ('Sàn SPC vân gỗ 4mm',     2, 'm2', '1220x180'),
  ('Sàn SPC vân đá 5mm',     2, 'm2', '600x600'),
  ('Tấm ốp nano 8mm',        3, 'm2', '400x3000'),
  ('Tấm ốp PVC vân đá',      3, 'm2', '1220x2440');

INSERT INTO nha_cung_cap (ten, dia_chi, ma_so_thue) VALUES
  ('Công ty Sàn Việt Phát (giả lập)',  'KCN Tân Bình, TP.HCM', '0300000001'),
  ('Tấm ốp Nano Hoàng Gia (giả lập)',  'KCN Quang Minh, Hà Nội', '0100000002'),
  ('Vật liệu Minh Khang (giả lập)',    'Biên Hoà, Đồng Nai', '3600000003');

INSERT INTO ncc_stk (ncc_id, so_tk, ten_ngan_hang, chu_tk) VALUES
  (1, '0000111122', 'Vietcombank', 'CONG TY SAN VIET PHAT'),
  (2, '0000333344', 'Techcombank', 'CONG TY NANO HOANG GIA'),
  (3, '0000555566', 'BIDV',        'CONG TY MINH KHANG');

-- Gia cu (het hieu luc) + gia moi dang ap dung, de minh hoa luu vet gia theo thoi diem
INSERT INTO ncc_bang_gia (ncc_id, vat_tu_id, don_gia, ngay_hieu_luc, ngay_het_hieu_luc) VALUES
  (1, 3, 175000, '2026-06-01', '2026-08-31'),
  (1, 3, 185000, '2026-09-01', NULL),
  (1, 4, 235000, '2026-09-01', NULL),
  (3, 3, 180000, '2026-09-01', NULL),
  (2, 5, 165000, '2026-08-15', NULL),
  (2, 6, 210000, '2026-08-15', NULL),
  (3, 5, 170000, '2026-09-01', NULL);

INSERT INTO doi_tho (ten, sdt, nang_luc) VALUES
  ('Đội anh Thắng', '0903000001', 'Sàn SPC, sàn gỗ'),
  ('Đội anh Phong', '0903000002', 'Tấm ốp, trần'),
  ('Đội anh Khải',  '0903000003', 'Cửa nhôm, cửa gỗ');

INSERT INTO don_hang (ma_don, khach_hang_id, sale_id, vanhanh_phu_trach_id, trang_thai, dia_chi_cong_trinh, phuong_an_van_chuyen, phuong_an_thi_cong, created_at) VALUES
  ('DH-2610-001', 1, 2, 4, 'dang_xu_ly', 'Căn hộ B2-1205, Quận 7, TP.HCM',
     'NCC giao thẳng sàn + tấm ốp tới công trình; cửa xuất từ xưởng.', 'Ngày 1 lát sàn, ngày 2 ốp tường và lắp cửa.', '2026-10-01 09:15+07'),
  ('DH-2610-002', 2, 2, NULL, 'moi', 'Ngõ 45 Trần Thái Tông, Cầu Giấy, Hà Nội', NULL, NULL, '2026-10-02 10:30+07'),
  ('DH-2608-087', 3, 3, 4, 'hoan_tat', 'Khu đô thị Sala, TP. Thủ Đức',
     'NCC giao thẳng.', 'Lát sàn 1 ngày.', '2026-08-14 14:00+07');

INSERT INTO don_hang_vat_tu (don_hang_id, vat_tu_id, so_luong_can) VALUES
  (1, 3, 42), (1, 5, 18), (1, 1, 2),
  (2, 4, 30), (2, 2, 3),
  (3, 3, 55);

INSERT INTO don_hang_yeu_cau_sua (don_hang_id, sale_id, noi_dung) VALUES
  (1, 2, 'Khách đổi tấm ốp phòng ngủ từ nano sang PVC vân đá.');

-- Don 3 da hoan tat: da mua, da thi cong, da nghiem thu, da thanh toan
INSERT INTO de_xuat_mua_hang (don_hang_id, ncc_id, nguoi_tao_id, trang_thai) VALUES
  (3, 1, 5, 'da_giao'),
  (1, 1, 5, 'da_giao'),
  (1, 2, 5, 'da_dat');

INSERT INTO de_xuat_mua_hang_ct (de_xuat_mua_hang_id, vat_tu_id, so_luong, don_gia) VALUES
  (1, 3, 55, 175000),
  (2, 3, 42, 185000),
  (3, 5, 18, 165000);

INSERT INTO thi_cong (don_hang_id, doi_tho_id, nguoi_phu_trach_id, ngay_du_kien, ngay_thuc_hien, trang_thai) VALUES
  (3, 1, 4, '2026-08-20', '2026-08-20', 'da_nghiem_thu'),
  (1, 1, 4, '2026-10-07', NULL, 'lap_lich');

INSERT INTO nghiem_thu (thi_cong_id, ngay_nghiem_thu, ket_qua, ghi_chu) VALUES
  (1, '2026-08-21', 'Đạt', 'Khách hài lòng, không phát sinh.');

INSERT INTO de_xuat_chi (ncc_id, nguoi_tao_id, so_tien, trang_thai) VALUES
  (1, 5, 9625000, 'da_thanh_toan'),
  (1, 5, 7770000, 'cho_duyet');

INSERT INTO de_xuat_chi_muc (de_xuat_chi_id, de_xuat_mua_hang_id) VALUES
  (1, 1),
  (2, 2);

INSERT INTO de_xuat_chi_duyet_log (de_xuat_chi_id, telegram_user, hanh_dong) VALUES
  (1, '@nguoiduyet_demo', 'duyet');

INSERT INTO phieu_thanh_toan (de_xuat_chi_id, ma_qr, so_tien, ngay_thanh_toan) VALUES
  (1, 'VIETQR-DEMO-0001', 9625000, '2026-08-25');
