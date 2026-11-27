# Rut gon CHUONG I tu ~4.770 tu con ~2.300 tu (19/11/2026). Giu de muc, Hinh 1.1 va cac trich dan [n];
# bo cac y trung voi Mo dau, Chuong II (2.1, 2.3, 2.4) va Chuong III (3.1). Chay: python rut_gon_chuong1.py <vao> <ra>
import sys
from docx.oxml.ns import qn
from docx.text.paragraph import Paragraph

DIR = 'F:/DATN/_cong_cu_bao_cao'
src = open(f'{DIR}/cap_nhat_v3_tro_ly_ai.py', encoding='utf-8').read()
exec(src[:src.index('# ================================================================ TU VIET TAT')])  # d, body, tim, dat, doan_moi, chen_sau...

NOI_DUNG = {
    '1.1. Giới thiệu chung về đề tài': [
        'Doanh nghiệp NST vừa tự sản xuất cửa, vừa phân phối sàn và tấm ốp mua từ nhiều nhà cung cấp (NCC), đồng thời trực tiếp thi công lắp đặt cho khách hàng. Một đơn hàng đi qua nhiều bộ phận: nhân viên kinh doanh (Sale) chăm sóc và chốt đơn, nhân viên vận hành lên phương án, đặt hàng NCC và điều phối đội thợ, kế toán chi tiền và thu tiền, giám đốc duyệt các khoản chi. Đề tài xây dựng hệ thống ERP trên nền tảng web để số hoá trọn vòng đời đơn hàng và dòng tiền đi kèm trên một nền tảng thống nhất, kết nối với Telegram – kênh doanh nghiệp và NCC đang dùng hằng ngày – và tích hợp trợ lý AI hỗ trợ nhân viên. Do vật tư mua ngoài được NCC giao thẳng đến công trình, hệ thống tập trung quản lý tiến độ và dòng tiền thay vì tồn kho vật lý.',
    ],
    '1.2. Giới thiệu dự án phần mềm': [
        'Hệ thống gồm các phân hệ nối thành một chuỗi khép kín, bắt đầu từ khi có số điện thoại khách hàng tiềm năng và kết thúc khi đơn hàng được quyết toán, thu đủ tiền:',
        ('-', '**Khách hàng:** nhập số khách tiềm năng và tự động chia cho Sale theo tỷ lệ, chăm sóc theo trạng thái cuộc gọi, ghi nhận sản phẩm khách quan tâm.'),
        ('-', '**Đơn hàng:** tạo và chốt đơn, gửi đường dẫn báo giá cho khách, theo dõi tiến độ qua các bước có điều kiện.'),
        ('-', '**Chuỗi cung ứng:** danh mục vật tư, NCC và bảng giá theo thời gian, mua hàng và đặt hàng NCC qua Telegram.'),
        ('-', '**Thi công:** giai đoạn thi công, phân công đội thợ, nghiệm thu theo số lượng thực tế và quyết toán đơn hàng.'),
        ('-', '**Dòng tiền:** đề xuất chi kèm mã QR chuyển khoản, duyệt và xác nhận đã chi qua Telegram hoặc web, công nợ, thu tiền khách hàng và đối soát giao dịch ngân hàng.'),
        ('-', '**Báo cáo và trợ lý AI:** lãi/lỗ theo đơn, vật tư bán chạy, giá NCC, hiệu quả chăm sóc khách hàng kèm nhận xét của AI; trợ lý AI tư vấn theo từng sản phẩm.'),
        ('-', '**Quản trị:** người dùng, phân quyền, xác thực hai lớp, nhật ký thay đổi dữ liệu, sao lưu và thông báo trong hệ thống.'),
    ],
    '1.3. Phương pháp thực hiện': [
        'Đề tài bắt đầu bằng việc khảo sát quy trình thực tế tại doanh nghiệp: cách số khách hàng tiềm năng được giao cho Sale, cách đơn hàng được bàn giao cho nhân viên vận hành, cách đặt hàng NCC qua điện thoại và Zalo, cách đề xuất chi được gửi duyệt trong nhóm Telegram và cách công nợ được đối soát vào cuối kỳ.',
        'Từ kết quả khảo sát, em xác định các actor của hệ thống. Sale, Vận hành, Kế toán và Admin đăng nhập trực tiếp; người duyệt chi và NCC tương tác qua Telegram Bot; khách hàng xem báo giá qua đường dẫn; công cụ tìm số khách hàng và ngân hàng là các hệ thống bên ngoài giao tiếp qua API. Yêu cầu được phân tích theo phương pháp hướng đối tượng với ngôn ngữ UML: biểu đồ use case, đặc tả luồng sự kiện, biểu đồ trình tự, biểu đồ lớp và mô hình dữ liệu quan hệ (ERD).',
        'Hệ thống được xây dựng theo từng vòng lặp (mục 1.5.2), mỗi vòng có các ca kiểm thử tự động đi kèm, và toàn bộ bộ kiểm thử được chạy lại trước khi chuyển sang vòng tiếp theo.',
    ],
    '1.4. Đối tượng sử dụng': [
        'Hệ thống phục vụ bốn nhóm người dùng đăng nhập trực tiếp; quyền mặc định của từng nhóm do Admin điều chỉnh được:',
        ('-', '**Sale (nhân viên kinh doanh):** nhận và chăm sóc số khách tiềm năng, hỏi trợ lý AI khi tư vấn, tạo và chốt đơn, gửi báo giá, theo dõi tiến độ đơn và ghi nhận khách thanh toán.'),
        ('-', '**Vận hành:** xử lý các đơn được giao: lên phương án, tính khối lượng vật tư, đặt hàng NCC, thi công, nghiệm thu và quyết toán.'),
        ('-', '**Kế toán:** quản lý vật tư, NCC và bảng giá; lập và xác nhận các khoản chi; theo dõi công nợ, xác nhận tiền khách về và xem báo cáo lãi/lỗ.'),
        ('-', '**Admin (giám đốc):** duyệt chi, quản trị người dùng và phân quyền, nhập và chia số, theo dõi hiệu quả chăm sóc khách hàng, soạn kiến thức cho trợ lý AI.'),
        'Ngoài ra, người duyệt chi và NCC thao tác trong nhóm Telegram, khách hàng xem báo giá qua đường dẫn mà không cần tài khoản. Chức năng chi tiết của từng nhóm được trình bày ở mục 2.4.1.',
    ],
    '1.5.1. Kiến trúc hệ thống': {
        'truoc_hinh': ['Hệ thống được xây dựng theo kiến trúc ba tầng kết hợp RESTful API và mô hình Single Page Application, như minh hoạ ở Hình 1.1.'],
        'sau_hinh': [
            'Tầng giao diện là ứng dụng React chạy trên trình duyệt, gọi API của back-end và hiển thị theo vai trò của người dùng. Tầng xử lý nghiệp vụ được tổ chức theo kiến trúc phân lớp (layered architecture) [8]: mỗi nghiệp vụ là một module gồm các lớp routes – controller – service – repository, trong đó routes kiểm tra quyền, service chứa quy tắc nghiệp vụ và repository làm việc với cơ sở dữ liệu. Các dịch vụ bên ngoài (Telegram, Gemini, VietQR, webhook ngân hàng) được tách thành tầng tích hợp riêng để nghiệp vụ không phụ thuộc trực tiếp vào giao thức của bên thứ ba.',
            'Tầng dữ liệu dùng PostgreSQL. Phần tính tiền của đơn hàng được gom vào một view duy nhất để mọi màn hình và báo cáo cho cùng một con số; nhật ký thay đổi được ghi bằng trigger ngay tại cơ sở dữ liệu nên không bị bỏ sót dù dữ liệu được ghi từ web, Telegram hay API.',
        ],
    },
    '1.5.2. Mô hình phát triển website': [
        'Dự án được phát triển theo mô hình Agile, chia thành các vòng lặp ngắn; mỗi vòng hoàn thiện một nhóm chức năng qua đủ các bước phân tích, thiết kế, lập trình và kiểm thử. Các vòng đầu xây dựng nền tảng và luồng đơn hàng; vòng lớn nhất xây dựng chuỗi cung ứng và dòng tiền; các vòng sau mở rộng ở đầu vào (nhập số, chăm sóc khách hàng) và phía quản trị (báo cáo, phân quyền, đối soát ngân hàng, bảo mật).',
        'Cách làm lặp giúp điều chỉnh kịp thời theo nhu cầu thực tế. Ví dụ, chức năng tạo đơn bằng AI ở vòng đầu được thay bằng trợ lý AI tư vấn theo từng sản phẩm, vì việc nhập đơn vốn đã nhanh, còn nhân viên kinh doanh cần tra cứu kiến thức sản phẩm ngay khi đang tư vấn khách. Sau mỗi vòng, toàn bộ bộ kiểm thử tự động được chạy lại để bảo đảm chức năng mới không làm hỏng chức năng đã có.',
    ],
    '1.6.1. Công cụ phát triển phần mềm': [
        'Visual Studio Code là môi trường phát triển chính; Git và GitHub dùng để quản lý mã nguồn. Rational Rose được dùng để vẽ biểu đồ use case, biểu đồ trình tự, biểu đồ lớp và biểu đồ thực thể liên kết. DBeaver dùng để truy vấn và kiểm tra dữ liệu PostgreSQL. Ngoài ra, Google Chrome DevTools dùng để kiểm tra giao diện ở các kích thước màn hình, BotFather để tạo Telegram Bot và Google AI Studio để tạo khoá Gemini API.',
    ],
    '1.6.2. Công nghệ phát triển phần mềm': [
        'Các công nghệ chính và lý do lựa chọn:',
        ('-', '**Node.js 22 và Express 5 [7], [12]:** back-end viết bằng JavaScript, cùng ngôn ngữ với giao diện nên thuận lợi cho một đồ án cá nhân; Express gọn nhẹ, phù hợp để xây dựng RESTful API trao đổi dữ liệu dạng JSON.'),
        ('-', '**PostgreSQL 16 [3], [13]:** hệ quản trị cơ sở dữ liệu quan hệ mã nguồn mở, hỗ trợ giao dịch, khoá dòng dữ liệu và các ràng buộc toàn vẹn chặt chẽ (CHECK, EXCLUDE, trigger) – yếu tố quan trọng với các nghiệp vụ liên quan đến tiền.'),
        ('-', '**React 18 [14] và Vite [16]:** React xây dựng giao diện theo thành phần (component) theo mô hình SPA, kết hợp React Router, Zustand và Axios; Vite chạy máy chủ phát triển và đóng gói bản phát hành. Hệ thống được đóng gói thành ứng dụng web cài đặt được (PWA) trên điện thoại.'),
        ('-', '**JWT [10] và TOTP [11]:** JWT dùng để xác thực người dùng sau khi đăng nhập; TOTP sinh mã 6 số đổi mỗi 30 giây trên ứng dụng điện thoại cho xác thực hai lớp; mật khẩu được băm bằng bcrypt.'),
        ('-', '**Telegram Bot API [15]:** cho phép gửi tin nhắn kèm nút bấm vào nhóm chat, nhờ đó NCC phản hồi đơn đặt hàng và giám đốc duyệt chi ngay trên điện thoại.'),
        ('-', '**Gemini API [9]:** mô hình ngôn ngữ lớn của Google, dùng cho trợ lý tư vấn theo từng sản phẩm và nhận xét số liệu. Tài liệu kiến thức được đưa vào ngữ cảnh mỗi lần hỏi thay vì huấn luyện lại mô hình; mọi con số do cơ sở dữ liệu tính toán, AI chỉ diễn giải.'),
        ('-', '**VietQR [4] và SePay [5]:** VietQR sinh ảnh mã QR chuyển khoản điền sẵn ngân hàng, số tài khoản, số tiền; SePay gửi thông báo giao dịch ngân hàng qua webhook để hệ thống tự đối soát.'),
    ],
}

