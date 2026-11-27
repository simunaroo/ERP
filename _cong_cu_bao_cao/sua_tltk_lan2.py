# Tai lieu tham khao gon trong 1 trang (27/11/2026): bo [5] Express (trich cung cho voi [8] Node.js) va [10] React.
# Danh muc dung danh so tu dong cua Word -> chi xoa doan; so trich [n] trong bai doi theo ANH_XA.
# Chay: python sua_tltk_lan2.py <vao.docx> <ra.docx>
import re
src = open(r'F:/DATN/_cong_cu_bao_cao/cap_nhat_v3_tro_ly_ai.py', encoding='utf-8').read()
exec(src[:src.index('# ================================================================ TU VIET TAT')])

BO = ['Express, Express 5.x – API Reference', 'React Team, React Documentation']
ANH_XA = {1: 1, 2: 2, 3: 3, 4: 4, 6: 5, 7: 6, 8: 7, 9: 8, 11: 9}

thay(tim('Node.js 22 và Express 5 [5], [8]'), '[5], [8]', '[8]')
thay(tim('React 18 [10] và Vite'), 'React 18 [10] và Vite', 'React 18 và Vite')
for dau in BO:
    p = tim(dau)
    p._p.getparent().remove(p._p)

MAU = re.compile(r'\[(\d+)\]')
for p in ds_doan():
    if p.style.name.lower().startswith('toc') or not MAU.search(p.text):
        continue
    def doi(m):
        n = int(m.group(1))
        assert n in ANH_XA, f'trich [{n}] khong con trong danh muc: {p.text[:80]}'
        return f'[{ANH_XA[n]}]'
    mong = MAU.sub(doi, p.text)
    for r in p.runs:
        r.text = MAU.sub(doi, r.text)
    assert p.text == mong, f'so trich bi tach run: {p.text[:80]}'
d.save(RA)
print('Da luu', RA)
