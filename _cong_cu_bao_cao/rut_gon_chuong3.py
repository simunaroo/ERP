# Rut gon + cap nhat Chuong 3 (20/11/2026): 16 -> ~10 trang.
#   3.1: bo phan lap lai muc 1.6.2, cap nhat so lieu ma nguon (8.100 dong BE, 149 endpoint, 39 migration, 30 quyen, 6.900 dong FE).
#   3.2: bo kiem thu 169 ca / 24 nhom (them tro ly Quan ly, tro ly NCC); Bang 3.1 tu 24 con 13 ca (them ca tro ly NCC);
#        Hinh 3.1 chup lai. 3.3: thay Hinh 3.3 (thong bao) bang tro ly NCC tra loi that.
# Chay: python rut_gon_chuong3.py <vao.docx> <ra.docx> [--khong-ket-luan]
src = open(r'F:/DATN/_cong_cu_bao_cao/cap_nhat_v3_tro_ly_ai.py', encoding='utf-8').read()
exec(src[:src.index('# ================================================================ TU VIET TAT')])
ANH3 = r'F:/DATN/_cong_cu_bao_cao/anh'


def xoa(e):
    assert e.find('.//' + qn('w:sectPr')) is None, 'khong xoa ngat section'
    e.getparent().remove(e)


def dat_doan(p, text):
    t = text.lstrip('\t')
    dat(p, ('\t' + t) if p.text.startswith('\t') else t)


def thay_anh_cua(dau_chu_thich, duong, rong_cm=None):
    """Thay anh ngay truoc chu thich; rong_cm=None: giu be rong cu, chieu cao theo ty le anh moi."""
    cap = tim(dau_chu_thich)
    inl = cap._p.getprevious().find('.//' + qn('wp:inline'))
    rid = inl.find('.//' + qn('a:blip')).get(qn('r:embed'))
    d.part.related_parts[rid]._blob = open(duong, 'rb').read()
    w, h = Image.open(duong).size
    cx = int(rong_cm * 360000) if rong_cm else int(inl.find(qn('wp:extent')).get('cx'))
    dat_kich_thuoc(inl, cx, int(cx * h / w))


def dat_rong(tbl_el, cms):
    """Do rong cot co dinh (cm); khong de Word tu co gian lam cot hep, dong cao."""
    pr = tbl_el.find(qn('w:tblPr'))
    lay = pr.find(qn('w:tblLayout'))
    if lay is None:
        lay = pr.makeelement(qn('w:tblLayout'), {})
        pr.find(qn('w:tblW')).addnext(lay)
    lay.set(qn('w:type'), 'fixed')
    tw = pr.find(qn('w:tblW'))
    tw.set(qn('w:w'), str(round(sum(cms) * 567)))
    tw.set(qn('w:type'), 'dxa')
    dxa = [str(round(c * 567)) for c in cms]
    for g, w in zip(tbl_el.iter(qn('w:gridCol')), dxa):
        g.set(qn('w:w'), w)
    for tr in tbl_el.iter(qn('w:tr')):
        for tc, w in zip(tr.findall(qn('w:tc')), dxa):
            tcw = tc.find(qn('w:tcPr') + '/' + qn('w:tcW'))
            if tcw is not None:
                tcw.set(qn('w:w'), w)
                tcw.set(qn('w:type'), 'dxa')


# ================================================================ 3.1.1 Back-end
dat_doan(tim('Phần back-end được viết bằng JavaScript'),
         'Phần back-end viết bằng JavaScript, chạy trên Node.js 22 và Express 5; mã nguồn khoảng 8.100 dòng, chia thành 23 module nghiệp vụ, cung cấp 149 endpoint REST. Back-end chỉ phụ thuộc 8 gói npm, phần còn lại dùng thư viện chuẩn của Node.js để dễ kiểm soát và dễ giải thích từng dòng mã. Ngoài các công nghệ đã nêu ở mục 1.6.2, một số lựa chọn khi cài đặt:')
xoa(tim('Các công nghệ và thư viện chính gồm:')._p)
xoa(tim('jsonwebtoken và bcryptjs:')._p)
dat_doan(tim('Hàm fetch có sẵn của Node.js 22:'),
         'Hàm fetch có sẵn của Node.js 22: gọi Telegram Bot API, Gemini API (kể cả cơ chế gọi hàm của trợ lý Quản lý và trợ lý NCC) và VietQR trực tiếp qua HTTPS, không phụ thuộc SDK của bên thứ ba.')
dat_doan(tim('Toàn bộ thông số phụ thuộc môi trường'),
         'Các thông số phụ thuộc môi trường (chuỗi kết nối CSDL, khoá ký JWT, token Telegram, khoá Gemini, khoá webhook ngân hàng) đặt trong tệp .env, tách khỏi mã nguồn; tệp .env.example liệt kê đủ các biến cần khai báo kèm chú thích.')
dat_doan(tim('integrations: tầng tích hợp với Telegram'),
         'integrations: tầng tích hợp với Telegram (gửi tin, nhận phản hồi bằng long polling hoặc webhook, bộ điều phối nút bấm) và Gemini (gọi mô hình, vòng gọi hàm, thử lại, chuyển mô hình dự phòng).')
