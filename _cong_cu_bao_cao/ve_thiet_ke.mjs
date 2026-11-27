// Ve ban thiet ke khung (wireframe) cho muc 2.9 "Thiet ke Front-end": xam, khong du lieu that, danh so vung chuc nang.
// Bo cuc bam theo giao dien thuc te (thanh dieu huong trai, thanh tren, vung noi dung). Chay: node ve_thiet_ke.mjs -> anh/tk_*.png
import puppeteer from 'puppeteer-core';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'anh');
const W = 1200, H = 700;

// ---------------------------------------------------------------- thanh phan
const so = (n, st = '') => `<i class="so" style="${st}">${n}</i>`;
const bpx = (w, cls = 'dam') => `<b class="bar inl ${cls}" style="width:${w}px"></b>`; // thanh giu cho co dinh (trong dong chu)
const kem = (n, html) => `<span style="position:relative;display:inline-flex">${so(n)}${html}</span>`; // so gan sat 1 nut
const bar = (w = 60, cls = '') => `<b class="bar ${cls}" style="width:${w}%"></b>`;
const nhan = (t) => `<div class="nhan">${t}</div>`;
const o = (ph = '', w = '100%') => `<div class="o" style="width:${w}"><b class="bar nhat" style="width:${ph}"></b></div>`;
const chon = (t, w = '100%') => `<div class="o chon" style="width:${w}"><span>${t}</span><span>▾</span></div>`;
const nut = (t, cls = '') => `<span class="nut ${cls}">${t}</span>`;
const chip = (t, on = false) => `<span class="chip ${on ? 'on' : ''}">${t}</span>`;
const the = (tieuDe, noiDung, st = '', n = '') => `<div class="the" style="${st}">${n ? so(n) : ''}${tieuDe ? `<div class="tt">${tieuDe}</div>` : ''}${noiDung}</div>`;
const anh = (st = '') => `<div class="anh" style="${st}"></div>`;
function bang(cot, soDong = 4, rong = null) {
  const g = rong || cot.map(() => '1fr');
  const tpl = `grid-template-columns:${g.join(' ')}`;
  let s = `<div class="bang"><div class="dong dau" style="${tpl}">${cot.map((c) => `<span>${c}</span>`).join('')}</div>`;
  for (let i = 0; i < soDong; i++) s += `<div class="dong" style="${tpl}">${cot.map((_, j) => `<span>${bar(45 + ((i * 7 + j * 13) % 45))}</span>`).join('')}</div>`;
  return `${s}</div>`;
}
const truong = (n = 5) => Array.from({ length: n }, (_, i) => `<div class="tr"><span>${bar(70)}</span><span>${bar(40 + ((i * 17) % 50))}</span></div>`).join('');
const MENU = {
  admin: ['Tổng quan', 'Khách hàng', 'Nhập số', 'Đơn hàng', 'Mua hàng', 'Thi công', 'Chi & công nợ', 'Báo cáo lãi/lỗ', 'Danh mục vật tư', 'Nhà cung cấp', 'Người dùng', 'Phân quyền', 'Sao lưu dữ liệu', 'Nhật ký thay đổi'],
  sale: ['Tổng quan', 'Khách hàng', 'Nhập số', 'Nhập đơn', 'Đơn hàng'],
  vh: ['Tổng quan', 'Đơn hàng', 'Mua hàng', 'Thi công', 'Danh mục vật tư', 'Nhà cung cấp'],
  kt: ['Tổng quan', 'Đơn hàng', 'Mua hàng', 'Thi công', 'Chi & công nợ', 'Báo cáo lãi/lỗ', 'Danh mục vật tư', 'Nhà cung cấp'],
};
function vo(vaiTro, trang, noiDung, { soMenu = '', soTren = '', tro = false } = {}) {
  return `<div class="man">
    <aside class="sb">${soMenu ? so(soMenu, 'top:6px;left:auto;right:6px') : ''}<div class="logo">ERP NST</div>
      <div class="nd"><b class="bar dam" style="width:70%"></b><b class="bar nhat" style="width:45%"></b></div>
      ${MENU[vaiTro].map((m) => `<div class="mn ${m === trang ? 'on' : ''}"><i></i>${m}</div>`).join('')}
      <div class="dx">Đăng xuất</div></aside>
    <main><div class="top">${soTren ? so(soTren, 'top:8px;left:auto;right:70px') : ''}<span>ERP NST / <b>${trang}</b></span><span class="tb">🔔 ◐</span></div>
      <div class="vung">${noiDung}</div>${tro ? '<span class="nut den tro-nut">✦ Trợ lý</span>' : ''}</main></div>`;
}

