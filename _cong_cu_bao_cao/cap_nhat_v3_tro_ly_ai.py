# Sua ban dung thu bao cao DATN (13/11/2026): tu viet tat, Mo dau, Chuong 1, Chuong 2
# theo he thong hien tai: bo "Len don nhanh bang AI", them tro ly AI theo san pham, san pham quan tam,
# xac thuc hai lop theo vai tro. Dau vao: ban da gop run (bdt_gop.docx). Chay lai duoc tu dau.
import copy
import re
import sys
from PIL import Image
import docx
from docx.oxml.ns import qn
from docx.text.paragraph import Paragraph
from docx.table import Table

VAO, RA = sys.argv[1], sys.argv[2]
HINH = r'F:/DATN/_hinh'
ANH = r'F:/DATN/_cong_cu_bao_cao/anh'
d = docx.Document(VAO)
body = d.element.body
RONG = 5580000            # be rong anh lon nhat (EMU) dang dung trong bao cao
CAO_TOI_DA = 7600000      # ~21 cm: chua cho tieu de + chu thich 2 dong cung trang


# ---------------------------------------------------------------- tien ich
def ds_doan():
    return [Paragraph(p, d) for p in body.iter(qn('w:p'))]


def tim(dau, tat_ca=False):
    """Doan van (ca trong bang) bat dau bang `dau`; mac dinh phai duy nhat."""
    kq = [p for p in ds_doan() if p.text.strip().startswith(dau) and not p.style.name.lower().startswith('toc')]
    if tat_ca:
        return kq
    assert len(kq) == 1, f'{len(kq)} doan bat dau bang: {dau!r}'
    return kq[0]


def thay(p, cu, moi):
    """Thay chuoi trong 1 doan, giu dinh dang cua run chua dau chuoi."""
    for r in p.runs:
        if cu in r.text:
            r.text = r.text.replace(cu, moi, 1)
            return
    full = ''.join(r.text for r in p.runs)
    s = full.find(cu)
    assert s >= 0, f'Khong thay {cu!r} trong: {full[:120]!r}'
    e = s + len(cu)
    pos = 0
    da_chen = False
    for r in p.runs:
        a, b = pos, pos + len(r.text)
        pos = b
        if b <= s or a >= e:
            continue
        t = r.text
        truoc = t[:max(0, s - a)]
        sau = t[max(0, e - a):] if b > e else ''
        if not da_chen:
            r.text = truoc + moi + sau
            da_chen = True
        else:
            r.text = sau


def thay_o(o, cu, moi):
    for p in o.paragraphs:
        if cu in p.text:
            thay(p, cu, moi)
            return
    raise AssertionError(f'Khong thay {cu!r} trong o bang')


def dat(p, text):
    """Dat lai toan bo chu cua doan; **...** la chu dam. Giu dinh dang run dau tien."""
    runs = p.runs
    mau = copy.deepcopy(runs[0]._r) if runs else None
    for r in runs:
        r._r.getparent().remove(r._r)
    for i, phan in enumerate(re.split(r'\*\*', text)):
        if not phan:
            continue
        if mau is not None:
            r = copy.deepcopy(mau)
            for t in r.findall(qn('w:t')):
                r.remove(t)
            p._p.append(r)
            from docx.text.run import Run
            run = Run(r, p)
        else:
            run = p.add_run()
        run.text = phan
        run.bold = True if i % 2 == 1 else None  # None: theo kieu doan (tieu de van dam)
    return p


def dat_o(o, text):
    """O bang: moi dong ' / ' tach thanh mot doan rieng (giong cac o 'Luong su kien')."""
    dong = text.split('\n')
    ps = o.paragraphs
    for p in ps[1:]:
        p._p.getparent().remove(p._p)
    dat(ps[0], dong[0])
    truoc = ps[0]._p
    for t in dong[1:]:
        moi = copy.deepcopy(ps[0]._p)
        truoc.addnext(moi)
        truoc = moi
        dat(Paragraph(moi, o), t)


def chen_sau(moc, phan_tu):
    """Chen danh sach phan tu (lxml) ngay sau moc; tra ve phan tu cuoi."""
    for x in phan_tu:
        moc.addnext(x)
        moc = x
    return moc


def doan_moi(mau, text):
    e = copy.deepcopy(mau._p)
    p = Paragraph(e, mau._parent)
    dat(p, text)
    return e


def bang_sau(p):
    e = p._p.getnext()
    assert e.tag == qn('w:tbl'), 'Sau chu thich khong phai bang'
    return Table(e, d)


def them_dong(bang, gia_tri, mau_dong=-1, sau=None):
    """Them dong (sao chep dinh dang dong mau) voi cac gia tri o."""
    tr = copy.deepcopy(bang.rows[mau_dong]._tr)
    (sau._tr if sau is not None else bang.rows[-1]._tr).addnext(tr)
    from docx.table import _Row
    row = _Row(tr, bang)
    for o, v in zip(row.cells, gia_tri):
        dat_o(o, v)
    return row


def bang_cot(mau_bang, dong):
    """Bang CSDL moi: sao chep bang mau (giu dong tieu de), dong = [(ten, kieu, null, ghi chu)]."""
    tbl = copy.deepcopy(mau_bang._tbl)
    t = Table(tbl, d)
    for r in list(t.rows)[2:]:
        tbl.remove(r._tr)
    for i, v in enumerate(dong):
        if i == 0:
            for o, x in zip(t.rows[1].cells, v):
                dat_o(o, x)
        else:
            them_dong(t, v, mau_dong=1)
    return tbl


def cap_anh(duong):
    w, h = Image.open(duong).size
    cx, cy = RONG, int(RONG * h / w)
    if cy > CAO_TOI_DA:
        cx, cy = int(cx * CAO_TOI_DA / cy), CAO_TOI_DA
    return cx, cy


def dat_kich_thuoc(inline, cx, cy):
    inline.find(qn('wp:extent')).set('cx', str(cx))
    inline.find(qn('wp:extent')).set('cy', str(cy))
    for ext in inline.iter(qn('a:ext')):
        ext.set('cx', str(cx))
        ext.set('cy', str(cy))


