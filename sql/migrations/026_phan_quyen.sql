-- Phan quyen theo chuc nang (RBAC): Admin tick quyen cho tung vai tro tren man hinh, khong sua code.
-- Pham vi DU LIEU (Sale chi thay khach/don cua minh, Van hanh chi thay don minh phu trach) van theo vai tro trong service.
-- Admin cung duoc gan quyen nhu vai tro khac (giu dung cac thao tac co y chi danh cho Sale/Van hanh/Ke toan);
-- rieng quyen chi_admin (quan tri he thong) luon thuoc Admin, code kiem tra cung -> khong the tu khoa minh.
CREATE TABLE quyen (
    ma        VARCHAR(40) PRIMARY KEY,
    ten       TEXT NOT NULL,
    nhom      VARCHAR(40) NOT NULL,
    thu_tu    SMALLINT NOT NULL,
    chi_admin BOOLEAN NOT NULL DEFAULT false   -- quyen quan tri he thong: khong gan cho vai tro khac
);

CREATE TABLE vai_tro_quyen (
    vai_tro  vai_tro_enum NOT NULL,
    ma_quyen VARCHAR(40) NOT NULL REFERENCES quyen(ma) ON DELETE CASCADE,
    PRIMARY KEY (vai_tro, ma_quyen)
);

-- Khong cho gan quyen chi_admin cho vai tro khac (CHECK khong tham chieu duoc bang khac -> trigger).
CREATE FUNCTION fn_chan_quyen_chi_admin() RETURNS trigger AS $$
BEGIN
  IF NEW.vai_tro <> 'admin' AND (SELECT chi_admin FROM quyen WHERE ma = NEW.ma_quyen) THEN
    RAISE EXCEPTION 'Quyen % chi danh cho Admin', NEW.ma_quyen USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER tg_chan_quyen_chi_admin BEFORE INSERT OR UPDATE ON vai_tro_quyen
  FOR EACH ROW EXECUTE FUNCTION fn_chan_quyen_chi_admin();

-- Nhat ky: dong phan quyen co khoa ghep (vai_tro, ma_quyen).
CREATE OR REPLACE FUNCTION fn_ghi_nhat_ky() RETURNS trigger AS $$
DECLARE
  cu  jsonb;
  moi jsonb;
  dong jsonb;
BEGIN
  IF current_setting('app.bo_qua_nhat_ky', true) = '1' THEN RETURN NULL; END IF;
  IF TG_OP = 'INSERT' THEN
    moi := to_jsonb(NEW);
  ELSIF TG_OP = 'DELETE' THEN
    cu := to_jsonb(OLD);
  ELSE
    SELECT jsonb_object_agg(o.key, o.value) INTO cu
      FROM jsonb_each(to_jsonb(OLD)) o WHERE o.value IS DISTINCT FROM to_jsonb(NEW) -> o.key;
    SELECT jsonb_object_agg(n.key, n.value) INTO moi
      FROM jsonb_each(to_jsonb(NEW)) n WHERE n.value IS DISTINCT FROM to_jsonb(OLD) -> n.key;
    IF moi IS NULL THEN RETURN NULL; END IF;
  END IF;
  IF cu ? 'password_hash' THEN cu := jsonb_set(cu, '{password_hash}', '"***"'); END IF;
  IF moi ? 'password_hash' THEN moi := jsonb_set(moi, '{password_hash}', '"***"'); END IF;
  dong := COALESCE(to_jsonb(NEW), to_jsonb(OLD));
  INSERT INTO nhat_ky_thay_doi (bang, ban_ghi, hanh_dong, du_lieu_cu, du_lieu_moi, nguoi_id, kenh)
  VALUES (TG_TABLE_NAME,
          COALESCE(dong ->> 'id', dong ->> 'sale_id', dong ->> 'khoa', (dong ->> 'vai_tro') || ':' || (dong ->> 'ma_quyen')),
          TG_OP, cu, moi,
          NULLIF(current_setting('app.user_id', true), '')::int, NULLIF(current_setting('app.kenh', true), ''));
  RETURN NULL;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER tg_nhat_ky AFTER INSERT OR UPDATE OR DELETE ON vai_tro_quyen FOR EACH ROW EXECUTE FUNCTION fn_ghi_nhat_ky();