dat_doan(tim('utils: các hàm dùng chung'),
         'utils: các hàm dùng chung như lớp lỗi AppError, thuật toán TOTP, sinh link VietQR, đọc số tiền người dùng gõ, bí danh hoá tên NCC và số tiền trước khi gửi AI.')
dat_doan(tim('Ngoài mã nguồn, thư mục sql chứa tệp schema.sql'),
         'Thư mục sql chứa tệp schema.sql (cấu trúc cuối cùng của CSDL), 39 tệp migration đánh số và dữ liệu mẫu; thư mục backend/scripts chứa công cụ dựng lại CSDL, chạy migration còn thiếu, sao lưu, khôi phục vào CSDL mới và sinh dữ liệu mẫu lớn mô phỏng 12 tháng hoạt động.')
thay(tim('Phân quyền với 28 quyền chức năng'), '28 quyền', '30 quyền')
dat_doan(tim('Tích hợp hoạt động với Telegram'),
         'Tích hợp hoạt động với Telegram (nhóm duyệt chi và nhóm nhà cung cấp), Gemini (ba trợ lý sản phẩm, trợ lý Quản lý và trợ lý NCC dùng cơ chế gọi hàm, hai chức năng nhận xét số liệu, đọc tài liệu), VietQR, webhook ngân hàng SePay và API nhập số cho website.')

# ================================================================ 3.1.2 Front-end
thay(tim('Front-end là ứng dụng một trang (SPA) tách biệt'), '6.200 dòng', '6.900 dòng')
dat_doan(tim('React Router 6:'),
         'React Router 6, Zustand và Axios: điều hướng giữa các trang (bộ lọc lưu trên URL), giữ trạng thái đăng nhập và khung chat trợ lý khi chuyển trang, gọi API tự gắn JWT và tự đăng xuất khi phiên hết hiệu lực.')
xoa(tim('Zustand: lưu trạng thái đăng nhập')._p)
xoa(tim('Axios: gọi API, tự gắn JWT')._p)
dat_doan(tim('Khung chat trợ lý AI là một cửa sổ nổi'),
         'Khung chat trợ lý AI là cửa sổ nổi mở được ở mọi màn hình; người dùng chọn trợ lý theo quyền của mình (Cửa, Sàn, Tấm ốp, Quản lý, NCC) và cuộc trò chuyện được giữ khi chuyển trang. Trang báo giá công khai hiển thị tốt trên điện thoại; các trang chính đã được thử ở khổ 390 px và ứng dụng cài được ra màn hình chính điện thoại.')

# ================================================================ 3.2 Kiem thu
p = tim('Mức thứ nhất là kiểm thử tự động ở mức API')
thay(p, 'câu hỏi gửi AI không chứa số điện thoại', 'câu hỏi gửi AI không chứa số điện thoại khách, tên NCC hay số tiền')
thay(p, '158 ca chia thành 22 nhóm', '169 ca chia thành 24 nhóm')
thay(tim('Bảng 3.1 trình bày 24 ca kiểm thử tiêu biểu'), '24 ca kiểm thử tiêu biểu', '13 ca kiểm thử tiêu biểu')
cap31 = tim('Bảng 3.1. Bảng kết quả kiểm thử')
e = cap31._p.getprevious()
while e.tag == qn('w:p') and not Paragraph(e, d).text.strip() and not e.findall('.//' + qn('w:drawing')):
    truoc = e.getprevious()      # bo cac doan trong de can truoc bang
    xoa(e)
    e = truoc

GIU_TC = ['TC01', 'TC03', 'TC05', 'TC08', 'TC09', 'TC11', 'TC12', 'TC14', 'TC16', 'TC18', 'TC22', 'TC23']
b31 = bang_sau(cap31)
for r in list(b31.rows)[1:]:
    if r.cells[0].text.strip() not in GIU_TC:
        b31._tbl.remove(r._tr)
them_dong(b31, ('', 'Trợ lý AI NCC', 'Admin hỏi "Sàn SPC vân gỗ 4mm nên mua của NCC nào?"',
                'Gửi AI chỉ mã NCC và mã số tiền; câu trả lời hiển thị tên NCC, giá thật',
                'Nội dung gửi Gemini không có tên NCC, giá nhập; câu trả lời đổi đúng về tên NCC và 180.000 đ', 'Đạt'), mau_dong=1)
for i, r in enumerate(list(b31.rows)[1:], 1):
    dat_o(r.cells[0], f'TC{i:02d}')
assert len(b31.rows) == 14, len(b31.rows)
dat_rong(b31._tbl, [1.7, 2.2, 3.8, 3.3, 3.3, 1.2])

# Bang 3.2 (so ca theo nhom) trung noi dung voi Hinh 3.1 (anh ket qua chay liet ke du 24 nhom kem so ca): bo bang, giu hinh.
dat_doan(tim('Kết quả chạy toàn bộ bộ kiểm thử tự động'),
         'Kết quả chạy toàn bộ bộ kiểm thử tự động theo từng nhóm được thể hiện ở Hình 3.1: 169/169 ca đạt, không có ca nào trượt, thời gian chạy toàn bộ dưới 2 phút. Lệnh npm run test:bao-cao đồng thời xuất báo cáo chi tiết từng ca ra tệp KET_QUA_KIEM_THU.md.')
