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

INSERT INTO doi_tho (ten, sdt, nang_luc, so_tk, ten_ngan_hang, chu_tk) VALUES
  ('Đội anh Thắng', '0903000001', 'Sàn SPC, sàn gỗ',  '0000700001', 'Vietcombank', 'DOI THO GIA LAP 1'),
  ('Đội anh Phong', '0903000002', 'Tấm ốp, trần',     '0000700002', 'Techcombank', 'DOI THO GIA LAP 2'),
  ('Đội anh Khải',  '0903000003', 'Cửa nhôm, cửa gỗ', '0000700003', 'BIDV',        'DOI THO GIA LAP 3');

INSERT INTO don_hang (ma_don, khach_hang_id, sale_id, vanhanh_phu_trach_id, trang_thai, giai_doan, hinh_thuc, ma_hop_dong, ngay_chot, ngay_yc_lap_dat,
                      tinh_thanh, phuong_xa, dia_chi_cong_trinh, phi_van_chuyen, phu_thu, chiet_khau_pct, tien_coc, ngay_coc, ty_le_tam_ung,
                      dieu_khoan_nghiem_thu, phuong_an_van_chuyen, phuong_an_thi_cong, created_at) VALUES
  ('DH-2610-001', 1, 2, 4, 'dang_xu_ly', 'mua_hang', 'hoan_thien', 'HĐ-1001', '2026-10-01', '2026-10-07',
     'TP. Hồ Chí Minh', 'Phường Tân Thuận', 'Căn hộ B2-1205', 0, 500000, 5, 5000000, '2026-10-01', 80,
     'so_m2_thi_cong',
     'NCC giao thẳng sàn + tấm ốp tới công trình; cửa xuất từ xưởng.', 'Ngày 1 lát sàn, ngày 2 ốp tường và lắp cửa.', '2026-10-01 09:15+07'),
  ('DH-2610-002', 2, 2, 4, 'moi', 'len_phuong_an', 'vat_tu', NULL, '2026-10-02', '2026-10-09',
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

-- ---------- Mua hang theo dong (dong vat tu MUA NGOAI cua don da chot) ----------
-- don_hang_vat_tu id: 1 = don1 san van go, 2 = don1 tam op nano, 4 = don2 san van da, 6 = don3 san van go
INSERT INTO mua_hang_dong (don_hang_vat_tu_id, ncc_id, gia_chot, vat_pct, trang_thai, nguoi_cap_nhat_id) VALUES
  (1, 1, 185000, 8, 'san_hang', 5),
  (2, 2, 165000, 8, 'da_dat_hang', 5),
  (4, NULL, NULL, 0, 'cho_xu_ly', NULL),
  (6, 1, 175000, 0, 'da_giao_hang', 5);

-- Don 1: NCC giao thieu san -> mua bo sung, NCC chiu trach nhiem
INSERT INTO mua_bo_sung (don_hang_id, loai_phat_sinh, ly_do, nguoi_tao_id) VALUES
  (1, 'giao_thieu_sai', 'NCC giao thiếu 2 m² sàn vân gỗ so với phiếu.', 4);
INSERT INTO mua_bo_sung_dong (mua_bo_sung_id, vat_tu_id, so_luong) VALUES (1, 3, 2);
INSERT INTO mua_bo_sung_trach_nhiem (mua_bo_sung_id, nguon, so_tien) VALUES (1, 'ncc', 0);

-- ---------- Thi cong theo giai doan ----------
INSERT INTO thi_cong (don_hang_id, doi_tho_id, nguoi_phu_trach_id, ten_giai_doan, don_vi_cong, gia_cong, kl_du_kien, kl_thuc_te,
                      ngay_du_kien, ngay_thuc_hien, ngay_hoan_thanh, trang_thai) VALUES
  (3, 1, 4, 'Lát sàn', 'm²', 60000, 55, 54.5, '2026-08-20', '2026-08-20', '2026-08-20', 'da_nghiem_thu'),
  (1, 1, 4, 'Lát sàn', 'm²', 60000, 42, NULL, '2026-10-07', NULL, NULL, 'lap_lich'),
  (1, 2, 4, 'Ốp tường', 'm²', 80000, 18, NULL, '2026-10-08', NULL, NULL, 'lap_lich');

-- Don 3: nghiem thu 54,5 m2 thuc te -> quyet toan
UPDATE don_hang_vat_tu SET so_luong_thuc_te = 54.5 WHERE id = 6;
UPDATE don_hang SET nghiem_thu_luc = '2026-08-21 10:00+07', nguoi_nghiem_thu_id = 4,
                    gia_tri_quyet_toan = 13352500, quyet_toan_luc = '2026-08-25 16:00+07', nguoi_quyet_toan_id = 5
 WHERE id = 3;

-- ---------- De xuat chi (1 don x 1 NCC / 1 doi tho) ----------
INSERT INTO de_xuat_chi (loai_chi, ncc_id, don_hang_id, nguoi_tao_id, gia_tri_hang, so_tien, trang_thai, noi_dung_ck, created_at) VALUES
  ('quyet_toan', 1, 3, 5, 9625000, 9625000, 'da_thanh_toan', 'DH-2608-087-11-1', '2026-08-18 09:00+07'),
  ('coc',        2, 1, 5, 0,       1000000, 'da_thanh_toan', 'DH-2610-001-11-2', '2026-10-02 11:00+07'),
  ('quyet_toan', 1, 1, 5, 8391600, 8391600, 'cho_duyet',     'DH-2610-001-11-3', '2026-10-05 09:00+07');
INSERT INTO de_xuat_chi (loai_chi, doi_tho_id, don_hang_id, nguoi_tao_id, so_tien, trang_thai, noi_dung_ck, created_at) VALUES
  ('tra_cong', 1, 3, 5, 3270000, 'da_thanh_toan', '0903000001 DH-2608-087', '2026-08-26 09:00+07');

INSERT INTO de_xuat_chi_dong (de_xuat_chi_id, mua_hang_dong_id, so_luong, don_gia, vat_pct, thanh_tien) VALUES
  (1, 4, 55, 175000, 0, 9625000),
  (3, 1, 42, 185000, 8, 8391600);

INSERT INTO de_xuat_chi_duyet_log (de_xuat_chi_id, telegram_user, nguoi_id, hanh_dong) VALUES
  (1, '@nguoiduyet_demo', NULL, 'duyet'),
  (2, 'web:Vương Ngọc Sơn', 1, 'duyet'),
  (4, 'web:Vương Ngọc Sơn', 1, 'duyet');

-- bill_anh 'du-lieu-cu' = du lieu mau, khong co file anh that
INSERT INTO phieu_thanh_toan (de_xuat_chi_id, so_tien, ngay_thanh_toan, nguoi_tao_id, noi_dung_ck, bill_anh) VALUES
  (1, 9625000, '2026-08-25', 5, 'DH-2608-087-11-1', 'du-lieu-cu'),
  (2, 1000000, '2026-10-03', 5, 'DH-2610-001-11-2', 'du-lieu-cu'),
  (4, 3270000, '2026-08-27', 5, '0903000001 DH-2608-087', 'du-lieu-cu');

-- So cong tho: don 3 lat san 54,5 m2 x 60.000d
INSERT INTO giao_dich_tho (doi_tho_id, don_hang_id, thi_cong_id, loai, so_tien, de_xuat_chi_id, ghi_chu, created_at) VALUES
  (1, 3, 1, 'phai_tra', 3270000, NULL, 'Công Lát sàn: 54,5 m² × 60.000 đ', '2026-08-25 16:00+07'),
  (1, 3, 1, 'da_tra',   3270000, 4,    'Trả công theo DXC-4', '2026-08-27 10:00+07');
