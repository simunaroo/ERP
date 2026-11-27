# Rut gon Tai lieu tham khao (20/11/2026): 16 -> 11 tai lieu, chi giu tai lieu thuc su dung khi lam do an.
# Bo: [3] Giao trinh HQT CSDL (thieu nam XB), [6] Booch UML, [8] Fowler PoEAA, [10] RFC 7519 JWT, [16] Vite.
# Danh muc dung danh so tu dong cua Word -> chi can xoa doan; so trich [n] trong bai duoc doi theo bang ANH_XA.
# Chay: python sua_tltk.py <vao.docx> <ra.docx>
import re
src = open(r'F:/DATN/_cong_cu_bao_cao/cap_nhat_v3_tro_ly_ai.py', encoding='utf-8').read()
exec(src[:src.index('# ================================================================ TU VIET TAT')])

BO = ['Đỗ Ngọc Sơn, Phan Văn Viên', 'Booch, G., Rumbaugh', 'Fowler, M. (2002)', 'Jones, M., Bradley, J.', 'Vite Team, Vite Guide']
ANH_XA = {1: 1, 2: 2, 4: 3, 5: 4, 7: 5, 9: 6, 11: 7, 12: 8, 13: 9, 14: 10, 15: 11}

# 1. Bo trich dan toi tai lieu bi xoa (giu nguyen cau)
thay(tim('Em sử dụng phương pháp phân tích hướng đối tượng'), 'UML [1], [6]', 'UML [1]')
thay(tim('PostgreSQL 16 [3], [13]'), '[3], [13]', '[13]')
thay([p for p in ds_doan() if '(layered architecture) [8]' in p.text][0], '(layered architecture) [8]', '(layered architecture)')
thay(tim('JWT [10] và TOTP [11]'), 'JWT [10] và TOTP', 'JWT và TOTP')
thay(tim('React 18 [14] và Vite [16]'), 'và Vite [16]', 'và Vite')

# 2. Xoa muc trong danh muc
for dau in BO:
    p = tim(dau)
    p._p.getparent().remove(p._p)

# 3. Doi so trich con lai (mot luot, theo tung run)
MAU = re.compile(r'\[(\d+)\]')
con = []
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
    con += re.findall(r'\[\d+\]', mong)
print('Trich dan sau khi doi:', sorted({int(x[1:-1]) for x in con}))
d.save(RA)
print('Da luu', RA)
