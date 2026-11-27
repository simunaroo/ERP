# Viet Chuong III (Cai dat va kiem thu), Ket luan, Tai lieu tham khao vao ban dung thu (13/11/2026).
# Theo khung ban mau Ngo Khac Tai. So lieu lay that: ket qua chay bo kiem thu (backend/test/KET_QUA_KIEM_THU.md),
# do thoi gian phan hoi (do_hieu_nang.json), anh chup (anh/c3_*.png).
# Dung lai cac ham tien ich cua cap_nhat_v3_tro_ly_ai.py. Chay: python viet_chuong3.py <vao.docx> <ra.docx>
import copy, json, re, sys
from docx.oxml.ns import qn
from docx.text.paragraph import Paragraph
from docx.table import Table

DIR = 'F:/DATN/_cong_cu_bao_cao'
src = open(f'{DIR}/cap_nhat_v3_tro_ly_ai.py', encoding='utf-8').read()
exec(src[:src.index('# ================================================================ TU VIET TAT')])  # d, body, tim, thay, dat, dat_o, chen_sau, doan_moi, bang_sau, them_dong, bang_cot, doan_anh...
ANH = f'{DIR}/anh'
MAU_ANH = Paragraph(next(p for p in body.iter(qn('w:p')) if p.find('.//' + qn('wp:inline')) is not None), d)
MAU_DOAN = tim('Doanh nghiệp NST hoạt động theo mô hình vừa tự sản xuất cửa')        # doan van thuong (thut dau dong)
MAU_GACH = tim('Thiết kế cơ sở dữ liệu quan hệ và kiến trúc hệ thống phân lớp')     # gach dau dong
MAU_CT_HINH = tim('Hình 2.1. Biểu đồ usecase tổng quan')
MAU_CT_BANG = tim('Bảng 2.1. Các bước tiến độ của đơn hàng')
MAU_BANG4 = bang_sau(next(p for p in ds_doan() if re.match(r'Bảng 2\.\d+\. Bảng loai_vat_tu', p.text.strip()) and not p.style.name.lower().startswith('toc')))                         # bang 4 cot (dong tieu de + dong du lieu)


def chen_noi_dung(tieu_de, ds, xoa_trong=True):
    """Chen danh sach noi dung ngay sau tieu de. ds: chuoi (doan), ('-', chuoi) (gach dau dong), phan tu lxml."""
    h = tim(tieu_de)
    # xoa cac doan trong / 'a' giu cho ngay sau tieu de
    e = h._p.getnext()
    while xoa_trong and e is not None and e.tag == qn('w:p') and Paragraph(e, d).text.strip() in ('', 'a') \
            and e.find('.//' + qn('wp:inline')) is None and e.find('.//' + qn('w:sectPr')) is None:
        nx = e.getnext(); e.getparent().remove(e); e = nx
    out = []
    for x in ds:
        if isinstance(x, str): out.append(doan_moi(MAU_DOAN, x))
        elif isinstance(x, tuple) and x[0] == '-': out.append(doan_moi(MAU_GACH, x[1]))
        else: out.append(x)
    chen_sau(h._p, out)


def hinh(file, chu_thich):
    return [doan_anh(f'{ANH}/{file}'), doan_moi(MAU_CT_HINH, chu_thich)]


def bang4(chu_thich, tieu_de, dong, ty_le):
    """Bang 4 cot dung dinh dang bang CSDL mau; dat lai dong tieu de va do rong cot theo ty_le (%)."""
    tbl = bang_cot(MAU_BANG4, dong)
    t = Table(tbl, d)
    for o, v in zip(t.rows[0].cells, tieu_de):
        dat_o(o, f'**{v}**')
    grid = tbl.find(qn('w:tblGrid'))
    tong = sum(int(g.get(qn('w:w'))) for g in grid.findall(qn('w:gridCol')))
    rong = [round(tong * x / 100) for x in ty_le]
    for g, w in zip(grid.findall(qn('w:gridCol')), rong): g.set(qn('w:w'), str(w))
    for tr in tbl.findall(qn('w:tr')):
        for tc, w in zip(tr.findall(qn('w:tc')), rong):
            tcW = tc.find(qn('w:tcPr')).find(qn('w:tcW'))
            tcW.set(qn('w:w'), str(w)); tcW.set(qn('w:type'), 'dxa')
    return [doan_moi(MAU_CT_BANG, chu_thich), tbl]


# ---------------------------------------------------------------- so lieu that
md = open('F:/DATN/backend/test/KET_QUA_KIEM_THU.md', encoding='utf-8').read()
nhom, cur = [], None
for l in md.split('\n'):
    m = re.match(r'^## (\S+)\.test\.js', l)
    if m: cur = {'tep': m.group(1), 'so': 0, 'dat': 0}; nhom.append(cur); continue
    if cur and re.match(r'^\| (TC|E2E)', l):
        cur['so'] += 1; cur['dat'] += 'Đạt' in l
