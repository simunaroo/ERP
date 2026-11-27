# Sua sau lan ra soat thu 2 (27/11/2026). Chay lai duoc nhieu lan (bo qua cho da sua).
#  1. 2.8.1: mo ta dung ky phap bieu do (boundary - control - entity), khong phai routes - controller - service - repository.
#  2. Hinh 2.1 ve lai co use case "Doi mat khau" (2.5.1 va 2.6 co nhac).
#  3. Ban thiet ke muc 2.9 ve lai: nhan buoc "Tính KLVT" (dung giao dien that), vong so khong de len chu.
#  4. Chu thich Hinh 2.19 ghi ro la bieu do thuc the lien ket muc logic (khop 1.3, 1.6.1, 2.2).
#  5. 1.3: actor ngoai dung ten nhu cac chuong sau, them Gemini AI.
#  6-10. Cau chu: "chia tay", 2 cau Ket luan, "toàn bộ bộ", JSON trong danh muc viet tat, "trợ lý AI sản phẩm", "backend".
#  11. 2.8.2.1: bang tro_ly_tin_nhan chuyen xuong cuoi dung thu tu doan dan; danh lai so Bang 2.x.
#  12-14. Thong nhat "hoá"; huong phat trien noi voi muc 3.3.1; bo doan gioi thieu trung lap dau muc 2.1.
#  15. Hinh 2.18 chi co lop cua tro ly san pham: sua chu thich; doan ngay sau chu thich noi 2 lop TroLyCongCuController, BiDanh cua tro ly Quan ly / NCC.
# Sau script nay chay sua_viet_tat.py de bo URL (khong con dung). Chay: python sua_ra_soat_lan2.py <vao.docx> <ra.docx>
import re
src = open(r'F:/DATN/_cong_cu_bao_cao/cap_nhat_v3_tro_ly_ai.py', encoding='utf-8').read()
exec(src[:src.index('# ================================================================ TU VIET TAT')])
la_muc_luc = lambda p: p.style.name.lower().startswith(('toc', 'table of figures'))
da_sua = []


def sua_neu(p, cu, moi, ten):
    """Thay `cu` -> `moi` trong doan p; bo qua neu da sua."""
    if cu in p.text:
        thay(p, cu, moi)
        da_sua.append(ten)
    else:
        assert moi in p.text, f'{ten}: khong thay ca cu lan moi trong {p.text[:80]!r}'


def dat_doan(p, text):
    t = text.lstrip('\t')
    dat(p, ('\t' + t) if p.text.startswith('\t') else t)


def thay_moi_nut(cu, moi):
    """Thay trong moi nut chu cua van ban (ke ca muc luc, o bang); tra ve so cho da thay."""
    n = 0
    for t in body.iter(qn('w:t')):
        if t.text and cu in t.text:
            n += t.text.count(cu)
            t.text = t.text.replace(cu, moi)
    return n


# ---------------------------------------------------------------- 1. 2.8.1
p = tim('Với mỗi chức năng chính, biểu đồ trình tự')
if 'boundary' not in p.text:
    dat_doan(p, 'Với mỗi chức năng chính, biểu đồ trình tự mô tả thứ tự trao đổi thông điệp giữa actor, lớp giao diện (boundary), lớp điều khiển (control), các thực thể dữ liệu (entity, tương ứng với bảng trong cơ sở dữ liệu) và hệ thống ngoài; biểu đồ lớp phân tích được suy ra từ chính các thông điệp đó. Khi cài đặt, lớp điều khiển tương ứng với các lớp routes – controller – service của module, còn thực thể được truy xuất qua repository (mục 1.5.1).')
    da_sua.append('2.8.1 mo ta bieu do')

# ---------------------------------------------------------------- 2. Hinh 2.1
cap = tim('Hình 2.1. Biểu đồ use case tổng quan')
inl = cap._p.getprevious().find('.//' + qn('wp:inline'))
duong = r'F:/DATN/_hinh/puml_rose/png/uc_tongquan.png'
d.part.related_parts[inl.find('.//' + qn('a:blip')).get(qn('r:embed'))]._blob = open(duong, 'rb').read()
dat_kich_thuoc(inl, *cap_anh(duong))

# ---------------------------------------------------------------- 3. Ban thiet ke 2.9: nhan buoc "Tính KLVT" dung nhu giao dien
# that (ban cu chep nhan "Bóc khối lượng" tu anh chup 06/11, truoc khi doi ten), vong so khong de len chu dau.
ANH_TK = {'Thiết kế giao diện đăng nhập': 'tk_dang_nhap', 'Thiết kế giao diện trang Tổng quan': 'tk_tong_quan',
          'Thiết kế giao diện chi tiết khách hàng': 'tk_chi_tiet_khach', 'Thiết kế giao diện tạo đơn hàng': 'tk_tao_don',
          'Thiết kế khung chat trợ lý AI': 'tk_tro_ly_chat', 'Thiết kế giao diện chi tiết đơn hàng': 'tk_chi_tiet_don',
          'Thiết kế giao diện đề xuất chi': 'tk_de_xuat_chi', 'Thiết kế giao diện báo cáo chăm sóc': 'tk_bao_cao_cham_soc'}
