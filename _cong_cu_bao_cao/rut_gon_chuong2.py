# Rut gon Chuong 2 (20/11/2026) vao ban dung thu: muc tieu ~47 trang (tu 101).
#   2.1-2.4 viet gon; 2.4.1 gop 5 bang thanh 1 bang theo nhom nguoi dung; 2.6: 21 -> 11 use case (gop UC lien quan,
#   them tro ly Quan ly / NCC vao UC Hoi tro ly AI); 2.8.1: 12 -> 6 chuc nang (+ bieu do trinh tu tro ly NCC);
#   2.8.2.1: chi tiet 12 bang loi, 30 bang con lai tom tat 1 bang; 2.9: 32 -> 12 anh. Danh lai so Hinh/Bang 2.x.
# Kem: Chuong 1 them tro ly Quan ly / NCC, sua cau "Rational Rose" cho dung cong cu thuc te.
# Chay: python rut_gon_chuong2.py <vao.docx> <ra.docx> [--chi-chuong2]
import json
import re

src = open(r'F:/DATN/_cong_cu_bao_cao/cap_nhat_v3_tro_ly_ai.py', encoding='utf-8').read()
exec(src[:src.index('# ================================================================ TU VIET TAT')])
ROSE = r'F:/DATN/_hinh/puml_rose/png'


# ---------------------------------------------------------------- tien ich them
def xoa(e):
    assert e.find('.//' + qn('w:sectPr')) is None and e.tag != qn('w:sectPr'), 'khong xoa ngat section'
    e.getparent().remove(e)


def xoa_khoang(a, b):
    """Xoa cac phan tu body tu a den truoc b."""
    e = a
    while e is not b:
        assert e is not None, 'khong gap phan tu ket thuc'
        n = e.getnext()
        xoa(e)
        e = n


def bo_bookmark(e):
    for tag in ('w:bookmarkStart', 'w:bookmarkEnd'):
        for b in list(e.iter(qn(tag))):
            b.getparent().remove(b)
    return e


def sao_doan(mau, text):
    e = bo_bookmark(copy.deepcopy(mau._p))
    dat(Paragraph(e, mau._parent), text)
    return e


def la_tieu_de(e):
    if e.tag != qn('w:p'):
        return False
    return Paragraph(e, d).style.name.startswith('Heading')


def thay_anh_cua(dau_chu_thich, duong):
    """Thay anh nam ngay truoc chu thich."""
    cap = tim(dau_chu_thich)
    inl = cap._p.getprevious().find('.//' + qn('wp:inline'))
    rid = inl.find('.//' + qn('a:blip')).get(qn('r:embed'))
    d.part.related_parts[rid]._blob = open(duong, 'rb').read()
    dat_kich_thuoc(inl, *cap_anh(duong))


def dat_doan(p, text):
    """Dat chu cho doan van, giu nguyen viec doan goc co / khong thut dau dong bang tab."""
    t = text.lstrip('	')
    dat(p, ('	' + t) if p.text.startswith('	') else t)


MAU_THUONG = tim('Các nghiệp vụ liên quan đến tiền và tiến độ chạy trong giao dịch')   # doan Normal co tab dau dong
MAU_CHU_THICH_BANG = tim('Bảng 2.2. Bảng yêu cầu chức năng phía nhân viên kinh doanh')
MAU_CHU_THICH_HINH = tim('Hình 2.28. Biểu đồ trình tự usecase Hỏi trợ lý AI sản phẩm')
MAU_ANH = Paragraph(MAU_CHU_THICH_HINH._p.getprevious(), d)
MAU_BANG_3COT = copy.deepcopy(bang_sau(tim('Bảng 2.6. Bảng yêu cầu chức năng về phía actor bên ngoài'))._tbl)

# ================================================================ CHUONG 1 (bo qua khi chay voi --chi-chuong2)
if '--chi-chuong2' not in sys.argv:
    thay(tim('Báo cáo và trợ lý AI:'), 'trợ lý AI tư vấn theo từng sản phẩm.',
         'trợ lý AI tư vấn theo từng sản phẩm; trợ lý AI giúp quản lý tra cứu tình hình chăm sóc khách và nhà cung cấp.')
    thay(tim('Admin (giám đốc):'), 'soạn kiến thức cho trợ lý AI.',
         'soạn kiến thức cho trợ lý AI, hỏi trợ lý AI về tình hình chăm sóc khách và nhà cung cấp.')
    thay(tim('Visual Studio Code là môi trường'),
         'Rational Rose được dùng để vẽ biểu đồ use case, biểu đồ trình tự, biểu đồ lớp và biểu đồ thực thể liên kết.',
         'Biểu đồ use case, biểu đồ trình tự, biểu đồ lớp và biểu đồ thực thể liên kết được vẽ theo ký pháp UML của Rational Rose bằng PlantUML và script vẽ SVG.')
    thay(tim('Gemini API [9]:'), 'mọi con số do cơ sở dữ liệu tính toán, AI chỉ diễn giải.',
         'mọi con số do cơ sở dữ liệu tính toán, AI chỉ diễn giải. Trợ lý quản lý và trợ lý NCC dùng cơ chế gọi hàm (function calling): AI chọn hàm tra cứu, back-end chạy truy vấn, tên NCC và số tiền được thay bằng mã trước khi gửi AI.')

# ================================================================ 2.1 - 2.3
GACH_21 = [
    ('Tiến độ đơn hàng không minh bạch', 'Tiến độ đơn hàng không minh bạch: Sale không biết đơn đang ở bước nào sau khi bàn giao; việc giao đơn cho vận hành làm thủ công, dễ bỏ sót hoặc hai người cùng xử lý một đơn.'),
    ('Đặt hàng NCC qua điện thoại', 'Đặt hàng NCC qua điện thoại, Zalo: không lưu nội dung đã đặt, yêu cầu cọc chỉ qua lời nhắn, khó đối chiếu giá đã chốt với giá NCC tính tiền.'),
    ('Duyệt chi và công nợ khó truy vết', 'Duyệt chi và công nợ khó truy vết: đề xuất chi là tin nhắn tự do trong nhóm Telegram, không biết ai đã duyệt, dễ chi trùng; công nợ NCC và đội thợ tổng hợp tay cuối kỳ.'),
    ('Thu tiền khách không đối soát được', 'Thu tiền khách không đối soát được: kế toán dò từng dòng sao kê ngân hàng; đơn hoàn tất mà khách còn nợ dễ bị bỏ quên.'),
    ('Số khách tiềm năng chia tay', 'Số khách tiềm năng chia tay: không biết mỗi Sale đã nhận bao nhiêu số, số trùng bị gọi nhiều lần, số chia rồi không ai gọi.'),
    ('Không biết lãi lỗ từng đơn', 'Thông tin phân tán: chỉ biết lãi lỗ tổng cuối kỳ, muốn biết vật tư nào bán chạy, NCC nào giá tốt phải lọc nhiều bảng tính; không biết ai đã sửa số liệu gì, dữ liệu không có bản sao lưu.'),
]
for dau, moi in GACH_21:
    dat_doan(tim(dau), moi)