TONG = sum(n['so'] for n in nhom); DAT = sum(n['dat'] for n in nhom)
assert TONG == 158 and DAT == 158, (TONG, DAT)
TEN_NHOM = {
    '01_xac_thuc': 'Đăng nhập, thu hồi phiên, chặn dò mật khẩu', '02_don_hang': 'Tạo, chốt đơn và chuyển bước tiến độ',
    '03_mua_hang': 'Mua hàng và đặt hàng nhà cung cấp', '04_telegram': 'Tương tác qua Telegram Bot',
    '05_thu_tien': 'Thu tiền khách hàng, tạm ứng', '06_thi_cong': 'Thi công, nghiệm thu, quyết toán',
    '07_thong_bao_phan_quyen': 'Thông báo và phân quyền theo dữ liệu', '08_tien_ich': 'Hàm tiện ích (số tiền, VietQR)',
    '09_nhap_so': 'Nhập số và chia số theo tỷ lệ', '10_bao_cao': 'Báo cáo lãi/lỗ, xuất Excel', '11_nhat_ky': 'Nhật ký thay đổi dữ liệu',
    '12_phan_quyen': 'Phân quyền theo chức năng', '13_ngan_hang': 'Đối soát giao dịch ngân hàng', '14_hai_lop': 'Xác thực hai lớp',
    '15_sao_luu': 'Sao lưu dữ liệu', '16_e2e_vong_doi_don': 'Kịch bản đầu–cuối vòng đời đơn hàng', '17_nhap_so_file': 'Nhập số từ tệp Excel, CSV, TXT',
    '18_cham_soc': 'Chăm sóc khách hàng', '19_bao_cao_cham_soc': 'Báo cáo chăm sóc khách hàng, AI nhận xét',
    '20_san_pham': 'Sản phẩm quan tâm, sản phẩm của đơn', '21_tro_ly_san_pham': 'Trợ lý AI theo sản phẩm', '22_xac_thuc_vai_tro': 'Cấu hình xác thực hai lớp theo vai trò',
}
e2e = next(n for n in nhom if n['tep'].startswith('16_'))['so']
hn = json.load(open(f'{DIR}/do_hieu_nang.json', encoding='utf-8'))
DL = hn['du_lieu']
so = lambda n: f'{n:,}'.replace(',', '.')
ms = lambda x: so(x)

