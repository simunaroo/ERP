-- Du lieu mau GIA LAP cho demo (khong phai du lieu that). Mat khau = ten tai khoan + 123456 (vd: doanha123456)

INSERT INTO users (ho_ten, username, password_hash, vai_tro) VALUES
  ('Vương Ngọc Sơn', 'ngocson', '$2b$10$J6b9kwPEB8FKSWS2qPLYlOHb8U/Q9rCutYYHdkHV2sMZJ4GUkbL.O', 'admin'),
  ('Kinh Doanh A', 'doanha', '$2b$10$4JD3NXRWs4/Q0zsrxOacpOzJWDVm8F2wp3Ifqn3GNnPixbC2QMvJO', 'sale'),
  ('Kinh Doanh B', 'doanhb', '$2b$10$YCc/DURiPY2uEZy.Ch3Q7OrYLSMW03ukVQiCqMnQWeM54CIOzX8Vi', 'sale'),
  ('Vận Hành A', 'hanha', '$2b$10$c4zY6Gp3oQuGex0DGUwmAOlnuusNlgjQD0UTXY0T5ZY7KkxsytbgW', 'van_hanh'),
  ('Kế Toán A', 'toana', '$2b$10$.UW175L2pg1o8cZUGQ28ruY9E1vByn7hWiBHqGJvMDpCQGXfFeuMu', 'ke_toan');

INSERT INTO khach_hang (ten, sdt, dia_chi, sale_phu_trach_id, trang_thai_cham_soc, nhom_khach_hang) VALUES
  ('Nguyễn Văn Hùng', '0901000001', 'Căn hộ B2-1205, Quận 7, TP.HCM', 2, 'chot', 'nha_dan'),
  ('Trần Thị Mai',    '0901000002', 'Ngõ 45 Trần Thái Tông, Cầu Giấy, Hà Nội', 2, 'chot', 'nha_dan'),
  ('Lê Quốc Bảo',     '0901000003', 'Khu đô thị Sala, TP. Thủ Đức', 3, 'chot', 'nha_thau'),
  ('Phạm Minh Tuấn',  '0901000004', 'Văn Quán, Hà Đông, Hà Nội', 3, 'dang_tu_van', 'nha_dan'),
  ('Vũ Thị Thanh',    '0901000005', 'Chung cư Ecopark, Văn Giang, Hưng Yên', 2, 'da_bao_gia', 'nha_dan'),
  ('Đặng Minh Khoa',  '0901000006', 'Số 18 Nguyễn Hữu Thọ, Quận 7, TP.HCM', 2, 'moi', 'doi_tac');

INSERT INTO khach_hang_cham_soc (khach_hang_id, sale_id, trang_thai, noi_dung, created_at) VALUES
  (1, 2, 'dang_tu_van', 'Khách hỏi sàn SPC cho căn hộ 2 phòng ngủ, đã gửi catalogue.', '2026-09-26 10:00+07'),
  (1, 2, 'da_bao_gia',  'Gửi báo giá sàn SPC + tấm ốp nano + 2 cửa Xingfa.', '2026-09-28 15:30+07'),
  (1, 2, 'chot',        'Khách đồng ý, đặt cọc 30%.', '2026-10-01 09:00+07'),
  (2, 2, 'dang_tu_van', 'Khách cần sàn vân đá cho phòng khách.', '2026-09-29 14:00+07'),
  (2, 2, 'chot',        'Chốt qua điện thoại.', '2026-10-02 10:00+07'),
  (5, 2, 'dang_tu_van', 'Khách quan tâm tấm ốp phòng ngủ, hẹn khảo sát.', '2026-10-03 09:30+07'),
  (5, 2, 'da_bao_gia',  'Đã báo giá 22 m² tấm ốp PVC vân đá, chờ khách phản hồi.', '2026-10-04 16:00+07');

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

