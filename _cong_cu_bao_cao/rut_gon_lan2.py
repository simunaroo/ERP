# Rut gon lan 2 (20/11/2026), muc tieu ~70 trang:
#   2.3 bo doan nhap so / cham soc / tro ly AI (trung 1.2, Bang 2.2, UC02, UC03, UC10) va 2 doan cuoi;
#   2.7 chi giu 1 doan dan sang 1.5.1 (giu trich dan [2]); 3.1 bo cac y cong nghe da co o 1.6.2;
#   2.9 bo 4 ban thiet ke (Mua hang, Phan tich, Doi soat, Phan quyen); bo Hinh 3.4; Bang tom tat CSDL bo cot "Khoa ngoai toi".
# Chay: python rut_gon_lan2.py <vao.docx> <ra.docx>
import re
src = open(r'F:/DATN/_cong_cu_bao_cao/cap_nhat_v3_tro_ly_ai.py', encoding='utf-8').read()
exec(src[:src.index('# ================================================================ TU VIET TAT')])
la_muc_luc = lambda p: p.style.name.lower().startswith(('toc', 'table of figures'))


def xoa(p):
    e = p._p if hasattr(p, '_p') else p
    assert e.find('.//' + qn('w:sectPr')) is None
    e.getparent().remove(e)


def dat_doan(p, text):
    t = text.lstrip('\t')
    dat(p, ('\t' + t) if p.text.startswith('\t') else t)


# ---------------------------------------------------------------- 2.3
for dau in ('Vòng đời bắt đầu từ số khách tiềm năng', 'Sale gọi cho khách và ghi nhận kết quả', 'Mỗi khách được gắn sản phẩm quan tâm',
            'Mọi thao tác quan trọng sinh thông báo đến đúng người', 'Ở tầng quản trị, Admin và kế toán xem báo cáo'):
    xoa(tim(dau))
dat_doan(tim('Hệ thống quản lý xuyên suốt vòng đời một đơn hàng'),
         'Hệ thống quản lý xuyên suốt vòng đời một đơn hàng, bắt đầu từ số khách tiềm năng được chia cho Sale và chăm sóc theo trạng thái cuộc gọi (UC02, UC03). Sale tạo đơn (ghi rõ sản phẩm chính: Cửa, Sàn hoặc Tấm ốp) và chốt đơn; ngay khi chốt, hệ thống tự động giao đơn cho nhân viên vận hành đang ít việc nhất. Từ đây đơn đi qua các bước tiến độ dưới đây; đơn chỉ bán vật tư bỏ qua các bước Tính KLVT, Thi công và Nghiệm thu.')

# ---------------------------------------------------------------- 2.7
xoa(tim('Front-end là ứng dụng một trang (SPA) [2]'))
dat_doan(tim('Back-end tổ chức theo kiến trúc phân lớp'),
         'Phần thiết kế gồm thiết kế back-end theo kiến trúc phân lớp đã trình bày ở mục 1.5.1 (biểu đồ trình tự và biểu đồ lớp ở mục 2.8.1), thiết kế cơ sở dữ liệu (mục 2.8.2) và thiết kế giao diện theo mô hình ứng dụng một trang SPA [2] (mục 2.9).')

# ---------------------------------------------------------------- 3.1
dat_doan(tim('Phần back-end viết bằng JavaScript'),
         'Phần back-end chạy trên Node.js 22 và Express 5 với các công nghệ đã nêu ở mục 1.6.2; mã nguồn khoảng 8.100 dòng, chia thành 23 module nghiệp vụ, cung cấp 149 endpoint REST. Back-end chỉ phụ thuộc 8 gói npm: thuật toán TOTP và mã hoá AES-256-GCM được tự cài bằng mô-đun crypto có sẵn của Node.js; Telegram Bot API, Gemini API và VietQR được gọi trực tiếp bằng hàm fetch, không dùng SDK của bên thứ ba; mọi truy vấn SQL đều tham số hoá để chống SQL injection.')
for dau in ('Node.js 22 và Express 5: Express 5 tự chuyển lỗi', 'PostgreSQL 16 với thư viện pg:', 'Mô-đun crypto có sẵn của Node.js:',
            'Hàm fetch có sẵn của Node.js 22:', 'exceljs và qrcode:', 'Các thông số phụ thuộc môi trường'):
    xoa(tim(dau))