# Mau dinh dang: doan van va gach dau dong dang dung trong bai (lay ban sao truoc khi xoa)
MAU_DOAN = Paragraph(copy.deepcopy(tim('Doanh nghiệp NST hoạt động theo mô hình vừa tự sản xuất cửa')._p), d)
MAU_GACH = Paragraph(copy.deepcopy(tim('Tiến độ đơn hàng không minh bạch')._p), d)
# Doan van: thut dau dong bang ky tu Tab o dau doan, dung theo cach ban chinh dang trinh bay
tao = lambda x: doan_moi(MAU_GACH, x[1]) if isinstance(x, tuple) else doan_moi(MAU_DOAN, '	' + x)

h1 = next(p for p in [Paragraph(x, d) for x in body.iter(qn('w:p'))]
          if p.style.name == 'Heading 1' and p.text.strip().startswith('CHƯƠNG I.'))
# Xoa noi dung (giu tieu de, doan chua anh, chu thich hinh, doan chua section break) den het Chuong I
e = h1._p.getnext()
while e is not None:
    if e.tag == qn('w:p'):
        p = Paragraph(e, d)
        if p.style.name == 'Heading 1': break
        nx = e.getnext()
        giu = (p.style.name.startswith('Heading') or e.find('.//' + qn('wp:inline')) is not None
               or p.style.style_id == '1hinh' or e.find('.//' + qn('w:sectPr')) is not None)
        if not giu: e.getparent().remove(e)
        e = nx
    else:
        nx = e.getnext(); e.getparent().remove(e); e = nx

for tieu_de, nd in NOI_DUNG.items():
    h = tim(tieu_de)
    if isinstance(nd, dict):
        chen_sau(h._p, [tao(x) for x in nd['truoc_hinh']])
        ct = tim('Hình 1.1. Kiến trúc tổng thể hệ thống')
        chen_sau(ct._p, [tao(x) for x in nd['sau_hinh']])
    else:
        chen_sau(h._p, [tao(x) for x in nd])
d.save(sys.argv[2])
dem = lambda x: len((x[1] if isinstance(x, tuple) else x).split())
tong = sum(dem(x) for v in NOI_DUNG.values() for x in (v['truoc_hinh'] + v['sau_hinh'] if isinstance(v, dict) else v))
print('Da luu', sys.argv[2], '| so tu Chuong I:', tong)