for dau in ('Đối soát sao kê thủ công', 'Thông tin phân tán, khó kiểm soát'):
    xoa(tim(dau)._p)

xoa(tim('Phân tích và đặc tả yêu cầu là giai đoạn nền tảng')._p)
dat_doan(tim('Em sử dụng phương pháp phân tích hướng đối tượng'),
    '\tEm sử dụng phương pháp phân tích hướng đối tượng với ngôn ngữ mô hình hoá UML [1], [6]: yêu cầu thu thập qua khảo sát được chia thành yêu cầu chức năng và phi chức năng, mô hình hoá bằng biểu đồ use case và đặc tả luồng sự kiện; phần thiết kế dùng biểu đồ trình tự, biểu đồ lớp và biểu đồ thực thể liên kết (ERD), vẽ theo ký pháp của Rational Rose. Vì nghiệp vụ đơn hàng là chuỗi bước có điều kiện, phần đặc tả bổ sung bảng trạng thái tiến độ và quy tắc chuyển bước.')

dat_doan(tim('Vòng đời bắt đầu từ số khách tiềm năng'),
    '\tVòng đời bắt đầu từ số khách tiềm năng: số điện thoại được nhập tay, dán hàng loạt, tải tệp Excel, CSV, TXT hoặc do website và kênh quảng cáo tự đẩy qua API. Hệ thống chống trùng số và tự chia cho Sale theo tỷ lệ Admin đặt (giao cho Sale đang thiếu nhiều nhất so với tỷ lệ trong tháng); Admin có thể chọn Sale nhận hoặc chuyển số. Sale tự tìm được khách thì tự nhập, số thuộc về chính Sale đó.')
dat_doan(tim('Sau khi nhận số, Sale gọi cho khách'),
    '\tSale gọi cho khách và ghi nhận kết quả mỗi cuộc gọi bằng một trạng thái: không nghe máy, thuê bao, hẹn gọi lại (bắt buộc chọn giờ hẹn, đến giờ hệ thống nhắc), quan tâm, chốt đơn (chuyển thẳng sang tạo đơn), không quan tâm hoặc sai số (bắt buộc ghi lý do). Admin theo dõi báo cáo chăm sóc theo từng Sale (tỷ lệ đã gọi, tốc độ gọi lần đầu, tỷ lệ chốt, số tồn đọng), chuyển hàng loạt số tồn đọng sang Sale khác và nhờ AI nhận xét.')
dat_doan(tim('Mỗi khách hàng được gắn các sản phẩm quan tâm'),
    '\tMỗi khách được gắn sản phẩm quan tâm (Cửa, Sàn, Tấm ốp), suy ra từ nhu cầu khách để lại và các đơn đã đặt. Khi tư vấn, Sale mở khung chat trợ lý AI ở bất kỳ màn hình nào: mỗi sản phẩm có một trợ lý riêng, trả lời dựa trên tài liệu kiến thức do Admin soạn và danh mục vật tư đang bán; Sale có thể gửi ảnh hiện trạng, câu trả lời kèm mẫu tin nhắn gửi khách. Quản lý có thêm hai trợ lý tự tra cứu dữ liệu: trợ lý Quản lý (tình hình chăm sóc, tư vấn khách của từng Sale) và trợ lý NCC (vật tư nên mua của NCC nào, lịch sử giá, công nợ NCC). Dữ liệu gửi AI không có tên, số điện thoại khách; tên NCC và số tiền được thay bằng mã, hệ thống đổi lại khi hiển thị.')
dat_doan(tim('Dòng tiền thu: Sale hoặc vận hành ghi nhận'),
    '\tDòng tiền thu: Sale hoặc vận hành ghi nhận khách thanh toán kèm ảnh bill, kế toán xác nhận "đã nhận tiền"; số còn phải thu được tính tức thời. Dịch vụ báo giao dịch (SePay) gửi về mỗi khoản tiền vào, ra tài khoản công ty: tiền vào có mã đơn trong nội dung được tự xác nhận vào phiếu thu, tiền ra khớp đề xuất chi đã duyệt được tự ghi "đã chi", giao dịch chưa khớp để kế toán khớp tay. Phát sinh thiếu, hỏng sau giao hàng được xử lý bằng phiếu mua bổ sung có chia trách nhiệm chi phí.')
xoa(tim('Đối soát ngân hàng: dịch vụ báo giao dịch')._p)
dat_doan(tim('Mọi thao tác quan trọng sinh thông báo'),
    '\tMọi thao tác quan trọng sinh thông báo đến đúng người liên quan. Hệ thống không quản lý tồn kho vật lý vì vật tư mua ngoài được NCC giao thẳng đến công trình; khách hàng xem báo giá qua đường dẫn, NCC và người duyệt chi tương tác qua Telegram mà không cần tài khoản.')
dat_doan(tim('Ở tầng quản trị, Admin và kế toán xem báo cáo'),
    '\tỞ tầng quản trị, Admin và kế toán xem báo cáo lãi/lỗ gộp theo đơn và xuất Excel; Admin cấu hình phân quyền theo chức năng, xác thực hai lớp theo vai trò, tham số nghiệp vụ, xem nhật ký thay đổi và sao lưu dữ liệu tự động hằng ngày.')