def thay_anh(media, duong):
    """Thay noi dung 1 anh co san (theo ten media trong docx) va chinh lai ty le."""
    so = 0
    for inline in body.iter(qn('wp:inline')):
        rid = inline.find('.//' + qn('a:blip')).get(qn('r:embed'))
        part = d.part.related_parts[rid]
        if part.partname.endswith('/' + media):
            part._blob = open(duong, 'rb').read()
            dat_kich_thuoc(inline, *cap_anh(duong))
            so += 1
    assert so == 1, f'{media}: {so}'


MAU_ANH = None  # doan chua anh mau (de sao chep dinh dang can giua)


def doan_anh(duong):
    e = copy.deepcopy(MAU_ANH._p)
    for r in e.findall(qn('w:r')):
        e.remove(r)
    p = Paragraph(e, MAU_ANH._parent)
    p.add_run().add_picture(duong)
    dat_kich_thuoc(e.find('.//' + qn('wp:inline')), *cap_anh(duong))
    return e


# ================================================================ TU VIET TAT
VT = [
    ('AI', 'Artificial Intelligence', 'Trí tuệ nhân tạo'),
    ('API', 'Application Programming Interface', 'Giao diện lập trình ứng dụng'),
    ('CSDL', 'Cơ sở dữ liệu', 'Nơi lưu trữ dữ liệu của hệ thống (PostgreSQL)'),
    ('ERD', 'Entity Relationship Diagram', 'Biểu đồ thực thể liên kết'),
    ('ERP', 'Enterprise Resource Planning', 'Hệ thống hoạch định nguồn lực doanh nghiệp'),
    ('HTTPS', 'Hypertext Transfer Protocol Secure', 'Giao thức truyền dữ liệu web có mã hoá'),
    ('JSON', 'JavaScript Object Notation', 'Định dạng trao đổi dữ liệu dạng văn bản giữa frontend và backend'),
    ('JWT', 'JSON Web Token', 'Chuỗi mã thông báo dùng để xác thực người dùng sau khi đăng nhập'),
    ('KLVT', 'Khối lượng vật tư', 'Khối lượng vật tư thực tế cần cho công trình, xác nhận trước khi mua hàng'),
    ('NCC', 'Nhà cung cấp', 'Đơn vị bán vật tư mua ngoài cho doanh nghiệp'),
    ('PWA', 'Progressive Web App', 'Ứng dụng web cài được lên màn hình chính điện thoại'),
    ('QR', 'Quick Response code', 'Mã vạch hai chiều, dùng để chuyển khoản và cài xác thực hai lớp'),
    ('RBAC', 'Role-Based Access Control', 'Phân quyền theo vai trò'),
    ('REST', 'Representational State Transfer', 'Kiểu kiến trúc API dựa trên giao thức HTTP'),
    ('SPA', 'Single Page Application', 'Ứng dụng web một trang, chuyển màn hình không tải lại trang'),
    ('SQL', 'Structured Query Language', 'Ngôn ngữ truy vấn cơ sở dữ liệu quan hệ'),
    ('TOTP', 'Time-based One-Time Password', 'Mã dùng một lần sinh theo thời gian, dùng cho xác thực hai lớp'),
    ('UML', 'Unified Modeling Language', 'Ngôn ngữ mô hình hoá thống nhất'),
]
tvt = bang_sau(tim('DANH MỤC TỪ VIẾT TẮT'))
while len(tvt.rows) - 1 < len(VT):
    them_dong(tvt, ['', '', ''])
for r, v in zip(list(tvt.rows)[1:], VT):
    for o, x in zip(r.cells, v):
        dat_o(o, x)
for r in list(tvt.rows)[len(VT) + 1:]:
    tvt._tbl.remove(r._tr)
# Can trai (can deu hai ben lam gian chu tieng Anh rat xau trong o hep)
from docx.enum.text import WD_ALIGN_PARAGRAPH
for r in list(tvt.rows)[1:]:
    for o in r.cells:
        for p in o.paragraphs:
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT

# ================================================================ MO DAU
thay(tim('Bên cạnh đó, sự phát triển của các mô hình ngôn ngữ lớn'),
     'như đọc tin nhắn đặt hàng của khách hay', 'như tra cứu thông tin sản phẩm để tư vấn khách hay')
dat(tim('Tích hợp trợ lý AI hỗ trợ trích xuất đơn hàng'),
    'Tích hợp trợ lý AI theo từng sản phẩm (Cửa, Sàn, Tấm ốp) giúp nhân viên kinh doanh hỏi bằng tin nhắn hoặc ảnh chụp hiện trạng để tư vấn khách; nhận xét số liệu vật tư bán chạy, giá nhà cung cấp và hiệu quả chăm sóc khách hàng của nhân viên kinh doanh.')
thay(tim('Bảo đảm an toàn hệ thống bằng phân quyền chi tiết'),
     'xác thực hai lớp cho các tài khoản quan trọng', 'xác thực hai lớp cấu hình theo từng vai trò')
thay(tim('Trợ lý AI hỗ trợ nhân viên kinh doanh lên đơn nhanh'),
     'hỗ trợ nhân viên kinh doanh lên đơn nhanh', 'hỗ trợ nhân viên kinh doanh tư vấn sản phẩm dựa trên tài liệu do doanh nghiệp cung cấp')

# ================================================================ CHUONG 1
thay(tim('Xuất phát từ thực tế đó, đề tài xây dựng hệ thống ERP'),
     'trợ lý AI có thể đọc tin nhắn hoặc ảnh chụp đơn của khách để điền sẵn thông tin.',
     'trong lúc tư vấn, nhân viên kinh doanh có thể hỏi trợ lý AI của sản phẩm khách quan tâm, bằng câu hỏi hoặc ảnh chụp công trình, để nhận câu trả lời kèm mẫu tin nhắn gửi khách.')
thay(tim('Do vật tư mua ngoài được NCC giao thẳng đến công trình'),
     'AI chỉ hỗ trợ trích xuất thông tin và diễn giải số liệu.',
     'AI chỉ trả lời dựa trên tài liệu sản phẩm do doanh nghiệp nạp và diễn giải số liệu; AI không nhận giá nhập của NCC hay tên, số điện thoại của khách hàng.')
