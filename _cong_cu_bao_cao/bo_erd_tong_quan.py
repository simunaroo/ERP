# Bo ERD tong quan khoi Chuong 2 cua ban da co (giu nguyen sua doi khac), danh lai so Hinh 2.x phia sau.
# Chay: python bo_erd_tong_quan.py <vao.docx> <ra.docx>
import re
src = open(r'F:/DATN/_cong_cu_bao_cao/cap_nhat_v3_tro_ly_ai.py', encoding='utf-8').read()
exec(src[:src.index('# ================================================================ TU VIET TAT')])
cap = tim('Hình 2.19. Biểu đồ thực thể liên kết mức logic')
so_bo = 19
anh = cap._p.getprevious()
assert anh.findall('.//' + qn('w:drawing'))
for e in (anh, cap._p):
    e.getparent().remove(e)
MAU = re.compile(r'Hình 2\.(\d+)(?!\d)')
doi = 0
for p in ds_doan():
    if p.style.name.lower().startswith('toc') or not MAU.search(p.text):
        continue
    mong = MAU.sub(lambda m: f'Hình 2.{int(m.group(1)) - 1}' if int(m.group(1)) > so_bo else m.group(0), p.text)
    for r in p.runs:
        r.text = MAU.sub(lambda m: f'Hình 2.{int(m.group(1)) - 1}' if int(m.group(1)) > so_bo else m.group(0), r.text)
    assert p.text == mong, p.text[:80]
    doi += 1
print('doan da doi so hinh:', doi)
d.save(RA)