# ================================================================ 2.4.1: 1 bang theo nhom nguoi dung
YEU_CAU = [
    ('Sale', [
        ('Chăm sóc khách hàng', 'Ghi nhận từng lần gọi theo trạng thái, cập nhật nhanh trên danh sách; gắn sản phẩm quan tâm; "Việc cần làm" nhắc số mới chưa gọi, lịch hẹn đến giờ.'),
        ('Nhập số tự tìm', 'Nhập từng số, dán nhiều số hoặc tải tệp Excel, CSV, TXT; chống trùng số.'),
        ('Tạo và chốt đơn hàng', 'Lưu nháp hoặc chốt đơn; gửi link báo giá cho khách; theo dõi tiến độ, gửi yêu cầu sửa đơn đã chốt.'),
        ('Ghi nhận khách thanh toán', 'Ghi nhận chuyển khoản (kèm bill) hoặc tiền mặt; gửi QR thu tiền cho khách.'),
        ('Hỏi trợ lý AI sản phẩm', 'Chọn trợ lý Cửa, Sàn hoặc Tấm ốp; hỏi bằng chữ hoặc gửi tối đa 3 ảnh; xem lại các cuộc trò chuyện.'),
    ]),
    ('Vận hành', [
        ('Cập nhật tiến độ', 'Lên phương án, xác nhận khối lượng vật tư, chuyển hoặc lùi bước, huỷ đơn (ghi lý do).'),
        ('Mua hàng', 'Chọn NCC theo bảng giá, đặt hàng NCC qua Telegram, xử lý cọc, xác nhận đã lấy hàng.'),
        ('Thi công, nghiệm thu, quyết toán', 'Lập giai đoạn, phân đội thợ (cảnh báo trùng lịch), nhập khối lượng thực tế, chốt quyết toán.'),
        ('Mua bổ sung', 'Lập phiếu khi thiếu, hỏng hàng, ghi nguồn trách nhiệm chi phí.'),
    ]),
    ('Kế toán', [
        ('Vật tư, NCC, bảng giá', 'Danh mục vật tư, NCC, giá theo thời gian hiệu lực (không chồng lấn), so sánh giá.'),
        ('Đề xuất chi, xác nhận đã chi', 'Lập đề xuất cọc, quyết toán NCC, trả công thợ; quét QR chuyển khoản, xác nhận kèm ảnh bill trên web hoặc Telegram.'),
        ('Công nợ, đối soát ngân hàng', 'Công nợ NCC, đội thợ, khách hàng; xác nhận tiền về; khớp tay giao dịch ngân hàng chưa khớp.'),
        ('Báo cáo, phân tích', 'Lãi/lỗ theo đơn, xuất Excel; vật tư bán chạy, giá NCC kèm nhận xét của AI.'),
    ]),
    ('Quản lý (Admin)', [
        ('Người dùng, phân quyền', 'Tạo tài khoản, đổi vai trò, khoá; ma trận quyền theo chức năng; bật, tắt xác thực hai lớp theo vai trò.'),
        ('Duyệt chi, điều phối', 'Duyệt, từ chối đề xuất chi trên web hoặc Telegram; chuyển đơn sang vận hành khác.'),
        ('Nhập số, báo cáo chăm sóc', 'Nhập số, đặt tỷ lệ chia; theo dõi hiệu quả chăm sóc từng Sale, chuyển số tồn đọng, AI nhận xét.'),
        ('Trợ lý AI', 'Soạn kiến thức cho trợ lý từng sản phẩm; hỏi trợ lý Quản lý (chăm sóc khách của Sale) và trợ lý NCC (chọn NCC, giá nhập, công nợ NCC).'),
        ('Giám sát, nhật ký, sao lưu', 'Xem mọi đơn, KPI, lãi/lỗ; nhật ký thay đổi dữ liệu; sao lưu, cấu hình tham số.'),
    ]),
    ('Actor bên ngoài', [
        ('Người duyệt chi, Kế toán (Telegram)', 'Duyệt, từ chối đề xuất chi; xác nhận đã chi bằng ảnh bill.'),
        ('Nhà cung cấp (Telegram)', 'Phản hồi đơn đặt hàng: "Cho xuất hàng" hoặc "Yêu cầu cọc".'),
        ('Khách hàng', 'Xem báo giá qua đường dẫn, không cần tài khoản.'),
        ('Gemini AI', 'Trả lời các trợ lý AI, đọc tài liệu cho Admin, nhận xét số liệu.'),
        ('Ngân hàng (SePay), website', 'Webhook giao dịch để đối soát; API đẩy số khách tiềm năng.'),
    ]),
]
h241 = tim('2.4.1. Yêu cầu chức năng')
xoa_khoang(tim('2.4.1.1. Về phía nhân viên kinh doanh')._p, tim('2.4.2. Yêu cầu phi chức năng')._p)
dong = [(nhom if i == 0 else '', cn, mt) for nhom, ds in YEU_CAU for i, (cn, mt) in enumerate(ds)]
tbl = bang_cot(Table(MAU_BANG_3COT, d), dong)
t = Table(tbl, d)
for o, v in zip(t.rows[0].cells, ('Nhóm', 'Chức năng', 'Mô tả')):
    dat_o(o, v)
r = 1
for nhom, ds in YEU_CAU:    # gop o "Nhom" theo chieu doc
    if len(ds) > 1:
        o = t.cell(r, 0).merge(t.cell(r + len(ds) - 1, 0))
        for p in o.paragraphs[1:]:
            if not p.text.strip():
                p._p.getparent().remove(p._p)
    r += len(ds)
chen_sau(h241._p, [
    sao_doan(MAU_THUONG, '\tYêu cầu chức năng của từng nhóm người dùng và actor bên ngoài được tổng hợp ở Bảng 2.@YC; luồng xử lý của các chức năng chính được đặc tả ở mục 2.6.'),
    sao_doan(MAU_CHU_THICH_BANG, 'Bảng 2.@YC. Bảng yêu cầu chức năng theo nhóm người dùng'),
    tbl,
])

# ================================================================ 2.4.2
dat_doan(tim('Giao diện theo mô hình Single Page Application'),
    '\tGiao diện theo mô hình Single Page Application; thực đơn và trang Tổng quan khác nhau theo vai trò, khối "Việc cần làm" ở đầu trang. Hỗ trợ chế độ sáng, tối và hiển thị tốt trên điện thoại (rà soát ở khổ 390 px); ứng dụng là PWA, cài được lên màn hình chính điện thoại. Nút thao tác chỉ hiện với người có quyền.')