thay(tim('Khâu đầu tiên là nhập số và chăm sóc khách hàng.'),
     'được hệ thống nhắc khi đến giờ hẹn gọi lại.',
     'được hệ thống nhắc khi đến giờ hẹn gọi lại. Mỗi khách hàng được gắn các sản phẩm quan tâm, suy ra tự động từ nhu cầu khách để lại và từ các đơn đã đặt.')
thay(tim('Khi khách đồng ý, nhân viên kinh doanh tạo đơn hàng'),
     'tạo đơn hàng với sự hỗ trợ của trợ lý AI và gửi', 'tạo đơn hàng (mỗi đơn ghi nhận sản phẩm chính) và gửi')
thay(tim('Hệ thống còn cung cấp báo cáo lãi/lỗ'),
     'Trợ lý AI diễn giải các số liệu này, và mỗi lần phân tích được lưu lại để xem lại khi cần.',
     'Trợ lý AI diễn giải các số liệu này; các nhận xét về hiệu quả chăm sóc khách hàng được lưu lại để xem lại khi cần. Mỗi sản phẩm còn có một trợ lý AI tư vấn riêng, trả lời nhân viên kinh doanh dựa trên tài liệu kiến thức do Admin soạn.')
thay(tim('Hệ thống còn cung cấp báo cáo lãi/lỗ'),
     'xác thực hai lớp cho các tài khoản quan trọng', 'xác thực hai lớp cấu hình theo từng vai trò')
p = tim('Về bảo mật, người dùng được xác thực bằng JWT')
thay(p, 'Tài khoản Admin và Kế toán, vốn liên quan trực tiếp đến tiền, được bảo vệ thêm bằng xác thực hai lớp với mã dùng một lần sinh trên ứng dụng xác thực của điện thoại.',
     'Xác thực hai lớp với mã dùng một lần sinh trên ứng dụng xác thực của điện thoại được Admin bật hoặc tắt theo từng vai trò, mặc định bật cho Admin và Kế toán là hai vai trò liên quan trực tiếp đến tiền.')
thay(p, '27 quyền', '28 quyền')
thay(tim('Hệ thống được kiểm thử bằng bộ kiểm thử tự động gồm'), '143 ca, chia thành 19 nhóm', '158 ca, chia thành 22 nhóm')
thay(tim('Sale (nhân viên kinh doanh) nhận các số khách hàng tiềm năng'),
     'có thể nhờ trợ lý AI điền sẵn thông tin từ tin nhắn hoặc ảnh chụp của khách, rồi gửi đường dẫn báo giá.',
     'rồi gửi đường dẫn báo giá. Trong lúc tư vấn, Sale có thể mở khung chat trợ lý AI ở bất kỳ màn hình nào để hỏi về sản phẩm khách quan tâm, kể cả gửi ảnh hiện trạng công trình.')
p = tim('Admin (giám đốc) quản lý tài khoản người dùng và phân quyền')
thay(p, 'xem nhật ký thay đổi dữ liệu và quản lý sao lưu.',
     'xem nhật ký thay đổi dữ liệu, quản lý sao lưu và soạn tài liệu kiến thức cho trợ lý AI của từng sản phẩm (có thể nạp từ tệp PDF hoặc ảnh catalog).')
thay(p, 'Do liên quan trực tiếp đến tiền, tài khoản Admin và Kế toán bắt buộc dùng xác thực hai lớp.',
     'Admin cũng cấu hình vai trò nào phải dùng xác thực hai lớp; mặc định bật cho Admin và Kế toán vì liên quan trực tiếp đến tiền.')
thay(tim('Các vòng sau mở rộng hệ thống về hai đầu của chuỗi.'),
     'cùng báo cáo hiệu quả chăm sóc khách hàng kèm nhận xét của AI.',
     'cùng báo cáo hiệu quả chăm sóc khách hàng kèm nhận xét của AI. Cũng ở vòng cuối, chức năng tạo đơn bằng AI được thay bằng trợ lý AI tư vấn theo từng sản phẩm, vì việc nhập đơn vốn đã nhanh, còn nhu cầu lớn hơn của nhân viên kinh doanh là tra cứu kiến thức sản phẩm ngay khi đang tư vấn khách; đồng thời hệ thống bổ sung sản phẩm quan tâm của khách hàng, sản phẩm chính của đơn hàng và cấu hình xác thực hai lớp theo vai trò.')
thay(tim('Đối với trợ lý AI, hệ thống sử dụng mô hình Gemini'),
     'cho ba việc: trích xuất thông tin đơn hàng từ tin nhắn hoặc ảnh chụp, viết nhận xét',
     'cho ba việc: trả lời câu hỏi tư vấn sản phẩm của nhân viên kinh doanh, viết nhận xét')
thay(tim('Đối với trợ lý AI, hệ thống sử dụng mô hình Gemini'),
     'Nguyên tắc xuyên suốt là mọi con số đều do cơ sở dữ liệu tính toán, AI chỉ diễn giải.',
     'Mỗi sản phẩm (Cửa, Sàn, Tấm ốp) có một trợ lý riêng: tài liệu kiến thức của sản phẩm được đưa vào ngữ cảnh mỗi lần hỏi thay vì huấn luyện lại mô hình, trợ lý nhận được cả ảnh chụp, nhớ khoảng 10 lượt hỏi đáp gần nhất và từ chối câu hỏi ngoài phạm vi. Nguyên tắc xuyên suốt là mọi con số đều do cơ sở dữ liệu tính toán, AI chỉ diễn giải.')

# Hinh 1.1: thay dong "[Chen Hinh 1.1 ...]" bang anh + chu thich
MAU_ANH = Paragraph(next(p for p in body.iter(qn('w:p')) if p.find('.//' + qn('wp:inline')) is not None), d)
MAU_CT_HINH = tim('Hình 2.1. Biểu đồ usecase tổng quan')
cho_h11 = tim('[Chèn Hình 1.1')
chen_sau(cho_h11._p, [doan_anh(f'{HINH}/png/Hinh_1_1_Kien_truc_tong_the.png'),
                      doan_moi(MAU_CT_HINH, 'Hình 1.1. Kiến trúc tổng thể hệ thống')])