INSERT INTO don_hang (ma_don, khach_hang_id, sale_id, vanhanh_phu_trach_id, trang_thai, giai_doan, hinh_thuc, ma_hop_dong, ngay_chot, ngay_yc_lap_dat,
                      tinh_thanh, phuong_xa, dia_chi_cong_trinh, phi_van_chuyen, phu_thu, chiet_khau_pct, tien_coc, ngay_coc, ty_le_tam_ung,
                      dieu_khoan_nghiem_thu, phuong_an_van_chuyen, phuong_an_thi_cong, created_at) VALUES
  ('DH-2610-001', 1, 2, 4, 'dang_xu_ly', 'mua_hang', 'hoan_thien', 'HĐ-1001', '2026-10-01', '2026-10-07',
     'TP. Hồ Chí Minh', 'Phường Tân Thuận', 'Căn hộ B2-1205', 0, 500000, 5, 5000000, '2026-10-01', 80,
     'so_m2_thi_cong',
     'NCC giao thẳng sàn + tấm ốp tới công trình; cửa xuất từ xưởng.', 'Ngày 1 lát sàn, ngày 2 ốp tường và lắp cửa.', '2026-10-01 09:15+07'),
  ('DH-2610-002', 2, 2, NULL, 'moi', 'len_phuong_an', 'vat_tu', NULL, '2026-10-02', '2026-10-09',
     'Hà Nội', 'Phường Cầu Giấy', 'Ngõ 45 Trần Thái Tông', 300000, 0, 0, 2000000, '2026-10-02', 100,
     'vat_tu_tieu_hao', NULL, NULL, '2026-10-02 10:30+07'),
  ('DH-2608-087', 3, 3, 4, 'hoan_tat', 'hoan_tat', 'hoan_thien', 'HĐ-0987', '2026-08-14', '2026-08-20',
     'TP. Hồ Chí Minh', 'Phường An Khánh', 'Khu đô thị Sala', 0, 0, 0, 3000000, '2026-08-14', 80,
     'so_m2_thi_cong', 'NCC giao thẳng.', 'Lát sàn 1 ngày.', '2026-08-14 14:00+07'),
  ('DH-2610-003', 5, 2, NULL, 'nhap', NULL, 'hoan_thien', NULL, NULL, '2026-10-15',
     'Hưng Yên', 'Xã Văn Giang', 'Chung cư Ecopark', 0, 0, 0, 0, NULL, 80,
     NULL, NULL, NULL, '2026-10-04 16:10+07');

-- Lich su tien do (nguoi: 2 = Kinh Doanh A, 3 = Kinh Doanh B, 4 = Van Hanh A, 5 = Ke Toan A)
INSERT INTO don_hang_giai_doan_log (don_hang_id, tu_giai_doan, den_giai_doan, nguoi_id, ghi_chu, created_at) VALUES
  (1, NULL, 'len_phuong_an', 2, 'Chốt đơn', '2026-10-01 09:15+07'),
  (1, 'len_phuong_an', 'boc_khoi_luong', 4, NULL, '2026-10-01 15:00+07'),
  (1, 'boc_khoi_luong', 'mua_hang', 4, 'Đã bóc khối lượng theo bản vẽ mặt bằng.', '2026-10-02 10:20+07'),
  (2, NULL, 'len_phuong_an', 2, 'Chốt đơn', '2026-10-02 10:30+07'),
  (3, NULL, 'len_phuong_an', 3, 'Chốt đơn', '2026-08-14 14:00+07'),
  (3, 'len_phuong_an', 'boc_khoi_luong', 4, NULL, '2026-08-14 17:00+07'),
  (3, 'boc_khoi_luong', 'mua_hang', 4, NULL, '2026-08-15 09:00+07'),
  (3, 'mua_hang', 'giao_hang', 4, NULL, '2026-08-17 08:30+07'),
  (3, 'giao_hang', 'thi_cong', 4, NULL, '2026-08-19 08:00+07'),
  (3, 'thi_cong', 'nghiem_thu', 4, NULL, '2026-08-20 17:00+07'),
  (3, 'nghiem_thu', 'quyet_toan', 4, 'Nghiệm thu đạt, khách hài lòng.', '2026-08-21 10:00+07'),
  (3, 'quyet_toan', 'hoan_tat', 5, 'Đã đối chiếu thanh toán.', '2026-08-25 16:00+07');

INSERT INTO don_hang_vat_tu (don_hang_id, vat_tu_id, so_luong_can, don_gia, ghi_chu, loai_thi_cong, dai_mm, rong_mm) VALUES
  (1, 3, 42, 255000, 'Phòng khách + 2 phòng ngủ', NULL, NULL, NULL), (1, 5, 18, 230000, 'Phòng ngủ master', 'op_tuong_khong_xuong', 3000, 400), (1, 1, 2, 5800000, 'Cửa ban công', NULL, 2200, 1200),
  (2, 4, 30, 320000, NULL, NULL, NULL, NULL), (2, 2, 3, 4200000, NULL, NULL, 2200, 900),
  (3, 3, 55, 245000, NULL, NULL, NULL, NULL),
  (4, 6, 22, 290000, 'Báo giá đang chờ khách xác nhận', 'op_tuong_co_xuong', 2440, 1220);

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
