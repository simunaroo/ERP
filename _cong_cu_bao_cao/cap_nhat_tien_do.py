# Cap nhat bao cao tien do (13/11/2026): trang thai ke hoach tong the, them bao cao tuan 3-4 va tuan 5.
# Noi dung lay tu lich su git, migration, nhat ky phat trien va ket qua kiem thu (khong tu dat viec khong co bang chung).
# Chay: python cap_nhat_tien_do.py <vao.docx> <ra.docx>
import copy, sys
import docx
from docx.oxml.ns import qn
from docx.table import Table, _Row
from docx.text.paragraph import Paragraph

d = docx.Document(sys.argv[1])
body = d.element.body


def chu(el):
    return ''.join(t.text or '' for t in el.iter(qn('w:t'))).strip()


def dat_doan(p_el, text):
    p = Paragraph(p_el, d)
    runs = p.runs
    for r in runs[1:]: r._r.getparent().remove(r._r)
    runs[0].text = text


def dat_o(o, text):
    ps = o.paragraphs
    for p in ps[1:]: p._p.getparent().remove(p._p)
    runs = ps[0].runs
    for r in runs[1:]: r._r.getparent().remove(r._r)
    if runs: runs[0].text = text
    else: ps[0].add_run(text)


els = list(body.iterchildren())
# ---- 1. Ke hoach tong the: cap nhat trang thai
kh = next(e for e in els if e.tag == qn('w:tbl') and 'Nội dung công việc' in chu(e))
TT = {
    '1': 'Hoàn thành', '2': 'Hoàn thành', '3': 'Hoàn thành',
    '4': 'Hoàn thành (xong ở tuần 5)', '5': 'Đang thực hiện', '6': 'Hoàn thành sớm (tuần 5)',
    '7': 'Đang thực hiện', '8': 'Chưa bắt đầu',
}
for r in Table(kh, d).rows[1:]:
    dat_o(r.cells[3], TT[r.cells[0].text.strip()])
# To mau theo quy uoc cua ban goc: dong 1 (xanh) = hoan thanh, dong 2 (vang) = chua xong han, con lai khong to
bkh = Table(kh, d)
def nen(o):
    shd = o._tc.find(qn('w:tcPr')).find(qn('w:shd'))
    return None if shd is None else shd.get(qn('w:fill'))
XANH, VANG = nen(bkh.rows[1].cells[0]), nen(bkh.rows[2].cells[0])
for r in bkh.rows[1:]:
    tt = r.cells[3].text.strip()
    mau = XANH if tt.startswith('Hoàn thành') else VANG if tt.startswith('Đang') else None
    for o in r.cells:
        tcPr = o._tc.get_or_add_tcPr()
        shd = tcPr.find(qn('w:shd'))
        if mau is None:
            if shd is not None: tcPr.remove(shd)
            continue
        if shd is None:
            from docx.oxml import OxmlElement
            shd = OxmlElement('w:shd'); tcPr.append(shd)
        shd.set(qn('w:val'), 'clear'); shd.set(qn('w:color'), 'auto'); shd.set(qn('w:fill'), mau)

# ---- 2. Khoi bao cao tuan 2 lam mau: tu tieu de "III. BÁO CÁO TUẦN 2" den het doan "4. Nhận xét..."
dau = next(i for i, e in enumerate(els) if chu(e).startswith('III. BÁO CÁO TUẦN 2'))
cuoi = next(i for i in range(dau, len(els)) if chu(els[i]).startswith('4. Nhận xét'))
khoi = els[dau:cuoi + 1]
sau_cung = els[cuoi]
# cac doan trong (cho GVHD ghi nhan xet) ngay sau "4. Nhận xét" cua tuan 2
j = cuoi + 1
trong = []
while j < len(els) and els[j].tag == qn('w:p') and not chu(els[j]) and els[j].find('.//' + qn('w:sectPr')) is None:
    trong.append(els[j]); j += 1
SO_TRONG = max(len(trong), 3)

mau_tieu_de = khoi[0]
mau_muc = next(e for e in khoi if chu(e).startswith('1. Công việc'))
mau_bang = next(e for e in khoi if e.tag == qn('w:tbl'))
mau_gach = next(e for e in khoi if e.tag == qn('w:p') and Paragraph(e, d).style.name == 'List Paragraph')
mau_trong = trong[0] if trong else None


def doan(mau, text):
    e = copy.deepcopy(mau); dat_doan(e, text); return e


def bang(dong):
    tbl = copy.deepcopy(mau_bang)
    t = Table(tbl, d)
    rows = list(t.rows)
    for r in rows[2:]: tbl.remove(r._tr)
    mau_dong = rows[1]._tr
    tbl.remove(mau_dong)
    for i, (cv, kq, td) in enumerate(dong):
        tr = copy.deepcopy(mau_dong); tbl.append(tr)
        row = _Row(tr, t)
        for o, v in zip(row.cells, (str(i + 1), cv, kq, td)): dat_o(o, v)
    return tbl