cho_h11._p.getparent().remove(cho_h11._p)

# ================================================================ CHUONG 2 - chu
p = tim('Hệ thống quản lý xuyên suốt vòng đời một đơn hàng. Sale chăm sóc khách hàng,')
thay(p, 'tạo đơn (có thể nhờ trợ lý AI trích xuất đơn từ tin nhắn hoặc ảnh chụp) và chốt đơn;',
     'tạo đơn (ghi rõ sản phẩm chính của đơn: Cửa, Sàn hoặc Tấm ốp) và chốt đơn;')
chen_sau(tim('Sau khi nhận số, Sale gọi cho khách')._p, [doan_moi(
    tim('Sau khi nhận số, Sale gọi cho khách'),
    'Mỗi khách hàng được gắn các sản phẩm quan tâm (Cửa, Sàn, Tấm ốp). Hệ thống tự suy ra từ nhu cầu khách để lại theo từ khoá của từng sản phẩm và từ các đơn khách đã đặt; Sale có thể sửa lại. Trong lúc tư vấn, Sale mở khung chat trợ lý AI ở bất kỳ màn hình nào: mỗi sản phẩm có một trợ lý riêng, trả lời dựa trên tài liệu kiến thức do Admin soạn (mẫu sản phẩm, giá tham khảo, cách tính khối lượng, bảo hành, cách xử lý khi khách từ chối) cùng danh mục vật tư đang bán. Sale có thể hỏi bằng câu chữ hoặc gửi ảnh hiện trạng công trình; câu trả lời thường kèm sẵn một mẫu tin nhắn để gửi khách qua Zalo. Khi mở trợ lý từ hồ sơ khách, trợ lý chỉ được biết nhóm khách và nhu cầu, không biết tên hay số điện thoại.')])
thay(tim('Ở tầng quản trị, Admin và kế toán xem báo cáo lãi/lỗ'),
     'Tài khoản Admin và kế toán - những người duyệt và chi tiền - bắt buộc xác thực hai lớp.',
     'Admin bật hoặc tắt xác thực hai lớp cho từng vai trò (mặc định bật cho Admin và kế toán - những người duyệt và chi tiền) và soạn tài liệu kiến thức cho trợ lý AI của từng sản phẩm.')

# Bang 2.2 - Sale
b = bang_sau(tim('Bảng 2.2. Bảng yêu cầu chức năng phía nhân viên kinh doanh'))
thay_o(b.rows[2].cells[2], 'danh sách xếp theo thời điểm nhận số và hiện ghi chú lần gọi gần nhất.',
       'danh sách xếp theo thời điểm nhận số và hiện ghi chú lần gọi gần nhất; gắn sản phẩm quan tâm của khách (hệ thống tự suy ra, Sale sửa được).')
thay_o(b.rows[3].cells[2], 'Lưu nháp hoặc chốt đơn (vật tư,', 'Lưu nháp hoặc chốt đơn (sản phẩm chính, vật tư,')
dat_o(b.rows[4].cells[1], 'Hỏi trợ lý AI sản phẩm')
dat_o(b.rows[4].cells[2], 'Mở khung chat ở mọi màn hình, chọn trợ lý Cửa, Sàn hoặc Tấm ốp; hỏi bằng câu chữ hoặc gửi tối đa 3 ảnh; nhận câu trả lời kèm mẫu tin nhắn gửi khách; xem lại các cuộc trò chuyện trước.')
# Bang 2.4 - Ke toan
b = bang_sau(tim('Bảng 2.4. Bảng yêu cầu chức năng về phía nhân viên kế toán'))
dat_o(b.rows[11].cells[1], 'Xác thực hai lớp')
dat_o(b.rows[11].cells[2],'Xác thực hai lớp bằng ứng dụng Authenticator (mặc định bật cho Kế toán, Admin có thể thay đổi); mã dự phòng khi mất điện thoại.')
# Bang 2.5 - Quan ly
b = bang_sau(tim('Bảng 2.5. Bảng yêu cầu chức năng về phía quản lý'))
them_dong(b, ['10', 'Kiến thức trợ lý AI', 'Soạn, sửa tài liệu kiến thức cho trợ lý AI của từng sản phẩm (tối đa 60.000 ký tự); nạp nội dung từ tệp PDF hoặc ảnh catalog, bảng giá nhờ AI đọc; có hiệu lực ngay ở câu hỏi tiếp theo.'])
them_dong(b, ['11', 'Cấu hình xác thực hai lớp', 'Bật / tắt xác thực hai lớp cho từng vai trò; xem số tài khoản đã cài; khi bật có thể đăng xuất ngay các tài khoản chưa cài.'])
# Bang 2.6 - actor ngoai
b = bang_sau(tim('Bảng 2.6. Bảng yêu cầu chức năng về phía actor bên ngoài'))
r = next(r for r in b.rows if r.cells[0].text.startswith('Dịch vụ Gemini AI'))
dat_o(r.cells[1], 'Trả lời tư vấn, nhận xét')
dat_o(r.cells[2], 'Trả lời câu hỏi tư vấn sản phẩm của Sale (câu chữ, ảnh) dựa trên tài liệu từng sản phẩm; đọc tệp PDF, ảnh catalog để Admin nạp kiến thức; viết nhận xét cho số liệu phân tích vật tư, giá NCC và hiệu quả chăm sóc khách hàng của Sale.')

# Phi chuc nang
thay(tim('Xác thực hai lớp (TOTP, RFC 6238) bắt buộc cho Admin và Kế toán'),
     'bắt buộc cho Admin và Kế toán:', 'bật theo từng vai trò do Admin cấu hình (mặc định Admin và Kế toán):')
