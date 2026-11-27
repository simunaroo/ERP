# Rut gon phan MO DAU con ~3 trang (19/11/2026): giu nguyen cac de muc theo ban mau, viet lai noi dung ngan gon,
# bo cac y da trinh bay chi tiet o Chuong I (1.1, 1.2). Chay: python rut_gon_mo_dau.py <vao.docx> <ra.docx>
import sys
from docx.oxml.ns import qn
from docx.text.paragraph import Paragraph

DIR = 'F:/DATN/_cong_cu_bao_cao'
src = open(f'{DIR}/cap_nhat_v3_tro_ly_ai.py', encoding='utf-8').read()
exec(src[:src.index('# ================================================================ TU VIET TAT')])  # d, body, tim, dat, doan_moi, chen_sau...

NOI_DUNG = {
    '1. Lý do chọn đề tài': [
        'Doanh nghiệp NST vừa tự sản xuất cửa, vừa phân phối sàn, tấm ốp mua từ nhiều nhà cung cấp và trực tiếp thi công lắp đặt cho khách hàng. Mỗi đơn hàng vì vậy đi qua nhiều bộ phận: nhân viên kinh doanh tư vấn và chốt đơn, nhân viên vận hành lên phương án, đặt hàng nhà cung cấp và điều phối đội thợ, kế toán chi tiền và thu tiền, giám đốc duyệt các khoản chi. Hiện toàn bộ quy trình được quản lý rời rạc trên Excel, Google Sheets, Zalo và Telegram: tiến độ đơn hàng khó theo dõi, việc đặt hàng và đặt cọc với nhà cung cấp không được lưu lại, đề xuất chi khó truy vết người duyệt, công nợ phải tổng hợp thủ công vào cuối kỳ. Các phần mềm ERP có sẵn thì chi phí cao và khó tuỳ biến theo quy trình vừa bán vật tư vừa thi công.',
        'Bên cạnh đó, mô hình ngôn ngữ lớn mở ra khả năng hỗ trợ nhân viên tra cứu thông tin sản phẩm khi tư vấn khách và nhận xét số liệu kinh doanh. Vì vậy, em chọn đề tài "Xây dựng hệ thống ERP quản lý chuỗi cung ứng và thi công tích hợp trợ lý AI cho doanh nghiệp NST" nhằm xây dựng một hệ thống gọn nhẹ, bám sát quy trình thật của doanh nghiệp, đồng thời vận dụng kiến thức đã học về phân tích thiết kế hệ thống, cơ sở dữ liệu và phát triển ứng dụng web.',
    ],
    '2. Ý nghĩa của đề tài': [
        'Về thực tiễn, hệ thống số hoá trọn vòng đời đơn hàng trên một nền tảng thống nhất: mỗi bộ phận biết rõ việc cần làm, tiến độ được cập nhật tức thời, mọi khoản chi đều có người lập, người duyệt và chứng từ, công nợ được tính theo thời gian thực. Nhà cung cấp và giám đốc thao tác ngay trên Telegram, kênh doanh nghiệp đang dùng hằng ngày, mà không phải học phần mềm mới. Về học thuật, đề tài giúp em vận dụng phân tích thiết kế hướng đối tượng, thiết kế cơ sở dữ liệu bảo đảm toàn vẹn cho nghiệp vụ liên quan đến tiền, xây dựng RESTful API, tích hợp dịch vụ bên ngoài và mô hình ngôn ngữ lớn một cách có kiểm soát, cùng thói quen kiểm thử tự động.',
    ],
    '3.1. Mục tiêu nghiên cứu': [
        'Mục tiêu của đề tài là xây dựng hệ thống ERP trên nền tảng web giúp doanh nghiệp NST quản lý vòng đời đơn hàng và dòng tiền liên quan, cụ thể:',
        ('-', 'Khảo sát quy trình thực tế, phân tích và đặc tả yêu cầu của các actor; thiết kế cơ sở dữ liệu quan hệ và kiến trúc hệ thống phân lớp.'),
        ('-', 'Xây dựng các phân hệ: nhập số và chăm sóc khách hàng, đơn hàng theo tiến độ, nhà cung cấp và mua hàng, thi công – nghiệm thu – quyết toán, chi tiền, thu tiền, đối soát ngân hàng, báo cáo và quản trị.'),
        ('-', 'Tích hợp Telegram Bot cho đặt hàng nhà cung cấp và duyệt chi, mã QR chuyển khoản theo chuẩn VietQR và trợ lý AI tư vấn theo từng sản phẩm.'),
        ('-', 'Bảo đảm an toàn bằng phân quyền, xác thực hai lớp, nhật ký thay đổi và sao lưu; kiểm tra hệ thống bằng bộ kiểm thử tự động.'),
    ],
    '3.2. Đối tượng nghiên cứu': [
        'Đối tượng nghiên cứu là quy trình quản lý đơn hàng, mua hàng, thi công và dòng tiền của doanh nghiệp vừa phân phối vật liệu hoàn thiện vừa thi công lắp đặt; phương pháp phân tích thiết kế hướng đối tượng với UML; các công nghệ Node.js, Express, PostgreSQL, React và cách tích hợp Telegram Bot API, VietQR, Gemini vào hệ thống quản lý doanh nghiệp.',
    ],
    '3.3. Phạm vi nghiên cứu': [
        'Hệ thống phục vụ các bộ phận kinh doanh, vận hành, kế toán và ban giám đốc của doanh nghiệp NST; nhà cung cấp và người duyệt chi tham gia qua Telegram, khách hàng xem báo giá qua đường dẫn. Đề tài được thực hiện từ tháng 10 đến tháng 12 năm 2026.',
        'Về nội dung, đề tài tập trung vào vòng đời đơn hàng và dòng tiền; không bao gồm quản lý tồn kho vật lý (vật tư mua ngoài được nhà cung cấp giao thẳng đến công trình), sản xuất tại xưởng, kế toán tổng hợp, báo cáo thuế và ứng dụng di động phát hành trên kho ứng dụng – người dùng thao tác trên trình duyệt của máy tính hoặc điện thoại.',
    ],
    '3.4. Kết quả mong muốn đạt được của đề tài': [
        ('-', 'Hệ thống ERP chạy trên nền tảng web, giao diện theo từng vai trò, dùng được trên máy tính và điện thoại.'),
        ('-', 'Luồng nghiệp vụ khép kín từ số khách hàng tiềm năng đến khi quyết toán đơn hàng; mọi khoản thu, chi đều có chứng từ và truy vết được.'),
        ('-', 'Nhà cung cấp, giám đốc và kế toán thao tác được ngay trên Telegram; trợ lý AI hỗ trợ tư vấn sản phẩm và nhận xét số liệu, mọi con số do cơ sở dữ liệu tính toán.'),
        ('-', 'Bộ kiểm thử tự động và tài liệu phân tích thiết kế làm cơ sở để bảo trì, mở rộng hệ thống.'),
    ],
    '3.5. Cấu trúc báo cáo': [
        'Ngoài phần Mở đầu, Kết luận và Tài liệu tham khảo, báo cáo gồm ba chương:',
        ('-', 'Chương I. Cơ sở lý thuyết: giới thiệu đề tài, phương pháp thực hiện, đối tượng sử dụng, kiến trúc hệ thống và công nghệ sử dụng.'),
        ('-', 'Chương II. Khảo sát, phân tích và thiết kế hệ thống: phân tích yêu cầu, mô hình hoá và đặc tả use case, thiết kế back-end, cơ sở dữ liệu và giao diện.'),
        ('-', 'Chương III. Cài đặt và kiểm thử: kết quả cài đặt, kiểm thử và thực nghiệm.'),
    ],
}