# ================================================================ 3.1.1 BACK-END
chen_noi_dung('3.1.1.1. Công nghệ sử dụng', [
    'Phần back-end được viết bằng JavaScript, chạy trên Node.js 22 và dùng Express 5 làm khung xử lý yêu cầu HTTP. Mã nguồn phía máy chủ dài khoảng 7.200 dòng, chia thành 23 module nghiệp vụ và cung cấp 145 endpoint REST cho giao diện. Em chủ động giữ số thư viện ở mức tối thiểu: khi chạy, back-end chỉ phụ thuộc 8 gói npm, các phần còn lại dùng thư viện chuẩn của Node.js để dễ kiểm soát và dễ giải thích từng dòng mã.',
    'Các công nghệ và thư viện chính gồm:',
    ('-', 'Node.js 22 và Express 5: Express 5 tự chuyển lỗi phát sinh trong các hàm bất đồng bộ (async) về một bộ xử lý lỗi chung, nên mỗi route không phải tự bắt lỗi; mọi lỗi nghiệp vụ được trả về dưới dạng JSON thống nhất kèm mã HTTP phù hợp (400, 403, 404, 409…).'),
    ('-', 'PostgreSQL 16 với thư viện pg: truy vấn được viết bằng SQL có tham số hoá ($1, $2…) để chống SQL injection, chạy qua một bể kết nối dùng chung; các nghiệp vụ nhiều bước chạy trong giao dịch thông qua hàm bọc withTransaction.'),
    ('-', 'jsonwebtoken và bcryptjs: cấp và kiểm tra JWT sau khi đăng nhập, băm mật khẩu bằng bcrypt.'),
    ('-', 'Mô-đun crypto có sẵn của Node.js: em tự cài đặt thuật toán TOTP cho xác thực hai lớp và mã hoá khoá bí mật bằng AES-256-GCM, không dùng thư viện bên ngoài.'),
    ('-', 'Hàm fetch có sẵn của Node.js 22: gọi Telegram Bot API, Gemini API và dịch vụ ảnh VietQR trực tiếp qua HTTPS, không phụ thuộc SDK của bên thứ ba.'),
    ('-', 'exceljs và qrcode: xuất bốn loại báo cáo ra tệp Excel và sinh mã QR để người dùng cài ứng dụng xác thực.'),
    'Toàn bộ thông số phụ thuộc môi trường như chuỗi kết nối cơ sở dữ liệu, khoá ký JWT, token Telegram, khoá Gemini, khoá webhook ngân hàng và lịch sao lưu được đặt trong tệp .env, tách khỏi mã nguồn. Tệp .env.example đi kèm liệt kê đủ các biến cần khai báo cùng chú thích, nhờ đó có thể dựng lại hệ thống trên máy khác mà không phải đọc mã.',
])
chen_noi_dung('3.1.1.2. Mô hình kiến trúc', [
    'Back-end được tổ chức theo kiến trúc phân lớp đã trình bày ở Chương I. Thư mục backend/src gồm các phần sau:',
    ('-', 'config: khởi tạo bể kết nối PostgreSQL và hàm chạy giao dịch; trong mỗi giao dịch, mã người thao tác và kênh thao tác (web, Telegram, API, ngân hàng) được đặt vào biến phiên để trigger ghi nhật ký biết ai đã sửa dữ liệu.'),
    ('-', 'middlewares: xác thực JWT, kiểm tra quyền theo chức năng (coQuyen) và bộ xử lý lỗi chung.'),
    ('-', 'modules: 23 module nghiệp vụ, mỗi module gồm các tệp routes, controller, service và repository.'),
    ('-', 'integrations: tầng tích hợp với Telegram (gửi tin, nhận phản hồi bằng long polling hoặc webhook, bộ điều phối nút bấm) và Gemini (gọi mô hình, thử lại, chuyển mô hình dự phòng).'),
    ('-', 'utils: các hàm dùng chung như lớp lỗi AppError, thuật toán TOTP, sinh link VietQR, đọc số tiền người dùng gõ.'),
    'Lấy ví dụ thao tác chuyển bước tiến độ đơn hàng: tầng routes nhận yêu cầu POST /api/don-hang/:id/giai-doan, xác thực JWT rồi kiểm tra quyền chuyển bước; controller lấy tham số và gọi service; service kiểm tra người gửi có phụ trách đơn không, đơn có thoả điều kiện của bước hiện tại không (Bảng 2.1), sau đó mở giao dịch, khoá dòng đơn hàng, cập nhật bước, ghi lịch sử chuyển bước và tạo thông báo cho người liên quan; repository chỉ chứa câu lệnh SQL. Nếu một bước bất kỳ lỗi, toàn bộ giao dịch được huỷ nên không có thông báo hay nhật ký sai lệch.',
    'Ngoài mã nguồn, thư mục sql chứa tệp schema.sql mô tả cấu trúc cuối cùng của cơ sở dữ liệu, 37 tệp migration đánh số và tệp dữ liệu mẫu. Thư mục backend/scripts chứa các công cụ vận hành: dựng lại cơ sở dữ liệu, chạy migration còn thiếu, sao lưu, khôi phục vào một cơ sở dữ liệu mới, sinh dữ liệu mẫu lớn mô phỏng 12 tháng hoạt động và nạp tài liệu kiến thức cho trợ lý AI.',
])
chen_noi_dung('3.1.1.3. Kết quả đạt được', [
    'Sau khi cài đặt, back-end đạt được các kết quả sau:',
    ('-', 'Cung cấp đủ API cho toàn bộ vòng đời đơn hàng và dòng tiền: nhập số, chăm sóc khách, đơn hàng, mua hàng, thi công, nghiệm thu, quyết toán, đề xuất chi, công nợ, thu tiền, đối soát ngân hàng, báo cáo, trợ lý AI và quản trị.'),
    ('-', 'Cơ sở dữ liệu gồm 42 bảng, một view tính tiền đơn hàng và 20 trigger; 18 bảng quan trọng được ghi nhật ký thay đổi tự động. Các migration áp dụng được cả trên cơ sở dữ liệu trống lẫn cơ sở dữ liệu đang có dữ liệu.'),
    ('-', 'Phân quyền với 28 quyền chức năng cấu hình được, phân quyền theo dữ liệu cho Sale và Vận hành, xác thực hai lớp bật/tắt theo vai trò.'),
    ('-', 'Tích hợp hoạt động với Telegram (nhóm duyệt chi và nhóm nhà cung cấp), Gemini (ba trợ lý sản phẩm, hai chức năng nhận xét số liệu, đọc tài liệu), VietQR, webhook ngân hàng SePay và API nhập số cho website.'),
    ('-', 'Cơ sở dữ liệu và thư mục ảnh chứng từ được sao lưu tự động lúc 2 giờ sáng hằng ngày, giữ 7 bản gần nhất.'),
])
# ================================================================ 3.1.2 FRONT-END
chen_noi_dung('3.1.2.1. Công nghệ sử dụng', [
    'Front-end là ứng dụng một trang (SPA) tách biệt với back-end, giao tiếp hoàn toàn qua REST API. Mã nguồn dài khoảng 6.200 dòng, gồm 26 trang và 8 thành phần dùng chung. Các công nghệ được sử dụng:',
    ('-', 'React 18: xây dựng giao diện theo thành phần (component); các khối lặp lại như nhãn trạng thái, bảng có bộ lọc, khung chat trợ lý được viết một lần và dùng lại ở nhiều trang.'),
    ('-', 'React Router 6: điều hướng giữa các trang, bộ lọc của danh sách được lưu trên địa chỉ URL.'),
    ('-', 'Zustand: lưu trạng thái đăng nhập và trạng thái khung chat trợ lý AI, giữ được khi người dùng chuyển trang.'),
    ('-', 'Axios: gọi API, tự gắn JWT vào mỗi yêu cầu và tự đăng xuất khi máy chủ báo phiên hết hiệu lực.'),
    ('-', 'Vite 5: chạy máy chủ phát triển (chuyển tiếp /api sang back-end) và đóng gói bản phát hành.'),
    ('-', 'CSS viết tay với biến màu, không dùng framework giao diện: hỗ trợ chế độ sáng/tối và co giãn theo các điểm ngắt 768 px, 640 px, 600 px cho điện thoại.'),
    ('-', 'Tệp manifest và service worker: cho phép cài hệ thống lên màn hình chính điện thoại như một ứng dụng (PWA).'),
])
chen_noi_dung('3.1.2.2. Kết quả đạt được', [
    'Giao diện được xây dựng đầy đủ cho bốn vai trò đăng nhập và cho khách hàng xem báo giá. Thực đơn được sinh từ danh sách quyền của người dùng nên khi Admin đổi phân quyền, chức năng tương ứng tự ẩn hoặc hiện mà không phải sửa mã. Mỗi vai trò có trang Tổng quan riêng với khối "Việc cần làm" đặt ở đầu trang, việc gấp được tô đỏ và có nút đi thẳng tới màn hình xử lý.',
    'Khung chat trợ lý AI là một cửa sổ nổi có thể mở ở bất kỳ màn hình nào của Sale; cuộc trò chuyện đang mở được giữ lại khi chuyển trang. Trang báo giá công khai hiển thị tốt trên điện thoại và có nút in hoặc lưu PDF. Các trang chính đã được thử ở khổ màn hình điện thoại 390 px, bảng rộng cuộn ngang, và ứng dụng cài được ra màn hình chính điện thoại.',
])