moc = tim('Văn bản đặt hàng gửi NCC không chứa tên')
chen_sau(moc._p, [doan_moi(moc, 'Trợ lý AI chỉ nhận nhóm khách và nhu cầu, không nhận tên, số điện thoại, địa chỉ khách hay giá nhập NCC; Sale chỉ xem được cuộc trò chuyện của mình; ảnh gửi kèm chỉ chuyển cho AI, không lưu trên máy chủ; câu hỏi ngoài phạm vi tư vấn sản phẩm bị từ chối.')])
thay(tim('Loại vật tư (tự sản xuất / mua ngoài) là dữ liệu'),
     'nên doanh nghiệp thêm sản phẩm mới chỉ bằng danh mục.',
     'nên doanh nghiệp thêm sản phẩm mới chỉ bằng danh mục; mỗi loại vật tư tự có một trợ lý AI riêng, chỉ cần nạp tài liệu kiến thức.')

# Mo hinh hoa use case
thay(tim('Nhân viên kinh doanh nhập số tự tìm, chăm sóc khách hàng'),
     'tạo và chốt đơn hàng (có thể nhờ trợ lý AI trích xuất đơn),',
     'hỏi trợ lý AI sản phẩm khi tư vấn (có thể gửi ảnh hiện trạng), tạo và chốt đơn hàng,')
thay(tim('Quản lý (Admin) quản trị người dùng và phân quyền'),
     'quản trị người dùng và phân quyền,', 'quản trị người dùng, phân quyền và cấu hình xác thực hai lớp theo vai trò,')
thay(tim('Quản lý (Admin) quản trị người dùng'),
     'theo dõi báo cáo chăm sóc khách hàng,', 'theo dõi báo cáo chăm sóc khách hàng, soạn kiến thức cho trợ lý AI sản phẩm,')

# Dac ta Dang nhap
b = bang_sau(tim('Bảng 2.7. Bảng đặc tả usecase Đăng nhập'))
o = next(r for r in b.rows if r.cells[0].text.startswith('Luồng sự kiện chính')).cells[1]
thay_o(o, '3. Với Admin, Kế toán:', '3. Nếu vai trò của người dùng đang bật xác thực hai lớp (mặc định Admin, Kế toán):')
o = next(r for r in b.rows if r.cells[0].text.startswith('Luồng rẽ nhánh')).cells[1]
thay_o(o, 'Sale, Vận hành không bắt buộc bước 3.', 'Vai trò không bật xác thực hai lớp bỏ qua bước 3.')
# Dac ta Tao va chot don
b = bang_sau(tim('Bảng 2.8. Bảng đặc tả usecase Tạo và chốt đơn hàng'))
o = next(r for r in b.rows if r.cells[0].text.startswith('Luồng sự kiện chính')).cells[1]
thay_o(o, 'hình thức (vật tư / hoàn thiện), địa chỉ,', 'hình thức (vật tư / hoàn thiện), sản phẩm chính, địa chỉ,')
thay_o(o, ' (có thể dùng trợ lý AI điền sẵn)', '')
thay_o(o, 'tạo đơn ở bước "Lên phương án".', 'tạo đơn ở bước "Lên phương án" và gắn sản phẩm của đơn vào sản phẩm quan tâm của khách.')
o = next(r for r in b.rows if r.cells[0].text.startswith('Luồng rẽ nhánh')).cells[1]
thay_o(o, '3a. Thiếu thông tin: báo danh sách phần còn thiếu.', '3a. Thiếu thông tin (kể cả chưa chọn sản phẩm khi chốt): báo danh sách phần còn thiếu.')