BAO_MAT = [
    ('Xác thực bằng JWT', 'Xác thực bằng JWT, mật khẩu băm bcrypt, sai 5 lần trong 15 phút bị tạm chặn; khoá, đổi vai trò hoặc đổi mật khẩu làm token cũ hết hiệu lực ngay.'),
    ('Xác thực hai lớp (TOTP', 'Xác thực hai lớp TOTP (RFC 6238) bật theo vai trò do Admin cấu hình; khoá bí mật lưu mã hoá AES-256-GCM, mỗi mã chỉ dùng một lần, có mã dự phòng.'),
    ('Thu hồi phiên ngay lập tức', 'Phân quyền hai lớp: theo chức năng (ma trận vai trò × quyền) ở tầng route và theo dữ liệu ở tầng nghiệp vụ (Sale chỉ thấy khách, đơn của mình); mọi kiểm tra thực hiện ở máy chủ.'),
    ('Phân quyền hai lớp', 'Chống giả mạo kênh ngoài: khoá API so sánh thời gian hằng; webhook Telegram có secret token, nút bấm chỉ hợp lệ trong đúng nhóm và đúng tin nhắn của chứng từ.'),
    ('API cho hệ thống ngoài', 'Lưu vết bằng trigger CSDL kèm người thao tác và kênh; ảnh bill được kiểm tra định dạng thật, giới hạn 4 MB, chỉ xem qua API có đăng nhập.'),
    ('Lưu vết: trigger', 'Tối thiểu hoá dữ liệu gửi ra ngoài: đơn đặt hàng gửi NCC không có thông tin khách; AI không nhận tên, số điện thoại, địa chỉ khách; với trợ lý Quản lý và trợ lý NCC, tên NCC được thay bằng mã (NCC-3) và số tiền bằng mã ([[T1]]) kèm tỷ lệ %, hệ thống đổi lại giá trị thật khi hiển thị; câu hỏi ngoài phạm vi bị từ chối.'),
]
for p, (dau, moi) in [(tim(dau), x) for x in BAO_MAT for dau in [x[0]]]:
    dat_doan(p, moi)
for dau in ('Telegram chống giả mạo', 'Ảnh bill được kiểm tra định dạng', 'Văn bản đặt hàng gửi NCC không chứa', 'Trợ lý AI chỉ nhận nhóm khách'):
    xoa(tim(dau)._p)
dat_doan(MAU_THUONG,
    '\tCác nghiệp vụ liên quan đến tiền và tiến độ chạy trong giao dịch (transaction) của PostgreSQL; khoá dòng (SELECT … FOR UPDATE) và khoá tư vấn (advisory lock) chống xử lý trùng khi nhiều người thao tác đồng thời. Ràng buộc đặt ngay tại CSDL: CHECK theo trạng thái, EXCLUDE chống chồng thời gian hiệu lực bảng giá, trigger chặn một dòng vật tư nằm trong hai đề xuất quyết toán; mỗi giao dịch ngân hàng chỉ được xử lý một lần dù ngân hàng gửi lại.')
dat_doan(tim('Loại vật tư (tự sản xuất / mua ngoài) là dữ liệu'),
    '\tLoại vật tư là dữ liệu chứ không cố định trong mã nguồn: thêm sản phẩm mới chỉ cần thêm danh mục, mỗi loại tự có một trợ lý AI riêng. Kênh Telegram, Gemini, ngân hàng nằm ở tầng tích hợp riêng; cấu trúc CSDL quản lý bằng các tệp migration đánh số; quyền và tham số nghiệp vụ lưu trong CSDL nên đổi quy định không cần sửa mã nguồn.')

# ================================================================ 2.5
dat_doan(tim('Quản lý (Admin) quản trị người dùng'),
    'Quản lý (Admin) quản trị người dùng, phân quyền và xác thực hai lớp theo vai trò, nhập số và quản lý tỷ lệ chia số, theo dõi báo cáo chăm sóc khách hàng, soạn kiến thức cho trợ lý AI sản phẩm, hỏi trợ lý AI quản lý và trợ lý NCC, duyệt đề xuất chi, điều phối vận hành, xem nhật ký thay đổi, sao lưu và cấu hình hệ thống.')
thay_anh_cua('Hình 2.1. Biểu đồ usecase tổng quan', f'{ROSE}/uc_tongquan.png')
thay_anh_cua('Hình 2.5. Biểu đồ usecase phía quản lý', f'{ROSE}/uc_admin.png')

# ================================================================ 2.6: 11 use case
H26 = tim('2.6. Đặc tả usecase')


def khoi_uc(dau):
    h = tim(dau)._p
    c = h.getnext()
    tb = c.getnext()
    assert tb.tag == qn('w:tbl')
    return h, c, tb