# ================================================================ 3.2 KIEM THU
chen_noi_dung('3.2.1. Kế hoạch kiểm thử', [
    'Kiểm thử nhằm xác nhận hệ thống thực hiện đúng các yêu cầu và use case đã đặc tả ở Chương II, đặc biệt các luồng liên quan đến tiền và phân quyền. Em áp dụng hai mức kiểm thử bổ sung cho nhau.',
    f'Mức thứ nhất là kiểm thử tự động ở mức API theo phương pháp hộp đen, viết bằng bộ kiểm thử có sẵn node:test của Node.js. Trước mỗi nhóm kiểm thử, cơ sở dữ liệu riêng datn_erp_test được tạo lại từ schema.sql và dữ liệu mẫu, sau đó máy chủ thật được khởi động và các ca kiểm thử gọi API qua HTTP giống như giao diện. Telegram Bot API và Gemini API được giả lập bằng cách thay hàm fetch, nhờ đó vừa kiểm tra được nội dung hệ thống gửi đi (ví dụ tin đặt hàng không chứa tên khách, câu hỏi gửi AI không chứa số điện thoại) vừa không gửi tin nhắn thật. Bộ kiểm thử gồm {TONG} ca chia thành {len(nhom)} nhóm, trong đó có một kịch bản đầu–cuối {e2e} bước đi trọn vòng đời một đơn hàng. Toàn bộ bộ kiểm thử được chạy lại sau mỗi lần thay đổi chức năng.',
    'Mức thứ hai là kiểm thử thủ công trên giao diện bằng trình duyệt Google Chrome và Microsoft Edge, ở khổ màn hình máy tính và khổ điện thoại, với dữ liệu mẫu lớn và các tài khoản mẫu của từng vai trò; luồng Telegram và trợ lý AI được thử với nhóm Telegram thử nghiệm và khoá Gemini thật.',
    'Các ca kiểm thử được thiết kế theo luồng chính và luồng ngoại lệ của từng use case, kết hợp phân vùng tương đương và giá trị biên (ví dụ tiền cọc bằng đúng tiền hàng, lần nhập sai mật khẩu thứ năm), kiểm tra phân quyền theo ma trận vai trò × API và kiểm tra thao tác đồng thời (nhiều đơn chốt cùng lúc, hai lô số nhập cùng lúc). Môi trường kiểm thử: Windows 11, Node.js 22.11, PostgreSQL 16.14, CPU Intel Core i7-1255U, RAM 16 GB.',
])
# Bang 3.1: 24 ca tieu bieu (moi ca tuong ung ca tu dong da dat trong KET_QUA_KIEM_THU.md)
CA = [
    ('Đăng nhập', 'thilan / thilan123456 (vai trò Sale, không bật 2FA)', 'Đăng nhập thành công, vào trang Tổng quan của Sale', 'Cấp token, hiển thị thực đơn và việc cần làm của Sale'),
    ('Chặn dò mật khẩu', 'Nhập sai mật khẩu tài khoản thilan 5 lần liên tiếp', 'Lần tiếp theo bị tạm chặn đăng nhập', 'Hệ thống báo tạm chặn (HTTP 429), mật khẩu đúng cũng chưa vào được'),
    ('Xác thực hai lớp', 'Kế toán thihong đăng nhập lần đầu, quét QR và nhập mã 6 số', 'Bắt buộc cài 2FA, nhận 8 mã dự phòng', 'Hiển thị mã QR; mã sai bị từ chối, mã đúng cấp token và 8 mã dự phòng'),
    ('Thu hồi phiên', 'Admin khoá tài khoản vanhung khi người này đang đăng nhập', 'Phiên đang dùng hết hiệu lực ngay', 'Yêu cầu tiếp theo của vanhung trả 401, giao diện quay về màn đăng nhập'),
    ('Chia số theo tỷ lệ', 'Tỷ lệ 70% / 30% cho 2 Sale, nhập 20 số mới', 'Sale A nhận 14 số, Sale B nhận 6 số', 'Chia đúng 14 / 6, mỗi Sale nhận thông báo'),
    ('Chống trùng số', 'Nhập "+84 912 345 678" khi đã có khách 0912345678', 'Không tạo khách mới, báo Sale đang giữ số', 'Dòng bị bỏ qua, hiển thị tên Sale đang giữ'),
    ('Nhập số từ tệp', 'Tệp Excel có cột SĐT kiểu số (mất số 0 đầu), cột đảo thứ tự', 'Đọc đúng số điện thoại và các cột', 'Tự thêm số 0, nhận đúng tên, địa chỉ, nhu cầu'),
    ('Chăm sóc khách', 'Chọn trạng thái "Hẹn gọi lại" nhưng không chọn thời điểm', 'Báo lỗi, không lưu', 'Báo bắt buộc chọn thời điểm hẹn ở tương lai'),
    ('Chốt đơn', 'Chốt đơn chưa nhập địa chỉ công trình và vật tư', 'Không chốt, liệt kê phần còn thiếu', 'Trả 400 kèm danh sách mục còn thiếu'),
    ('Tự giao đơn', 'Chốt một đơn hoàn thiện hợp lệ', 'Đơn giao cho Vận hành có ít đơn mở nhất', 'Đơn được giao đúng người, Vận hành nhận thông báo'),
    ('Chuyển bước', 'Bấm "Xong" ở bước Lên phương án khi chưa có phương án', 'Không cho qua bước', 'Báo cần nhập phương án, đơn giữ nguyên bước'),
    ('Đặt hàng NCC', 'Chọn NCC cho vật tư mua ngoài, bấm "Đặt hàng"', 'Tin đặt hàng gửi nhóm Telegram NCC, có 2 nút phản hồi', 'Tin gửi đúng nhóm, không chứa tên và SĐT khách'),
    ('NCC yêu cầu cọc', 'NCC nhập số tiền cọc lớn hơn hoặc bằng tiền hàng', 'Từ chối số tiền cọc', 'Bot báo số tiền không hợp lệ, yêu cầu nhập lại'),
    ('NCC yêu cầu cọc', 'NCC trả lời tin nhắn bằng "50k"', 'Lập đề xuất cọc 50.000 đ kèm mã QR', 'Vật tư chuyển "Chờ cọc", đề xuất gửi nhóm duyệt chi'),
    ('Duyệt chi qua Telegram', 'Một người không có quyền bấm "Duyệt" trong nhóm', 'Thao tác bị từ chối', 'Đề xuất giữ trạng thái "Chờ duyệt"'),
    ('Xác nhận đã chi', 'Kế toán trả lời tin đề xuất bằng ảnh bill', 'Đề xuất "Đã chi", vật tư sẵn hàng', 'Ghi phiếu thanh toán, vật tư "Sẵn hàng", tin nhắn bỏ nút'),
    ('Ghi nhận thanh toán', 'Sale ghi nhận khách chuyển khoản nhưng không tải ảnh bill', 'Không lưu phiếu thu', 'Báo bắt buộc ảnh bill với chuyển khoản'),
    ('Đối soát ngân hàng', 'Webhook tiền vào, nội dung chứa mã đơn bị mất dấu gạch', 'Tự xác nhận phiếu thu chờ đúng số tiền', 'Phiếu thu chuyển "Đã xác nhận", Sale và Kế toán được báo'),
    ('Đối soát ngân hàng', 'Ngân hàng gửi lại cùng một mã giao dịch lần thứ hai', 'Không ghi nhận lần hai', 'Bỏ qua giao dịch trùng, số đã thu không đổi'),
    ('Nghiệm thu, quyết toán', 'Xác nhận nghiệm thu, sau đó bấm "Chốt quyết toán"', 'Đơn sang Hoàn tất, ghi công thợ phải trả', 'Đơn Hoàn tất, sổ công nợ đội thợ có khoản phải trả'),
    ('Báo cáo lãi/lỗ', 'Kế toán xuất Excel lãi/lỗ theo khoảng ngày', 'Tệp .xlsx có dòng tổng khớp số liệu', 'Tải được tệp, dòng tổng khớp với báo cáo trên web'),
    ('Phân quyền', 'Admin bỏ quyền "Xem khách hàng" của vai trò Sale', 'Sale bị chặn ngay ở API khách hàng', 'API trả 403 ở yêu cầu kế tiếp, mục Khách hàng ẩn'),
    ('Hỏi trợ lý AI', 'Sale hỏi trợ lý Sàn từ hồ sơ khách của mình', 'AI chỉ nhận kiến thức Sàn, nhóm khách và nhu cầu', 'Nội dung gửi AI không có tên, SĐT khách; trả lời kèm mẫu tin nhắn'),
    ('Cấu hình 2FA theo vai trò', 'Admin bật 2FA cho Sale, chọn đăng xuất ngay', 'Sale chưa cài bị đăng xuất, lần sau phải cài', 'Token cũ của Sale hết hiệu lực, đăng nhập lại hiển thị mã QR'),
]
assert len(CA) == 24
ct31 = tim('Bảng 3.1. Bảng kết quả kiểm thử')
b31 = bang_sau(ct31)
for r, (cn, vao, mong, thuc) in zip(list(b31.rows)[1:], CA):
    for o, v in zip(r.cells[1:], (cn, vao, mong, thuc, 'Đạt')):
        dat_o(o, v)
