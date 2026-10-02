import os

CSS = """
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;font-size:13px;color:#1f2937;background:#f3f4f6;width:1280px;height:760px;display:flex}
.side{width:210px;background:#1e3a5f;color:#cbd5e1;padding:18px 0}
.side .brand{color:#fff;font-weight:700;font-size:16px;padding:0 18px 16px;border-bottom:1px solid #2c4a72}
.side .role{font-size:11px;padding:10px 18px;color:#93c5fd;text-transform:uppercase;letter-spacing:.06em}
.side a{display:block;padding:9px 18px;color:#cbd5e1;text-decoration:none}
.side a.on{background:#2c4a72;color:#fff;border-left:3px solid #60a5fa;padding-left:15px}
.main{flex:1;display:flex;flex-direction:column}
.top{height:52px;background:#fff;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;justify-content:space-between;padding:0 22px}
.top h1{font-size:17px;font-weight:600}
.top .user{color:#6b7280}
.content{padding:20px 22px;overflow:hidden}
.card{background:#fff;border:1px solid #e5e7eb;border-radius:6px;padding:16px;margin-bottom:14px}
.toolbar{display:flex;gap:8px;margin-bottom:12px;align-items:center}
input,select,textarea{border:1px solid #d1d5db;border-radius:4px;padding:7px 9px;font:inherit;background:#fff}
.btn{background:#2563eb;color:#fff;border:none;border-radius:4px;padding:8px 14px;font:inherit;font-weight:600}
.btn.sec{background:#fff;color:#374151;border:1px solid #d1d5db}
.btn.ok{background:#16a34a}
table{width:100%;border-collapse:collapse}
th{background:#f9fafb;text-align:left;padding:8px 10px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#374151}
td{padding:8px 10px;border-bottom:1px solid #f1f5f9}
.num{text-align:right;font-variant-numeric:tabular-nums}
.pill{display:inline-block;padding:2px 9px;border-radius:999px;font-size:11px;font-weight:600}
.p-new{background:#dbeafe;color:#1d4ed8}.p-wip{background:#fef3c7;color:#92400e}.p-done{background:#dcfce7;color:#166534}.p-no{background:#fee2e2;color:#991b1b}.p-gray{background:#e5e7eb;color:#374151}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px 18px}
.field label{display:block;font-weight:600;margin-bottom:5px;color:#374151}
.field input,.field select,.field textarea{width:100%}
.drop{border:2px dashed #cbd5e1;border-radius:6px;height:110px;display:flex;align-items:center;justify-content:center;color:#6b7280}
.thumbs{display:flex;gap:8px;margin-top:8px}.thumbs div{width:90px;height:64px;background:#e2e8f0;border-radius:4px}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:14px}
.stat{background:#fff;border:1px solid #e5e7eb;border-radius:6px;padding:14px}
.stat .k{color:#6b7280;font-size:12px}.stat .v{font-size:20px;font-weight:700;margin-top:4px}
h3{font-size:14px;margin-bottom:10px}
"""

MENUS = {
    'sale': ('Sale', ['Đơn hàng của tôi', 'Tạo đơn hàng', 'Khách hàng phụ trách', 'Yêu cầu chỉnh sửa']),
    'vh': ('Vận hành', ['Đơn hàng cần xử lý', 'Phương án thi công', 'Lịch thi công', 'Nghiệm thu', 'Yêu cầu chỉnh sửa']),
    'kt': ('Kế toán', ['Nhà cung cấp & bảng giá', 'Đề xuất mua hàng', 'Đề xuất chi', 'Công nợ NCC']),
    'ad': ('Admin', ['Người dùng', 'Loại vật tư', 'Đội thợ']),
}