UC = [
    ('2.6.1. Đặc tả usecase Đăng nhập', 'Đăng nhập', {
        'actor': 'Sale, Vận hành, Kế toán, Admin',
        'mo_ta': 'Người dùng đăng nhập bằng tài khoản Admin cấp; vai trò đang bật xác thực hai lớp phải nhập thêm mã 6 số.',
        'truoc': 'Tài khoản đang hoạt động.',
        'chinh': '1. Người dùng nhập tên đăng nhập, mật khẩu.\n2. Hệ thống kiểm tra mật khẩu (bcrypt), trạng thái tài khoản.\n3. Nếu vai trò đang bật xác thực hai lớp: hệ thống cấp "mã tạm" 10 phút, người dùng nhập mã 6 số từ ứng dụng Authenticator.\n4. Hệ thống kiểm tra mã (lệch ±1 bước 30 giây, mã chưa dùng), cấp JWT kèm số phiên bản token, chuyển đến trang Tổng quan theo vai trò.',
        're': '2a. Sai thông tin: báo "Sai tên đăng nhập hoặc mật khẩu"; sai 5 lần trong 15 phút: tạm chặn.\n2b. Tài khoản bị khoá: báo đã bị khoá.\n3a. Lần đầu: hiện mã QR để quét; nhập đúng mã đầu tiên thì bật xác thực hai lớp và hiện 8 mã dự phòng.\n3b. Mất điện thoại: nhập mã dự phòng hoặc nhờ Admin đặt lại.\n3c. Admin bật, tắt xác thực hai lớp cho từng vai trò ở trang Người dùng; áp dụng từ lần đăng nhập tiếp theo.',
        'sau': 'Người dùng vào hệ thống đúng vai trò.'}),
    ('2.6.15. Đặc tả usecase Nhập và chia số', 'Nhập và chia số', None),
    ('2.6.18. Đặc tả usecase Chăm sóc khách hàng', 'Chăm sóc khách hàng', None),
    ('2.6.2. Đặc tả usecase Tạo và chốt đơn hàng', 'Tạo và chốt đơn hàng', None),
    ('2.6.3. Đặc tả usecase Chuyển tiến độ đơn hàng', 'Chuyển tiến độ đơn hàng', {
        'actor': 'Vận hành phụ trách, Admin',
        'mo_ta': 'Hoàn thành bước hiện tại (kể cả xác nhận khối lượng vật tư) để sang bước tiếp theo, hoặc lùi bước.',
        'truoc': 'Người thao tác phụ trách đơn; đơn chưa hoàn tất, chưa huỷ.',
        'chinh': '1. Ở bước Tính KLVT, vận hành nhập số lượng thực đo cho từng vật tư và bấm "Xác nhận khối lượng"; hệ thống tính lại tổng đơn, báo Sale nếu tổng thay đổi.\n2. Vận hành bấm "Xong" ở bước hiện tại.\n3. Hệ thống kiểm tra điều kiện của bước (Bảng 2.1).\n4. Hệ thống cập nhật bước (khoá lạc quan theo bước cũ), ghi lịch sử, thông báo Sale của đơn.',
        're': '1a. Dòng vật tư đã đặt hàng NCC: không cho đổi số lượng.\n2a. Lùi bước, huỷ đơn: bắt buộc ghi lý do; chỉ huỷ được trước khi giao hàng.\n3a. Chưa đạt điều kiện: báo lý do cụ thể.\n3b. Bước Mua hàng thiếu tạm ứng: chỉ qua được khi ghi lý do; hệ thống báo Admin và Kế toán.',
        'sau': 'Đơn ở bước mới, có lịch sử và thông báo.'}),
    ('2.6.5. Đặc tả usecase Đặt hàng nhà cung cấp', 'Đặt hàng nhà cung cấp', {
        'actor': 'Vận hành phụ trách, Kế toán; Nhà cung cấp (Telegram)',
        'mo_ta': 'Gửi đơn đặt hàng cho NCC và ghi nhận NCC cho xuất hàng hoặc yêu cầu cọc.',
        'truoc': 'Có dòng vật tư đã chọn NCC.',
        'chinh': '1. Người dùng chọn NCC cho các dòng vật tư (giá lấy từ bảng giá hiệu lực) và bấm "Đặt hàng".\n2. Hệ thống tạo đơn đặt hàng (không chứa thông tin khách), chuyển các dòng sang "Đã đặt", gửi vào nhóm Telegram NCC kèm nút "Cho xuất hàng" và "Yêu cầu cọc".\n3. NCC bấm "Cho xuất hàng"; hệ thống kiểm tra đúng nhóm, đúng tin nhắn, chuyển vật tư sang "Sẵn hàng".\n4. Hệ thống tự lập đề xuất quyết toán NCC (tiền hàng gồm VAT trừ cọc đã duyệt) và gửi nhóm duyệt chi.',
        're': '2a. Chưa cấu hình Telegram NCC: người dùng chép nội dung gửi NCC qua Zalo, ghi nhận phản hồi trên web.\n2b. Đã đặt hàng: khoá đổi NCC, giá; muốn đổi phải huỷ đặt hàng.\n3a. NCC bấm "Yêu cầu cọc": bot hỏi số tiền, NCC trả lời (ví dụ "2tr"); hệ thống kiểm tra cọc nhỏ hơn tiền hàng, chuyển vật tư sang "Chờ cọc" và tự lập đề xuất cọc.\n3b. Nút từ nhóm khác, tin khác: từ chối.',
        'sau': 'Có đề xuất chi tương ứng chờ duyệt.'}),
    ('2.6.7. Đặc tả usecase Duyệt đề xuất chi', 'Duyệt và chi đề xuất chi', {
        'actor': 'Admin (web), Người duyệt chi (Telegram); Kế toán',
        'mo_ta': 'Phê duyệt hoặc từ chối đề xuất chi; kế toán chuyển khoản và xác nhận đã chi.',
        'truoc': 'Đề xuất ở trạng thái "Chờ duyệt".',
        'chinh': '1. Người duyệt xem đề xuất (ảnh QR, số tiền, người nhận, nội dung chuyển khoản) và bấm "Duyệt".\n2. Hệ thống cập nhật trạng thái (chỉ khi còn chờ duyệt), ghi nhật ký người duyệt, thông báo Kế toán; tin Telegram đổi thành "Đã duyệt" kèm nút "Đã chi".\n3. Kế toán quét QR chuyển khoản, tải ảnh bill trên web hoặc bấm "Đã chi – gửi ảnh bill" và trả lời bằng ảnh trên Telegram.\n4. Hệ thống kiểm tra ảnh, tạo phiếu thanh toán, chuyển đề xuất sang "Đã chi"; nếu là cọc thì vật tư tự chuyển "Sẵn hàng" và tự lập quyết toán phần còn lại.',
        're': '1a. Từ chối: bắt buộc lý do; Kế toán sửa và gửi lại.\n1b. Người không có quyền bấm trên Telegram: từ chối.\n2a. Đề xuất đã được xử lý: không cập nhật lại.\n3a. Không phải ảnh hoặc quá 4 MB: báo lỗi.\n3b. Tiền ra tài khoản khớp nội dung chuyển khoản và số tiền: hệ thống tự ghi "đã chi" (UC09).',
        'sau': 'Đề xuất đã chi; công nợ NCC, đội thợ được cập nhật.'}),
    ('2.6.9. Đặc tả usecase Thi công và nghiệm thu', 'Thi công, nghiệm thu và quyết toán', {
        'actor': 'Vận hành phụ trách, Admin',
        'mo_ta': 'Lập giai đoạn thi công, theo dõi đến nghiệm thu và chốt giá trị cuối của đơn.',
        'truoc': 'Đơn hoàn thiện đã giao hàng (đơn chỉ bán vật tư đi thẳng tới Quyết toán).',
        'chinh': '1. Vận hành lập giai đoạn (đội thợ, khối lượng, giá công, ngày dự kiến).\n2. Thợ bắt đầu giai đoạn đầu: đơn tự sang Thi công; báo xong giai đoạn cuối: đơn tự sang Nghiệm thu.\n3. Vận hành nhập số lượng vật tư và khối lượng thi công thực tế, bấm "Xác nhận nghiệm thu": đơn sang Quyết toán.\n4. Người dùng xem bảng quyết toán (số lượng thực tế × giá, chiết khấu, phát sinh, cọc) và bấm "Chốt quyết toán"; hệ thống lưu giá trị quyết toán, ghi công thợ phải trả, chuyển đơn sang Hoàn tất.',
        're': '1a. Đội thợ trùng lịch: cảnh báo, cần xác nhận.\n3a. Hao hụt vật tư trên 10%: cảnh báo.\n4a. Đơn chỉ bán vật tư: số lượng thực tế lấy bằng số lượng đặt.',
        'sau': 'Đơn hoàn tất; công nợ khách và công thợ được xác định.'}),
    ('2.6.11. Đặc tả usecase Ghi nhận thanh toán của khách', 'Thu tiền khách và đối soát ngân hàng', {
        'actor': 'Sale, Vận hành (ghi nhận); Kế toán (xác nhận); Ngân hàng (SePay)',
        'mo_ta': 'Ghi nhận khách trả tiền, xác nhận tiền về và tự khớp giao dịch ngân hàng với phiếu thu, đề xuất chi.',
        'truoc': 'Đơn chưa huỷ, còn phải thu; đã cấu hình khoá webhook ngân hàng.',
        'chinh': '1. Sale gửi khách QR thu tiền (nội dung là mã đơn) và ghi nhận khoản thu kèm ảnh bill; hệ thống lưu phiếu "Chờ xác nhận", thông báo Kế toán.\n2. Ngân hàng gửi webhook giao dịch (mã giao dịch, số tiền, nội dung, chiều vào/ra); hệ thống kiểm tra khoá API, bỏ qua giao dịch đã xử lý.\n3. Tiền vào có mã đơn trong nội dung: xác nhận phiếu chờ đúng số tiền hoặc tạo phiếu đã xác nhận; tiền ra khớp đề xuất chi đã duyệt: ghi "đã chi" (UC07).\n4. Hệ thống cập nhật số đã thu, còn phải thu và thông báo Sale, Vận hành, Kế toán.',
        're': '1a. Chuyển khoản không có bill hoặc vượt số còn phải thu: báo lỗi.\n1b. Kế toán đối chiếu sao kê: bấm "Đã nhận tiền" hoặc "Chưa thấy tiền" (ghi lý do).\n3a. Không có mã đơn hoặc vượt số còn phải thu: giao dịch "Chưa khớp"; Kế toán khớp tay vào một đơn hoặc bỏ qua kèm lý do.',
        'sau': 'Phiếu thu, đề xuất chi được cập nhật; giao dịch có trạng thái rõ ràng.'}),
    ('2.6.13. Đặc tả usecase Hỏi trợ lý AI sản phẩm', 'Hỏi trợ lý AI', {
        'actor': 'Sale (trợ lý sản phẩm); Admin (trợ lý Quản lý, trợ lý NCC, soạn kiến thức); Gemini AI',
        'mo_ta': 'Người dùng hỏi trợ lý AI trong khung chat. Trợ lý sản phẩm (Cửa, Sàn, Tấm ốp) trả lời dựa trên tài liệu kiến thức; trợ lý Quản lý và trợ lý NCC tự gọi các hàm tra cứu dữ liệu thật.',
        'truoc': 'Có quyền dùng trợ lý tương ứng; sản phẩm đã được nạp kiến thức; đã cấu hình khoá Gemini API.',
        'chinh': '1. Người dùng mở khung chat (nút "Trợ lý" ở mọi màn hình), chọn trợ lý và nhập câu hỏi; trợ lý sản phẩm nhận thêm tối đa 3 ảnh.\n2. Trợ lý sản phẩm: hệ thống ghép tài liệu kiến thức, danh mục vật tư, nhóm khách và nhu cầu (nếu mở từ hồ sơ khách) cùng các lượt hỏi gần nhất rồi gửi Gemini.\n3. Trợ lý Quản lý, NCC: hệ thống thay tên NCC trong câu hỏi bằng mã; Gemini chọn hàm tra cứu (báo cáo chăm sóc, nhật ký chăm sóc, so sánh giá NCC, lịch sử giá, công nợ NCC...), back-end chạy truy vấn chỉ đọc, kết quả có tên NCC và số tiền ở dạng mã; Gemini viết câu trả lời.\n4. Hệ thống đổi mã về tên và số tiền thật, lưu cuộc trò chuyện (bản hiển thị và bản đã mã hoá để gửi lại ở lượt sau), hiển thị câu trả lời kèm nguồn đã tra.',
        're': '1a. Câu hỏi trống, ảnh sai định dạng hoặc quá 4 MB: báo lỗi.\n2a. Sản phẩm chưa có kiến thức: báo, không gọi AI.\n3a. Tên Sale hoặc vật tư mơ hồ: trợ lý hỏi lại kèm danh sách.\n3b. Câu hỏi ngoài phạm vi: trợ lý từ chối hoặc chỉ sang đúng trợ lý khác.\n3c. Mô hình quá tải: chuyển mô hình dự phòng; vẫn lỗi thì báo thử lại, không lưu câu hỏi.\n5. Admin soạn kiến thức cho từng sản phẩm (tối đa 60.000 ký tự) hoặc nạp từ tệp PDF, ảnh catalog nhờ Gemini đọc; có hiệu lực ngay ở câu hỏi tiếp theo.',
        'sau': 'Người dùng có câu trả lời; tên, số điện thoại khách, tên NCC và số tiền thật không bị gửi ra ngoài.'}),
    ('2.6.17. Đặc tả usecase Phân quyền theo chức năng', 'Phân quyền theo chức năng', None),
]
GIU = {u[0] for u in UC}
KHOI_CU = [tim(f'2.6.{i}. ')._p for i in range(1, 22)]
moi = []
for i, (dau, ten, nd) in enumerate(UC, 1):
    h, c, tb = khoi_uc(dau)
    dat(Paragraph(h, d), f'2.6.{i}. Đặc tả usecase {ten}')
    dat(Paragraph(c, d), f'Bảng 2.@UC{i}. Bảng đặc tả usecase {ten}')
    bang = Table(tb, d)
    dat_o(bang.cell(1, 1), f'UC{i:02d}')
    dat_o(bang.cell(2, 1), ten)
    if nd:
        for r_, k in zip(range(3, 9), ('actor', 'mo_ta', 'truoc', 'chinh', 're', 'sau')):
            dat_o(bang.cell(r_, 1), nd[k])
    moi.append((h, c, tb))
