# Danh muc tu viet tat (20/11/2026): bo tu khong con dung (RBAC), them tu bai co dung ma chua co, xep lai theo ABC.
# Chi them tu thuc su xuat hien trong ban (vd SVG chi co o ban dung thu). Chay: python sua_viet_tat.py <vao.docx> <ra.docx>
import re
src = open(r'F:/DATN/_cong_cu_bao_cao/cap_nhat_v3_tro_ly_ai.py', encoding='utf-8').read()
exec(src[:src.index('# ================================================================ TU VIET TAT')])

THEM = {
    'AES': ('Advanced Encryption Standard', 'Chuẩn mã hoá đối xứng, dùng để mã hoá khoá xác thực hai lớp'),
    'CSS': ('Cascading Style Sheets', 'Ngôn ngữ định dạng giao diện trang web'),
    'KPI': ('Key Performance Indicator', 'Chỉ số đo lường hiệu quả công việc'),
    'PK': ('Primary Key', 'Khoá chính'),
    'UK': ('Unique Key', 'Khoá duy nhất: giá trị không được trùng giữa các dòng'),
    'SDK': ('Software Development Kit', 'Bộ thư viện phát triển do nhà cung cấp dịch vụ phát hành'),
    'SPC': ('Stone Plastic Composite', 'Vật liệu sàn nhựa lõi đá'),
    'SVG': ('Scalable Vector Graphics', 'Định dạng ảnh vector, dùng để vẽ các biểu đồ trong báo cáo'),
    'TC': ('Test Case', 'Ca kiểm thử'),
    'UC': ('Use Case', 'Ca sử dụng: một chức năng hệ thống cung cấp cho actor'),
}

# Noi dung bai (Mo dau -> truoc Tai lieu tham khao), bo muc luc / danh muc
noi_dung, on = [], False
for el in body.iterchildren():
    t = ''.join(x.text or '' for x in el.iter(qn('w:t')))
    if el.tag == qn('w:p'):
        st = el.find('.//' + qn('w:pStyle'))
        if st is not None and st.get(qn('w:val')).lower().startswith(('toc', 'tableoffigures')):
            continue
        s = t.strip()
        if s.startswith('MỞ ĐẦU'):
            on = True
        if s.startswith('TÀI LIỆU THAM KHẢO'):
            on = False
    if on:
        noi_dung.append(t)
T = '\n'.join(noi_dung)


def so_lan(tu):
    if tu in ('UC', 'TC'):      # ma use case / ca kiem thu: UC01, TC01 (dung lien voi chu khac trong o bang)
        return len(re.findall(rf'{tu}\d{{2}}', T))
    return len(re.findall(rf'(?<![\w-]){re.escape(tu)}(?![\w])', T))


cap = [p for p in tim('DANH MỤC TỪ VIẾT TẮT', tat_ca=True) if p.style.name.startswith('Heading') or p.text.strip().isupper()][-1]
e = cap._p.getnext()
while e.tag != qn('w:tbl'):
    e = e.getnext()
bang = Table(e, d)
dong = {r.cells[0].text.strip(): (r.cells[1].text.strip(), r.cells[2].text.strip()) for r in list(bang.rows)[1:]}
bo = [k for k in dong if so_lan(k) == 0]
them = [k for k in THEM if k not in dong and so_lan(k) > 0]
for k in bo:
    del dong[k]
for k in them:
    dong[k] = THEM[k]
for r in list(bang.rows)[2:]:          # giu dong tieu de + 1 dong lam mau
    bang._tbl.remove(r._tr)
khoa = lambda k: k.replace('Đ', 'D~')
ds = sorted(dong, key=khoa)
for o, v in zip(bang.rows[1].cells, (ds[0], *dong[ds[0]])):
    dat_o(o, v)
for k in ds[1:]:
    them_dong(bang, (k, *dong[k]), mau_dong=1)
print('Bo:', bo, '| Them:', them, '| Tong:', len(ds))
d.save(RA)