chen_sau(ct31._p.getprevious(), [doan_moi(MAU_DOAN, 'Bảng 3.1 trình bày 24 ca kiểm thử tiêu biểu cho các use case chính, mỗi ca đều đã được tự động hoá trong bộ kiểm thử và được thử lại thủ công trên giao diện.')])
dong32 = [(f'{i + 1}', TEN_NHOM[n['tep']], str(n['so']), f"{n['dat']}/{n['so']}") for i, n in enumerate(nhom)]
dong32.append(('', 'Tổng cộng', str(TONG), f'{DAT}/{TONG}'))
chen_sau(b31._tbl, [
    doan_moi(MAU_DOAN, f'Kết quả chạy toàn bộ bộ kiểm thử tự động được tổng hợp theo nhóm ở Bảng 3.2 và Hình 3.1: {DAT}/{TONG} ca đạt, không có ca nào trượt; thời gian chạy toàn bộ khoảng 2,5 phút. Lệnh npm run test:bao-cao đồng thời xuất báo cáo chi tiết từng ca ra tệp KET_QUA_KIEM_THU.md.'),
    *bang4('Bảng 3.2. Tổng hợp kết quả kiểm thử tự động theo nhóm', ('STT', 'Nhóm kiểm thử', 'Số ca', 'Đạt'), dong32, (9, 61, 14, 16)),
    *hinh('c3_4_ket_qua_kiem_thu.png', 'Hình 3.1. Kết quả chạy bộ kiểm thử tự động'),
])
chen_noi_dung('3.2.3. Đánh giá kết quả kiểm thử', [
    'Sau quá trình kiểm thử, có thể đánh giá hệ thống như sau:',
    ('-', 'Tính đúng đắn: các luồng nghiệp vụ chính hoạt động đúng đặc tả, kể cả các nhánh ngoại lệ. Kiểm thử cũng giúp phát hiện lỗi thật trong quá trình phát triển, ví dụ điều kiện "đủ hàng" từng đếm theo dòng mua hàng nên đơn chưa ai mở màn Mua hàng bị coi là đủ hàng (phát hiện nhờ kịch bản đầu–cuối), hay lỗi lưu số lượng thực tế khi nghiệm thu; sau khi sửa, mỗi lỗi được giữ lại thành một ca kiểm thử hồi quy.'),
    ('-', 'Phân quyền và bảo mật: mọi API đọc dữ liệu được gọi lần lượt bằng cả bốn vai trò mà không phát sinh lỗi máy chủ; người không có quyền nhận đúng mã 401 hoặc 403; nội dung gửi ra Telegram và Gemini không chứa thông tin cá nhân của khách hàng.'),
    ('-', 'Toàn vẹn dữ liệu: thao tác lỗi giữa chừng không để lại thông báo hay nhật ký sai; chốt nhiều đơn hoặc nhập nhiều lô số cùng lúc vẫn chia đúng, không trùng mã hợp đồng.'),
    ('-', 'Giao diện: các màn hình hiển thị đúng dữ liệu theo vai trò trên máy tính và điện thoại.'),
    'Kiểm thử vẫn còn hạn chế: giao diện mới được kiểm thử thủ công, chưa có kiểm thử tự động ở mức trình duyệt; trong kiểm thử tự động, Telegram và Gemini là giả lập nên chất lượng câu trả lời của AI chỉ được đánh giá bằng cách hỏi thử trực tiếp; hệ thống chưa được kiểm thử tải với nhiều người dùng đồng thời.',
])
# ================================================================ 3.3 THUC NGHIEM
kq = {k['ten']: k for k in hn['ket_qua']}
dong33 = [(str(i + 1), k['ten'], ms(k['trung_vi_ms']), ms(k['cham_nhat_ms'])) for i, k in enumerate(hn['ket_qua'])]
chen_noi_dung('3.3.1. Một số kết quả đạt được', [
    f'Để đánh giá hệ thống trong điều kiện gần với thực tế, em chạy thử trên bộ dữ liệu mẫu lớn mô phỏng 12 tháng hoạt động của doanh nghiệp, gồm {so(DL["don"])} đơn hàng với {so(DL["dong_vt"])} dòng vật tư, {so(DL["khach"])} khách hàng, {so(DL["cham_soc"])} lần chăm sóc, {so(DL["dxc"])} đề xuất chi, {so(DL["phieu_thu"])} phiếu thu và {so(DL["log_tien_do"])} lần chuyển bước tiến độ. Mỗi API được gọi 10 lần liên tiếp trên máy phát triển (Intel Core i7-1255U, RAM 16 GB); Bảng 3.3 ghi trung vị và lần chậm nhất.',
    *bang4('Bảng 3.3. Thời gian phản hồi của một số API trên dữ liệu mẫu lớn', ('STT', 'Chức năng', 'Trung vị (ms)', 'Chậm nhất (ms)'), dong33, (9, 51, 20, 20)),
    f'Phần lớn các thao tác thường dùng như xem chi tiết đơn, danh sách khách của Sale, công nợ nhà cung cấp hay báo cáo chăm sóc khách hàng phản hồi dưới 50 ms. Đăng nhập mất khoảng {kq["Đăng nhập (bcrypt)"]["trung_vi_ms"]} ms, chủ yếu do bcrypt được thiết kế chậm để chống dò mật khẩu. Các chức năng phải tính tiền trên toàn bộ đơn hàng thông qua view v_don_hang_tien chậm hơn rõ rệt: trang Tổng quan và danh sách đơn khoảng 1,1 giây, công nợ khách hàng khoảng 2,2 giây, báo cáo lãi/lỗ 12 tháng khoảng 3,8 giây. Thời gian này vẫn chấp nhận được với quy mô doanh nghiệp hiện tại nhưng là điểm cần tối ưu khi dữ liệu tăng.',
    'Một số kết quả khác của hệ thống khi chạy thực tế được minh hoạ dưới đây. Khách hàng mở đường dẫn báo giá trên điện thoại mà không cần tài khoản; báo giá luôn lấy số liệu mới nhất của đơn và có thể in hoặc lưu thành PDF (Hình 3.2).',
    *hinh('c3_1_bao_gia_dien_thoai.png', 'Hình 3.2. Khách hàng xem báo giá trên điện thoại'),
    'Sau mỗi thao tác, người liên quan nhận thông báo trong hệ thống. Hình 3.3 là hộp thông báo của nhân viên vận hành sau khi Sale gửi hai yêu cầu sửa đơn và Admin chuyển thêm một đơn sang cho người này kèm lý do.',
    *hinh('c3_2_thong_bao.png', 'Hình 3.3. Thông báo đến nhân viên vận hành'),
    'Hình 3.4 là kết quả hỏi trợ lý AI sản phẩm Sàn bằng mô hình Gemini thật với ba câu hỏi nằm ngoài phạm vi: câu hỏi không liên quan công việc bị từ chối, câu hỏi về cửa được chuyển sang đúng trợ lý Cửa, còn mặt hàng công ty không kinh doanh thì trợ lý nói rõ và gợi ý sản phẩm thay thế có trong danh mục.',
    *hinh('c3_3_tro_ly_tu_choi.png', 'Hình 3.4. Trợ lý AI xử lý câu hỏi ngoài phạm vi'),
])