// ---------------------------------------------------------------- 12 man hinh
const MAN = {
  tk_dang_nhap: `<div class="man giua" style="gap:40px">
    ${the('', `<div class="h1">ERP NST</div><div class="phu">Đăng nhập để tiếp tục</div>${nhan('Tài khoản')}${o()}${nhan('Mật khẩu')}${o()}<div style="margin-top:14px">${nut('Đăng nhập', 'den rong')}</div>`, 'width:330px;padding:26px', 1)}
    <div style="font-size:30px;color:#999">→</div>
    ${the('', `<div class="h1">Xác thực hai lớp</div><div class="phu">Nhập mã 6 số trong ứng dụng Authenticator</div><div class="ma6">${'<span></span>'.repeat(6)}</div>${anh('width:120px;height:120px;margin:10px auto')}<div class="phu" style="text-align:center">Lần đầu: quét mã QR để cài đặt</div><div style="margin-top:10px">${nut('Xác nhận', 'den rong')}</div><div class="phu lk" style="text-align:center;margin-top:8px">Dùng mã dự phòng</div>`, 'width:330px;padding:26px', 2)}
  </div>`,

  tk_tong_quan: vo('admin', 'Tổng quan', `
    <div class="h2">Xin chào, ${bpx(170)}</div>
    ${the('Việc cần làm', `<div class="hang">${the('', `<div class="so-lon">●●</div>${bar(80)}<div class="lk">Xử lý →</div>`, 'flex:1;background:#eee;border-color:#888')}${the('', `<div class="so-lon">●●●</div>${bar(70)}<div class="lk">Xử lý →</div>`, 'flex:1')}<div style="flex:2"></div></div>`, '', 3)}
    <div class="hang">${so(4)}${[1, 2, 3, 4, 5].map(() => the('', `${bar(70, 'nhat')}<div class="so-lon">●●</div>${bar(50, 'nhat')}`, 'flex:1')).join('')}</div>
    <div class="hang" style="flex:1">${the('Đơn đang chạy theo tiến độ', [1, 2, 3, 4, 5, 6, 7].map((i) => `<div class="tien">${bar(60, 'inl nhat')}<b class="vach" style="width:${20 + ((i * 23) % 70)}%"></b></div>`).join(''), 'flex:1', 5)}
      ${the('Doanh thu 6 tháng gần nhất', `<div class="cot">${[55, 70, 62, 80, 74, 90].map((h) => `<b style="height:${h}%"></b>`).join('')}</div>`, 'flex:1', 6)}</div>`, { soMenu: 1, soTren: 2 }),

  tk_chi_tiet_khach: vo('sale', 'Khách hàng', `
    <div class="lk">← Danh sách khách hàng</div>
    <div class="hang" style="align-items:center">${so(1)}<div class="h2" style="margin:0">${bpx(150)} ${chip('Mới')}</div></div>
    <div class="hang" style="align-items:center"><span class="h1">☎ ${bpx(160)}</span>${nut('Gọi', 'vien')}${nut('Zalo', 'vien')}${nut('Chép số', 'vien')}</div>
    <div class="hang">${the('Thông tin', `${truong(6)}<div style="text-align:right">${nut('✦ Hỏi trợ lý sản phẩm', 'vien')}</div>`, 'flex:2', 2)}${the('Đơn hàng', `${bar(60, 'nhat')}${bar(40, 'nhat')}`, 'flex:1', 3)}</div>
    ${the('Cập nhật chăm sóc', `<div class="hang">${chon('— Kết quả lần liên hệ —', '26%')}${o('40%', '64%')}${nut('Lưu', 'den')}</div>`, '', 4)}
    ${the('Lịch sử chăm sóc', [1, 2].map(() => `<div class="tl">● ${chip('Trạng thái')} ${bpx(260, 'nhat')} ${bpx(90, 'nhat')}</div>`).join(''), '', 5)}`, { tro: true }),

  tk_tao_don: vo('sale', 'Nhập đơn', `
    <div class="h2">Tạo đơn hàng</div>
    <div class="hang" style="flex:1"><div style="flex:3;display:flex;flex-direction:column;gap:10px">
      ${the('Khách hàng & hình thức', `<div class="hang">${chon('— Chọn khách hàng —', '50%')}${o('30%', '50%')}</div><div class="hang">${the('', '<b>Hoàn thiện</b><div class="phu">Giao hàng + thi công</div>', 'flex:1;border:2px solid #555')}${the('', '<b>Vật tư</b><div class="phu">Chỉ giao hàng</div>', 'flex:1')}</div><div class="hang">${chon('— Sản phẩm chính —', '50%')}${o('25%', '50%')}</div>`, '', 1)}
      ${the('Địa chỉ công trình', `<div class="hang">${chon('— Tỉnh/thành —', '50%')}${o('30%', '50%')}</div>${o('40%')}`, '', 2)}
      ${the('Vật tư', `${bang(['Vật tư', 'Số lượng', 'ĐVT', 'Đơn giá', 'Thành tiền', 'Thi công · kích thước'], 2, ['2fr', '1fr', '.6fr', '1fr', '1fr', '1.6fr'])}<div style="margin-top:6px">${nut('+ Thêm vật tư', 'vien')}</div>`, '', 3)}
    </div><div style="flex:1">${the('Tổng đơn', `${truong(3)}<div class="tr"><b>Tổng đơn</b><span>${bar(60, 'dam')}</span></div><div style="margin:10px 0 6px">${nut('Chốt đơn', 'den rong')}</div>${nut('Lưu nháp', 'vien rong')}<div class="phu" style="margin-top:8px">${bar(90, 'nhat')}${bar(70, 'nhat')}</div>`, '', 4)}</div></div>`),

  tk_tro_ly_chat: vo('sale', 'Khách hàng', `
    <div style="opacity:.45;display:flex;flex-direction:column;gap:10px;width:58%">${the('Thông tin', truong(6))}${the('Cập nhật chăm sóc', o('40%'))}${the('Lịch sử chăm sóc', bar(60, 'nhat'))}</div>
    <div class="chat">${so(1)}<div class="hang" style="justify-content:space-between;align-items:center"><b>✦ Trợ lý ${bpx(50)}</b><span>${nut('☰', 'vien nho')} ${nut('+', 'vien nho')} ${nut('×', 'vien nho')}</span></div>
      <div class="hang" style="position:relative">${so(2)}${chip('Cửa')}${chip('Sàn', true)}${chip('Tấm ốp')}${chip('Quản lý')}${chip('NCC')}</div>
      <div style="position:relative;flex:1;display:flex;flex-direction:column;gap:8px">${so(3)}<div class="bong toi">${bar(85)}${bar(50)}</div><div class="bong ai">${[90, 80, 95, 70, 85, 60, 88, 75].map((w) => bar(w)).join('')}<div class="lk" style="margin-top:4px">Chép tin nhắn gửi khách · Chép cả câu trả lời</div></div></div>
      <div class="hang" style="position:relative;align-items:center">${so(4)}${nut('Ảnh', 'vien')}${o('40%', '72%')}${nut('Gửi', 'den')}</div></div>`),

  tk_chi_tiet_don: vo('vh', 'Đơn hàng', `
    <div class="lk">← Danh sách đơn hàng</div>
    <div class="hang" style="align-items:center">${so(1)}<span class="h2" style="margin:0;white-space:nowrap">Đơn hàng ${bpx(110)}</span>${chip('Trạng thái')}${chip('Hình thức')}</div>
    ${the('Tiến độ đơn hàng', `<div class="buoc">${['Chốt đơn', 'Lên phương án', 'Tính KLVT', 'Mua hàng', 'Giao hàng', 'Thi công', 'Nghiệm thu', 'Quyết toán'].map((t, i) => `<div><i class="${i < 3 ? 'xong' : i === 3 ? 'nay' : ''}">${i < 3 ? '✓' : i + 1}</i><span>${t}</span></div>`).join('')}</div>`, '', 2)}
    <div class="hang" style="position:relative">${so(3)}${o('35%', '62%')}${nut('Đăng ký giao hàng', 'den')}${nut('← Lùi bước', 'vien')}<span class="lk do">Huỷ đơn</span></div>
    <div class="hang">${the('Thông tin chung', truong(6), 'flex:2', 4)}${the('Thanh toán', truong(5), 'flex:1', 5)}</div>
    ${the('Vật tư', bang(['Vật tư', 'Nguồn gốc', 'SL', 'Đơn giá', 'Thành tiền', 'Thi công', 'Ghi chú'], 2), '', 6)}`),

  tk_mua_hang: vo('vh', 'Mua hàng', `
    ${the('Vật tư cần mua', bang(['Vật tư', 'SL', 'NCC đề xuất (rẻ nhất hôm nay)', 'NCC chọn', 'Giá chốt', 'VAT', 'Thành tiền', 'Trạng thái'], 3, ['1.4fr', '.5fr', '2fr', '1.6fr', '.8fr', '.5fr', '.9fr', '.9fr']), '', 1)}
    ${the('Tổng theo nhà cung cấp', `${bang(['Nhà cung cấp', 'Số VT', 'Tiền hàng (gồm VAT)', 'Cọc đã duyệt', 'Đề xuất chi'], 2)}<div style="text-align:right;margin-top:6px">${nut('🛒 Đặt hàng', 'den')}</div>`, '', 2)}
    ${the('Đơn đặt hàng đã gửi NCC', `<div class="hang" style="align-items:center">${bpx(220)} ${chip('Chờ phản hồi')}</div>${bar(80, 'nhat')}${bar(60, 'nhat')}<div class="hang">${nut('Chép nội dung', 'vien')}<span class="lk do">Huỷ đặt hàng</span></div>`, '', 3)}
    ${the('Mua bổ sung', bar(55, 'nhat'), '', 4)}`),

  tk_de_xuat_chi: vo('kt', 'Chi & công nợ', `
    <div class="hang tab" style="position:relative">${so(1)}${['Đề xuất chi', 'Công nợ NCC', 'Công nợ thợ', 'Công nợ khách', 'Ngân hàng'].map((t, i) => `<span class="${i === 0 ? 'on' : ''}">${t}</span>`).join('')}</div>
    <div class="hang" style="flex:1"><div style="flex:3">${the('', `<div class="hang">${chon('Trạng thái', '25%')}${chon('Loại chi', '25%')}${o('30%', '50%')}</div>${bang(['Mã', 'Đơn', 'Người nhận', 'Loại', 'Số tiền', 'Trạng thái', 'Người lập'], 7)}`, '', 2)}</div>
      <div style="flex:1.3">${the('Chi tiết đề xuất', `${truong(5)}${anh('width:150px;height:150px;margin:8px auto')}<div class="phu" style="text-align:center">Mã QR chuyển khoản (VietQR)</div><div class="hang" style="margin-top:8px">${nut('Duyệt', 'den')}${nut('Từ chối', 'vien')}</div><div style="margin-top:6px">${nut('Đã chi – tải ảnh bill', 'vien rong')}</div>`, '', 3)}</div></div>`),

  tk_phan_tich: vo('kt', 'Nhà cung cấp', `
    <div class="h2">Nhà cung cấp</div>
    <div class="hang tab" style="position:relative">${so(1)}${['Danh sách', 'So sánh giá', 'Phân tích & AI'].map((t, i) => `<span class="${i === 2 ? 'on' : ''}">${t}</span>`).join('')}</div>
    <div class="hang" style="position:relative;align-items:center">${so(2)}${chip('30 ngày qua', true)}${chip('Tháng này')}${chip('Tháng trước')}${o('50%', '14%')} – ${o('50%', '14%')}</div>
    <div class="hang" style="position:relative">${so(3)}${['Doanh thu vật tư', 'Số đơn chốt', 'Tiền mua nhà cung cấp'].map((t) => the('', `<div class="phu">${t}</div><div class="so-lon">●●</div>${bar(30, 'nhat')}`, 'flex:1')).join('')}</div>
    ${the('✦ Trợ lý AI nhận xét', `<div class="hang" style="align-items:center"><div style="flex:1">${bar(90, 'nhat')}${bar(60, 'nhat')}</div>${nut('Phân tích bằng AI', 'den')}</div>`, 'border:2px solid #555', 4)}
    <div class="hang">${the('Vật tư bán chạy', bang(['Vật tư', 'Số lượng', 'Doanh thu', 'Tăng trưởng', 'Lãi gộp ước tính', 'NCC rẻ nhất'], 2), 'flex:1', 5)}${the('Nhà cung cấp – giá có hợp lý?', bang(['Nhà cung cấp', 'Mức giá', 'Chỉ số', 'Đổi giá', 'Đã mua'], 2), 'flex:1', 6)}</div>`),

  tk_doi_soat: vo('kt', 'Chi & công nợ', `
    <div class="h2">Chi & công nợ</div>
    <div class="hang tab" style="position:relative">${so(1)}${['Đề xuất chi', 'Công nợ NCC', 'Công nợ thợ', 'Công nợ khách', 'Ngân hàng'].map((t, i) => `<span class="${i === 4 ? 'on' : ''}">${t}</span>`).join('')}</div>
    ${the('Giả lập giao dịch ngân hàng', `${bar(85, 'nhat')}<div class="hang">${chon('Tiền vào (khách trả)', '22%')}${o('40%', '18%')}${o('50%', '45%')}${nut('Gửi giao dịch', 'den')}</div>`, '', 2)}
    ${the('Giao dịch ngân hàng', `<div class="hang" style="position:relative">${chip('Tất cả', true)}${chip('Chưa khớp')}${chip('Đã khớp')}${chip('Bỏ qua')}</div>${bang(['Thời gian', 'Số tiền', 'Nội dung chuyển khoản', 'Trạng thái', 'Kết quả', 'Thao tác'], 4, ['1fr', '.8fr', '2fr', '.8fr', '1.5fr', '1.2fr'])}<div class="phu" style="margin-top:4px">Thao tác với giao dịch chưa khớp: <u>Khớp vào đơn</u> · <u>Bỏ qua</u> (ghi lý do)</div>`, 'flex:1', 3)}`),

  tk_bao_cao_cham_soc: vo('admin', 'Khách hàng', `
    <div class="h2">Khách hàng</div>
    <div class="hang tab" style="position:relative">${so(1)}${['Danh sách khách', 'Báo cáo chăm sóc'].map((t, i) => `<span class="${i === 1 ? 'on' : ''}">${t}</span>`).join('')}</div>
    <div class="hang" style="position:relative;align-items:center">${so(2)}<span class="phu">Số được chia từ</span>${o('50%', '14%')} → ${o('50%', '14%')}${chip('7 ngày')}${chip('30 ngày', true)}${chip('Tháng này')}</div>
    <div class="hang" style="position:relative">${so(3)}${['Số được chia', 'Đã gọi lần đầu', 'Chốt đơn', 'Quá 1 ngày chưa gọi', 'Quan tâm quá 3 ngày', 'Hẹn gọi lại quá giờ'].map((t, i) => the('', `<div class="phu">${t}</div><div class="so-lon">●●</div>`, `flex:1;${i >= 3 ? 'border:2px solid #555' : ''}`)).join('')}</div>
    ${the('Theo Sale', bang(['Sale', 'Được chia', 'Đã gọi', 'Gọi trong 2 giờ', 'Phản hồi TB', 'Lần CS / khách', 'Quan tâm', 'Chốt', 'Doanh thu', 'Tồn > 1 ngày'], 5), 'flex:1', 4)}
    <div class="hang" style="justify-content:flex-end">${kem(5, nut('Chuyển khách tồn đọng', 'vien'))}${nut('✦ Phân tích bằng AI', 'den')}</div>`),

  tk_phan_quyen: vo('admin', 'Phân quyền', `
    <div class="h2">Phân quyền</div><div class="phu">${bar(70, 'nhat')}</div>
    ${the('', `<div class="bang"><div class="dong dau" style="grid-template-columns:4fr 1fr 1fr 1fr 1fr"><span>Chức năng</span><span>Sale</span><span>Vận hành</span><span>Kế toán</span><span>Admin</span></div>
      ${['Bán hàng', 'Điều phối', 'Tiền'].map((nhom, g) => `<div class="dong nhom" style="grid-template-columns:1fr"><span>${nhom}</span></div>${[0, 1, 2, 3].map((i) => `<div class="dong" style="grid-template-columns:4fr 1fr 1fr 1fr 1fr"><span>${bar(40 + ((i * 19 + g * 7) % 40))}</span>${[0, 1, 2, 3].map((c) => `<span><i class="hop ${(i + c + g) % 3 === 0 || c === 3 ? 'tick' : ''}"></i></span>`).join('')}</div>`).join('')}`).join('')}</div>`, 'flex:1', 1)}
    <div class="hang" style="justify-content:flex-end;align-items:center"><span class="phu">Quyền quản trị hệ thống luôn thuộc Admin</span>${kem(2, nut('Lưu', 'den'))}</div>`),
};