for h in KHOI_CU:              # xoa cac use case khong giu (heading + chu thich + bang)
    if not any(h is x[0] for x in moi):
        c = h.getnext()
        tb = c.getnext()
        for e in (h, c, tb):
            xoa(e)
for h, c, tb in moi:           # sap lai theo thu tu moi
    for e in (h, c, tb):
        e.getparent().remove(e)
moc = chen_sau(H26._p, [sao_doan(MAU_THUONG, '\tMục này đặc tả 11 use case chính; mỗi use case gộp các thao tác liên quan trên cùng một luồng nghiệp vụ (ví dụ duyệt và xác nhận đã chi, thi công đến quyết toán). Các use case còn lại như đổi mật khẩu, quản lý tài khoản, lập phiếu mua bổ sung, báo cáo chăm sóc khách hàng được thể hiện trên biểu đồ use case ở mục 2.5.')])
for h, c, tb in moi:
    moc = chen_sau(moc, [h, c, tb])
# Ma UC trong bang da viet moi; sua ma UC cu con lai trong o "Luong" cua UC giu nguyen noi dung
for o in (bang_sau(tim('Bảng 2.@UC3.')).cell(7, 1),):     # Cham soc: "(UC02)" -> tao don la UC04
    thay_o(o, '(UC02)', '(UC04)')

