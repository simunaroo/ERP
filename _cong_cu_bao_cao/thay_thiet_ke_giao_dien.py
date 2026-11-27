# Muc 2.9 "Thiet ke Front-end": thay anh chup san pham bang ban thiet ke khung (wireframe, ve bang ve_thiet_ke.mjs),
# chu thich "Thiet ke giao dien ...", them doan giai thich cac vung danh so truoc moi hinh.
# Chay: python thay_thiet_ke_giao_dien.py <vao.docx> <ra.docx>
import re
src = open(r'F:/DATN/_cong_cu_bao_cao/cap_nhat_v3_tro_ly_ai.py', encoding='utf-8').read()
exec(src[:src.index('# ================================================================ TU VIET TAT')])
A = r'F:/DATN/_cong_cu_bao_cao/anh'

# (dau chu thich cu, anh, ten moi, giai thich - {h} = "Hình 2.N")
MAN = [
    ('Giao diện đăng nhập', 'tk_dang_nhap', 'Thiết kế giao diện đăng nhập và xác thực hai lớp',
     'Màn hình đăng nhập ({h}) gồm: (1) ô tài khoản, mật khẩu và nút Đăng nhập; (2) bước nhập mã xác thực hai lớp 6 số, chỉ hiện với vai trò đang bật xác thực hai lớp; lần đầu đăng nhập hiển thị mã QR để cài ứng dụng Authenticator.'),
    ('Giao diện trang Tổng quan', 'tk_tong_quan', 'Thiết kế giao diện trang Tổng quan',
     'Mọi trang dùng chung một bố cục ({h}): (1) thanh điều hướng bên trái, chỉ hiện các mục theo quyền của người dùng; (2) thanh trên cùng gồm đường dẫn trang, chuông thông báo và nút chế độ sáng, tối; vùng nội dung ở bên phải. Trang Tổng quan gồm: (3) khối Việc cần làm, việc gấp được nhấn mạnh và có nút đi thẳng tới màn hình xử lý; (4) các chỉ số chính; (5) số đơn đang chạy theo từng bước tiến độ; (6) biểu đồ doanh thu 6 tháng.'),
    ('Giao diện chi tiết khách hàng', 'tk_chi_tiet_khach', 'Thiết kế giao diện chi tiết khách hàng',
     'Trang chi tiết khách hàng ({h}): (1) tên, trạng thái chăm sóc và số điện thoại kèm nút Gọi, Zalo, Chép số; (2) thông tin khách và nút Hỏi trợ lý sản phẩm; (3) các đơn hàng của khách; (4) cập nhật kết quả lần liên hệ; (5) lịch sử chăm sóc. Nút Trợ lý ở góc dưới mở khung chat từ mọi màn hình.'),
    ('Giao diện tạo đơn hàng', 'tk_tao_don', 'Thiết kế giao diện tạo đơn hàng',
     'Màn hình tạo đơn hàng ({h}): (1) chọn khách, hình thức đơn (hoàn thiện hoặc chỉ bán vật tư) và sản phẩm chính; (2) địa chỉ công trình; (3) bảng vật tư, mỗi dòng gồm số lượng, đơn giá và kích thước thi công; (4) tổng đơn cập nhật tức thời cùng nút Chốt đơn và Lưu nháp.'),
    ('Giao diện khung chat trợ lý AI', 'tk_tro_ly_chat', 'Thiết kế khung chat trợ lý AI',
     'Khung chat trợ lý AI ({h}) là cửa sổ nổi phía trên trang đang mở: (1) tiêu đề và các nút xem lịch sử, tạo cuộc trò chuyện mới, thu nhỏ; (2) chọn trợ lý theo quyền: Cửa, Sàn, Tấm ốp, Quản lý, NCC; (3) vùng hội thoại, câu trả lời có nút chép tin nhắn gửi khách; (4) ô nhập câu hỏi, nút gửi ảnh (chỉ trợ lý sản phẩm) và nút Gửi.'),
    ('Giao diện chi tiết đơn hàng', 'tk_chi_tiet_don', 'Thiết kế giao diện chi tiết đơn hàng và tiến độ',
     'Trang chi tiết đơn hàng ({h}): (1) mã đơn, trạng thái và hình thức; (2) thanh tiến độ 8 bước, bước hiện tại được tô đậm; (3) ô ghi chú cùng các nút chuyển bước, lùi bước, huỷ đơn; (4) thông tin chung; (5) thanh toán: tổng đơn, đã thu, còn phải thu; (6) danh sách vật tư của đơn.'),
    ('Giao diện mua hàng', 'tk_mua_hang', 'Thiết kế giao diện mua hàng – đặt hàng nhà cung cấp',
     'Màn hình mua hàng ({h}): (1) bảng vật tư cần mua, mỗi dòng gợi ý NCC rẻ nhất theo bảng giá và cho chọn NCC, giá chốt, VAT; (2) tổng theo từng NCC và nút Đặt hàng; (3) các đơn đặt hàng đã gửi NCC kèm trạng thái phản hồi; (4) mua bổ sung khi thiếu, hỏng hàng.'),
    ('Giao diện đề xuất chi', 'tk_de_xuat_chi', 'Thiết kế giao diện đề xuất chi kèm mã QR chuyển khoản',
     'Màn hình đề xuất chi ({h}): (1) các thẻ của mục Chi & công nợ; (2) danh sách đề xuất chi có bộ lọc theo trạng thái, loại chi; (3) chi tiết đề xuất kèm mã QR chuyển khoản, nút Duyệt, Từ chối dành cho Admin và nút Đã chi – tải ảnh bill dành cho Kế toán.'),
    ('Giao diện phân tích vật tư', 'tk_phan_tich', 'Thiết kế giao diện phân tích vật tư, giá nhà cung cấp và nhận xét AI',
     'Màn hình phân tích ({h}): (1) các thẻ của mục Nhà cung cấp; (2) chọn kỳ phân tích; (3) chỉ số tổng hợp; (4) nút nhờ AI nhận xét số liệu; (5) vật tư bán chạy kèm lãi gộp ước tính; (6) đánh giá mức giá của từng NCC so với thị trường.'),
    ('Giao diện đối soát giao dịch ngân hàng', 'tk_doi_soat', 'Thiết kế giao diện đối soát giao dịch ngân hàng',
     'Màn hình đối soát ngân hàng ({h}): (1) thẻ Ngân hàng trong mục Chi & công nợ; (2) gửi giao dịch thử để kiểm tra khi chưa nối tài khoản thật; (3) danh sách giao dịch lọc theo trạng thái khớp; giao dịch chưa khớp được khớp tay vào đơn hoặc bỏ qua kèm lý do.'),
    ('Giao diện báo cáo chăm sóc khách hàng', 'tk_bao_cao_cham_soc', 'Thiết kế giao diện báo cáo chăm sóc khách hàng',
     'Màn hình báo cáo chăm sóc ({h}): (1) thẻ Báo cáo chăm sóc trong trang Khách hàng; (2) chọn kỳ báo cáo; (3) chỉ số chung, các ô tồn đọng được nhấn mạnh; (4) bảng chỉ số theo từng Sale; (5) chuyển hàng loạt khách tồn đọng và nhờ AI nhận xét.'),
    ('Giao diện phân quyền theo chức năng', 'tk_phan_quyen', 'Thiết kế giao diện phân quyền theo chức năng',
     'Màn hình phân quyền ({h}): (1) ma trận quyền, mỗi dòng là một chức năng (nhóm theo phân hệ), mỗi cột là một vai trò; (2) nút Lưu, quyền có hiệu lực ngay ở yêu cầu tiếp theo.'),
]