# ================================================================ KET LUAN
h1 = tim('1. Kết quả đạt được')
h2 = tim('2. Hướng phát triển trong tương lai')
dat(h2, '**3. Hướng phát triển trong tương lai**')
chen_sau(h1._p.getnext() if False else h2._p.getprevious(), [doan_moi(h1, '**2. Hạn chế**')])
chen_noi_dung('1. Kết quả đạt được', [
    'Đề tài đã xây dựng được hệ thống ERP trên nền tảng web cho doanh nghiệp NST, số hoá trọn vòng đời một đơn hàng từ khi có số điện thoại khách hàng tiềm năng đến khi quyết toán và thu đủ tiền. Các kết quả cụ thể gồm:',
    ('-', 'Về phân tích thiết kế: khảo sát quy trình thực tế, xác định các actor, đặc tả 21 use case, xây dựng biểu đồ trình tự, biểu đồ lớp cho các chức năng chính và thiết kế cơ sở dữ liệu 42 bảng có ràng buộc toàn vẹn chặt chẽ.'),
    ('-', 'Về chức năng: hoàn thiện các phân hệ nhập và chia số theo tỷ lệ, chăm sóc khách hàng, đơn hàng theo tiến độ có điều kiện, mua hàng và đặt hàng nhà cung cấp, thi công – nghiệm thu – quyết toán, đề xuất chi và công nợ, thu tiền và đối soát ngân hàng tự động, báo cáo lãi/lỗ xuất Excel, thông báo và quản trị hệ thống.'),
    ('-', 'Về tích hợp: nhà cung cấp phản hồi đơn đặt hàng, giám đốc duyệt chi và kế toán xác nhận đã chi được ngay trên Telegram; đề xuất chi kèm mã QR VietQR đúng ngân hàng và số tiền; giao dịch ngân hàng được tự đối chiếu với mã đơn.'),
    ('-', 'Về trí tuệ nhân tạo: mỗi sản phẩm có một trợ lý AI riêng trả lời Sale dựa trên tài liệu do doanh nghiệp soạn, nhận cả ảnh chụp công trình; AI còn nhận xét số liệu vật tư, giá nhà cung cấp và hiệu quả chăm sóc khách hàng. Mọi con số do cơ sở dữ liệu tính, thông tin cá nhân của khách không được gửi ra ngoài.'),
    ('-', 'Về an toàn và chất lượng: phân quyền theo chức năng và theo dữ liệu, xác thực hai lớp theo vai trò, nhật ký thay đổi, sao lưu tự động; bộ kiểm thử tự động 158 ca đều đạt.'),
    'Qua đề tài, em hiểu rõ hơn cách đi từ quy trình nghiệp vụ thực tế đến thiết kế và mã nguồn, cách bảo đảm toàn vẹn dữ liệu cho các nghiệp vụ liên quan đến tiền, cách tích hợp dịch vụ bên ngoài và mô hình ngôn ngữ lớn một cách có kiểm soát, cũng như thói quen viết kiểm thử tự động để thay đổi hệ thống mà không sợ làm hỏng chức năng cũ.',
])
chen_noi_dung('2. Hạn chế', [
    'Bên cạnh các kết quả trên, đề tài còn một số hạn chế:',
    ('-', 'Hệ thống mới được chạy thử trên dữ liệu mẫu mô phỏng và nhóm Telegram thử nghiệm, chưa trải qua thời gian vận hành chính thức đủ dài tại doanh nghiệp.'),
    ('-', 'Các báo cáo tính trên toàn bộ đơn hàng như lãi/lỗ cả năm, công nợ khách hàng còn chậm (2–4 giây trên 1.500 đơn).'),
    ('-', 'Hệ thống chưa quản lý tồn kho và sản xuất tại xưởng cửa, chưa có thông báo đẩy về điện thoại khi ứng dụng đang đóng.'),
    ('-', 'Trợ lý AI phụ thuộc dịch vụ Gemini bên ngoài, có lúc mô hình chính bị quá tải phải chuyển sang mô hình dự phòng; chất lượng câu trả lời phụ thuộc vào tài liệu kiến thức mà doanh nghiệp cập nhật.'),
    ('-', 'Giao diện chưa có kiểm thử tự động và hệ thống chưa được kiểm thử tải với nhiều người dùng đồng thời.'),
])
chen_noi_dung('3. Hướng phát triển trong tương lai', [
    'Từ những kết quả và hạn chế trên, hệ thống có thể tiếp tục phát triển theo các hướng sau:',
    ('-', 'Tối ưu hiệu năng báo cáo bằng chỉ mục phù hợp và bảng số liệu tổng hợp theo ngày, cập nhật dần thay vì tính lại trên toàn bộ đơn.'),
    ('-', 'Bổ sung phân hệ sản xuất và tồn kho cho xưởng cửa: lệnh sản xuất, định mức nguyên vật liệu, nhập – xuất kho.'),
    ('-', 'Gửi thông báo đẩy (Web Push) để nhân viên nhận việc ngay trên điện thoại kể cả khi chưa mở ứng dụng.'),
    ('-', 'Mở rộng trợ lý AI: cho phép tra cứu tình trạng đơn hàng trong phạm vi quyền của người hỏi, gợi ý báo giá sơ bộ từ ảnh hiện trạng và số đo.'),
    ('-', 'Viết kiểm thử tự động cho giao diện, kiểm thử tải, đóng gói hệ thống bằng Docker và triển khai lên máy chủ có HTTPS, giám sát lỗi.'),
])