dat_doan(tim('Front-end là ứng dụng một trang (SPA) tách biệt'),
         'Front-end là ứng dụng một trang (SPA) tách biệt với back-end, giao tiếp hoàn toàn qua REST API, dùng các công nghệ đã nêu ở mục 1.6.2; mã nguồn khoảng 6.900 dòng, gồm 26 trang và 8 thành phần dùng chung. Giao diện dùng CSS viết tay với biến màu, không dùng framework giao diện, hỗ trợ chế độ sáng, tối và co giãn cho điện thoại; tệp manifest và service worker cho phép cài hệ thống lên màn hình chính như một ứng dụng (PWA).')
for dau in ('React 18: xây dựng giao diện theo thành phần', 'React Router 6, Zustand và Axios:', 'Vite 5: chạy máy chủ phát triển',
            'CSS viết tay với biến màu', 'Tệp manifest và service worker:'):
    xoa(tim(dau))

# ---------------------------------------------------------------- 2.9: bo 4 ban thiet ke (doan giai thich + anh + chu thich)
for ten in ('Thiết kế giao diện mua hàng', 'Thiết kế giao diện phân tích vật tư', 'Thiết kế giao diện đối soát giao dịch', 'Thiết kế giao diện phân quyền'):
    cap = [p for p in tim('Hình 2.', tat_ca=True) if p.style.name == '1hinh' and ten in p.text][0]
    anh = cap._p.getprevious()
    giai = anh.getprevious()
    assert anh.findall('.//' + qn('w:drawing')) and '(Hình 2.' in Paragraph(giai, d).text, ten
    for e in (giai, anh, cap._p):
        xoa(e)

# ---------------------------------------------------------------- Chuong 3: bo Hinh 3.4
cap = tim('Hình 3.4. Trợ lý AI xử lý câu hỏi ngoài phạm vi')
anh = cap._p.getprevious()
assert anh.findall('.//' + qn('w:drawing'))
for e in (tim('Hình 3.4 là kết quả hỏi trợ lý AI sản phẩm Sàn')._p, anh, cap._p):
    xoa(e)

# ---------------------------------------------------------------- Bang tom tat CSDL: bo cot "Khoa ngoai toi"
cap = [p for p in tim('Bảng 2.', tat_ca=True) if p.style.name == '1bb' and 'Các bảng còn lại của cơ sở dữ liệu' in p.text][0]
tbl = bang_sau(cap)._tbl
grid = tbl.find(qn('w:tblGrid'))
cols = grid.findall(qn('w:gridCol'))
if len(cols) == 3:
    grid.remove(cols[2])
    for tr in tbl.iter(qn('w:tr')):
        tcs = tr.findall(qn('w:tc'))
        tr.remove(tcs[2])
    rong = [str(round(c * 567)) for c in (5.8, 9.7)]
    for g, w in zip(grid.findall(qn('w:gridCol')), rong):
        g.set(qn('w:w'), w)
    for tr in tbl.iter(qn('w:tr')):
        for tc, w in zip(tr.findall(qn('w:tc')), rong):
            tcw = tc.find(qn('w:tcPr') + '/' + qn('w:tcW'))
            if tcw is not None:
                tcw.set(qn('w:w'), w)
                tcw.set(qn('w:type'), 'dxa')

# ---------------------------------------------------------------- danh lai so Hinh 2.x (chuong 2) + tham chieu
MAP, dem, on = {}, 0, False
for p in ds_doan():
    t = p.text.strip()
    if la_muc_luc(p):
        continue
    if t.startswith('CHƯƠNG II'):
        on = True
    if t.startswith('CHƯƠNG III'):
        break
    m = re.match(r'Hình 2\.(\d+)\. ', t)
    if on and m and p.style.name == '1hinh':
        dem += 1
        MAP[m.group(1)] = str(dem)
MAU = re.compile(r'Hình 2\.(\d+)(?!\d)')
for p in ds_doan():
    if la_muc_luc(p) or not MAU.search(p.text):
        continue
    f = lambda m: f'Hình 2.{MAP[m.group(1)]}' if m.group(1) in MAP else m.group(0)
    mong = MAU.sub(f, p.text)
    for r in p.runs:
        r.text = MAU.sub(f, r.text)
    assert p.text == mong, p.text[:80]
print('So hinh chuong 2:', dem)
d.save(RA)
print('Da luu', RA)
