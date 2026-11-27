# Sua sau khi ra soat ban chinh (20/11/2026). Chay lai duoc nhieu lan (bo qua cho da sua).
#  1. Ket luan: so lieu cu (21 use case, 158 ca), bo sung tro ly Quan ly / NCC, huong phat trien tro ly AI.
#  2. Mo dau, Chuong 1 (1.2, 1.4, 1.6.2): bo sung tro ly Quan ly / NCC va co che goi ham, ma hoa du lieu.
#  3. 2.8.1.4 / 2.8.1.5 doi ten theo UC07 / UC09, thay bieu do trinh tu + lop da gop.
#  4. Chu thich bang di cung bang, anh di cung chu thich (keep with next).
#  5. Tieu de rong -> Normal; bo dau cham cuoi tieu de.
#  6. Thong nhat "use case", "back-end", "front-end".
# Chay: python sua_sau_ra_soat.py <vao.docx> <ra.docx>
import re
src = open(r'F:/DATN/_cong_cu_bao_cao/cap_nhat_v3_tro_ly_ai.py', encoding='utf-8').read()
exec(src[:src.index('# ================================================================ TU VIET TAT')])
ROSE = r'F:/DATN/_hinh/puml_rose/png'


def sua(dau, cu, moi):
    """Thay trong doan bat dau bang `dau`; bo qua neu da sua (khong con `cu`)."""
    p = tim(dau)
    if cu in p.text:
        thay(p, cu, moi)
        return 1
    assert moi in p.text or moi.split(';')[0] in p.text, f'Khong thay ca cu lan moi: {dau!r}'
    return 0


# ---------------------------------------------------------------- 1. Ket luan
sua('Về phân tích thiết kế: khảo sát quy trình thực tế', 'đặc tả 21 use case', 'đặc tả 11 use case chính')
sua('Về an toàn và chất lượng:', 'bộ kiểm thử tự động 158 ca đều đạt.', 'bộ kiểm thử tự động 169 ca đều đạt.')
p = tim('Về trí tuệ nhân tạo:')
if 'trợ lý NCC' not in p.text:
    dat(p, 'Về trí tuệ nhân tạo: mỗi sản phẩm có một trợ lý AI riêng trả lời Sale dựa trên tài liệu do doanh nghiệp soạn, nhận cả ảnh chụp công trình; quản lý có thêm trợ lý Quản lý và trợ lý NCC tự gọi hàm tra cứu dữ liệu thật về tình hình chăm sóc khách, giá nhập và công nợ nhà cung cấp; AI còn nhận xét số liệu vật tư, giá nhà cung cấp và hiệu quả chăm sóc khách hàng. Mọi con số do cơ sở dữ liệu tính; thông tin cá nhân của khách không được gửi ra ngoài, tên nhà cung cấp và số tiền được thay bằng mã trước khi gửi AI.')
sua('Mở rộng trợ lý AI:', 'cho phép tra cứu tình trạng đơn hàng trong phạm vi quyền của người hỏi',
    'cho Sale và Vận hành tra cứu tình trạng đơn hàng của chính mình bằng cơ chế gọi hàm như trợ lý Quản lý')

# ---------------------------------------------------------------- 2. Mo dau, Chuong 1
sua('Tích hợp Telegram Bot cho đặt hàng nhà cung cấp', 'mã QR chuyển khoản theo chuẩn VietQR và trợ lý AI tư vấn theo từng sản phẩm.',
    'mã QR chuyển khoản theo chuẩn VietQR, trợ lý AI tư vấn theo từng sản phẩm và trợ lý AI tra cứu dữ liệu cho quản lý.')
sua('Nhà cung cấp, giám đốc và kế toán thao tác được ngay trên Telegram', 'trợ lý AI hỗ trợ tư vấn sản phẩm và nhận xét số liệu, mọi con số',
    'trợ lý AI hỗ trợ tư vấn sản phẩm, tra cứu tình hình chăm sóc khách và nhà cung cấp, nhận xét số liệu; mọi con số')
sua('Báo cáo và trợ lý AI:', 'trợ lý AI tư vấn theo từng sản phẩm.',
    'trợ lý AI tư vấn theo từng sản phẩm; trợ lý AI giúp quản lý tra cứu tình hình chăm sóc khách và nhà cung cấp.')