for ten, tep in ANH_TK.items():
    cs = [x for x in tim('Hình 2.', tat_ca=True) if x.style.name == '1hinh' and ten in x.text]
    assert len(cs) == 1, ten
    inl = cs[0]._p.getprevious().find('.//' + qn('wp:inline'))
    part = d.part.related_parts[inl.find('.//' + qn('a:blip')).get(qn('r:embed'))]
    duong = rf'F:/DATN/_cong_cu_bao_cao/anh/{tep}.png'
    blob = open(duong, 'rb').read()
    if part._blob != blob:
        part._blob = blob
        dat_kich_thuoc(inl, *cap_anh(duong))
        da_sua.append(f'anh {tep}')

# ---------------------------------------------------------------- 4. Hinh 2.19
cap = [x for x in tim('Hình 2.', tat_ca=True) if x.style.name == '1hinh' and 'Mô hình cơ sở dữ liệu' in x.text][0]
if 'thực thể liên kết' not in cap.text:
    thay(cap, 'Mô hình cơ sở dữ liệu', 'Mô hình cơ sở dữ liệu (biểu đồ thực thể liên kết mức logic)')
    da_sua.append('chu thich mo hinh CSDL')

# ---------------------------------------------------------------- 5. 1.3
sua_neu(tim('Từ kết quả khảo sát, em xác định các actor'),
        'công cụ tìm số khách hàng và ngân hàng là các hệ thống bên ngoài giao tiếp qua API',
        'website và kênh quảng cáo (đẩy số khách tiềm năng), ngân hàng (SePay) và Gemini AI là các hệ thống bên ngoài giao tiếp qua API',
        '1.3 actor ngoai')

# ---------------------------------------------------------------- 6-10. cau chu
ps = [x for x in ds_doan() if x.text.strip().startswith('Số khách tiềm năng chia tay:')]
if ps:
    thay(ps[0], 'Số khách tiềm năng chia tay:', 'Chia số khách tiềm năng thủ công:')
    da_sua.append('2.1 chia tay')
sua_neu(tim('Về chức năng: hoàn thiện các phân hệ'), 'đơn hàng theo tiến độ, đặt, mua hàng nhà cung cấp', 'đơn hàng theo tiến độ, đặt và mua hàng từ nhà cung cấp', 'KL chuc nang')
sua_neu(tim('Hệ thống mới được chạy thử trên dữ liệu mẫu'), 'nhưng chưa được trải qua thời gian vận hành doanh nghiệp.', 'nhưng chưa được vận hành chính thức tại doanh nghiệp.', 'KL han che')
n = thay_moi_nut('toàn bộ bộ kiểm thử', 'cả bộ kiểm thử') + thay_moi_nut('Toàn bộ bộ kiểm thử', 'Cả bộ kiểm thử')
if n:
    da_sua.append(f'"toàn bộ bộ" x{n}')
if thay_moi_nut('giữa frontend và backend', 'giữa front-end và back-end'):
    da_sua.append('JSON viet tat')
sua_neu(tim('Cơ sở dữ liệu PostgreSQL gồm 42 bảng'), 'trợ lý AI sản phẩm; mua hàng', 'trợ lý AI; mua hàng', '2.8.2 phan he tro ly')
sua_neu(tim('Hàm trigger fn_ghi_nhat_ky gắn vào'), 'biến phiên do backend đặt', 'biến phiên do back-end đặt', 'backend')

# ---------------------------------------------------------------- 11. thu tu bang chi tiet CSDL
cap_tl = [x for x in tim('Bảng 2.', tat_ca=True) if x.style.name == '1bb' and 'Bảng tro_ly_tin_nhan –' in x.text][0]
moc = tim('Các bảng còn lại phục vụ thông báo')._p
tbl_tl = cap_tl._p.getnext()
assert tbl_tl.tag == qn('w:tbl')
if tbl_tl.getnext() is not moc:
    moc.addprevious(cap_tl._p)                     # lxml: addprevious tu chuyen phan tu (khong sao chep)
    moc.addprevious(tbl_tl)
    da_sua.append('chuyen bang tro_ly_tin_nhan xuong cuoi')
MAP, dem, on = {}, 0, False
for p in ds_doan():
    t = p.text.strip()
    if la_muc_luc(p):
        continue
    if t.startswith('CHƯƠNG II'):
        on = True
    if t.startswith('CHƯƠNG III'):
        break
    m = re.match(r'Bảng 2\.(\d+)\. ', t)
    if on and m and p.style.name == '1bb':
        dem += 1
        MAP[m.group(1)] = str(dem)