# 2.6.13: thay dac ta "Trich xuat don" bang "Hoi tro ly AI san pham"
DT_TRO_LY = [
    ('Mã use case', 'UC13'), ('Tên use case', 'Hỏi trợ lý AI sản phẩm'), ('Actor', 'Sale; Gemini AI'),
    ('Mô tả', 'Sale hỏi trợ lý AI của một sản phẩm (Cửa, Sàn hoặc Tấm ốp) bằng câu hỏi hoặc ảnh chụp để tư vấn khách; trợ lý chỉ trả lời dựa trên tài liệu kiến thức và danh mục vật tư của sản phẩm đó.'),
    ('Điều kiện trước', 'Sale đã đăng nhập, có quyền "Hỏi trợ lý AI sản phẩm"; sản phẩm đã được Admin nạp kiến thức; đã cấu hình khoá Gemini API.'),
    ('Luồng sự kiện chính', '1. Sale mở khung chat (nút "Trợ lý" ở mọi màn hình hoặc nút "Hỏi trợ lý sản phẩm" trong hồ sơ khách) và chọn sản phẩm.\n2. Sale nhập câu hỏi, có thể đính kèm tối đa 3 ảnh (JPEG, PNG, WEBP, mỗi ảnh tối đa 4 MB).\n3. Hệ thống ghép nguyên tắc trả lời, tài liệu kiến thức, danh mục vật tư đang bán, nhóm khách và nhu cầu (nếu mở từ hồ sơ khách) cùng 10 lượt hỏi đáp gần nhất rồi gửi Gemini.\n4. Hệ thống lưu câu hỏi và câu trả lời vào cuộc trò chuyện của Sale (không lưu ảnh), hiển thị câu trả lời kèm nút "Chép tin nhắn gửi khách".'),
    ('Luồng rẽ nhánh / ngoại lệ', '2a. Câu hỏi trống, ảnh sai định dạng hoặc quá dung lượng: báo lỗi, không gửi.\n3a. Sản phẩm chưa có kiến thức: báo "chưa được nạp kiến thức", không gọi AI.\n3b. Khách không do Sale phụ trách: từ chối.\n3c. Mô hình quá tải hoặc quá thời gian: thử lại, chuyển mô hình dự phòng; vẫn lỗi thì báo Sale thử lại, câu hỏi không bị lưu.\n3d. Câu hỏi ngoài phạm vi: trợ lý từ chối; hỏi về sản phẩm khác: trợ lý chỉ sang đúng trợ lý của sản phẩm đó.'),
    ('Điều kiện sau', 'Sale có câu trả lời để tư vấn khách; cuộc trò chuyện được lưu để xem lại; tên, số điện thoại khách và giá nhập NCC không bị gửi ra ngoài.'),
]
DT_KIEN_THUC = [
    ('Mã use case', 'UC20'), ('Tên use case', 'Soạn kiến thức trợ lý AI'), ('Actor', 'Admin; Gemini AI'),
    ('Mô tả', 'Admin soạn và cập nhật tài liệu kiến thức mà trợ lý AI của từng sản phẩm dùng để trả lời Sale.'),
    ('Điều kiện trước', 'Admin đã đăng nhập, có quyền "Soạn kiến thức cho trợ lý AI sản phẩm".'),
    ('Luồng sự kiện chính', '1. Admin mở mục "Kiến thức trợ lý AI" và chọn sản phẩm; hệ thống hiển thị nội dung hiện tại và số ký tự.\n2. Admin soạn hoặc sửa nội dung: mẫu sản phẩm, giá tham khảo, cách tính khối lượng, bảo hành, quy trình đặt hàng, cách xử lý khi khách từ chối.\n3. Admin bấm "Lưu"; hệ thống kiểm tra độ dài, lưu kèm người và thời điểm cập nhật, ghi nhật ký thay đổi.\n4. Từ câu hỏi tiếp theo, trợ lý dùng ngay nội dung mới.'),
    ('Luồng rẽ nhánh / ngoại lệ', '2a. Nạp từ file: Admin chọn tệp PDF hoặc ảnh catalog, bảng giá (tối đa 10 MB); hệ thống nhờ Gemini chuyển thành văn bản và nối vào ô soạn để Admin kiểm tra trước khi lưu.\n2b. Tệp sai định dạng hoặc quá dung lượng: báo lỗi.\n3a. Nội dung vượt 60.000 ký tự: báo lỗi, không lưu.'),
    ('Điều kiện sau', 'Tài liệu kiến thức của sản phẩm được cập nhật và có nhật ký thay đổi.'),
]
DT_XAC_THUC = [
    ('Mã use case', 'UC21'), ('Tên use case', 'Cấu hình xác thực hai lớp theo vai trò'), ('Actor', 'Admin'),
    ('Mô tả', 'Admin bật hoặc tắt xác thực hai lớp cho từng vai trò (Admin, Kế toán, Vận hành, Sale).'),
    ('Điều kiện trước', 'Admin đã đăng nhập.'),
    ('Luồng sự kiện chính', '1. Admin mở "Người dùng", chọn tab "Xác thực 2 lớp"; hệ thống hiển thị từng vai trò, trạng thái bật / tắt và số tài khoản đã cài.\n2. Admin gạt công tắc của một vai trò và xác nhận.\n3. Hệ thống lưu cấu hình kèm người cập nhật và ghi nhật ký thay đổi.\n4. Từ lần đăng nhập tới, mọi tài khoản của vai trò đang bật phải nhập mã 6 số; tài khoản chưa cài được yêu cầu quét mã QR.'),
    ('Luồng rẽ nhánh / ngoại lệ', '2a. Tắt cho Admin hoặc Kế toán: hệ thống cảnh báo đây là vai trò liên quan đến tiền trước khi xác nhận.\n2b. Bật khi còn tài khoản chưa cài: Admin có thể chọn đăng xuất ngay các tài khoản đó (trừ chính mình) để áp dụng ngay.\n2c. Tắt rồi bật lại: khoá đã cài được giữ, người dùng không phải quét QR lại.'),
    ('Điều kiện sau', 'Cấu hình mới được áp dụng cho lần đăng nhập tiếp theo của vai trò đó.'),
]


def dien_dac_ta(bang, dl):
    for r, (_, v) in zip(list(bang.rows)[1:], dl):
        dat_o(r.cells[1], v)


h = tim('2.6.13. Đặc tả usecase Trích xuất đơn bằng trợ lý AI')
dat(h, '2.6.13. Đặc tả usecase Hỏi trợ lý AI sản phẩm')
ct = tim('Bảng 2.19. Bảng đặc tả usecase Trích xuất đơn bằng trợ lý AI')
dat(ct, 'Bảng 2.19. Bảng đặc tả usecase Hỏi trợ lý AI sản phẩm')
dien_dac_ta(bang_sau(ct), DT_TRO_LY)

# 2.6.20, 2.6.21: sao chep khoi 2.6.19 (tieu de + chu thich + bang)
h19 = tim('2.6.19. Đặc tả usecase Báo cáo chăm sóc khách hàng')
ct19 = tim('Bảng 2.25. Bảng đặc tả usecase Báo cáo chăm sóc khách hàng')
b19 = bang_sau(ct19)
moc = b19._tbl
for so, ten, dl in [('2.6.20', 'Soạn kiến thức trợ lý AI', DT_KIEN_THUC), ('2.6.21', 'Cấu hình xác thực hai lớp theo vai trò', DT_XAC_THUC)]:
    tb = copy.deepcopy(b19._tbl)
    dien_dac_ta(Table(tb, d), dl)
    moc = chen_sau(moc, [doan_moi(h19, f'{so}. Đặc tả usecase {ten}'), doan_moi(ct19, f'Bảng 2.X. Bảng đặc tả usecase {ten}'), tb])

# 2.8.1.12: bieu do trinh tu + lop "Hoi tro ly AI san pham" (sao chep khoi 2.8.1.11)
h11 = tim('2.8.1.11. Chức năng “Báo cáo chăm sóc khách hàng”')
khoi = []
e = h11._p
for _ in range(7):   # tieu de, "* Bieu do trinh tu", anh, chu thich, "* Bieu do lop", anh, chu thich
    khoi.append(e)
    e = e.getnext()
assert Paragraph(khoi[6], d).text.startswith('Hình 2.27')
moi = [copy.deepcopy(x) for x in khoi]
dat(Paragraph(moi[0], d), '2.8.1.12. Chức năng “Hỏi trợ lý AI sản phẩm”')
moi[2] = doan_anh(f'{HINH}/puml_rose/png/seq_tro_ly_xoay.png')
dat(Paragraph(moi[3], d), 'Hình 2.X. Biểu đồ trình tự usecase Hỏi trợ lý AI sản phẩm')
moi[5] = doan_anh(f'{HINH}/puml_rose/png/cls_tro_ly.png')
dat(Paragraph(moi[6], d), 'Hình 2.X. Biểu đồ lớp usecase Hỏi trợ lý AI sản phẩm')
for i in (0, 1, 4):   # tieu de va dong "* Bieu do ..." luon di cung anh (khong bo lung cuoi trang)
    Paragraph(moi[i], d).paragraph_format.keep_with_next = True