sua('Admin (giám đốc):', 'soạn kiến thức cho trợ lý AI.', 'soạn kiến thức cho trợ lý AI, hỏi trợ lý AI về tình hình chăm sóc khách và nhà cung cấp.')
sua('Gemini API [', 'mọi con số do cơ sở dữ liệu tính toán, AI chỉ diễn giải.',
    'mọi con số do cơ sở dữ liệu tính toán, AI chỉ diễn giải. Trợ lý quản lý và trợ lý NCC dùng cơ chế gọi hàm (function calling): AI chọn hàm tra cứu, back-end chạy truy vấn, tên NCC và số tiền được thay bằng mã trước khi gửi AI.')

# ---------------------------------------------------------------- 3. 2.8.1.4 / 2.8.1.5 theo UC07 / UC09
def thay_anh_cua(cap, duong):
    inl = cap._p.getprevious().find('.//' + qn('wp:inline'))
    rid = inl.find('.//' + qn('a:blip')).get(qn('r:embed'))
    d.part.related_parts[rid]._blob = open(duong, 'rb').read()
    dat_kich_thuoc(inl, *cap_anh(duong))


for cu, moi, ma in [('Duyệt đề xuất chi', 'Duyệt và chi đề xuất chi', 'duyet_chi'),
                    ('Đối soát giao dịch ngân hàng', 'Thu tiền khách và đối soát ngân hàng', 'doi_soat')]:
    hs = [p for p in tim('2.8.1.', tat_ca=True) if f'“{cu}”' in p.text]
    if not hs:
        continue                                  # da sua
    thay(hs[0], f'“{cu}”', f'“{moi}”')
    for loai, anh in (('trình tự', f'seq_{ma}_xoay.png'), ('lớp', f'cls_{ma}.png')):
        cap = [p for p in tim('Hình 2.', tat_ca=True) if p.style.name == '1hinh' and re.search(rf'Biểu đồ {loai} (usecase|use case) {cu}$', p.text.strip())][0]
        thay(cap, cu, moi)
        thay_anh_cua(cap, f'{ROSE}/{anh}')

# ---------------------------------------------------------------- 4. keep with next
dem_kwn = 0
for p in ds_doan():
    e = p._p
    nx = e.getnext()
    if nx is None:
        continue
    if p.style.name == '1bb' and nx.tag == qn('w:tbl'):            # chu thich bang -> bang
        p.paragraph_format.keep_with_next = True
        dem_kwn += 1
    elif e.findall('.//' + qn('w:drawing')) and nx.tag == qn('w:p') and Paragraph(nx, d).style.name == '1hinh':
        p.paragraph_format.keep_with_next = True                    # anh -> chu thich ben duoi
        dem_kwn += 1

# ---------------------------------------------------------------- 5. tieu de
for p in ds_doan():
    if not p.style.name.startswith('Heading'):
        continue
    if not p.text.strip():
        p.style = d.styles['Normal']                                 # tieu de rong tao dong trong trong muc luc
    elif re.match(r'^\d+(\.\d+)+\. .+\.$', p.text.strip()):
        r = [r for r in p.runs if r.text.strip()][-1]
        r.text = re.sub(r'\.(\s*)$', r'\1', r.text)

# ---------------------------------------------------------------- 6. thong nhat cach viet
def chuan(t):
    t = t.replace('usecase', 'use case').replace('Usecase', 'Use case')
    t = re.sub(r'(?<=[\wÀ-ỹ,] )(Back|Front)[–-]end', lambda m: m.group(1).lower() + '-end', t)
    return re.sub(r'(back|front|Back|Front)–end', r'\1-end', t)


con = []
for p in ds_doan():
    for t in p._p.iter(qn('w:t')):               # moi nut chu (ke ca trong lien ket cua muc luc / danh muc)
        if t.text and chuan(t.text) != t.text:
            t.text = chuan(t.text)
    if chuan(p.text) != p.text:
        con.append(p.text[:80])
print('Giu voi tiep:', dem_kwn, '| con sot do tach run:', con)
d.save(RA)
print('Da luu', RA)