mau = tim('Mục này trình bày chi tiết 6 bảng lõi')       # doan van thuong co tab dau dong
for dau, anh, ten, giai in MAN:
    cs = [p for p in tim('Hình 2.', tat_ca=True) if re.match(r'Hình 2\.\d+\. ' + re.escape(dau), p.text.strip()) and p.style.name == '1hinh']
    assert len(cs) == 1, (dau, len(cs))
    cap = cs[0]
    so_h = re.match(r'(Hình 2\.\d+)\.', cap.text.strip()).group(1)
    e_anh = cap._p.getprevious()
    inl = e_anh.find('.//' + qn('wp:inline'))
    assert inl is not None, dau
    duong = f'{A}/{anh}.png'
    rid = inl.find('.//' + qn('a:blip')).get(qn('r:embed'))
    d.part.related_parts[rid]._blob = open(duong, 'rb').read()
    dat_kich_thuoc(inl, *cap_anh(duong))
    dat(cap, f'{so_h}. {ten}')
    e = copy.deepcopy(mau._p)
    for tag in ('w:bookmarkStart', 'w:bookmarkEnd'):
        for b in list(e.iter(qn(tag))):
            b.getparent().remove(b)
    dat(Paragraph(e, mau._parent), '\t' + giai.format(h=so_h))
    e_anh.addprevious(e)

dat(tim('Giao diện được thiết kế theo vai trò'),
    '\tGiao diện được thiết kế theo vai trò: mỗi vai trò có thực đơn, trang Tổng quan và danh sách việc cần làm riêng. Các hình dưới đây là bản thiết kế khung (wireframe) của các màn hình chính, chỉ thể hiện bố cục và các vùng chức năng, chưa có dữ liệu; số trong vòng tròn đỏ đánh dấu các vùng được giải thích trước mỗi hình. Kết quả cài đặt thực tế được trình bày ở Chương III.')
print('Da thay', len(MAN), 'man hinh')
d.save(RA)