INSERT INTO quyen (ma, ten, nhom, thu_tu, chi_admin) VALUES
  ('khach_hang.xem',      'Xem khách hàng',                                   'Bán hàng', 10, false),
  ('khach_hang.sua',      'Thêm khách, ghi chăm sóc',                         'Bán hàng', 11, false),
  ('nhap_so.nhap',        'Nhập số (khách tiềm năng)',                        'Bán hàng', 12, false),
  ('nhap_so.quan_ly',     'Quản lý tỷ lệ chia số, chuyển số giữa Sale',       'Bán hàng', 13, false),
  ('don_hang.lap',        'Lập / sửa đơn nháp, gửi báo giá, yêu cầu sửa đơn', 'Bán hàng', 14, false),
  ('tro_ly.ai',           'Lên đơn nhanh bằng AI',                            'Bán hàng', 15, false),
  ('don_hang.dieu_phoi',  'Lên phương án, xử lý yêu cầu sửa đơn',             'Điều phối', 20, false),
  ('don_hang.chuyen_buoc','Chuyển bước tiến độ đơn',                          'Điều phối', 21, false),
  ('don_hang.boc_kl',     'Xác nhận bóc khối lượng',                          'Điều phối', 22, false),
  ('don_hang.huy',        'Huỷ đơn',                                          'Điều phối', 23, false),
  ('don_hang.phu_trach',  'Đổi Vận hành phụ trách đơn',                       'Điều phối', 24, false),
  ('mua_hang.xem',        'Xem mua hàng, đặt hàng NCC',                       'Điều phối', 25, false),
  ('mua_hang.lay_hang',   'Xác nhận lấy hàng, lập mua bổ sung',               'Điều phối', 26, false),
  ('thi_cong.xem',        'Xem thi công, nghiệm thu, quyết toán',             'Điều phối', 27, false),
  ('thi_cong.thao_tac',   'Phân thợ, nghiệm thu, chốt quyết toán',            'Điều phối', 28, false),
  ('chi.xem',             'Xem đề xuất chi và công nợ NCC / thợ',             'Tiền', 30, false),
  ('chi.lap',             'Lập / sửa / xoá đề xuất chi',                      'Tiền', 31, false),
  ('chi.duyet',           'Duyệt / thu hồi đề xuất chi',                      'Tiền', 32, false),
  ('chi.da_chi',          'Xác nhận đã chi (kèm bill)',                       'Tiền', 33, false),
  ('mua_hang.da_mua',     'Xác nhận đã mua hàng bổ sung',                     'Tiền', 34, false),
  ('thu.ghi_nhan',        'Ghi nhận phiếu thu khách',                         'Tiền', 35, false),
  ('thu.xac_nhan',        'Xác nhận tiền về, xem công nợ khách',              'Tiền', 36, false),
  ('ncc.xem',             'Xem nhà cung cấp, bảng giá',                       'Danh mục & báo cáo', 40, false),
  ('ncc.sua',             'Sửa nhà cung cấp, bảng giá',                       'Danh mục & báo cáo', 41, false),
  ('vat_tu.sua',          'Sửa danh mục vật tư',                              'Danh mục & báo cáo', 42, false),
  ('bao_cao.xem',         'Xem báo cáo lãi/lỗ, phân tích NCC',                'Danh mục & báo cáo', 43, false),
  ('he_thong.quan_tri',   'Quản trị người dùng, phân quyền, cấu hình, nhật ký','Hệ thống', 90, true);

INSERT INTO vai_tro_quyen (vai_tro, ma_quyen) VALUES
  ('sale', 'khach_hang.xem'), ('sale', 'khach_hang.sua'), ('sale', 'nhap_so.nhap'), ('sale', 'don_hang.lap'), ('sale', 'tro_ly.ai'),
  ('sale', 'thu.ghi_nhan'),
  ('van_hanh', 'don_hang.dieu_phoi'), ('van_hanh', 'don_hang.chuyen_buoc'), ('van_hanh', 'don_hang.boc_kl'), ('van_hanh', 'don_hang.huy'),
  ('van_hanh', 'mua_hang.xem'), ('van_hanh', 'mua_hang.lay_hang'), ('van_hanh', 'thi_cong.xem'), ('van_hanh', 'thi_cong.thao_tac'),
  ('van_hanh', 'thu.ghi_nhan'), ('van_hanh', 'ncc.xem'),
  ('ke_toan', 'don_hang.chuyen_buoc'), ('ke_toan', 'mua_hang.xem'), ('ke_toan', 'thi_cong.xem'), ('ke_toan', 'chi.xem'), ('ke_toan', 'chi.lap'),
  ('ke_toan', 'chi.da_chi'), ('ke_toan', 'mua_hang.da_mua'), ('ke_toan', 'thu.ghi_nhan'), ('ke_toan', 'thu.xac_nhan'), ('ke_toan', 'ncc.xem'),
  ('ke_toan', 'ncc.sua'), ('ke_toan', 'vat_tu.sua'), ('ke_toan', 'bao_cao.xem'),
  ('admin', 'khach_hang.xem'), ('admin', 'nhap_so.nhap'), ('admin', 'nhap_so.quan_ly'), ('admin', 'don_hang.chuyen_buoc'), ('admin', 'don_hang.boc_kl'),
  ('admin', 'don_hang.huy'), ('admin', 'don_hang.phu_trach'), ('admin', 'mua_hang.xem'), ('admin', 'mua_hang.lay_hang'), ('admin', 'thi_cong.xem'),
  ('admin', 'thi_cong.thao_tac'), ('admin', 'chi.xem'), ('admin', 'chi.duyet'), ('admin', 'mua_hang.da_mua'), ('admin', 'thu.ghi_nhan'),
  ('admin', 'thu.xac_nhan'), ('admin', 'ncc.xem'), ('admin', 'ncc.sua'), ('admin', 'vat_tu.sua'), ('admin', 'bao_cao.xem'), ('admin', 'he_thong.quan_tri');