# ================================================================ 2.7
xoa(tim('Thiết kế chuyển các yêu cầu đã phân tích thành')._p)
dat_doan(tim('Back-end tổ chức theo kiến trúc phân lớp'),
    '\tBack-end tổ chức theo kiến trúc phân lớp: Routes khai báo đường dẫn và kiểm tra quyền, Controller nhận và trả dữ liệu HTTP, Service chứa quy tắc nghiệp vụ và giao dịch, Repository truy vấn PostgreSQL bằng câu lệnh SQL tham số hoá; các tích hợp ngoài (Telegram, Gemini, VietQR, SePay) nằm ở tầng tích hợp riêng. Người thao tác của mỗi request được truyền xuống PostgreSQL qua biến phiên để trigger nhật ký ghi đúng người.')

# ================================================================ 2.8.1: 6 chuc nang
for ten in ('Đăng nhập', 'Nhập và chia số', 'Xác nhận đã chi', 'Thi công, nghiệm thu và quyết toán', 'Ghi nhận thanh toán của khách', 'Báo cáo chăm sóc khách hàng'):
    h = [p for p in tim('2.8.1.', tat_ca=True) if f'“{ten}”' in p.text]
    assert len(h) == 1, ten
    e = h[0]._p.getnext()
    while not la_tieu_de(e):
        e = e.getnext()
    xoa_khoang(h[0]._p, e)
for i, p in enumerate(tim('2.8.1.', tat_ca=True)[1:], 1):    # [0] la "2.8.1. Cac bieu do ..."
    ten = re.search(r'“(.+)”', p.text).group(1).replace('Hỏi trợ lý AI sản phẩm', 'Hỏi trợ lý AI')
    dat(p, f'2.8.1.{i}. Chức năng “{ten}”')
cap_tl = tim('Hình 2.28. Biểu đồ trình tự usecase Hỏi trợ lý AI sản phẩm')
thay(cap_tl, 'usecase Hỏi trợ lý AI sản phẩm', 'trợ lý AI sản phẩm')
thay(tim('Hình 2.29. Biểu đồ lớp usecase Hỏi trợ lý AI sản phẩm'), 'Hỏi trợ lý AI sản phẩm', 'Hỏi trợ lý AI')
chen_sau(cap_tl._p, [
    sao_doan(MAU_THUONG, '\tVới trợ lý Quản lý và trợ lý NCC, AI không nhận sẵn dữ liệu mà tự yêu cầu gọi hàm tra cứu; back-end chạy truy vấn chỉ đọc, thay tên NCC và số tiền bằng mã trước khi gửi kết quả cho AI, rồi đổi lại khi hiển thị (Hình 2.@SEQNCC).'),
    doan_anh(f'{ROSE}/seq_tro_ly_ncc_xoay.png'),
    sao_doan(MAU_CHU_THICH_HINH, 'Hình 2.@SEQNCC. Biểu đồ trình tự trợ lý AI quản lý và NCC'),
])

# ================================================================ 2.8.2.1: 12 bang chi tiet + 1 bang tom tat
GIU_BANG = ['khach_hang', 'don_hang', 'ncc_bang_gia', 'de_xuat_chi', 'thanh_toan_khach', 'tro_ly_tin_nhan']
erd = json.load(open(r'F:/DATN/_hinh/puml_rose/erd_ve.json', encoding='utf-8'))
fk = {}
for f in erd['fk']:
    if f['den'] != f['bang'] and f['den'] not in fk.setdefault(f['bang'], []):
        fk[f['bang']].append(f['den'])
h2821 = tim('2.8.2.1. Thiết kế bảng cơ sở dữ liệu')
het = tim('View v_don_hang_tien là nguồn duy nhất')._p
tom_tat = []
e = h2821._p.getnext()
cur = None
while e is not het:
    n = e.getnext()
    if e.tag == qn('w:tbl'):
        giu = cur in GIU_BANG
    else:
        p = Paragraph(e, d)
        txt = p.text.strip()
        m = re.match(r'Bảng 2\.\d+\. Bảng (\w+) – (.+)', txt)
        m2 = re.match(r'Ràng buộc nhiều cột của bảng (\w+):', txt)
        if m:
            cur = m.group(1)
            if cur not in GIU_BANG:
                tom_tat.append((cur, m.group(2)))
            giu = cur in GIU_BANG
        elif m2:
            cur = m2.group(1)
            giu = cur in GIU_BANG
        elif p.style.name == 'List Paragraph':
            giu = cur in GIU_BANG
        else:                      # nhan "Phan he ...", doan trong
            giu = False
    if not giu:
        xoa(e)
    e = n
assert len(tom_tat) == 36, len(tom_tat)
tbl = bang_cot(Table(MAU_BANG_3COT, d), [(b, mt, ', '.join(fk.get(b, [])) or '–') for b, mt in tom_tat])
for o, v in zip(Table(tbl, d).rows[0].cells, ('Bảng', 'Mục đích', 'Khoá ngoại tới')):
    dat_o(o, v)