h_md = tim('MỞ ĐẦU')
assert h_md.style.name == 'Heading 1'
MAU_DOAN = tim('Trong những năm gần đây, nhu cầu sửa chữa')
MAU_GACH = tim('Khảo sát quy trình thực tế, phân tích và đặc tả yêu cầu của các actor')
mau_doan = copy.deepcopy(MAU_DOAN._p); mau_gach = copy.deepcopy(MAU_GACH._p)
MAU_DOAN = Paragraph(mau_doan, d); MAU_GACH = Paragraph(mau_gach, d)

# Xoa moi doan noi dung (giu tieu de, giu doan chua section break) tu sau MO DAU den Heading 1 ke tiep
e = h_md._p.getnext()
while e is not None:
    if e.tag == qn('w:p'):
        p = Paragraph(e, d)
        if p.style.name == 'Heading 1': break
        nx = e.getnext()
        if not p.style.name.startswith('Heading') and e.find('.//' + qn('w:sectPr')) is None:
            e.getparent().remove(e)
        e = nx
    else:
        nx = e.getnext(); e.getparent().remove(e); e = nx

for tieu_de, ds in NOI_DUNG.items():
    h = tim(tieu_de)
    out = [doan_moi(MAU_GACH, x[1]) if isinstance(x, tuple) else doan_moi(MAU_DOAN, x) for x in ds]
    chen_sau(h._p, out)
# Doan trong chua dau ngat trang cuoi Mo dau da bi xoa -> Chuong I tu sang trang moi
next(p for p in [Paragraph(x, d) for x in body.iter(qn('w:p'))]
     if p.style.name == 'Heading 1' and p.text.strip().startswith('CHƯƠNG I.')).paragraph_format.page_break_before = True
d.save(sys.argv[2])
print('Da luu', sys.argv[2], '| so tu:', sum(len((x[1] if isinstance(x, tuple) else x).split()) for v in NOI_DUNG.values() for x in v))