chen_sau(khoi[6], moi)

# ================================================================ CSDL
thay(tim('Cơ sở dữ liệu PostgreSQL gồm 37 bảng'), '37 bảng, một view và 18 trigger (3 hàm trigger)', '42 bảng, một view và 20 trigger (3 hàm trigger)')
thay(tim('Cơ sở dữ liệu PostgreSQL gồm'), 'vật tư, NCC và bảng giá;', 'vật tư, NCC và bảng giá; trợ lý AI sản phẩm;')
thay(tim('Hàm trigger fn_ghi_nhat_ky gắn vào 16 bảng'), 'gắn vào 16 bảng quan trọng (', 'gắn vào 18 bảng quan trọng (')
thay(tim('Hàm trigger fn_ghi_nhat_ky gắn vào'), 'giao dịch ngân hàng...)', 'giao dịch ngân hàng, kiến thức trợ lý AI, cấu hình xác thực hai lớp...)')

b = bang_sau(tim('Bảng 2.39. Bảng loai_vat_tu'))
them_dong(b, ['tu_khoa', 'TEXT', 'Có', 'Từ khoá nhận biết sản phẩm trong nhu cầu khách, cách nhau bằng dấu phẩy (dùng để suy ra sản phẩm quan tâm)'])
b = bang_sau(tim('Bảng 2.33. Bảng don_hang'))
r_ma = next(r for r in b.rows if r.cells[0].text.strip() == 'hinh_thuc')
them_dong(b, ['san_pham_id', 'INTEGER', 'Có', 'Sản phẩm chính của đơn (bắt buộc khi chốt). FK → loai_vat_tu.id'], sau=r_ma)

mau_bang = bang_sau(tim('Bảng 2.39. Bảng loai_vat_tu'))
MAU_CT_BANG = tim('Bảng 2.39. Bảng loai_vat_tu')
MAU_NHOM = tim('Phân hệ Mua hàng')

# khach_hang_san_pham: sau rang buoc cua khach_hang_cham_soc
moc = tim('ck_cham_soc_hen_goi_lai:')
chen_sau(moc._p, [doan_moi(MAU_CT_BANG, 'Bảng 2.X. Bảng khach_hang_san_pham — Sản phẩm khách hàng quan tâm'), bang_cot(mau_bang, [
    ('khach_hang_id', 'INTEGER', 'Không', 'Khách hàng. Khoá chính (ghép). FK → khach_hang.id'),
    ('loai_vat_tu_id', 'INTEGER', 'Không', 'Sản phẩm (loại vật tư) khách quan tâm. Khoá chính (ghép). FK → loai_vat_tu.id'),
    ('created_at', 'TIMESTAMPTZ', 'Không', 'Thời điểm gắn'),
])])

# Phan he Tro ly AI san pham: truoc "Phan he Mua hang"
moc = MAU_NHOM._p.getprevious()
chen_sau(moc, [
    doan_moi(MAU_NHOM, 'Phân hệ Trợ lý AI sản phẩm'),
    doan_moi(MAU_CT_BANG, 'Bảng 2.X. Bảng tro_ly_san_pham — Kiến thức trợ lý AI của từng sản phẩm'), bang_cot(mau_bang, [
        ('id', 'SERIAL', 'Không', 'Khoá chính'),
        ('loai_vat_tu_id', 'INTEGER', 'Không', 'Sản phẩm của trợ lý. Duy nhất (mỗi sản phẩm một trợ lý). FK → loai_vat_tu.id'),
        ('kien_thuc', 'TEXT', 'Không', 'Tài liệu kiến thức do Admin soạn (tối đa 60.000 ký tự), gửi kèm mỗi câu hỏi'),
        ('cap_nhat_luc', 'TIMESTAMPTZ', 'Không', 'Thời điểm cập nhật gần nhất'),
        ('nguoi_cap_nhat_id', 'INTEGER', 'Có', 'Người cập nhật. FK → users.id'),
    ]),
    doan_moi(MAU_CT_BANG, 'Bảng 2.X. Bảng tro_ly_hoi_thoai — Cuộc trò chuyện với trợ lý AI'), bang_cot(mau_bang, [
        ('id', 'SERIAL', 'Không', 'Khoá chính'),
        ('nguoi_id', 'INTEGER', 'Không', 'Người hỏi (chỉ người này xem được). FK → users.id'),
        ('loai_vat_tu_id', 'INTEGER', 'Không', 'Trợ lý sản phẩm. FK → loai_vat_tu.id'),
        ('khach_hang_id', 'INTEGER', 'Có', 'Khách đang tư vấn (nếu mở từ hồ sơ khách). FK → khach_hang.id'),
        ('tieu_de', 'TEXT', 'Không', 'Tiêu đề (câu hỏi đầu tiên, tối đa 80 ký tự)'),
        ('created_at', 'TIMESTAMPTZ', 'Không', 'Thời điểm tạo'),
        ('cap_nhat_luc', 'TIMESTAMPTZ', 'Không', 'Thời điểm hỏi gần nhất'),
    ]),
    doan_moi(MAU_CT_BANG, 'Bảng 2.X. Bảng tro_ly_tin_nhan — Tin nhắn hỏi đáp với trợ lý AI'), bang_cot(mau_bang, [
        ('id', 'BIGSERIAL', 'Không', 'Khoá chính'),
        ('hoi_thoai_id', 'INTEGER', 'Không', 'Cuộc trò chuyện. FK → tro_ly_hoi_thoai.id'),
        ('vai_tro', 'VARCHAR(5)', 'Không', 'Người gửi. Giá trị: user (Sale hỏi), model (AI trả lời)'),
        ('noi_dung', 'TEXT', 'Không', 'Nội dung câu hỏi hoặc câu trả lời'),
        ('so_anh', 'SMALLINT', 'Không', 'Số ảnh gửi kèm (0–3); ảnh không được lưu'),
        ('created_at', 'TIMESTAMPTZ', 'Không', 'Thời điểm gửi'),
    ]),
])