# ================================================================ TAI LIEU THAM KHAO
# Xep theo ABC: tieng Viet theo TEN tac gia (to chuc theo ten), tieng Anh theo HO. Moi muc: (phan truoc, phan in nghieng, phan sau)
TV = [
    ('Nguyễn Thị Hương Lan, Vũ Thị Dương, Trần Đức Hào (2015), ', 'Giáo trình Phân tích thiết kế hướng đối tượng', ', NXB Khoa học và Kỹ thuật, Hà Nội.'),
    ('Trần Phương Nhung (2020), ', 'Giáo trình Lập trình web', ', NXB Thống kê, Hà Nội.'),
    ('Đỗ Ngọc Sơn, Phan Văn Viên, Nguyễn Phương Nga, ', 'Giáo trình Hệ quản trị cơ sở dữ liệu', ', NXB Khoa học và Kỹ thuật, Hà Nội.'),
    ('Casso, ', 'VietQR – API tạo mã QR', ', [Trực tuyến]. Có tại: https://www.vietqr.io/danh-sach-api/link-tao-ma-nhanh/api-tao-ma-qr/. Lần truy cập gần nhất 13/11/2026.'),
    ('SePay, ', 'Hướng dẫn tích hợp WebHooks', ', [Trực tuyến]. Có tại: https://docs.sepay.vn/tich-hop-webhooks.html. Lần truy cập gần nhất 13/11/2026.'),
]
TA = [
    ('Booch, G., Rumbaugh, J., Jacobson, I. (2005), ', 'The Unified Modeling Language User Guide', ', 2nd ed., Addison-Wesley, Boston.'),
    ('Express, ', 'Express 5.x – API Reference', ', [Trực tuyến]. Có tại: https://expressjs.com/en/5x/api.html. Lần truy cập gần nhất 13/11/2026.'),
    ('Fowler, M. (2002), ', 'Patterns of Enterprise Application Architecture', ', Addison-Wesley, Boston.'),
    ('Google, ', 'Gemini API Documentation', ', [Trực tuyến]. Có tại: https://ai.google.dev/gemini-api/docs. Lần truy cập gần nhất 13/11/2026.'),
    ('Jones, M., Bradley, J., Sakimura, N. (2015), ', 'JSON Web Token (JWT)', ', RFC 7519, IETF. Có tại: https://datatracker.ietf.org/doc/html/rfc7519. Lần truy cập gần nhất 13/11/2026.'),
    ("M'Raihi, D., Machani, S., Pei, M., Rydell, J. (2011), ", 'TOTP: Time-Based One-Time Password Algorithm', ', RFC 6238, IETF. Có tại: https://datatracker.ietf.org/doc/html/rfc6238. Lần truy cập gần nhất 13/11/2026.'),
    ('OpenJS Foundation, ', 'Node.js v22 Documentation', ', [Trực tuyến]. Có tại: https://nodejs.org/docs/latest-v22.x/api/. Lần truy cập gần nhất 13/11/2026.'),
    ('PostgreSQL Global Development Group, ', 'PostgreSQL 16 Documentation', ', [Trực tuyến]. Có tại: https://www.postgresql.org/docs/16/. Lần truy cập gần nhất 13/11/2026.'),
    ('React Team, ', 'React Documentation', ', [Trực tuyến]. Có tại: https://react.dev/. Lần truy cập gần nhất 13/11/2026.'),
    ('Telegram, ', 'Telegram Bot API', ', [Trực tuyến]. Có tại: https://core.telegram.org/bots/api. Lần truy cập gần nhất 13/11/2026.'),
    ('Vite Team, ', 'Vite Guide', ', [Trực tuyến]. Có tại: https://vite.dev/guide/. Lần truy cập gần nhất 13/11/2026.'),
]
for nhan, ds in (('Tiếng Việt', TV), ('Tiếng Anh', TA)):
    h = next(p for p in ds_doan() if p.text.strip() == nhan and not p.style.name.lower().startswith('toc'))
    mau = Paragraph(h._p.getnext(), d)
    assert mau.style.name == 'List Paragraph'
    moi = []
    for truoc, nghieng, sau in ds:
        e = doan_moi(mau, truoc + nghieng + sau)
        p = Paragraph(e, d)
        r0 = p.runs[0]._r
        p._p.remove(r0)
        for t, it in ((truoc, False), (nghieng, True), (sau, False)):
            r = copy.deepcopy(r0)
            p._p.append(r)
            from docx.text.run import Run
            run = Run(r, p); run.text = t; run.italic = True if it else None
        from docx.enum.text import WD_ALIGN_PARAGRAPH
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT  # URL dai: can deu hai ben lam gian chu
        moi.append(e)
    chen_sau(mau._p, moi)
    mau._p.getparent().remove(mau._p)