MAU = re.compile(r'Bảng 2\.(\d+)(?!\d)')
for p in ds_doan():
    if la_muc_luc(p) or not MAU.search(p.text):
        continue
    f = lambda m: f'Bảng 2.{MAP[m.group(1)]}' if m.group(1) in MAP else m.group(0)
    mong = MAU.sub(f, p.text)
    for r in p.runs:
        r.text = MAU.sub(f, r.text)
    assert p.text == mong, p.text[:80]

# ---------------------------------------------------------------- 12-14. tuy chon
n = thay_moi_nut('hóa', 'hoá') + thay_moi_nut('Hóa', 'Hoá')
if n:
    da_sua.append(f'"hóa"->"hoá" x{n}')
p = tim('Tối ưu hiệu năng')
if 'mục 3.3.1' not in p.text:
    dat_doan(p, 'Tối ưu hiệu năng các báo cáo còn chậm ở mục 3.3.1 (lãi/lỗ 12 tháng, công nợ khách hàng) bằng chỉ mục phù hợp và bảng số liệu tổng hợp theo ngày, cập nhật dần thay vì tính lại trên toàn bộ đơn.')
    da_sua.append('huong phat trien 1')
ps = [x for x in ds_doan() if x.text.strip().startswith('Doanh nghiệp NST hoạt động trong lĩnh vực vật liệu hoàn thiện')]
if ps:                                              # trung voi Mo dau va muc 1.1
    ps[0]._p.getparent().remove(ps[0]._p)
    dat_doan(tim('Trước khi có phần mềm, các bước trên'),
             'Quy trình nhiều bộ phận của doanh nghiệp NST (mục 1.1) trước khi có phần mềm được thực hiện rời rạc trên Excel, Google Sheets, Zalo và nhóm Telegram nội bộ. Qua khảo sát, em ghi nhận các hạn chế chính sau:')
    da_sua.append('2.1 bo doan trung')

# ---------------------------------------------------------------- 15. Hinh 2.18 chi ve lop cua tro ly san pham
cs = [x for x in tim('Hình 2.', tat_ca=True) if x.style.name == '1hinh' and 'Biểu đồ lớp use case Hỏi trợ lý AI' in x.text]
if cs:
    thay(cs[0], 'Biểu đồ lớp use case Hỏi trợ lý AI', 'Biểu đồ lớp trợ lý AI sản phẩm')
    da_sua.append('chu thich Hinh 2.18')
# Cau noi 2 lop dat ngay sau chu thich Hinh 2.18 (muc "Biểu đồ lớp"). Ban dau cau nam cuoi doan dan Hinh 2.17:
# doan dai them 3 dong -> Hinh 2.17 (cao 21 cm) khong vua trang, bi day sang trang sau, du 1 trang -> go ra.
CAU_CU = (' So với trợ lý sản phẩm, luồng này dùng thêm lớp điều khiển TroLyCongCuController (vòng gọi hàm) và BiDanh'
          ' (thay tên NCC, số tiền bằng mã rồi đổi lại); lớp giao diện và các thực thể tro_ly_hoi_thoai, tro_ly_tin_nhan'
          ' dùng chung với biểu đồ lớp ở Hình 2.18.')
CAU_MOI = ('Trợ lý Quản lý và trợ lý NCC dùng chung lớp giao diện và các thực thể tro_ly_hoi_thoai, tro_ly_tin_nhan'
           ' với Hình 2.18; so với trợ lý sản phẩm, luồng này dùng thêm lớp điều khiển TroLyCongCuController'
           ' (vòng gọi hàm) và BiDanh (thay tên NCC, số tiền bằng mã rồi đổi lại).')
p17 = tim('Với trợ lý Quản lý và trợ lý NCC, AI không nhận sẵn dữ liệu')
if CAU_CU in p17.text:
    thay(p17, CAU_CU, '')
    da_sua.append('go cau khoi doan dan Hinh 2.17')
if not tim(CAU_MOI[:40], tat_ca=True):
    cap18 = [x for x in tim('Hình 2.18.', tat_ca=True) if x.style.name == '1hinh']
    assert len(cap18) == 1, cap18
    moi = doan_moi(p17, ('\t' if p17.text.startswith('\t') else '') + CAU_MOI)
    chen_sau(cap18[0]._p, [moi])
    Paragraph(moi, cap18[0]._parent).paragraph_format.keep_with_next = None
    da_sua.append('doan noi 2 lop sau Hinh 2.18')

# ---------------------------------------------------------------- kiem tra con sot
T = '\n'.join(x.text for x in ds_doan() if not la_muc_luc(x))
for k in ('Bóc khối lượng', 'toàn bộ bộ', 'chia tay', 'hóa', 'frontend', 'Routes – Controller – Service'):
    assert k not in T, f'con sot: {k}'
print('Da sua:', da_sua)
print('So bang chuong 2:', dem)
d.save(RA)
print('Da luu', RA)
