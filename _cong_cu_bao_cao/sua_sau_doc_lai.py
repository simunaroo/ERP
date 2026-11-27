# Sua sau khi doc lai ban chinh (13/11/2026): dong bang Chuong III khong bi cat doi qua trang,
# chu thich Hinh 2.33 viet hoa NCC, bo sung tu viet tat con thieu. Chay: python sua_sau_doc_lai.py <vao> <ra>
import copy, re, sys
import docx
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.table import Table, _Row
from docx.text.paragraph import Paragraph

d = docx.Document(sys.argv[1])
body = d.element.body
than = lambda: [Paragraph(p, d) for p in body.iter(qn('w:p')) if not Paragraph(p, d).style.name.lower().startswith('toc')]

# 1. Bang 3.1-3.3: khong cat dong qua trang; chu thich di cung bang
for p in than():
    if re.match(r'Bảng 3\.\d+\. ', p.text.strip()):
        p.paragraph_format.keep_with_next = True
        tbl = p._p.getnext()
        assert tbl.tag == qn('w:tbl'), p.text
        for tr in tbl.findall(qn('w:tr')):
            trPr = tr.find(qn('w:trPr'))
            if trPr is None:
                trPr = OxmlElement('w:trPr'); tr.insert(0, trPr)
            if trPr.find(qn('w:cantSplit')) is None:
                trPr.append(OxmlElement('w:cantSplit'))
        print('khong cat dong:', p.text.strip()[:50])

# 2. Hinh 2.33: "ncc" -> "NCC"
for p in than():
    if re.match(r'Hình 2\.\d+\. Biểu đồ thực thể liên kết phân hệ vật tư, ncc', p.text.strip()):
        for r in p.runs:
            if 'ncc' in r.text: r.text = r.text.replace('ncc', 'NCC')
        print('sua chu thich:', p.text.strip())

# 3. Bo sung tu viet tat (giu thu tu ABC)
THEM = [
    ('CSV', 'Comma-Separated Values', 'Tệp dữ liệu dạng bảng, các cột cách nhau bằng dấu phẩy'),
    ('FK', 'Foreign Key', 'Khoá ngoại'),
    ('HTTP', 'Hypertext Transfer Protocol', 'Giao thức truyền dữ liệu giữa trình duyệt và máy chủ web'),
    ('PDF', 'Portable Document Format', 'Định dạng tài liệu dùng để in và chia sẻ'),
    ('RFC', 'Request for Comments', 'Văn bản đặc tả tiêu chuẩn kỹ thuật của Internet do IETF công bố'),
    ('SĐT', 'Số điện thoại', 'Số điện thoại của khách hàng, nhân viên'),
    ('URL', 'Uniform Resource Locator', 'Địa chỉ của một trang hoặc tài nguyên trên web'),
    ('VAT', 'Value Added Tax', 'Thuế giá trị gia tăng'),
]
h = next(p for p in than() if p.text.strip() == 'DANH MỤC TỪ VIẾT TẮT' and p.style.name.startswith('Heading'))
tbl = h._p.getnext()
assert tbl.tag == qn('w:tbl')
t = Table(tbl, d)
co = {r.cells[0].text.strip() for r in t.rows[1:]}
mau = t.rows[1]._tr
for vt, day, nghia in THEM:
    if vt in co: continue
    tr = copy.deepcopy(mau)
    row = _Row(tr, t)
    for o, v in zip(row.cells, (vt, day, nghia)):
        ps = o.paragraphs
        for p in ps[1:]: p._p.getparent().remove(p._p)
        runs = ps[0].runs
        for r in runs[1:]: r._r.getparent().remove(r._r)
        runs[0].text = v
    # chen dung vi tri ABC (so sanh khong dau)
    khoa = lambda s: s.replace('Đ', 'D')
    sau = None
    for r in t.rows[1:]:
        if khoa(r.cells[0].text.strip()) < khoa(vt): sau = r._tr
    (sau if sau is not None else t.rows[0]._tr).addnext(tr)
    co.add(vt)
print('tu viet tat:', [r.cells[0].text.strip() for r in t.rows[1:]])
d.save(sys.argv[2])
print('Da luu', sys.argv[2])