het.addprevious(sao_doan(MAU_THUONG, '\tCác bảng còn lại phục vụ thông báo, nhật ký, cấu hình và chi tiết của từng nghiệp vụ, được tóm tắt ở Bảng 2.@TOMTAT.'))
het.addprevious(sao_doan(MAU_CHU_THICH_BANG, 'Bảng 2.@TOMTAT. Các bảng còn lại của cơ sở dữ liệu'))
het.addprevious(tbl)
chen_sau(h2821._p, [sao_doan(MAU_THUONG, '\tMục này trình bày chi tiết 6 bảng lõi của các luồng nghiệp vụ chính: khách hàng, đơn hàng, bảng giá NCC, đề xuất chi, phiếu thu tiền khách và tin nhắn trợ lý AI; 36 bảng còn lại được tóm tắt ở Bảng 2.@TOMTAT.')])

# Bang tro ly: cot moi cua migration 038, 039
b = bang_sau(tim('Bảng 2.49. Bảng tro_ly_tin_nhan'))
dat_o([r_ for r_ in b.rows if r_.cells[0].text.strip() == 'vai_tro'][0].cells[3], 'Người gửi. Giá trị: user (người hỏi), model (AI trả lời)')
r_nd = [r_ for r_ in b.rows if r_.cells[0].text.strip() == 'noi_dung'][0]
r2 = them_dong(b, ('ma_tien', 'JSONB', 'Có', 'Giá trị thật của các mã tiền trong câu trả lời, để đổi đúng khi AI nhắc lại ở lượt sau'), mau_dong=1, sau=r_nd)
them_dong(b, ('noi_dung_ai', 'TEXT', 'Có', 'Bản đã mã hoá (tên NCC, số tiền thay bằng mã) gửi lại AI ở lượt sau; chỉ trợ lý Quản lý, NCC'), mau_dong=1, sau=r_nd)

# Do rong cot (cm, tong 15,5 = kho chu): cot "Ghi chu" / "Muc dich" rong de chu it xuong dong -> bang ngan hon.
def dat_rong(tbl_el, cms):
    # Bo cuc co dinh: neu de tu co gian, ten kieu dai (trang_thai_cham_soc_enum) lam Word noi rong cot do.
    pr = tbl_el.find(qn('w:tblPr'))
    lay = pr.find(qn('w:tblLayout'))
    if lay is None:
        lay = pr.makeelement(qn('w:tblLayout'), {})
        pr.find(qn('w:tblW')).addnext(lay)
    lay.set(qn('w:type'), 'fixed')
    dxa = [str(round(c * 567)) for c in cms]
    for g, w in zip(tbl_el.iter(qn('w:gridCol')), dxa):
        g.set(qn('w:w'), w)
    for tr in tbl_el.iter(qn('w:tr')):
        for tc, w in zip(tr.findall(qn('w:tc')), dxa):
            tcw = tc.find(qn('w:tcPr') + '/' + qn('w:tcW'))
            if tcw is not None:
                tcw.set(qn('w:w'), w)
                tcw.set(qn('w:type'), 'dxa')


for b_ in GIU_BANG:
    cap_ = [x for x in tim('Bảng 2.', tat_ca=True) if re.match(rf'Bảng 2\.\d+\. Bảng {b_} – ', x.text.strip())][0]
    dat_rong(cap_._p.getnext(), [3.7, 3.8, 1.6, 6.4])
dat_rong(tbl, [3.9, 6.3, 5.3])
dat_rong(bang_sau(tim('Bảng 2.@YC.'))._tbl, [2.6, 3.7, 9.2])

# ================================================================ 2.8.2.2 ERD
# Bo ERD tong quan (qua day, o kho A4 khong doc duoc); giu 5 ERD theo phan he.
cap_ = tim('Hình 2.30. Biểu đồ thực thể liên kết mức logic')
xoa(cap_._p.getprevious())
xoa(cap_._p)
thay_anh_cua('Hình 2.35. Biểu đồ thực thể liên kết phân hệ trợ lý AI', f'{ROSE}/erd_5_tro_ly_ai_rose.png')
thay(tim('Hình 2.35. Biểu đồ thực thể liên kết phân hệ trợ lý AI'), 'trợ lý AI sản phẩm', 'trợ lý AI')

# ================================================================ 2.9: giu 12 anh
BO_ANH = [37, 39, 40, 41, 43, 46, 49, 50, 51, 53, 54, 56, 58, 59, 60, 61, 63, 64, 66, 67]
for so in BO_ANH:
    cap = tim(f'Hình 2.{so}. ')
    anh = cap._p.getprevious()
    assert anh.findall('.//' + qn('w:drawing')), so
    xoa(anh)
    xoa(cap._p)

# ================================================================ danh lai so Hinh / Bang 2.x va ma tham chieu
def doan_chuong2():
    ra, on = [], False
    for p in ds_doan():
        t = p.text.strip()
        if p.style.name.lower().startswith('toc'):
            continue
        if t.startswith('CHƯƠNG II.'):
            on = True
        if t.startswith('CHƯƠNG III.'):
            break
        if on:
            ra.append(p)
    return ra


MAP = {'Hình': {}, 'Bảng': {}}
dem = {'Hình': 0, 'Bảng': 0}
for p in doan_chuong2():
    m = re.match(r'(Hình|Bảng) 2\.(\d+|@\w+)\. ', p.text.strip())
    if m and p.style.name in ('1hinh', '1bb'):
        dem[m.group(1)] += 1
        assert m.group(2) not in MAP[m.group(1)], m.group(0)
        MAP[m.group(1)][m.group(2)] = str(dem[m.group(1)])
MAU_SO = re.compile(r'(Hình|Bảng) 2\.(\d+|@\w+)(?![\d\w])')
mat = []


def doi(m):
    k = MAP[m.group(1)].get(m.group(2))
    if k is None:
        mat.append(m.group(0))
        return m.group(0)
    return f'{m.group(1)} 2.{k}'


for p in ds_doan():
    if p.style.name.lower().startswith('toc') or not MAU_SO.search(p.text):
        continue
    mong_doi = MAU_SO.sub(doi, p.text)
    for r_ in p.runs:
        if MAU_SO.search(r_.text):
            r_.text = MAU_SO.sub(doi, r_.text)
    assert p.text == mong_doi, f'tham chieu bi tach run: {p.text[:80]!r}'
print('Mat tham chieu (hinh/bang da bo):', sorted(set(mat)))
print('So hinh chuong 2:', dem['Hình'], '| so bang:', dem['Bảng'])
con_uc = sorted({m for p in doan_chuong2() for m in re.findall(r'UC\d+', p.text)})
print('Ma UC con trong chuong 2:', con_uc)
d.save(RA)
print('Da luu', RA)