def tuan(tieu_de, viec, kho, ke_hoach_ten, ke_hoach):
    out = [doan(mau_tieu_de, tieu_de), doan(mau_muc, '1. Công việc đã thực hiện'), bang(viec),
           doan(mau_muc, '2. Khó khăn'), *[doan(mau_gach, x) for x in kho],
           doan(mau_muc, f'3. {ke_hoach_ten}'), *[doan(mau_gach, x) for x in ke_hoach],
           doan(mau_muc, '4. Nhận xét của giảng viên hướng dẫn')]
    if mau_trong is not None: out += [copy.deepcopy(mau_trong) for _ in range(SO_TRONG)]
    return out


T34 = tuan(
    'IV. BÁO CÁO TUẦN 3 – 4 (26/10/2026 – 08/11/2026)',
    [
        ('Chăm sóc khách hàng theo trạng thái cuộc gọi', 'Ghi nhận 7 trạng thái (không nghe máy, thuê bao, hẹn gọi lại, quan tâm, chốt đơn, không quan tâm, sai số); hẹn gọi lại bắt buộc chọn giờ và được nhắc; chốt đơn chuyển thẳng sang form tạo đơn', 'Xong'),
        ('Nhập số từ tệp và chuyển số', 'Nhập số khách tiềm năng từ tệp Excel, CSV, TXT (có xem trước); Admin chuyển hàng loạt số tồn đọng sang Sale khác', 'Xong'),
        ('Báo cáo chăm sóc khách hàng + AI nhận xét', 'Thống kê theo Sale: số được chia, tỷ lệ đã gọi, tỷ lệ chốt, số tồn đọng; Gemini nhận xét từng Sale (hậu kiểm tên và số liệu), lưu lịch sử phân tích', 'Xong'),
        ('Kiểm thử tự động', '143 ca kiểm thử, tất cả đạt (tăng từ 112 ca ở tuần 2); xuất báo cáo kết quả ra tệp KET_QUA_KIEM_THU.md', 'Xong'),
        ('Chương II', 'Vẽ biểu đồ use case, trình tự, lớp và ERD; chụp lại màn hình giao diện từ phần mềm thật cho mục 2.9', 'Xong'),
    ],
    ['Chưa có tài khoản ngân hàng/SePay thật nên chức năng đối soát vẫn kiểm tra trên giao dịch giả lập.'],
    'Kế hoạch tuần 5',
    ['Rà soát lại các use case theo nhu cầu thực tế của nhân viên kinh doanh, điều chỉnh chức năng nếu cần.',
     'Cập nhật Mở đầu, Chương I, Chương II cho khớp phần mềm; viết Chương III, Kết luận, Tài liệu tham khảo.'],
)
T5 = tuan(
    'V. BÁO CÁO TUẦN 5 (09/11/2026 – 15/11/2026, cập nhật đến 13/11/2026)',
    [
        ('Mã hợp đồng, bước Tính KLVT', 'Mã hợp đồng tự sinh dạng "SĐT_STT" khi chốt đơn, không trùng khi chốt đồng thời; đổi bước "Bóc khối lượng" thành "Tính KLVT"', 'Xong'),
        ('Trợ lý AI theo sản phẩm', 'Bỏ chức năng "Lên đơn nhanh bằng AI", thay bằng 3 trợ lý Gemini cho Cửa, Sàn, Tấm ốp: khung chat mở ở mọi màn hình, hỏi bằng chữ hoặc ảnh, kèm mẫu tin nhắn gửi khách; Admin soạn kiến thức (nạp từ PDF/ảnh); từ chối câu hỏi ngoài phạm vi', 'Xong'),
        ('Sản phẩm quan tâm, sản phẩm của đơn', 'Khách hàng gắn sản phẩm quan tâm (tự suy từ nhu cầu và đơn đã đặt); đơn hàng lưu sản phẩm chính', 'Xong'),
        ('Xác thực hai lớp theo vai trò', 'Admin bật/tắt xác thực hai lớp cho từng vai trò, có thể đăng xuất ngay tài khoản chưa cài', 'Xong'),
        ('Kiểm thử và thực nghiệm', '158 ca kiểm thử trong 22 nhóm, tất cả đạt; đo thời gian phản hồi API trên dữ liệu mẫu 1.504 đơn hàng', 'Xong'),
        ('Báo cáo', 'Cập nhật Mở đầu, Chương I, Chương II theo chức năng mới (đối chiếu với mã nguồn); vẽ lại biểu đồ theo kiểu Rational Rose, nét thẳng; viết Chương III, Kết luận, Tài liệu tham khảo (16 tài liệu, có trích dẫn trong bài)', '~95%'),
    ],
    ['Mô hình Gemini chính có lúc quá tải (lỗi 503), hệ thống phải chuyển sang mô hình dự phòng nên trợ lý trả lời chậm hơn.',
     'Trên dữ liệu mẫu lớn, báo cáo lãi/lỗ 12 tháng mất khoảng 3,8 giây, công nợ khách hàng khoảng 2,2 giây; cần tối ưu.'],
    'Kế hoạch tuần 6',
    ['Gửi bản báo cáo hoàn chỉnh để GVHD góp ý và chỉnh sửa theo góp ý.',
     'Tối ưu tốc độ báo cáo lãi/lỗ và công nợ khách hàng.',
     'Kiểm tra đạo văn, hoàn thiện định dạng (mục lục, danh mục hình, bảng, từ viết tắt).'],
)
moc = trong[-1] if trong else sau_cung
for e in T34 + T5:
    moc.addnext(e); moc = e
d.save(sys.argv[2])
print('Da luu', sys.argv[2])