cap32b = tim('Bảng 3.2. Tổng hợp kết quả kiểm thử tự động theo nhóm')
xoa(cap32b._p.getnext())
xoa(cap32b._p)
thay(tim('Bảng 3.3. Thời gian phản hồi'), 'Bảng 3.3', 'Bảng 3.2')
thay(tim('Để đánh giá hệ thống trong điều kiện gần với thực tế'), 'Bảng 3.3', 'Bảng 3.2')
cap_h31 = tim('Hình 3.1. Kết quả chạy bộ kiểm thử tự động')
anh_h31 = cap_h31._p.getprevious()
trong = anh_h31.getprevious()
if trong.tag == qn('w:p') and not Paragraph(trong, d).text.strip() and not trong.findall('.//' + qn('w:drawing')):
    xoa(trong)
thay_anh_cua('Hình 3.1. Kết quả chạy bộ kiểm thử tự động', f'{ANH3}/c3_4_ket_qua_kiem_thu.png', rong_cm=11)
# Hinh 3.2 (bao gia tren dien thoai) dang chiem nguyen trang: thu nho, giu ty le
cap32 = tim('Hình 3.2. Khách hàng xem báo giá trên điện thoại')
inl = cap32._p.getprevious().find('.//' + qn('wp:inline'))
ext = inl.find(qn('wp:extent'))
cx, cy = int(ext.get('cx')), int(ext.get('cy'))
cao = int(13.5 * 360000)                       # cao 13,5 cm
dat_kich_thuoc(inl, int(cx * cao / cy), cao)

dat_doan(tim('Tính đúng đắn: các luồng nghiệp vụ chính'),
         'Tính đúng đắn: các luồng nghiệp vụ chính hoạt động đúng đặc tả, kể cả các nhánh ngoại lệ. Kiểm thử phát hiện được lỗi thật trong quá trình phát triển, ví dụ điều kiện "đủ hàng" từng coi đơn chưa ai mở màn Mua hàng là đủ hàng (phát hiện nhờ kịch bản đầu–cuối); mỗi lỗi sau khi sửa được giữ lại thành một ca kiểm thử hồi quy.')
thay(tim('Phân quyền và bảo mật: mọi API đọc dữ liệu'), 'không chứa thông tin cá nhân của khách hàng.',
     'không chứa thông tin cá nhân của khách hàng; tên NCC và số tiền gửi trợ lý AI đã được thay bằng mã.')

# ================================================================ 3.3 Thuc nghiem
dat_doan(tim('Phần lớn các thao tác thường dùng'),
         'Các thao tác thường dùng (chi tiết đơn, danh sách khách của Sale, công nợ nhà cung cấp, báo cáo chăm sóc khách hàng) phản hồi dưới 50 ms; đăng nhập khoảng 221 ms do bcrypt được thiết kế chậm để chống dò mật khẩu. Các chức năng tính tiền trên toàn bộ đơn qua view v_don_hang_tien chậm hơn rõ rệt (trang Tổng quan khoảng 1,1 giây, báo cáo lãi/lỗ 12 tháng khoảng 3,8 giây): chấp nhận được với quy mô hiện tại nhưng là điểm cần tối ưu khi dữ liệu tăng.')
dat_doan(tim('Sau mỗi thao tác, người liên quan nhận thông báo'),
         'Hình 3.3 là trợ lý AI NCC trả lời câu hỏi "Sàn SPC vân gỗ 4mm nên mua của NCC nào?" bằng mô hình Gemini thật trên dữ liệu mẫu lớn. Trợ lý tự gọi hàm so sánh giá, đề xuất NCC chính và NCC dự phòng kèm lý do (giá, độ ổn định giá, đã từng mua); Gemini chỉ nhận mã NCC và mã số tiền, tên và giá trong câu trả lời do hệ thống đổi lại.')
thay_anh_cua('Hình 3.3. Thông báo đến nhân viên vận hành', f'{ANH3}/c3_5_tro_ly_ncc.png', rong_cm=8.5)
dat(tim('Hình 3.3. Thông báo đến nhân viên vận hành'), 'Hình 3.3. Trợ lý AI NCC đề xuất nhà cung cấp cho vật tư')

# ================================================================ Ket luan: so lieu thay doi theo Chuong 2, 3
if '--khong-ket-luan' not in sys.argv:
    thay(tim('Về phân tích thiết kế: khảo sát quy trình thực tế'), 'đặc tả 21 use case', 'đặc tả 11 use case chính')
    thay(tim('Về an toàn và chất lượng: phân quyền'), 'sao lưu tự động; bộ kiểm thử tự động 158 ca đều đạt.',
         'sao lưu tự động; tên nhà cung cấp và số tiền được mã hoá trước khi gửi AI; bộ kiểm thử tự động 169 ca đều đạt.')

d.save(RA)
print('Da luu', RA)