def page(role, active, title, user, body):
    rname, items = MENUS[role]
    links = ''.join(f'<a class="{"on" if i == active else ""}">{t}</a>' for i, t in enumerate(items))
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>{CSS}</style></head><body>
<div class="side"><div class="brand">ERP NST</div><div class="role">{rname}</div>{links}</div>
<div class="main"><div class="top"><h1>{title}</h1><div class="user">{user} · Đăng xuất</div></div>
<div class="content">{body}</div></div></body></html>"""

pages = {}

pages['ui_login'] = f"""<!doctype html><html><head><meta charset="utf-8"><style>{CSS}
body{{align-items:center;justify-content:center;background:#1e3a5f}}
.box{{width:380px;background:#fff;border-radius:8px;padding:30px}}
.box h2{{font-size:20px;margin-bottom:4px}} .box p{{color:#6b7280;margin-bottom:20px}}
.box .field{{margin-bottom:14px}} .box .btn{{width:100%;padding:10px}}
</style></head><body><div class="box"><h2>ERP NST</h2><p>Hệ thống quản lý chuỗi cung ứng &amp; thi công</p>
<div class="field"><label>Tên đăng nhập</label><input value="ketoan01"></div>
<div class="field"><label>Mật khẩu</label><input type="password" value="12345678"></div>
<button class="btn">Đăng nhập</button></div></body></html>"""

rows = [
    ('DH-2410-001', 'Nguyễn Văn Hùng', 'Q.7, TP.HCM', 'p-wip', 'Đang xử lý', '01/10/2026'),
    ('DH-2410-002', 'Trần Thị Mai', 'Q. Cầu Giấy, Hà Nội', 'p-new', 'Mới', '01/10/2026'),
    ('DH-2409-087', 'Lê Quốc Bảo', 'TP. Thủ Đức', 'p-done', 'Hoàn tất', '28/09/2026'),
    ('DH-2409-085', 'Phạm Minh Tuấn', 'Q. Hà Đông, Hà Nội', 'p-wip', 'Đang xử lý', '27/09/2026'),
    ('DH-2409-079', 'Võ Thị Lan', 'Biên Hoà, Đồng Nai', 'p-done', 'Hoàn tất', '25/09/2026'),
    ('DH-2409-074', 'Đặng Hoàng Nam', 'Q. Long Biên, Hà Nội', 'p-done', 'Hoàn tất', '23/09/2026'),
]
tr = ''.join(f'<tr><td>{a}</td><td>{b}</td><td>{c}</td><td><span class="pill {d}">{e}</span></td><td>{f}</td><td><a style="color:#2563eb">Xem</a> · <a style="color:#2563eb">Yêu cầu sửa</a></td></tr>' for a, b, c, d, e, f in rows)
pages['ui_sale_donhang'] = page('sale', 0, 'Đơn hàng của tôi', 'Đỗ Thu Hà (Sale)', f"""
<div class="card"><div class="toolbar"><input placeholder="Tìm theo mã đơn, khách hàng..." style="width:280px">
<select><option>Tất cả trạng thái</option></select><span style="flex:1"></span><button class="btn">+ Tạo đơn hàng</button></div>
<table><tr><th>Mã đơn</th><th>Khách hàng</th><th>Địa chỉ công trình</th><th>Trạng thái</th><th>Ngày tạo</th><th>Thao tác</th></tr>{tr}</table></div>""")

pages['ui_sale_taodon'] = page('sale', 1, 'Tạo đơn hàng', 'Đỗ Thu Hà (Sale)', """
<div class="card"><h3>Thông tin đơn hàng</h3><div class="grid2">
<div class="field"><label>Khách hàng</label><select><option>Trần Thị Mai — 0912 345 678</option></select></div>
<div class="field"><label>Mã đơn (tự sinh)</label><input value="DH-2410-003" disabled></div>
<div class="field" style="grid-column:1/3"><label>Địa chỉ công trình</label><input value="Số 12 ngõ 45 Trần Thái Tông, Cầu Giấy, Hà Nội"></div>
<div class="field" style="grid-column:1/3"><label>Mô tả nhu cầu</label><textarea rows="3">Lát sàn SPC phòng khách 42 m², ốp tấm nano tường phòng ngủ 18 m², lắp 2 cửa nhôm Xingfa.</textarea></div>
</div></div>
<div class="card"><h3>Vật tư dự kiến</h3><table><tr><th>Vật tư</th><th>Loại</th><th class="num">Số lượng</th><th>ĐVT</th></tr>
<tr><td>Sàn SPC vân gỗ 4mm</td><td>Sàn (mua ngoài)</td><td class="num">42</td><td>m²</td></tr>
<tr><td>Tấm ốp nano 8mm</td><td>Tấm ốp (mua ngoài)</td><td class="num">18</td><td>m²</td></tr>
<tr><td>Cửa nhôm Xingfa 2 cánh</td><td>Cửa (tự sản xuất)</td><td class="num">2</td><td>bộ</td></tr></table></div>
<div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn sec">Huỷ</button><button class="btn">Lưu đơn hàng</button></div>""")

pages['ui_vh_phuongan'] = page('vh', 1, 'Phương án vận chuyển – thi công · DH-2410-001', 'Bùi Văn Quân (Vận hành)', """
<div class="grid2"><div class="card"><h3>Hình ảnh mặt bằng</h3><div class="drop">Kéo thả hoặc bấm để tải ảnh mặt bằng</div>
<div class="thumbs"><div></div><div></div><div></div></div></div>
<div class="card"><h3>Thông tin đơn</h3><table>
<tr><td style="color:#6b7280">Khách hàng</td><td>Nguyễn Văn Hùng</td></tr>
<tr><td style="color:#6b7280">Công trình</td><td>Căn hộ B2-1205, Q.7, TP.HCM</td></tr>
<tr><td style="color:#6b7280">Sale phụ trách</td><td>Đỗ Thu Hà</td></tr>
<tr><td style="color:#6b7280">Trạng thái</td><td><span class="pill p-wip">Đang xử lý</span></td></tr></table></div></div>
<div class="card"><div class="grid2">
<div class="field"><label>Phương án vận chuyển</label><textarea rows="4">NCC giao thẳng sàn + tấm ốp đến công trình ngày 05/10, xe tải 1.5 tấn, nhận hàng tại hầm B1. Cửa xuất từ xưởng ngày 06/10.</textarea></div>
<div class="field"><label>Phương án thi công</label><textarea rows="4">Ngày 1: lát sàn phòng khách. Ngày 2: ốp tường phòng ngủ, lắp cửa. Yêu cầu BQL cho thi công 8h–17h.</textarea></div>
</div><div style="display:flex;justify-content:flex-end;margin-top:12px"><button class="btn">Lưu phương án</button></div></div>""")

pages['ui_vh_lichthicong'] = page('vh', 2, 'Lập lịch thi công', 'Bùi Văn Quân (Vận hành)', """
<div class="card"><h3>Đơn hàng: DH-2410-001 · Căn hộ B2-1205, Q.7</h3><div class="grid2">
<div class="field"><label>Ngày thi công dự kiến</label><input value="07/10/2026"></div>
<div class="field"><label>Người phụ trách</label><input value="Bùi Văn Quân" disabled></div></div></div>
<div class="card"><h3>Chọn đội thợ</h3><table><tr><th></th><th>Đội thợ</th><th>Năng lực</th><th>Số điện thoại</th><th>Lịch trong tuần</th></tr>
<tr><td><input type="radio" checked></td><td>Đội anh Thắng</td><td>Sàn SPC, sàn gỗ</td><td>0903 111 222</td><td><span class="pill p-done">Trống</span></td></tr>
<tr><td><input type="radio"></td><td>Đội anh Phong</td><td>Tấm ốp, trần</td><td>0938 222 333</td><td><span class="pill p-wip">2 công trình</span></td></tr>
<tr><td><input type="radio"></td><td>Đội anh Khải</td><td>Cửa nhôm, cửa gỗ</td><td>0977 333 444</td><td><span class="pill p-done">Trống</span></td></tr>
<tr><td><input type="radio"></td><td>Đội anh Đức</td><td>Sàn + tấm ốp</td><td>0918 444 555</td><td><span class="pill p-no">Kín lịch</span></td></tr></table>
<div style="display:flex;justify-content:flex-end;margin-top:12px;gap:8px"><button class="btn sec">Huỷ</button><button class="btn">Lưu lịch thi công</button></div></div>""")

pages['ui_kt_ncc'] = page('kt', 0, 'Nhà cung cấp & bảng giá', 'Ngô Thanh Hương (Kế toán)', """
<div style="display:grid;grid-template-columns:300px 1fr;gap:14px">
<div class="card"><div class="toolbar"><input placeholder="Tìm NCC..." style="flex:1"><button class="btn">+</button></div>
<table><tr><th>Nhà cung cấp</th></tr>
<tr><td style="background:#eff6ff;font-weight:600">Công ty Sàn Việt Phát</td></tr><tr><td>Tấm ốp Nano Hoàng Gia</td></tr>
<tr><td>Vật liệu Minh Khang</td></tr><tr><td>SPC Floor Miền Nam</td></tr><tr><td>Ốp tường Đại Thành</td></tr></table></div>
<div class="card"><h3>Bảng giá — Công ty Sàn Việt Phát</h3><div class="toolbar"><select><option>Đang hiệu lực</option></select><span style="flex:1"></span><button class="btn">+ Thêm giá</button></div>
<table><tr><th>Vật tư</th><th class="num">Đơn giá (đ)</th><th>ĐVT</th><th>Hiệu lực từ</th><th>Đến</th></tr>
<tr><td>Sàn SPC vân gỗ 4mm</td><td class="num">185.000</td><td>m²</td><td>01/09/2026</td><td>—</td></tr>
<tr><td>Sàn SPC vân đá 5mm</td><td class="num">235.000</td><td>m²</td><td>01/09/2026</td><td>—</td></tr>
<tr><td>Len chân tường PVC</td><td class="num">32.000</td><td>md</td><td>15/08/2026</td><td>—</td></tr>
<tr style="color:#9ca3af"><td>Sàn SPC vân gỗ 4mm</td><td class="num">175.000</td><td>m²</td><td>01/06/2026</td><td>31/08/2026</td></tr></table>
<p style="color:#6b7280;margin-top:10px">Giá cũ được giữ lại để tra cứu lịch sử; đề xuất mua lưu đơn giá tại thời điểm mua.</p></div></div>""")

pages['ui_kt_dexuatmua'] = page('kt', 1, 'Tạo đề xuất mua hàng · DH-2410-001', 'Ngô Thanh Hương (Kế toán)', """
<div class="card"><h3>Vật tư của đơn hàng</h3><table><tr><th>Vật tư</th><th>Nguồn gốc</th><th class="num">SL cần</th><th>Nhà cung cấp</th><th class="num">Đơn giá hiện hành</th><th class="num">Thành tiền</th></tr>
<tr><td>Sàn SPC vân gỗ 4mm</td><td><span class="pill p-new">Mua ngoài</span></td><td class="num">42 m²</td><td><select><option>Công ty Sàn Việt Phát</option></select></td><td class="num">185.000</td><td class="num">7.770.000</td></tr>
<tr><td>Tấm ốp nano 8mm</td><td><span class="pill p-new">Mua ngoài</span></td><td class="num">18 m²</td><td><select><option>Tấm ốp Nano Hoàng Gia</option></select></td><td class="num">165.000</td><td class="num">2.970.000</td></tr>
<tr style="color:#9ca3af"><td>Cửa nhôm Xingfa 2 cánh</td><td><span class="pill p-gray">Tự sản xuất</span></td><td class="num">2 bộ</td><td>— không cần mua —</td><td class="num">—</td><td class="num">—</td></tr></table></div>
<div class="stats"><div class="stat"><div class="k">Số NCC</div><div class="v">2</div></div><div class="stat"><div class="k">Số dòng vật tư mua ngoài</div><div class="v">2</div></div><div class="stat"><div class="k">Tổng giá trị</div><div class="v">10.740.000 đ</div></div></div>
<div style="display:flex;justify-content:flex-end;gap:8px"><button class="btn sec">Huỷ</button><button class="btn">Tạo đề xuất mua (2 NCC)</button></div>""")

pages['ui_kt_congno'] = page('kt', 3, 'Công nợ nhà cung cấp', 'Ngô Thanh Hương (Kế toán)', """
<div class="stats"><div class="stat"><div class="k">Tổng công nợ hiện tại</div><div class="v">148.350.000 đ</div></div>
<div class="stat"><div class="k">Đề xuất chi chờ duyệt (Telegram)</div><div class="v">3</div></div>
<div class="stat"><div class="k">Đã thanh toán tháng này</div><div class="v">92.400.000 đ</div></div></div>
<div class="card"><div class="toolbar"><h3 style="margin:0">Công nợ theo NCC</h3><span style="flex:1"></span><button class="btn sec">Xuất báo cáo</button><button class="btn">+ Tạo đề xuất chi</button></div>
<table><tr><th>Nhà cung cấp</th><th class="num">Tổng đã mua</th><th class="num">Đã thanh toán</th><th class="num">Còn nợ</th><th>Đề xuất chi gần nhất</th></tr>
<tr><td>Công ty Sàn Việt Phát</td><td class="num">186.500.000</td><td class="num">124.000.000</td><td class="num">62.500.000</td><td><span class="pill p-wip">Chờ duyệt</span></td></tr>
<tr><td>Tấm ốp Nano Hoàng Gia</td><td class="num">98.200.000</td><td class="num">54.000.000</td><td class="num">44.200.000</td><td><span class="pill p-done">Đã duyệt</span></td></tr>
<tr><td>Vật liệu Minh Khang</td><td class="num">41.650.000</td><td class="num">0</td><td class="num">41.650.000</td><td><span class="pill p-wip">Chờ duyệt</span></td></tr>
<tr><td>SPC Floor Miền Nam</td><td class="num">35.000.000</td><td class="num">35.000.000</td><td class="num">0</td><td><span class="pill p-gray">Đã thanh toán</span></td></tr>
<tr><td>Ốp tường Đại Thành</td><td class="num">12.300.000</td><td class="num">12.300.000</td><td class="num">0</td><td><span class="pill p-no">Từ chối</span></td></tr></table></div>""")

pages['ui_ad_users'] = page('ad', 0, 'Quản lý người dùng', 'Quản trị viên (Admin)', """
<div class="card"><div class="toolbar"><input placeholder="Tìm theo tên, tài khoản..." style="width:260px"><select><option>Tất cả vai trò</option></select><span style="flex:1"></span><button class="btn">+ Thêm người dùng</button></div>
<table><tr><th>Họ tên</th><th>Tài khoản</th><th>Vai trò</th><th>Trạng thái</th><th>Thao tác</th></tr>
<tr><td>Đỗ Thu Hà</td><td>ha.sale</td><td>Sale</td><td><span class="pill p-done">Hoạt động</span></td><td><a style="color:#2563eb">Sửa</a> · <a style="color:#dc2626">Khoá</a></td></tr>
<tr><td>Ngô Thanh Hương</td><td>huong.ketoan</td><td>Kế toán</td><td><span class="pill p-done">Hoạt động</span></td><td><a style="color:#2563eb">Sửa</a> · <a style="color:#dc2626">Khoá</a></td></tr>
<tr><td>Bùi Văn Quân</td><td>quan.vanhanh</td><td>Vận hành</td><td><span class="pill p-done">Hoạt động</span></td><td><a style="color:#2563eb">Sửa</a> · <a style="color:#dc2626">Khoá</a></td></tr>
<tr><td>Trịnh Đức Anh</td><td>anh.vanhanh</td><td>Vận hành</td><td><span class="pill p-done">Hoạt động</span></td><td><a style="color:#2563eb">Sửa</a> · <a style="color:#dc2626">Khoá</a></td></tr>
<tr><td>Hoàng Gia Huy</td><td>huy.sale</td><td>Sale</td><td><span class="pill p-no">Đã khoá</span></td><td><a style="color:#2563eb">Sửa</a> · <a style="color:#16a34a">Mở khoá</a></td></tr></table></div>""")

os.makedirs('html', exist_ok=True)
for name, html in pages.items():
    with open(f'html/{name}.html', 'w', encoding='utf-8') as f:
        f.write(html)
print(len(pages), 'pages')