# xac_thuc_vai_tro: sau bang vai_tro_quyen
moc = bang_sau(tim('Bảng 2.60. Bảng vai_tro_quyen'))._tbl
chen_sau(moc, [doan_moi(MAU_CT_BANG, 'Bảng 2.X. Bảng xac_thuc_vai_tro — Cấu hình xác thực hai lớp theo vai trò'), bang_cot(mau_bang, [
    ('id', 'SERIAL', 'Không', 'Khoá chính'),
    ('vai_tro', 'vai_tro_enum', 'Không', 'Vai trò. Duy nhất. Giá trị: sale, van_hanh, ke_toan, admin'),
    ('bat_2fa', 'BOOLEAN', 'Không', 'Bật xác thực hai lớp cho mọi tài khoản của vai trò (mặc định bật cho admin, ke_toan)'),
    ('nguoi_cap_nhat_id', 'INTEGER', 'Có', 'Người cập nhật. FK → users.id'),
    ('cap_nhat_luc', 'TIMESTAMPTZ', 'Không', 'Thời điểm cập nhật'),
])])

# ERD phan he tro ly AI: sau Hinh 2.32
ct = tim('Hình 2.32. Biểu đồ thực thể liên kết phân hệ chi tiền')
chen_sau(ct._p, [doan_anh(f'{HINH}/puml_rose/png/erd_5_tro_ly_ai.png'),
                 doan_moi(ct, 'Hình 2.X. Biểu đồ thực thể liên kết phân hệ trợ lý AI sản phẩm')])

# ================================================================ GIAO DIEN
# Chu thich cu dai 2 dong, dong 2 bi day sang trang sau -> rut gon con 1 dong
thay(tim('Hình 2.34. Giao diện cài đặt xác thực hai lớp'),
     'Giao diện cài đặt xác thực hai lớp (quét mã QR bằng ứng dụng Authenticator)', 'Giao diện cài đặt xác thực hai lớp bằng mã QR')
ct = tim('Hình 2.41. Giao diện tạo đơn hàng')
chen_sau(ct._p, [doan_anh(f'{ANH}/30_tro_ly_ai_chat.png'),
                 doan_moi(ct, 'Hình 2.X. Giao diện khung chat trợ lý AI sản phẩm (mở từ hồ sơ khách hàng)')])
ct = tim('Hình 2.54. Giao diện quản lý người dùng')
chen_sau(ct._p, [doan_anh(f'{ANH}/32_xac_thuc_vai_tro.png'),
                 doan_moi(ct, 'Hình 2.X. Giao diện cấu hình xác thực hai lớp theo vai trò')])
ct = tim('Hình 2.58. Giao diện AI nhận xét cách chăm sóc khách hàng')
chen_sau(ct._p, [doan_anh(f'{ANH}/31_kien_thuc_tro_ly.png'),
                 doan_moi(ct, 'Hình 2.X. Giao diện soạn kiến thức trợ lý AI')])

# ================================================================ THAY ANH CU
for media, nguon in [
    ('image26.png', f'{HINH}/puml_rose/png/uc_tongquan.png'), ('image27.png', f'{HINH}/puml_rose/png/uc_sale.png'),
    ('image29.png', f'{HINH}/puml_rose/png/uc_ketoan.png'), ('image30.png', f'{HINH}/puml_rose/png/uc_admin.png'),
    ('image31.png', f'{HINH}/puml_rose/png/seq_dang_nhap.png'), ('image32.png', f'{HINH}/puml_rose/png/cls_dang_nhap.png'),
    ('image37.png', f'{HINH}/puml_rose/png/seq_tao_don_xoay.png'), ('image38.png', f'{HINH}/puml_rose/png/cls_tao_don.png'),
    ('image53.png', f'{HINH}/puml_ch2/png/erd.png'),
    ('image54.png', f'{HINH}/puml_rose/png/erd_1_khach_hang.png'), ('image55.png', f'{HINH}/puml_rose/png/erd_2_don_hang_thi_cong.png'),
    ('image56.png', f'{HINH}/puml_rose/png/erd_3_vat_tu_mua_hang.png'), ('image57.png', f'{HINH}/puml_rose/png/erd_4_tien_quan_tri.png'),
    ('image8.png', f'{ANH}/04_tao_don_sale.png'), ('image61.png', f'{ANH}/05_khach_hang_sale.png'),
    ('image75.png', f'{ANH}/15_nguoi_dung_admin.png'), ('image63.png', f'{ANH}/27_chi_tiet_khach.png'),
]:
    thay_anh(media, nguon)

# Dong "* Bieu do trinh tu / lop" va tieu de 2.8.1.x luon di cung anh ngay sau (ban cu bi bo lung cuoi trang)
for p in ds_doan():
    if p.text.strip() in ('* Biểu đồ trình tự', '* Biểu đồ lớp') or re.match(r'2\.8\.1\.\d+\. Chức năng', p.text.strip()):
        p.paragraph_format.keep_with_next = True

# ================================================================ DANH LAI SO HINH / BANG CHUONG 2
doi = {}
for loai, kieu in [('Hình', '1hinh'), ('Bảng', '1bb')]:
    n = 0
    for p in ds_doan():
        m = re.match(rf'{loai} 2\.(\d+|X)\. ', p.text)
        if m and p.style.style_id == kieu:
            n += 1
            if m.group(1) != 'X':
                doi[f'{loai} 2.{m.group(1)}'] = f'{loai} 2.{n}'
            thay(p, f'{loai} 2.{m.group(1)}. ', f'{loai} 2.{n}. ')
    print(loai, 'chuong 2:', n)
# Cap nhat tham chieu trong chu (khong phai chu thich), vd "(Bảng 2.1)"
mau = re.compile(r'(Hình|Bảng) 2\.(\d+)(?!\d)')
for p in ds_doan():
    if p.style.style_id in ('1hinh', '1bb'):
        continue
    for r in p.runs:
        if mau.search(r.text):
            moi_t = mau.sub(lambda m: doi.get(m.group(0), m.group(0)), r.text)
            if moi_t != r.text:
                print('  tham chieu:', r.text.strip()[:60], '->', moi_t.strip()[:60])
                r.text = moi_t

d.save(RA)
print('Da luu', RA)