# ---- Trich dan [n] trong than bai (so thu tu theo danh muc tren: TV [1]-[5], TA [6]-[16])
TRICH = [
    ('Em sử dụng phương pháp phân tích hướng đối tượng với ngôn ngữ mô hình hoá UML', 'ngôn ngữ mô hình hoá UML', 'ngôn ngữ mô hình hoá UML [1], [6]'),
    ('Phần mềm được phát triển theo kiến trúc phân lớp', '(layered architecture)', '(layered architecture) [8]'),
    ('Hệ thống được phát triển trên nền tảng Node.js 22', 'framework Express 5', 'framework Express 5 [7], [12]'),
    ('Hệ thống được phát triển trên nền tảng Node.js 22', 'xác thực bằng JWT', 'xác thực bằng JWT [10]'),
    ('Xác thực hai lớp được em tự cài đặt theo thuật toán TOTP', 'chuẩn RFC 6238', 'chuẩn RFC 6238 [11]'),
    ('Để tích hợp Telegram, backend gọi trực tiếp Telegram Bot API', 'gọi trực tiếp Telegram Bot API', 'gọi trực tiếp Telegram Bot API [15]'),
    ('Theo cách tương tự, hệ thống nhận thông báo giao dịch ngân hàng', 'dịch vụ SePay', 'dịch vụ SePay [5]'),
    ('PostgreSQL 16 được lựa chọn làm hệ quản trị cơ sở dữ liệu', 'PostgreSQL 16 được', 'PostgreSQL 16 [3], [13] được'),
    ('Ở phía giao diện, hệ thống sử dụng React 18', 'sử dụng React 18', 'sử dụng React 18 [14]'),
    ('Ở phía giao diện, hệ thống sử dụng React 18', 'Vite giúp', 'Vite [16] giúp'),
    ('Đối với trợ lý AI, hệ thống sử dụng mô hình Gemini', 'thông qua Gemini API', 'thông qua Gemini API [9]'),
    ('Đối với trợ lý AI, hệ thống sử dụng mô hình Gemini', 'theo chuẩn VietQR', 'theo chuẩn VietQR [4]'),
    ('Front-end là ứng dụng một trang (SPA) bằng React 18', 'ứng dụng một trang (SPA)', 'ứng dụng một trang (SPA) [2]'),
]
for dau, cu, moi in TRICH:
    thay(tim(dau), cu, moi)

d.save(sys.argv[2])
print('Da luu', sys.argv[2], '| kiem thu', DAT, '/', TONG, '| nhom', len(nhom))