const CSS = `*{box-sizing:border-box}body{margin:0;font:13px Arial,sans-serif;color:#333;background:#fff}
.man{width:${W}px;height:${H}px;border:1px solid #999;display:flex;position:relative;background:#fff;overflow:hidden}
.giua{align-items:center;justify-content:center;background:#f4f4f4}
.sb{width:190px;background:#f2f2f2;border-right:1px solid #ccc;padding:12px 10px;display:flex;flex-direction:column;gap:4px;position:relative}
.logo{font-weight:bold;font-size:14px;margin-bottom:6px}.nd{background:#e4e4e4;border-radius:5px;padding:8px;margin-bottom:8px}
.mn{display:flex;align-items:center;gap:8px;padding:5px 6px;border-radius:5px;font-size:12px;color:#444}.mn i{width:12px;height:12px;border:1.5px solid #888;border-radius:3px}
.mn.on{background:#d9d9d9;font-weight:bold}.dx{margin-top:auto;border:1px solid #bbb;border-radius:5px;padding:5px 8px;font-size:12px;background:#fff}
main{flex:1;display:flex;flex-direction:column;position:relative;min-width:0}
.top{height:38px;border-bottom:1px solid #ccc;display:flex;justify-content:space-between;align-items:center;padding:0 16px;font-size:12px;color:#666;position:relative}
.vung{flex:1;padding:14px 18px;display:flex;flex-direction:column;gap:10px;overflow:hidden}
.the{border:1.5px solid #aaa;border-radius:7px;padding:10px 12px;background:#fff;position:relative;display:flex;flex-direction:column;gap:6px;min-width:0}
.tt{font-weight:bold;font-size:13px}.h1{font-size:20px;font-weight:bold}.h2{font-size:17px;font-weight:bold;display:flex;align-items:center;gap:6px}
.phu{font-size:11.5px;color:#777}.nhan{font-size:11.5px;color:#666;margin-top:8px}.lk{font-size:12px;color:#555;text-decoration:underline}.do{color:#555}
.hang{display:flex;gap:10px;position:relative}
.bar{display:block;height:9px;border-radius:4px;background:#cfcfcf;margin:3px 0}.bar.nhat{background:#e2e2e2}.bar.dam{background:#9a9a9a;height:12px}.bar.inl{display:inline-block;vertical-align:middle;margin:0}
.o{height:30px;border:1.5px solid #999;border-radius:5px;padding:0 8px;display:flex;align-items:center;justify-content:space-between;background:#fff;margin-top:3px;font-size:12px;color:#888}
.nut{display:inline-flex;align-items:center;justify-content:center;height:30px;padding:0 14px;border-radius:6px;font-size:12.5px;white-space:nowrap}
.nut.den{background:#444;color:#fff}.nut.vien{border:1.5px solid #888;background:#fff}.nut.rong{width:100%}.nut.nho{height:24px;padding:0 8px}
.chip{display:inline-flex;align-items:center;height:24px;padding:0 10px;border:1.5px solid #aaa;border-radius:12px;font-size:12px;background:#fff}.chip.on{background:#444;color:#fff;border-color:#444}
.so{position:absolute;top:-11px;left:-11px;width:22px;height:22px;border-radius:50%;background:#d32f2f;color:#fff;font:bold 12px Arial;font-style:normal;display:flex;align-items:center;justify-content:center;z-index:5;box-shadow:0 0 0 2px #fff}
.so-lon{font-size:22px;font-weight:bold;color:#777;letter-spacing:2px}
.anh{border:1.5px solid #999;background:linear-gradient(to top right,transparent calc(50% - 1px),#999 50%,transparent calc(50% + 1px)),linear-gradient(to top left,transparent calc(50% - 1px),#999 50%,transparent calc(50% + 1px))}
.bang{border:1px solid #bbb;border-radius:5px;overflow:hidden}.dong{display:grid;gap:8px;padding:6px 8px;border-top:1px solid #e3e3e3;align-items:center}.dong.dau{background:#e9e9e9;border-top:0;font-size:11.5px;font-weight:bold;color:#555}
.dong.nhom{background:#f4f4f4;font-weight:bold;font-size:12px}.hop{display:inline-block;width:13px;height:13px;border:1.5px solid #888;border-radius:3px}.hop.tick{background:#555;border-color:#555}
.tr{display:grid;grid-template-columns:1fr 2fr;gap:10px}.tien{display:flex;align-items:center;gap:8px}.tien>.bar{width:90px!important;flex:none}.vach{height:8px;background:#999;border-radius:4px}
.cot{flex:1;display:flex;align-items:flex-end;gap:14px;height:150px;padding:6px 10px;border-bottom:1.5px solid #999}.cot b{flex:1;background:#c8c8c8}
.tl{font-size:12px;color:#888;display:flex;gap:8px;align-items:center}
.buoc{display:flex;justify-content:space-between;padding:4px 10px}.buoc>div{display:flex;flex-direction:column;align-items:center;gap:4px;font-size:11px;color:#666;width:90px;text-align:center}
.buoc i{width:26px;height:26px;border-radius:50%;border:1.5px solid #999;display:flex;align-items:center;justify-content:center;font-style:normal;font-weight:bold}.buoc i.xong{background:#bbb}.buoc i.nay{background:#444;color:#fff;border-color:#444}
.tab{border-bottom:1.5px solid #ccc;gap:18px;font-size:12.5px;color:#666;padding-left:16px}
.so+.h2,.so+.phu{margin-left:16px!important}.tab span{padding:6px 2px}.tab span.on{border-bottom:3px solid #444;font-weight:bold;color:#333}
.ma6{display:flex;gap:8px;justify-content:center;margin-top:12px}.ma6 span{width:34px;height:40px;border:1.5px solid #999;border-radius:5px}
.chat{position:absolute;right:16px;top:50px;bottom:14px;width:420px;border:2px solid #555;border-radius:10px;background:#fff;padding:12px;display:flex;flex-direction:column;gap:10px;box-shadow:-6px 6px 0 #ddd}
.bong{border-radius:9px;padding:8px 10px}.bong.toi{background:#e6e6e6;align-self:flex-end;width:62%}.bong.ai{border:1.5px solid #ccc;width:88%}
.tro-nut{position:absolute;right:18px;bottom:16px;border-radius:18px}`;

const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const p = await browser.newPage();
await p.setViewport({ width: W + 20, height: H + 20, deviceScaleFactor: 2 });
for (const [ten, html] of Object.entries(MAN)) {
  await p.setContent(`<html><head><style>${CSS}</style></head><body style="padding:10px">${html}</body></html>`, { waitUntil: 'load' });
  const el = await p.$('.man');
  await el.screenshot({ path: path.join(OUT, `${ten}.png`) });
  console.log('ve', ten);
}
await browser.close();
