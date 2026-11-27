# Muc 2.8.2.2: thay 5 ERD theo phan he bang 1 hinh "Mo hinh co so du lieu" (14 bang loi, chi ghi khoa PK/UK/FK,
# mau theo phan he; ve bang _hinh/puml_rose/ve_mo_hinh.cjs). Danh lai so Hinh 2.x phia sau.
# Chay: python thay_mo_hinh_csdl.py <vao.docx> <ra.docx>
import re
src = open(r'F:/DATN/_cong_cu_bao_cao/cap_nhat_v3_tro_ly_ai.py', encoding='utf-8').read()
exec(src[:src.index('# ================================================================ TU VIET TAT')])
HINH_MH = r'F:/DATN/_hinh/puml_rose/png/mo_hinh_csdl.png'
la_muc_luc = lambda p: p.style.name.lower().startswith(('toc', 'table of figures'))


def sao(mau, text):
    e = copy.deepcopy(mau._p)
    for tag in ('w:bookmarkStart', 'w:bookmarkEnd'):
        for b in list(e.iter(qn(tag))):
            b.getparent().remove(b)
    dat(Paragraph(e, mau._parent), text)
    return e


h = tim('2.8.2.2. ')
het = tim('2.9. Thiết kế Front')._p
cap_mau = Paragraph(h._p.getnext().getnext(), d)                 # chu thich ERD dau tien
assert cap_mau.text.strip().startswith('Hình 2.'), cap_mau.text
MAU_ANH = Paragraph(cap_mau._p.getprevious(), d)
doan_mau = tim('Mục này trình bày chi tiết 6 bảng lõi')
moi = [
    sao(doan_mau, '\tHình 2.@MH thể hiện mô hình cơ sở dữ liệu của 14 bảng lõi. Mỗi bảng ghi khoá chính (PK), khoá duy nhất (UK) và khoá ngoại (FK) kèm bảng được tham chiếu; màu tiêu đề phân biệt phân hệ: khách hàng, đơn hàng, vật tư – nhà cung cấp – mua hàng, chi tiền – thu tiền và trợ lý AI. Khoá ngoại tới bảng users chỉ được ghi trong bảng, không vẽ đường nối để hình dễ đọc.'),
    doan_anh(HINH_MH),
    sao(cap_mau, 'Hình 2.@MH. Mô hình cơ sở dữ liệu'),
]
e = h._p.getnext()
while e is not het:                                             # bo cac ERD cu (anh + chu thich + doan trong)
    n = e.getnext()
    assert e.find('.//' + qn('w:sectPr')) is None
    e.getparent().remove(e)
    e = n
dat(h, '2.8.2.2. Mô hình cơ sở dữ liệu')
chen_sau(h._p, moi)

# Danh lai so Hinh 2.x theo thu tu trong Chuong 2, doi ca cho tham chieu trong bai
MAP, dem, on = {}, 0, False
for p in ds_doan():
    t = p.text.strip()
    if la_muc_luc(p):
        continue
    if t.startswith('CHƯƠNG II.'):
        on = True
    if t.startswith('CHƯƠNG III.'):
        break
    m = re.match(r'Hình 2\.(\d+|@\w+)\. ', t)
    if on and m and p.style.name == '1hinh':
        dem += 1
        MAP[m.group(1)] = str(dem)
MAU = re.compile(r'Hình 2\.(\d+|@\w+)(?![\d\w])')
for p in ds_doan():
    if la_muc_luc(p) or not MAU.search(p.text):
        continue
    f = lambda m: f'Hình 2.{MAP[m.group(1)]}' if m.group(1) in MAP else m.group(0)
    mong = MAU.sub(f, p.text)
    for r in p.runs:
        r.text = MAU.sub(f, r.text)
    assert p.text == mong, p.text[:80]
print('So hinh chuong 2:', dem, '| mo hinh CSDL la Hinh 2.' + MAP['@MH'])
d.save(RA)
