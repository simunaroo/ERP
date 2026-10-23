// Tao Chuong 2 (docx) khop phan mem hien tai. Dinh dang theo ban bao cao chinh thuc:
// A4, le tren 1418 / phai 1134 / duoi 1134 / trai 1985 (twip), Times New Roman 14, gian dong 1.5, can deu.
// Cap tieu de: CHUONG = Heading1, 2.x = Heading2, 2.x.y = Heading3, 2.x.y.z = Heading4 (dan thang vao ban chinh thuc).
const fs = require('fs');
const path = require('path');
const d = require('docx');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, ImageRun, BorderStyle, ShadingType, LevelFormat, PageBreak } = d;

const ANH = path.join(__dirname, 'anh');
const schema = JSON.parse(fs.readFileSync(path.join(__dirname, 'schema.json'), 'utf8'));
const NOI_DUNG_RONG = 8787; // 11906 - 1985 - 1134

// ---------- tien ich dung noi dung ----------
const out = [];
let soBang = 0; let soHinh = 0;
// "**dam**" trong chuoi -> chu dam
const runs = (s, opt = {}) => String(s).split(/(\*\*[^*]+\*\*)/).filter(Boolean).map((t) => (t.startsWith('**')
  ? new TextRun({ text: t.slice(2, -2), bold: true, ...opt }) : new TextRun({ text: t, ...opt })));
const H1 = (t) => out.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t)] }));
const H2 = (t) => out.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)] }));
const H3 = (t) => out.push(new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(t)] }));
const H4 = (t) => out.push(new Paragraph({ heading: HeadingLevel.HEADING_4, children: [new TextRun(t)] }));
const P = (t) => out.push(new Paragraph({ children: runs(t), indent: { firstLine: 567 } }));
const B = (items) => items.forEach((t) => out.push(new Paragraph({ children: runs(t), numbering: { reference: 'cham', level: 0 } })));
const capBang = (t) => { soBang++; out.push(new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true, spacing: { before: 120 }, children: [new TextRun({ text: `Bảng 2.${soBang}. ${t}`, italics: true, bold: true, size: 26 })] })); };
const capHinh = (t) => { soHinh++; out.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 }, children: [new TextRun({ text: `Hình 2.${soHinh}. ${t}`, italics: true, bold: true, size: 26 })] })); };

const vien = { style: BorderStyle.SINGLE, size: 4, color: '808080' };
const cell = (t, w, { head = false, shade = null } = {}) => new TableCell({
  width: { size: w, type: WidthType.DXA },
  shading: head ? { type: ShadingType.CLEAR, fill: 'D9E2F3', color: 'auto' } : shade ? { type: ShadingType.CLEAR, fill: shade, color: 'auto' } : undefined,
  margins: { top: 40, bottom: 40, left: 80, right: 80 },
  children: String(t).split('\n').map((dong) => new Paragraph({ spacing: { line: 276 }, alignment: AlignmentType.LEFT, children: runs(dong, { size: 24, bold: head || undefined }) })),
});
// Bang: tieu de cot + cac dong; ti le do rong cot (tong bat ky).
function Bang(cap, cot, dong, tiLe) {
  capBang(cap);
  const tong = tiLe.reduce((a, b) => a + b, 0);
  const w = tiLe.map((x) => Math.floor((x / tong) * NOI_DUNG_RONG));
  w[w.length - 1] += NOI_DUNG_RONG - w.reduce((a, b) => a + b, 0);
  out.push(new Table({
    width: { size: NOI_DUNG_RONG, type: WidthType.DXA }, columnWidths: w,
    borders: { top: vien, bottom: vien, left: vien, right: vien, insideHorizontal: vien, insideVertical: vien },
    rows: [new TableRow({ tableHeader: true, children: cot.map((c, i) => cell(c, w[i], { head: true })) }),
      ...dong.map((r) => new TableRow({ children: r.map((c, i) => cell(c, w[i])) }))],
  }));
  out.push(new Paragraph({ children: [] }));
}
// Bang dac ta use case: 2 cot (muc | noi dung)
function DacTa(cap, muc) {
  Bang(cap, ['Mục', 'Nội dung'], muc, [26, 74]);
}
// Anh chup man hinh
function Anh(file, cap) {
  const buf = fs.readFileSync(path.join(ANH, file));
  const w = buf.readUInt32BE(16); const h = buf.readUInt32BE(20);
  const rong = 585; // px ~ do rong vung noi dung
  out.push(new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true, children: [new ImageRun({ type: 'png', data: buf, transformation: { width: rong, height: Math.round((rong * h) / w) } })] }));
  capHinh(cap);
}
// O giu cho so do ve bang Rational Rose: khung vien net dut + mo ta can ve (xoa khung sau khi chen hinh).
function ChoHinh(cap, moTa) {
  const k = { style: BorderStyle.DASHED, size: 8, color: 'C00000', space: 4 };
  const pr = { border: { top: k, left: k, bottom: k, right: k }, shading: { type: ShadingType.CLEAR, fill: 'FFF7E6', color: 'auto' }, spacing: { line: 264, after: 0 }, alignment: AlignmentType.LEFT };
  out.push(new Paragraph({ ...pr, keepNext: true, children: [new TextRun({ text: '[CHÈN HÌNH VẼ BẰNG RATIONAL ROSE — xoá khung này sau khi chèn]', bold: true, color: 'C00000', size: 22 })] }));
  moTa.forEach((t, i) => out.push(new Paragraph({ ...pr, keepNext: i < moTa.length - 1, children: runs(t, { size: 22 }) })));
  capHinh(cap);
}

// =====================================================================================
H1('CHƯƠNG II. KHẢO SÁT, PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG');

// ---------------- 2.1 ----------------
H2('2.1. Khảo sát hiện trạng');
P('Doanh nghiệp NST hoạt động trong lĩnh vực vật liệu hoàn thiện (sàn, tấm ốp), tự sản xuất cửa và trực tiếp thi công lắp đặt cho khách hàng. Một đơn hàng đi qua nhiều bộ phận: nhân viên kinh doanh (Sale) tư vấn và chốt đơn, nhân viên vận hành lên phương án vận chuyển – thi công, đặt hàng nhà cung cấp (NCC), điều phối đội thợ; kế toán chi tiền cho NCC, đội thợ và thu tiền của khách; giám đốc phê duyệt các khoản chi.');
P('Trước khi có phần mềm, các bước trên được thực hiện rời rạc trên Excel, Google Sheets và nhóm Telegram nội bộ. Qua khảo sát, em ghi nhận các hạn chế chính sau:');
B([
  '**Tiến độ đơn hàng không minh bạch:** Sale không biết đơn đang ở bước nào sau khi bàn giao; việc giao đơn cho nhân viên vận hành nào phụ trách làm thủ công, dễ bỏ sót hoặc hai người cùng xử lý một đơn.',
  '**Đặt hàng NCC qua điện thoại, Zalo:** không lưu lại nội dung đã đặt, NCC yêu cầu đặt cọc thì kế toán chỉ biết qua lời nhắn; khó đối chiếu giá đã chốt với giá NCC tính tiền.',
  '**Duyệt chi và công nợ khó truy vết:** đề xuất chi gửi tin nhắn tự do trong nhóm Telegram, không biết ai đã duyệt, có thể chi trùng hoặc chi thiếu; công nợ NCC và đội thợ phải tổng hợp tay cuối kỳ.',
  '**Thu tiền khách không đối soát được:** không biết khách đã tạm ứng đủ trước khi giao hàng hay chưa, đơn hoàn tất mà khách còn nợ dễ bị bỏ quên.',
  '**Số khách tiềm năng chia tay:** phòng marketing và các kênh quảng cáo gửi số điện thoại khách qua tin nhắn, người quản lý tự chia cho từng Sale; không biết mỗi Sale đã nhận bao nhiêu số, số trùng bị gọi nhiều lần, số chia rồi không ai gọi.',
  '**Không biết lãi lỗ từng đơn:** doanh thu, tiền hàng NCC, công thợ nằm ở các bảng tính khác nhau nên chỉ biết lãi lỗ tổng cuối kỳ, không phát hiện kịp đơn bán dưới giá vốn.',
  '**Đối soát sao kê thủ công:** kế toán dò từng dòng sao kê ngân hàng để khớp với khoản khách trả và khoản đã chi.',
  '**Thông tin phân tán, khó kiểm soát:** muốn biết vật tư nào bán chạy, NCC nào giá tốt phải tự lọc nhiều bảng tính; không biết ai đã sửa số liệu gì, dữ liệu chỉ nằm trên máy cá nhân, không có bản sao lưu.',
]);
P('Từ thực trạng đó, việc xây dựng một hệ thống ERP quản lý chuỗi cung ứng và thi công, số hoá toàn bộ vòng đời đơn hàng trên một nền tảng thống nhất, có phân quyền rõ ràng, lưu vết mọi phê duyệt và thay đổi, tích hợp các kênh doanh nghiệp đang dùng (Telegram, chuyển khoản QR, sao kê ngân hàng) và cho biết lãi lỗ của từng đơn là cần thiết.');

// ---------------- 2.2 ----------------
H2('2.2. Cơ sở lý thuyết phân tích và đặc tả yêu cầu hệ thống');
P('Phân tích và đặc tả yêu cầu là giai đoạn nền tảng, xác định hệ thống cần thực hiện những chức năng nào, phục vụ đối tượng nào và phải đáp ứng các tiêu chí gì về bảo mật, toàn vẹn dữ liệu và khả năng mở rộng. Phân tích đúng giúp hạn chế sai sót khi thiết kế, lập trình và đảm bảo sản phẩm phù hợp nhu cầu thực tế của doanh nghiệp.');
P('Em sử dụng phương pháp phân tích hướng đối tượng với ngôn ngữ mô hình hoá UML: yêu cầu được thu thập qua khảo sát quy trình thực tế, phân thành yêu cầu chức năng và phi chức năng; chức năng được mô hình hoá bằng biểu đồ use case và đặc tả luồng sự kiện; phần thiết kế dùng biểu đồ trình tự, biểu đồ lớp và biểu đồ thực thể liên kết (ERD). Các biểu đồ được vẽ bằng công cụ Rational Rose. Vì nghiệp vụ đơn hàng là một chuỗi bước có điều kiện, phần đặc tả bổ sung bảng trạng thái tiến độ và quy tắc chuyển bước làm căn cứ cho việc kiểm tra ở tầng nghiệp vụ.');

// ---------------- 2.3 ----------------
H2('2.3. Mô tả bài toán');
P('Vòng đời bắt đầu từ **số khách tiềm năng**: số điện thoại do marketing nhập vào hệ thống (nhập tay, dán hàng loạt từ bảng tính, hoặc website và quảng cáo tự đẩy qua API). Hệ thống chống trùng số và **tự chia số cho Sale theo tỷ lệ** Admin đặt — mỗi số giao cho Sale đang thiếu nhiều nhất so với tỷ lệ của mình trong tháng; Admin có thể chọn Sale nhận hoặc chuyển số sang Sale khác. Sale tự tìm được khách thì tự nhập, số thuộc về chính Sale đó.');
P('Hệ thống quản lý xuyên suốt vòng đời một đơn hàng. Sale chăm sóc khách hàng, tạo đơn (có thể nhờ trợ lý AI trích xuất đơn từ tin nhắn hoặc ảnh chụp) và **chốt đơn**; ngay khi chốt, hệ thống **tự động giao đơn cho nhân viên vận hành đang ít việc nhất**. Từ đây đơn đi qua các bước tiến độ dưới đây; đơn chỉ bán vật tư bỏ qua các bước Bóc khối lượng, Thi công và Nghiệm thu.');
Bang('Các bước tiến độ của đơn hàng và điều kiện chuyển bước', ['Bước', 'Người thực hiện', 'Công việc chính', 'Điều kiện qua bước'], [
  ['Lên phương án', 'Vận hành phụ trách', 'Viết phương án vận chuyển, phương án thi công', 'Đã có đủ phương án'],
  ['Bóc khối lượng', 'Vận hành phụ trách', 'Đo thực tế, sửa số lượng vật tư nếu khác lúc chốt', 'Đã "Xác nhận khối lượng"'],
  ['Mua hàng', 'Vận hành, Kế toán', 'Chọn NCC, đặt hàng NCC, xử lý cọc, quyết toán NCC', '100% vật tư sẵn hàng và khách đủ tạm ứng (thiếu thì phải ghi lý do)'],
  ['Giao hàng', 'Vận hành', 'Lấy hàng, lập giai đoạn thi công, phân đội thợ', 'Thợ bắt đầu giai đoạn đầu tiên (tự động)'],
  ['Thi công', 'Vận hành, đội thợ', 'Theo dõi giai đoạn, phát sinh thi công', 'Mọi giai đoạn báo xong (tự động)'],
  ['Nghiệm thu', 'Vận hành', 'Nhập số lượng vật tư và khối lượng thi công thực tế', 'Đã "Xác nhận nghiệm thu" (tự động)'],
  ['Quyết toán', 'Vận hành / Admin', 'Chốt giá trị cuối của đơn, ghi công thợ phải trả', 'Bấm "Chốt quyết toán" → Hoàn tất'],
], [16, 18, 36, 30]);
P('Song song với tiến độ là hai dòng tiền. **Dòng tiền chi:** khi vận hành bấm Đặt hàng, hệ thống lập đơn đặt hàng gửi vào nhóm Telegram của NCC; NCC trả lời "Cho xuất hàng" (vật tư chuyển Sẵn hàng, hệ thống tự lập đề xuất quyết toán) hoặc "Yêu cầu cọc" kèm số tiền (hệ thống tự lập đề xuất cọc). Mọi đề xuất chi kèm mã QR VietQR được gửi vào nhóm Telegram duyệt chi; giám đốc (Admin) duyệt ngay trên Telegram hoặc trên web; kế toán chuyển khoản và xác nhận "đã chi" kèm ảnh bill trên web hoặc ngay trong nhóm. Cọc đã chi thì vật tư tự chuyển Sẵn hàng. Công thợ được ghi vào sổ khi chốt quyết toán và chi qua đề xuất trả công.');
P('**Đối soát ngân hàng:** dịch vụ báo giao dịch (SePay) gửi về hệ thống mỗi khoản tiền vào/ra tài khoản công ty. Tiền vào có mã đơn trong nội dung chuyển khoản được tự xác nhận vào phiếu thu; tiền ra khớp nội dung chuyển khoản của đề xuất chi đã duyệt được tự ghi "đã chi". Giao dịch không khớp được chuyển cho kế toán xử lý.');
P('**Dòng tiền thu:** Sale hoặc vận hành ghi nhận khách thanh toán kèm ảnh bill; kế toán đối chiếu sao kê (hoặc hệ thống tự khớp như trên) rồi xác nhận "đã nhận tiền". Số đã thu gồm tiền cọc lúc chốt, các phiếu thu đã xác nhận và tiền thợ thu hộ; "còn phải thu" được tính tức thời. Sau khi giao hàng, nếu phát sinh thiếu hoặc hỏng, vận hành lập phiếu mua bổ sung và chia trách nhiệm chi phí cho các bên.');
P('Mọi thao tác quan trọng sinh **thông báo** đến đúng người liên quan (ví dụ Admin duyệt chi thì kế toán nhận thông báo cần chuyển khoản). Hệ thống không quản lý tồn kho vật lý vì vật tư mua ngoài được NCC giao thẳng đến công trình. Khách hàng xem báo giá qua đường dẫn công khai; NCC và người duyệt chi tương tác qua Telegram mà không cần tài khoản trên hệ thống.');
P('Ở tầng quản trị, Admin và kế toán xem **báo cáo lãi/lỗ gộp theo đơn** (doanh thu trừ chi NCC, giá vốn hàng tự sản xuất, mua bổ sung, công thợ) và xuất Excel. Admin cấu hình **phân quyền theo chức năng** cho từng vai trò, tham số nghiệp vụ, theo dõi **nhật ký thay đổi** (ai sửa gì, giá trị cũ và mới) và **sao lưu dữ liệu** tự động hằng ngày. Tài khoản Admin và kế toán — những người duyệt và chi tiền — bắt buộc **xác thực hai lớp**.');

// ---------------- 2.4 ----------------
H2('2.4. Phân tích yêu cầu');
H3('2.4.1. Yêu cầu chức năng');
P('Hệ thống có bốn actor đăng nhập trực tiếp (Sale, Vận hành, Kế toán, Admin) và các actor bên ngoài: Người duyệt chi và Nhà cung cấp tương tác qua Telegram Bot; Khách hàng xem báo giá qua đường dẫn; các hệ thống ngoài gồm dịch vụ AI Gemini (trợ lý AI), Ngân hàng (dịch vụ báo giao dịch SePay) và Website / kênh quảng cáo (đẩy số khách tiềm năng qua API).');
H4('2.4.1.1. Về phía Sale (nhân viên kinh doanh)');
Bang('Yêu cầu chức năng phía Sale', ['STT', 'Chức năng', 'Mô tả'], [
  ['1', 'Đăng nhập, đổi mật khẩu', 'Đăng nhập bằng tài khoản được cấp; tự đổi mật khẩu.'],
  ['2', 'Quản lý khách hàng', 'Thêm, sửa khách hàng được phân công; ghi nhật ký chăm sóc theo trạng thái (mới, đang tư vấn, đã báo giá, chốt, không mua).'],
  ['3', 'Tạo và chốt đơn hàng', 'Lưu nháp hoặc chốt đơn (vật tư, giá, chiết khấu, cọc, tỷ lệ tạm ứng, điều khoản nghiệm thu).'],
  ['4', 'Trợ lý AI tạo đơn', 'Dán tin nhắn hoặc ảnh chụp đơn của khách, AI trích xuất khách hàng và vật tư để điền sẵn form.'],
  ['5', 'Gửi link báo giá', 'Tạo đường dẫn báo giá để khách xem trên điện thoại; tạo link mới để thu hồi link cũ.'],
  ['6', 'Theo dõi đơn của mình', 'Danh sách, bộ lọc, tiến độ từng bước; chỉ thấy đơn của mình.'],
  ['7', 'Gửi yêu cầu chỉnh sửa', 'Gửi yêu cầu sửa đơn đã chốt cho vận hành phụ trách.'],
  ['8', 'Ghi nhận khách thanh toán', 'Ghi nhận khách chuyển khoản (kèm bill) hoặc trả tiền mặt; gửi QR thu tiền cho khách.'],
  ['9', 'Nhập số tự tìm', 'Nhập số khách tiềm năng tự tìm được (từng số hoặc dán nhiều số); số thuộc về chính Sale; chống trùng số.'],
  ['10', 'Chăm sóc số được chia', 'Nhận thông báo khi được chia số; "Việc cần làm" nhắc số mới chưa liên hệ, số quá 2 giờ chưa gọi.'],
], [8, 26, 66]);
H4('2.4.1.2. Về phía Vận hành');
Bang('Yêu cầu chức năng phía Vận hành', ['STT', 'Chức năng', 'Mô tả'], [
  ['1', 'Xem đơn được giao', 'Chỉ xem và thao tác các đơn mình phụ trách; việc cần làm trên trang Tổng quan.'],
  ['2', 'Cập nhật tiến độ', 'Lên phương án, chuyển bước, lùi bước (ghi lý do), huỷ đơn trước khi giao hàng (ghi lý do).'],
  ['3', 'Bóc khối lượng', 'Nhập số lượng thực đo và xác nhận khối lượng trước khi mua hàng.'],
  ['4', 'Mua hàng', 'Chọn NCC cho từng dòng vật tư theo bảng giá; đặt hàng NCC; ghi nhận NCC cho xuất hàng hoặc yêu cầu cọc; huỷ đặt hàng; xác nhận đã lấy hàng.'],
  ['5', 'Đăng ký giao hàng', 'Khi đủ hàng và khách đủ tạm ứng; thiếu tạm ứng vẫn giao được nhưng phải ghi lý do.'],
  ['6', 'Thi công', 'Lập giai đoạn thi công, phân đội thợ (cảnh báo trùng lịch), bắt đầu, báo xong; ghi phát sinh thi công.'],
  ['7', 'Nghiệm thu, quyết toán', 'Nhập số lượng, khối lượng thực tế; xác nhận nghiệm thu; chốt quyết toán.'],
  ['8', 'Mua bổ sung', 'Lập phiếu mua bổ sung khi thiếu, hỏng hàng, chọn nguồn trách nhiệm.'],
  ['9', 'Xử lý yêu cầu sửa', 'Xem và đánh dấu đã xử lý yêu cầu chỉnh sửa của Sale.'],
], [8, 26, 66]);
H4('2.4.1.3. Về phía Kế toán');
Bang('Yêu cầu chức năng phía Kế toán', ['STT', 'Chức năng', 'Mô tả'], [
  ['1', 'Quản lý NCC và bảng giá', 'NCC, tài khoản ngân hàng NCC, giá vật tư theo thời gian hiệu lực (không chồng lấn), so sánh giá.'],
  ['2', 'Danh mục vật tư', 'Thêm, sửa vật tư, loại vật tư (tự sản xuất / mua ngoài); ngừng kinh doanh.'],
  ['3', 'Đề xuất chi', 'Lập đề xuất cọc, quyết toán NCC, chi bổ sung, trả công / ứng công thợ; sửa và gửi lại khi bị từ chối.'],
  ['4', 'Xác nhận đã chi', 'Quét QR chuyển khoản, xác nhận đã chi kèm ảnh bill trên web hoặc trong nhóm Telegram.'],
  ['5', 'Công nợ NCC, đội thợ', 'Xem còn phải trả, chi thừa, sổ công thợ theo từng đội.'],
  ['6', 'Công nợ khách hàng', 'Xác nhận tiền về hoặc từ chối phiếu thu; danh sách đơn còn nợ, đơn đến hạn.'],
  ['7', 'Phân tích, trợ lý AI', 'Thống kê vật tư bán chạy, so sánh giá NCC; AI nhận xét (số liệu do SQL tính, AI chỉ diễn giải).'],
  ['8', 'Mua bổ sung', 'Chốt phiếu mua bổ sung (NCC, giá, chia tiền trách nhiệm) và lập đề xuất chi bổ sung.'],
  ['9', 'Đối soát ngân hàng', 'Xem giao dịch ngân hàng hệ thống đã tự khớp; khớp tay giao dịch tiền vào chưa khớp vào đơn, hoặc bỏ qua kèm lý do.'],
  ['10', 'Báo cáo lãi/lỗ, xuất Excel', 'Lãi gộp theo đơn, theo Sale, theo hình thức; lọc đơn lỗ; xuất Excel báo cáo, danh sách đơn, đề xuất chi, công nợ khách.'],
  ['11', 'Đăng nhập hai lớp', 'Bắt buộc xác thực hai lớp bằng ứng dụng Authenticator; mã dự phòng khi mất điện thoại.'],
], [8, 26, 66]);
H4('2.4.1.4. Về phía Admin');
Bang('Yêu cầu chức năng phía Admin', ['STT', 'Chức năng', 'Mô tả'], [
  ['1', 'Quản lý người dùng', 'Tạo tài khoản (mật khẩu tạm), đổi vai trò, khoá/mở khoá, đặt lại mật khẩu, gắn tài khoản Telegram, đặt lại xác thực hai lớp khi nhân viên mất điện thoại.'],
  ['2', 'Duyệt chi', 'Duyệt, từ chối (ghi lý do), thu hồi đề xuất đã duyệt mà chưa chi — trên web hoặc Telegram.'],
  ['3', 'Phân công vận hành', 'Chuyển đơn sang vận hành khác (bắt buộc lý do); xem đơn chưa phân công.'],
  ['4', 'Giám sát toàn công ty', 'Xem mọi đơn, mọi công nợ; KPI doanh thu, công nợ trên trang Tổng quan; báo cáo lãi/lỗ.'],
  ['5', 'Nhập số và quản lý chia số', 'Nhập số khách tiềm năng (tay, dán hàng loạt, API); đặt tỷ lệ chia cho từng Sale; chọn Sale nhận; chuyển số sang Sale khác (ghi lý do).'],
  ['6', 'Phân quyền theo chức năng', 'Tick chức năng mỗi vai trò được làm trên ma trận quyền; có hiệu lực ngay.'],
  ['7', 'Nhật ký thay đổi', 'Xem ai đã thêm / sửa / xoá dữ liệu gì, giá trị cũ và mới, lúc nào, qua kênh nào.'],
  ['8', 'Sao lưu, cấu hình', 'Xem và tạo bản sao lưu dữ liệu, tải bản sao lưu; chỉnh tham số nghiệp vụ (giá vốn ước tính hàng tự sản xuất).'],
], [8, 26, 66]);
H4('2.4.1.5. Về phía actor bên ngoài');
Bang('Yêu cầu chức năng phía actor bên ngoài', ['Actor', 'Chức năng', 'Mô tả'], [
  ['Người duyệt chi (Telegram)', 'Duyệt / từ chối đề xuất chi', 'Nhận tin đề xuất kèm ảnh QR trong nhóm duyệt chi, bấm nút Duyệt / Từ chối.'],
  ['Kế toán (Telegram)', 'Xác nhận đã chi', 'Bấm "Đã chi – gửi ảnh bill" và trả lời bằng ảnh bill (tài khoản Telegram phải được gắn với Kế toán).'],
  ['Nhà cung cấp (Telegram)', 'Phản hồi đơn đặt hàng', 'Nhận đơn đặt hàng trong nhóm NCC, bấm "Cho xuất hàng" hoặc "Yêu cầu cọc" rồi nhập số tiền cọc.'],
  ['Khách hàng', 'Xem báo giá', 'Mở đường dẫn báo giá trên điện thoại, không cần tài khoản.'],
  ['Dịch vụ Gemini AI', 'Trích xuất, nhận xét', 'Trích xuất đơn từ văn bản/ảnh; viết nhận xét cho số liệu phân tích.'],
  ['Ngân hàng (SePay)', 'Báo giao dịch', 'Gửi webhook mỗi giao dịch tiền vào/ra tài khoản công ty (số tiền, nội dung chuyển khoản) để hệ thống tự đối soát.'],
  ['Website / kênh quảng cáo', 'Đẩy số khách tiềm năng', 'Gọi API nhập số (kèm khoá API) mỗi khi có khách để lại số; số được chia cho Sale như khi nhập tay.'],
], [24, 26, 50]);

H3('2.4.2. Yêu cầu phi chức năng');
H4('2.4.2.1. Giao diện người dùng');
P('Giao diện theo mô hình Single Page Application, chuyển chức năng không tải lại trang; thực đơn và trang Tổng quan khác nhau theo vai trò, khối "Việc cần làm" nổi bật ở đầu trang (việc gấp tô đỏ). Hỗ trợ chế độ sáng/tối, hiển thị tốt trên điện thoại (Sale và vận hành thường thao tác ngoài công trình): các trang được rà soát ở khổ màn hình 390 px, bảng rộng cuộn ngang, thanh tab vuốt ngang. Ứng dụng là **PWA** — cài được lên màn hình chính điện thoại như một ứng dụng, mở toàn màn hình. Trạng thái được thể hiện bằng nhãn màu kèm chữ, bảng có bộ lọc và tìm kiếm; nút chỉ hiện với người có quyền thao tác.');
H4('2.4.2.2. Tính bảo mật');
B([
  'Xác thực bằng JWT; mật khẩu băm bằng bcrypt; sai mật khẩu 5 lần trong 15 phút bị tạm chặn đăng nhập.',
  '**Xác thực hai lớp (TOTP, RFC 6238)** bắt buộc cho Admin và Kế toán: sau mật khẩu phải nhập mã 6 số đổi mỗi 30 giây từ ứng dụng Authenticator; khoá bí mật lưu mã hoá AES-256-GCM, mỗi mã chỉ dùng một lần, có 8 mã dự phòng dùng một lần.',
  '**Thu hồi phiên ngay lập tức:** mỗi tài khoản có số phiên bản token; khoá, đổi vai trò hoặc đổi mật khẩu làm token cũ hết hiệu lực ngay. Vai trò được đọc từ CSDL ở mỗi request, không tin thông tin trong token.',
  '**Phân quyền hai lớp:** theo chức năng (RBAC — Admin cấu hình ma trận vai trò × quyền) ở tầng route và theo dữ liệu ở tầng nghiệp vụ (Sale chỉ thấy khách, đơn của mình; Vận hành chỉ thấy đơn mình phụ trách); mọi kiểm tra thực hiện ở máy chủ. Quyền quản trị hệ thống luôn thuộc Admin để không thể tự khoá mình.',
  '**API cho hệ thống ngoài** (nhập số, webhook ngân hàng) xác thực bằng khoá API so sánh thời gian hằng (chống dò khoá theo thời gian phản hồi).',
  '**Lưu vết:** trigger CSDL ghi nhật ký mọi thay đổi trên các bảng quan trọng kèm người thao tác và kênh (web, Telegram, API, ngân hàng); mật khẩu và khoá xác thực không bao giờ xuất hiện trong nhật ký.',
  '**Telegram chống giả mạo:** webhook xác thực bằng secret token; nút bấm chỉ được chấp nhận trong đúng nhóm và đúng tin nhắn của chứng từ; chỉ người được phép mới duyệt, chỉ kế toán đã gắn tài khoản mới xác nhận chi.',
  'Ảnh bill được kiểm tra định dạng thật bằng magic bytes, giới hạn 4 MB, tên tệp do máy chủ sinh (chống path traversal) và chỉ xem qua API có đăng nhập.',
  'Văn bản đặt hàng gửi NCC không chứa tên, số điện thoại, địa chỉ khách hàng.',
]);
H4('2.4.2.3. Toàn vẹn dữ liệu');
P('Các nghiệp vụ liên quan đến tiền và tiến độ chạy trong giao dịch (transaction) của PostgreSQL: thông báo được ghi cùng giao dịch nên thao tác lỗi không sinh thông báo sai. Khoá dòng (SELECT … FOR UPDATE) và khoá tư vấn (advisory lock) chống xử lý trùng khi nhiều người thao tác đồng thời (ví dụ hai đơn chốt cùng lúc vẫn được chia đều cho vận hành). Ràng buộc được đặt ngay tại CSDL: CHECK theo trạng thái (chuyển khoản phải có bill, đã duyệt phải có người duyệt), EXCLUDE chống chồng thời gian hiệu lực bảng giá, trigger chặn một dòng vật tư nằm trong hai đề xuất quyết toán. Mỗi giao dịch ngân hàng chỉ được xử lý một lần (khoá duy nhất theo mã giao dịch) dù ngân hàng gửi lại; chia số khách tiềm năng dùng khoá tư vấn để nhập đồng thời vẫn đúng tỷ lệ và không lọt số trùng.');
H4('2.4.2.4. Khả năng mở rộng');
P('Loại vật tư (tự sản xuất / mua ngoài) là dữ liệu chứ không cố định trong mã nguồn, nên doanh nghiệp thêm sản phẩm mới chỉ bằng danh mục. Kênh Telegram được tách thành tầng tích hợp riêng (một bot, hai nhóm), có thể thay bằng kênh khác mà không sửa nghiệp vụ. Cấu trúc CSDL được quản lý bằng các tệp migration đánh số, chạy đúng một lần trên mỗi máy, giúp nâng cấp an toàn khi triển khai. Quyền của từng vai trò và tham số nghiệp vụ được lưu trong CSDL nên thay đổi quy định không cần sửa mã nguồn; hệ thống ngoài kết nối qua API (nhập số) và webhook theo định dạng chuẩn của dịch vụ ngân hàng.');
H4('2.4.2.5. Sao lưu và khôi phục dữ liệu');
P('Hệ thống tự sao lưu hằng ngày toàn bộ cơ sở dữ liệu (pg_dump) và thư mục ảnh bill, giữ số bản gần nhất theo cấu hình; Admin có thể sao lưu ngay và tải bản sao lưu về. Công cụ khôi phục luôn khôi phục vào một cơ sở dữ liệu mới, không ghi đè cơ sở dữ liệu đang chạy, để kiểm tra trước khi chuyển sang dùng.');

// ---------------- 2.5 ----------------
H2('2.5. Mô hình hoá Use case');
H3('2.5.1. Use case tổng quan');
P('Bốn actor Sale, Vận hành, Kế toán, Admin kế thừa actor chung "Người dùng" nên cùng dùng các use case Đăng nhập, Đổi mật khẩu và Xem thông báo. Người duyệt chi, Nhà cung cấp, Khách hàng, Gemini AI, Ngân hàng và Website / kênh quảng cáo là actor bên ngoài.');
ChoHinh('Biểu đồ use case tổng quan', [
  '**Actor:** Người dùng (tổng quát hoá: Sale, Vận hành, Kế toán, Admin); Người duyệt chi (Telegram); Nhà cung cấp (Telegram); Khách hàng; Gemini AI, Ngân hàng (SePay), Website / kênh quảng cáo (hệ thống ngoài).',
  '**Use case (gói theo nhóm):** Đăng nhập (extend: Xác thực hai lớp); Đổi mật khẩu; Xem thông báo; Nhập số và chia số; Quản lý khách hàng; Quản lý đơn hàng; Mua hàng – đặt hàng NCC; Thi công – nghiệm thu – quyết toán; Đề xuất chi & duyệt chi; Thu tiền khách hàng; Đối soát ngân hàng; Quản lý NCC – bảng giá – vật tư; Phân tích, báo cáo lãi/lỗ & trợ lý AI; Quản trị hệ thống (người dùng, phân quyền, nhật ký, sao lưu, cấu hình).',
  '**Liên kết:** Người dùng — Đăng nhập, Đổi mật khẩu, Xem thông báo. Sale — Nhập số và chia số (số tự tìm), Quản lý khách hàng, Quản lý đơn hàng, Thu tiền khách hàng. Vận hành — Quản lý đơn hàng, Mua hàng, Thi công. Kế toán — Đề xuất chi, Thu tiền, Đối soát ngân hàng, Quản lý NCC, Phân tích & báo cáo. Admin — Nhập số và chia số, Quản trị hệ thống, Đề xuất chi & duyệt chi, Báo cáo lãi/lỗ. Người duyệt chi — Đề xuất chi & duyệt chi. Nhà cung cấp — Mua hàng – đặt hàng NCC. Khách hàng — Quản lý đơn hàng (xem báo giá). Gemini AI — Phân tích & trợ lý AI. Ngân hàng — Đối soát ngân hàng. Website / kênh quảng cáo — Nhập số và chia số.',
]);
H3('2.5.2. Use case phía Sale');
ChoHinh('Biểu đồ use case phía Sale', [
  '**Actor:** Sale; Gemini AI; Khách hàng.',
  '**Use case:** Nhập số tự tìm; Quản lý khách hàng; Ghi nhật ký chăm sóc; Tạo đơn hàng; Lưu nháp; Chốt đơn; Trích xuất đơn bằng AI; Tạo link báo giá; Xem báo giá; Theo dõi tiến độ đơn; Gửi yêu cầu chỉnh sửa; Ghi nhận khách thanh toán.',
  '**Quan hệ:** Nhập số tự tìm «include» Kiểm tra trùng số; Tạo đơn hàng «extend» Trích xuất đơn bằng AI (liên kết Gemini AI); Chốt đơn «include» Kiểm tra đủ thông tin; Tạo link báo giá — Khách hàng liên kết Xem báo giá; Ghi nhận khách thanh toán «include» Tải ảnh bill (khi chuyển khoản); mọi use case «include» Đăng nhập.',
]);
H3('2.5.3. Use case phía Vận hành');
ChoHinh('Biểu đồ use case phía Vận hành', [
  '**Actor:** Vận hành; Nhà cung cấp (Telegram).',
  '**Use case:** Cập nhật phương án; Chuyển / lùi bước tiến độ; Huỷ đơn; Xác nhận khối lượng; Chọn NCC cho vật tư; Đặt hàng NCC; Ghi nhận phản hồi NCC; Huỷ đặt hàng; Đăng ký giao hàng; Xác nhận lấy hàng; Lập giai đoạn thi công; Bắt đầu / báo xong giai đoạn; Ghi phát sinh thi công; Nghiệm thu; Chốt quyết toán; Lập phiếu mua bổ sung; Xử lý yêu cầu sửa.',
  '**Quan hệ:** Đặt hàng NCC «include» Gửi đơn đặt hàng qua Telegram (liên kết Nhà cung cấp); Nhà cung cấp — Phản hồi đơn đặt hàng (Cho xuất hàng / Yêu cầu cọc); Đăng ký giao hàng «extend» Bỏ qua tạm ứng có lý do; Lùi bước «include» Ghi lý do.',
]);
H3('2.5.4. Use case phía Kế toán');
ChoHinh('Biểu đồ use case phía Kế toán', [
  '**Actor:** Kế toán; Người duyệt chi (Telegram); Gemini AI; Ngân hàng (SePay).',
  '**Use case:** Quản lý NCC và bảng giá; Quản lý danh mục vật tư; Lập đề xuất chi; Gửi lại đề xuất bị từ chối; Xác nhận đã chi; Xem công nợ NCC; Xem công nợ đội thợ; Xác nhận tiền khách về; Xem công nợ khách hàng; Đối soát giao dịch ngân hàng; Chốt phiếu mua bổ sung; Phân tích vật tư bán chạy và giá NCC; Xem báo cáo lãi/lỗ; Xuất Excel.',
  '**Quan hệ:** Lập đề xuất chi «include» Gửi đề xuất kèm QR vào nhóm Telegram (liên kết Người duyệt chi); Xác nhận đã chi «include» Tải ảnh bill; Xác nhận đã chi «extend» Xác nhận qua Telegram; Ngân hàng — Đối soát giao dịch ngân hàng (tự xác nhận tiền khách về / tự ghi đã chi); Xem báo cáo lãi/lỗ «extend» Xuất Excel; Phân tích «extend» AI nhận xét (liên kết Gemini AI).',
]);
H3('2.5.5. Use case phía Admin');
ChoHinh('Biểu đồ use case phía Admin', [
  '**Actor:** Admin; Người duyệt chi (Telegram); Website / kênh quảng cáo.',
  '**Use case:** Quản lý người dùng (tạo, đổi vai trò, khoá, đặt lại mật khẩu, gắn Telegram, đặt lại xác thực hai lớp); Nhập số khách tiềm năng; Quản lý tỷ lệ chia số; Chuyển số sang Sale khác; Duyệt / từ chối đề xuất chi; Thu hồi đề xuất đã duyệt; Chuyển vận hành phụ trách đơn; Phân quyền theo chức năng; Xem nhật ký thay đổi; Sao lưu dữ liệu; Cấu hình tham số; Xem tổng quan, báo cáo lãi/lỗ toàn công ty.',
  '**Quan hệ:** Duyệt đề xuất chi được thực hiện trên web (Admin) hoặc trên Telegram (Người duyệt chi) — vẽ Người duyệt chi liên kết cùng use case; Website / kênh quảng cáo liên kết Nhập số khách tiềm năng (qua API); Nhập số «include» Chia số theo tỷ lệ; Từ chối, Chuyển phụ trách, Chuyển số «include» Ghi lý do.',
]);

// ---------------- 2.6 ----------------
H2('2.6. Đặc tả Use case');
const UC = [
  ['Đăng nhập', ['UC01', 'Sale, Vận hành, Kế toán, Admin', 'Người dùng đăng nhập bằng tài khoản Admin cấp.', 'Tài khoản đang hoạt động.',
    '1. Người dùng nhập tên đăng nhập, mật khẩu.\n2. Hệ thống kiểm tra mật khẩu (bcrypt), trạng thái tài khoản.\n3. Với Admin, Kế toán: hệ thống cấp "mã tạm" 10 phút và yêu cầu mã xác thực hai lớp; người dùng nhập mã 6 số từ ứng dụng Authenticator.\n4. Hệ thống kiểm tra mã (lệch tối đa ±30 giây, mã chưa dùng), cấp JWT kèm số phiên bản token, chuyển đến trang Tổng quan theo vai trò.',
    '2a. Sai thông tin: báo "Sai tên đăng nhập hoặc mật khẩu" (không tiết lộ tài khoản có tồn tại).\n2b. Sai 5 lần trong 15 phút: tạm chặn đăng nhập.\n2c. Tài khoản bị khoá: báo đã bị khoá.\n3a. Lần đầu (chưa cài): hệ thống hiện mã QR để quét bằng ứng dụng; nhập đúng mã đầu tiên thì bật xác thực hai lớp và hiện 8 mã dự phòng (chỉ một lần).\n3b. Mất điện thoại: nhập một mã dự phòng (mỗi mã dùng một lần) hoặc nhờ Admin đặt lại.\n4a. Sai mã 5 lần: tạm khoá 15 phút. Sale, Vận hành không bắt buộc bước 3.', 'Người dùng vào hệ thống đúng vai trò.']],
  ['Tạo và chốt đơn hàng', ['UC02', 'Sale (hệ thống tự phân công)', 'Sale tạo đơn cho khách mình phụ trách và chốt đơn.', 'Sale đã đăng nhập; khách hàng thuộc Sale.',
    '1. Sale nhập khách hàng, hình thức (vật tư / hoàn thiện), địa chỉ, vật tư, đơn giá, chiết khấu, cọc, tỷ lệ tạm ứng, điều khoản nghiệm thu (có thể dùng trợ lý AI điền sẵn).\n2. Sale bấm "Chốt đơn".\n3. Hệ thống kiểm tra đủ thông tin, tạo đơn ở bước "Lên phương án".\n4. Hệ thống chọn vận hành đang hoạt động có ít đơn mở nhất (khoá tư vấn chống trùng), ghi lịch sử phân công và gửi thông báo cho vận hành đó.',
    '1a. Lưu nháp: đơn chỉ Sale thấy, chưa phân công.\n3a. Thiếu thông tin: báo danh sách phần còn thiếu.\n4a. Không có vận hành nào hoạt động: đơn "chưa phân công", Admin phân sau.', 'Đơn được chốt, có vận hành phụ trách.']],
  ['Chuyển bước tiến độ đơn hàng', ['UC03', 'Vận hành phụ trách, Admin', 'Hoàn thành bước hiện tại để sang bước tiếp theo, hoặc lùi bước.', 'Người thao tác phụ trách đơn; đơn chưa hoàn tất / huỷ.',
    '1. Vận hành bấm "Xong" ở bước hiện tại.\n2. Hệ thống kiểm tra điều kiện của bước (Bảng 2.1).\n3. Hệ thống cập nhật bước (khoá lạc quan theo bước cũ), ghi lịch sử, thông báo cho Sale của đơn.',
    '2a. Chưa đạt điều kiện: báo lý do cụ thể.\n2b. Bước Mua hàng thiếu tạm ứng: chỉ qua được khi ghi lý do; hệ thống báo Admin và Kế toán.\n1a. Lùi bước / huỷ đơn: bắt buộc ghi lý do; chỉ huỷ được trước khi giao hàng.', 'Đơn ở bước mới, có lịch sử và thông báo.']],
  ['Xác nhận bóc khối lượng', ['UC04', 'Vận hành phụ trách', 'Nhập số lượng thực đo trước khi mua hàng.', 'Đơn hoàn thiện ở bước Bóc khối lượng.',
    '1. Vận hành nhập số lượng thực đo cho từng vật tư.\n2. Bấm "Xác nhận khối lượng".\n3. Hệ thống cập nhật số lượng, tính lại tổng đơn, ghi lịch sử; nếu tổng thay đổi thì thông báo Sale.',
    '3a. Dòng đã đặt hàng NCC: không cho đổi số lượng.', 'Đơn được phép sang bước Mua hàng.']],
  ['Đặt hàng nhà cung cấp', ['UC05', 'Vận hành phụ trách, Kế toán', 'Gửi đơn đặt hàng cho một NCC gồm các vật tư đã chọn NCC.', 'Có dòng vật tư ở trạng thái "Đã chọn NCC".',
    '1. Người dùng chọn NCC cho các dòng vật tư (giá lấy từ bảng giá hiệu lực hôm nay).\n2. Bấm "Đặt hàng" tại NCC.\n3. Hệ thống tạo đơn đặt hàng (nội dung văn bản không chứa thông tin khách), chuyển các dòng sang "Đã đặt".\n4. Hệ thống gửi đơn đặt hàng vào nhóm Telegram NCC kèm hai nút "Cho xuất hàng" và "Yêu cầu cọc".',
    '4a. Chưa cấu hình Telegram NCC: người dùng chép nội dung gửi NCC qua Zalo/email.\n3a. Đã gửi đặt hàng: khoá đổi NCC, giá; muốn đổi phải huỷ đặt hàng.', 'Đơn đặt hàng chờ NCC phản hồi.']],
  ['Phản hồi đơn đặt hàng', ['UC06', 'Nhà cung cấp (Telegram) / Vận hành ghi nhận trên web', 'NCC xác nhận xuất hàng hoặc yêu cầu cọc.', 'Đơn đặt hàng đang chờ phản hồi.',
    '1. NCC bấm "Cho xuất hàng" trong nhóm Telegram.\n2. Hệ thống kiểm tra đúng nhóm, đúng tin nhắn; chuyển vật tư sang "Sẵn hàng".\n3. Hệ thống tự lập đề xuất quyết toán NCC (tiền hàng gồm VAT trừ cọc đã duyệt) và gửi nhóm duyệt chi.',
    '1a. NCC bấm "Yêu cầu cọc": bot hỏi số tiền; NCC trả lời (vd "2tr"); hệ thống kiểm tra cọc nhỏ hơn tiền hàng, chuyển vật tư sang "Chờ cọc" và tự lập đề xuất cọc, thông báo Kế toán, Admin.\n2a. Nút từ nhóm khác / tin khác: từ chối.', 'Có đề xuất chi tương ứng chờ duyệt.']],
  ['Duyệt đề xuất chi', ['UC07', 'Admin (web), Người duyệt chi (Telegram)', 'Phê duyệt hoặc từ chối một đề xuất chi.', 'Đề xuất ở trạng thái "Chờ duyệt".',
    '1. Người duyệt xem đề xuất (ảnh QR, số tiền, người nhận, nội dung chuyển khoản).\n2. Bấm "Duyệt".\n3. Hệ thống cập nhật trạng thái (chỉ khi còn chờ duyệt), ghi nhật ký người duyệt, thông báo Kế toán và người lập; tin Telegram đổi thành "Đã duyệt" kèm nút "Đã chi".',
    '2a. Từ chối: bắt buộc lý do (trên web); Kế toán sửa và gửi lại.\n2b. Người không có quyền bấm trên Telegram: từ chối.\n3a. Đề xuất đã được xử lý: không cập nhật lại.', 'Đề xuất đã duyệt chờ chi, hoặc bị từ chối.']],
  ['Xác nhận đã chi', ['UC08', 'Kế toán (web hoặc Telegram)', 'Ghi nhận đã chuyển khoản cho đề xuất đã duyệt.', 'Đề xuất "Đã duyệt"; Kế toán đã gắn Telegram (nếu thao tác trên Telegram).',
    '1. Kế toán quét QR chuyển khoản.\n2. Kế toán tải ảnh bill (web) hoặc bấm "Đã chi – gửi ảnh bill" và trả lời bằng ảnh (Telegram).\n3. Hệ thống kiểm tra ảnh, tạo phiếu thanh toán, chuyển đề xuất sang "Đã chi", thông báo người lập; tin Telegram bỏ nút.\n4. Nếu là cọc: vật tư tự chuyển "Sẵn hàng", tự lập quyết toán phần còn lại, báo nhóm NCC đề nghị xuất hàng.',
    '2a. Không phải ảnh / quá 4 MB: báo lỗi.\n3a. Chi trả công thợ: ghi sổ thợ.\n1a. Đã nối dịch vụ báo giao dịch: khi tiền ra tài khoản khớp nội dung chuyển khoản và số tiền của đề xuất, hệ thống tự ghi "đã chi" không cần ảnh bill (UC16).', 'Công nợ NCC / thợ được cập nhật.']],
  ['Thi công và nghiệm thu', ['UC09', 'Vận hành phụ trách', 'Lập giai đoạn thi công, theo dõi đến nghiệm thu.', 'Đơn hoàn thiện đã giao hàng.',
    '1. Vận hành lập giai đoạn (tên, đội thợ, khối lượng, giá công, ngày dự kiến).\n2. Thợ bắt đầu giai đoạn đầu: đơn tự sang Thi công.\n3. Báo xong giai đoạn cuối: đơn tự sang Nghiệm thu.\n4. Vận hành nhập số lượng vật tư và khối lượng thi công thực tế, bấm "Xác nhận nghiệm thu": đơn tự sang Quyết toán.',
    '1a. Đội thợ trùng lịch: cảnh báo, cần xác nhận.\n4a. Hao hụt vật tư trên 10%: cảnh báo.', 'Đơn chờ chốt quyết toán.']],
  ['Chốt quyết toán', ['UC10', 'Vận hành phụ trách, Admin', 'Chốt giá trị cuối của đơn theo số lượng thực tế.', 'Đơn ở bước Quyết toán (đơn hoàn thiện đã nghiệm thu).',
    '1. Người dùng xem bảng quyết toán (SL thực tế × giá, chiết khấu, phí, phát sinh, cọc).\n2. Bấm "Chốt quyết toán".\n3. Hệ thống lưu giá trị quyết toán, ghi công thợ phải trả vào sổ thợ, chuyển đơn sang Hoàn tất.', '—', 'Đơn hoàn tất; công nợ khách và công thợ được xác định.']],
  ['Ghi nhận thanh toán của khách', ['UC11', 'Sale, Vận hành phụ trách (ghi nhận); Kế toán (xác nhận)', 'Ghi nhận khách đã trả tiền và xác nhận tiền về.', 'Đơn chưa huỷ, còn phải thu.',
    '1. Sale gửi khách QR thu tiền (số tiền gợi ý, nội dung là mã đơn).\n2. Sale ghi nhận khoản thu: loại, số tiền, hình thức, ngày, ảnh bill.\n3. Hệ thống lưu phiếu "Chờ xác nhận", thông báo Kế toán.\n4. Kế toán đối chiếu sao kê, bấm "Đã nhận tiền": phiếu được tính vào số đã thu, thông báo Sale.',
    '2a. Chuyển khoản không có bill / vượt số còn phải thu / ngày tương lai: báo lỗi.\n4a. Kế toán "Chưa thấy tiền": ghi lý do, báo người ghi nhận.\n2b. Kế toán tự nhập: xác nhận luôn.\n4b. Tiền về tài khoản có mã đơn trong nội dung: hệ thống tự xác nhận phiếu chờ đúng số tiền hoặc tự tạo phiếu đã xác nhận (UC16).', 'Số đã thu, còn phải thu được cập nhật.']],
  ['Lập phiếu mua bổ sung', ['UC12', 'Vận hành (lập), Kế toán (chốt)', 'Mua thêm khi thiếu, hỏng hàng sau giao hàng.', 'Đơn đã giao hàng trở đi.',
    '1. Vận hành chọn loại phát sinh, vật tư, số lượng, lý do, nguồn trách nhiệm.\n2. Hệ thống lưu phiếu "Chờ mua", thông báo Kế toán.\n3. Kế toán chọn NCC, giá, chia tiền cho các nguồn trách nhiệm (tổng bằng tiền hàng), bấm "Đã mua".\n4. Kế toán lập đề xuất chi bổ sung.',
    '3a. Tổng tiền trách nhiệm khác tiền hàng: báo lỗi.', 'Chi phí phát sinh có người chịu trách nhiệm rõ ràng.']],
  ['Trích xuất đơn bằng trợ lý AI', ['UC13', 'Sale; Gemini AI', 'AI đọc tin nhắn / ảnh đơn của khách để điền sẵn form tạo đơn.', 'Đã cấu hình khoá Gemini API.',
    '1. Sale dán nội dung tin nhắn hoặc tải ảnh.\n2. Hệ thống gửi Gemini kèm danh mục vật tư và khách hàng của Sale.\n3. Hệ thống đối chiếu kết quả với danh mục (hậu kiểm tên vật tư, khách), điền form để Sale kiểm tra lại.',
    '2a. Mô hình quá tải / quá thời gian: thử lại, chuyển mô hình dự phòng.\n3a. Vật tư không có trong danh mục: đánh dấu để Sale chọn tay.', 'Form tạo đơn được điền sẵn, Sale vẫn là người chốt.']],
  ['Quản lý tài khoản người dùng', ['UC14', 'Admin', 'Tạo, đổi vai trò, khoá, đặt lại mật khẩu, gắn Telegram.', 'Admin đã đăng nhập.',
    '1. Admin tạo tài khoản: hệ thống sinh mật khẩu tạm hiện một lần.\n2. Admin đổi vai trò / khoá / đặt lại mật khẩu: hệ thống tăng số phiên bản token, người đó bị đăng xuất ngay.\n3. Admin gắn username Telegram để người dùng duyệt / chi trên Telegram.',
    '2a. Tự khoá chính mình hoặc khoá Admin cuối cùng: từ chối.\n3a. Username Telegram đã gắn cho người khác: từ chối.\n2b. Nhân viên mất điện thoại: Admin "Đặt lại xác thực hai lớp", lần đăng nhập sau phải quét QR cài lại.', 'Tài khoản cập nhật, phiên cũ bị thu hồi khi cần.']],
  ['Nhập số và chia số cho Sale', ['UC15', 'Admin, Sale; Website / kênh quảng cáo (API)', 'Đưa số khách tiềm năng vào hệ thống và giao cho Sale theo tỷ lệ.', 'Admin đã đặt tỷ lệ chia (chưa đặt thì chia đều cho mọi Sale đang hoạt động).',
    '1. Người dùng nhập một số, hoặc dán nhiều dòng "SĐT | Tên | Địa chỉ | Nhu cầu" từ bảng tính và chọn nguồn; hệ thống ngoài gọi API nhập số kèm khoá API.\n2. Hệ thống chuẩn hoá số (bỏ dấu cách, đổi +84 thành 0), kiểm tra hợp lệ.\n3. Hệ thống khoá tư vấn, kiểm tra trùng với khách đã có.\n4. Hệ thống chọn Sale có (số đã chia trong tháng + 1) / tỷ lệ nhỏ nhất, tạo khách trạng thái "Mới", ghi nhật ký giao số, thông báo Sale.\n5. Hệ thống trả kết quả từng dòng: đã chia cho ai, trùng (thuộc Sale nào), lỗi.',
    '1a. Sale nhập: số thuộc chính Sale, không tính vào tỷ lệ.\n1b. Admin chọn Sale nhận: giao thẳng, không tính vào tỷ lệ.\n3a. Số đã có: không tạo mới, báo Sale đang giữ.\n4a. Không Sale nào có tỷ lệ > 0: báo lỗi.\n6. Admin chuyển số sang Sale khác: bắt buộc lý do; Sale cũ mất quyền xem, Sale mới được thông báo.', 'Số được giao cho Sale, đúng tỷ lệ theo tháng.']],
  ['Đối soát giao dịch ngân hàng', ['UC16', 'Ngân hàng (SePay); Kế toán', 'Tự khớp giao dịch ngân hàng với phiếu thu khách và đề xuất chi.', 'Đã cấu hình khoá webhook; dịch vụ báo giao dịch đã nối tài khoản công ty.',
    '1. Ngân hàng gửi webhook giao dịch (mã giao dịch, số tiền, nội dung chuyển khoản, chiều vào/ra).\n2. Hệ thống kiểm tra khoá API, bỏ qua nếu mã giao dịch đã xử lý.\n3. Tiền vào: tìm mã đơn trong nội dung (chấp nhận mất dấu gạch); có phiếu chờ xác nhận đúng số tiền thì xác nhận, không có thì tạo phiếu thu đã xác nhận; thông báo Sale, Kế toán.\n4. Tiền ra: tìm đề xuất chi đã duyệt có nội dung chuyển khoản và số tiền khớp, ghi "đã chi" theo đúng luồng UC08.',
    '3a. Không có mã đơn / đơn không tồn tại / vượt số còn phải thu: giao dịch "Chưa khớp", báo Kế toán.\n5. Kế toán khớp tay giao dịch chưa khớp vào một đơn, hoặc bỏ qua kèm lý do.\n1a. Chưa có tài khoản thật: Kế toán dùng màn giả lập gửi đúng dữ liệu webhook.', 'Phiếu thu / đề xuất chi được cập nhật tự động, giao dịch có trạng thái rõ ràng.']],
  ['Phân quyền theo chức năng', ['UC17', 'Admin', 'Cấu hình chức năng mỗi vai trò được thực hiện.', 'Admin đã đăng nhập (đã xác thực hai lớp).',
    '1. Admin mở ma trận phân quyền (chức năng theo nhóm × vai trò).\n2. Admin tick / bỏ tick quyền của một vai trò, bấm Lưu.\n3. Hệ thống thay toàn bộ quyền của vai trò trong một giao dịch, xoá bộ nhớ đệm quyền, ghi nhật ký thay đổi.\n4. Quyền có hiệu lực ngay ở request kế tiếp; thực đơn của người dùng cập nhật khi tải lại.',
    '2a. Gán quyền quản trị hệ thống cho vai trò khác Admin: từ chối (trigger CSDL cũng chặn).\n2b. Bỏ quyền quản trị của Admin: hệ thống tự giữ lại.', 'Vai trò có đúng tập quyền đã chọn.']],
];
UC.forEach(([ten, [ma, tn, mt, dkt, chinh, re, dks]], i) => {
  H3(`2.6.${i + 1}. Đặc tả use case "${ten}"`);
  DacTa(`Đặc tả use case ${ten}`, [['Mã use case', ma], ['Tên use case', ten], ['Actor', tn], ['Mô tả', mt], ['Điều kiện trước', dkt], ['Luồng sự kiện chính', chinh], ['Luồng rẽ nhánh / ngoại lệ', re], ['Điều kiện sau', dks]]);
});

// ---------------- 2.7 ----------------
H2('2.7. Cơ sở lý thuyết thiết kế hệ thống');
P('Thiết kế chuyển các yêu cầu đã phân tích thành kiến trúc và luồng xử lý cụ thể, gồm thiết kế phía máy chủ (back-end), thiết kế cơ sở dữ liệu và thiết kế giao diện (front-end).');
P('Back-end tổ chức theo kiến trúc phân lớp: **Routes** khai báo đường dẫn và kiểm tra vai trò (middleware), **Controller** nhận và trả dữ liệu HTTP, **Service** chứa quy tắc nghiệp vụ, phân quyền theo dữ liệu và giao dịch, **Repository** truy vấn PostgreSQL bằng câu lệnh SQL tham số hoá. Các tích hợp ngoài (Telegram Bot API, Gemini API, VietQR, webhook ngân hàng SePay) nằm ở tầng tích hợp riêng, nghiệp vụ không phụ thuộc trực tiếp vào giao thức của bên thứ ba. Middleware **coQuyen** kiểm tra quyền chức năng theo bảng phân quyền; ngữ cảnh người thao tác của mỗi request được truyền xuống PostgreSQL qua biến phiên trong giao dịch để trigger nhật ký ghi đúng người.');
P('Front-end là ứng dụng một trang (SPA) bằng React 18, Vite, React Router; trạng thái đăng nhập lưu bằng Zustand, gọi API bằng Axios. Bộ lọc của danh sách nằm trên URL để có thể chia sẻ đường dẫn và dùng nút Quay lại của trình duyệt. Service worker của PWA lưu đệm phần vỏ ứng dụng để mở nhanh, không bao giờ lưu đệm dữ liệu API.');

// ---------------- 2.8 ----------------
H2('2.8. Thiết kế Back-end');
H3('2.8.1. Các biểu đồ mô tả chức năng');
P('Với mỗi chức năng chính, biểu đồ trình tự mô tả thứ tự tương tác giữa người dùng, giao diện, các lớp Routes – Controller – Service – Repository, cơ sở dữ liệu và hệ thống ngoài; biểu đồ lớp mô tả các lớp xử lý và thực thể liên quan.');
const SO_DO = [
  ['Đăng nhập', [
    '**Đối tượng:** Người dùng, Giao diện Đăng nhập, AuthController, AuthService, AuthRepository, PostgreSQL.',
    '**Thông điệp:** 1 nhập tên đăng nhập, mật khẩu → 2 POST /api/auth/login → 3 dangNhap() → 4 kiểm tra số lần sai (chặn nếu ≥ 5) → 5 findByUsername() → 6 SELECT users → 7 so sánh bcrypt → 8 [Admin/Kế toán] kyMaTam() → trả { buoc: nhap_ma_2fa, ma_tam } → 9 nhập mã 6 số → 10 POST /api/auth/2fa/xac-minh → 11 HaiLopService.xacMinh(): giaiMa(khoá) → kiemTra(TOTP, ±1 bước) → UPDATE totp_buoc_cuoi (chỉ khi lớn hơn bước đã dùng) → 12 kyToken(id, vai trò, phiên bản token) → 13 lưu token, chuyển trang Tổng quan.',
    '**Nhánh alt:** sai mật khẩu → tăng bộ đếm, trả 401; tài khoản khoá → 403; Sale/Vận hành → cấp token ngay ở bước 8; lần đầu → khoiTao() trả QR, kichHoat() lưu khoá mã hoá + 8 mã dự phòng; sai mã 5 lần → 429.',
  ], ['**Lớp:** AuthController (login, me, doiMatKhau); AuthService (dangNhap, phienDangNhap, kyToken); HaiLopService (kyMaTam, khoiTao, kichHoat, xacMinh, datLai); Totp (taoKhoa, maTai, kiemTra); MaHoa (maHoa, giaiMa); AuthRepository; middleware xacThuc, coQuyen; thực thể User (id, ho_ten, username, password_hash, vai_tro, trang_thai, phien_ban_token, totp_khoa, totp_buoc_cuoi, totp_ma_du_phong).']],
  ['Tạo và chốt đơn hàng', [
    '**Đối tượng:** Sale, Giao diện Tạo đơn, DonHangController, DonHangService, DonHangRepository, ThongBaoService, PostgreSQL.',
    '**Thông điệp:** 1 nhập đơn, bấm Chốt → 2 POST /api/don-hang (chot=true) → 3 taoDonHang() → 4 kiemTraDuDeChot() → 5 BEGIN → 6 create(don, vật tư) → 7 ghiLichSuGiaiDoan("Chốt đơn") → 8 chonVanHanhItViec() [pg_advisory_xact_lock] → 9 ganVanHanh() + ghi phân công → 10 ThongBaoService.giaoDon() → 11 COMMIT → 12 trả đơn.',
    '**Nhánh alt:** thiếu thông tin → 400 liệt kê phần thiếu; không có vận hành → đơn chưa phân công.',
  ], ['**Lớp:** DonHangController; DonHangService (taoDonHang, chuyenGiaiDoan, bocKhoiLuong, doiPhuTrach, damBaoPhuTrach); DonHangRepository; ThongBaoService (gui, giaoDon, tienDoDon); thực thể DonHang, DonHangVatTu, KhachHang, User, DonHangPhanCongLog, DonHangGiaiDoanLog.']],
  ['Đặt hàng NCC và NCC phản hồi', [
    '**Đối tượng:** Vận hành, Giao diện Mua hàng, MuaHangService, MuaHangRepository, CongNoService, Telegram Bot API, Nhà cung cấp, PostgreSQL.',
    '**Thông điệp:** 1 bấm Đặt hàng → 2 POST /api/mua-hang/don/:id/dat-hang → 3 datHang(): khoá đơn, lấy dòng "Đã chọn NCC", tạo dat_hang_ncc, chuyển dòng "Đã đặt" → 4 sendMessage (đơn đặt hàng + 2 nút) → 5 NCC bấm "Cho xuất hàng" → 6 callback_query → 7 kiểm tra nhóm, tin nhắn → 8 ghiPhanHoiNcc(): dòng → Sẵn hàng → 9 CongNoService.taoQuyetToanNcc() → 10 gửi đề xuất (ảnh QR) vào nhóm duyệt chi → 11 sửa tin nhóm NCC "Đã xác nhận".',
    '**Nhánh alt:** NCC bấm "Yêu cầu cọc" → bot hỏi số tiền (ForceReply) → NCC trả lời → taoCocTuNcc() → dòng "Chờ cọc".',
  ], ['**Lớp:** MuaHangController; MuaHangService (capNhatDong, datHang, phanHoiNccWeb, huyDatHang, xuLyTelegramNcc, luiSanHang); MuaHangRepository; TelegramClient (guiDatHangNcc, hoiSoTienCoc); TelegramRouter (xuLyUpdate); thực thể MuaHangDong, DatHangNcc, NhaCungCap, NccBangGia, DeXuatChi.']],
  ['Duyệt đề xuất chi qua Telegram', [
    '**Đối tượng:** Người duyệt chi, Telegram Bot API, TelegramRouter, CongNoService, CongNoRepository, ThongBaoService, PostgreSQL.',
    '**Thông điệp:** 1 bấm "Duyệt" trên ảnh QR → 2 Telegram gửi callback_query (webhook có secret header hoặc long polling) → 3 xuLyUpdate() → 4 kiểm tra đúng nhóm duyệt, đúng tin nhắn, người có quyền → 5 xuLyDuyet(): BEGIN, UPDATE … WHERE trang_thai = \'cho_duyet\', ghi nhật ký duyệt, thông báo Kế toán, COMMIT → 6 editMessageCaption: "Đã duyệt" + nút "Đã chi" → 7 answerCallbackQuery.',
    '**Nhánh alt:** đã được xử lý trước đó → không cập nhật; người không có quyền → từ chối.',
  ], ['**Lớp:** TelegramRouter; TelegramClient (guiDeXuatChi, capNhatTinNhan, nutDaChi); CongNoService (taoDeXuat, xuLyDuyet, xuLyUpdateTelegram); CongNoRepository; thực thể DeXuatChi, DeXuatChiDuyetLog, ThongBao.']],
  ['Xác nhận đã chi', [
    '**Đối tượng:** Kế toán, Telegram Bot API (hoặc Giao diện Công nợ), CongNoService, LuuAnh, MuaHangRepository, PostgreSQL.',
    '**Thông điệp:** 1 bấm "Đã chi – gửi ảnh bill" → 2 bot hỏi ảnh (ForceReply) → 3 Kế toán trả lời bằng ảnh → 4 xuLyAnhBill(): kiểm tra Kế toán đã gắn Telegram → 5 getFile, tải ảnh → 6 daChi(): luuAnhBase64 (kiểm tra magic bytes) → BEGIN → tạo phieu_thanh_toan → trạng thái "Đã chi" → [nếu cọc] dòng Chờ cọc → Sẵn hàng, taoQuyetToanNcc() → COMMIT → 7 sửa tin "Đã chi", bỏ nút → 8 báo nhóm NCC "đã chuyển cọc".',
    '**Nhánh alt:** không phải ảnh / không đúng Kế toán → báo lỗi trong nhóm; tiền ra khớp sao kê ngân hàng → NganHangService gọi daChi(null, id, { giaoDichId }) không cần ảnh bill.',
  ], ['**Lớp:** CongNoService (daChi, xuLyAnhBill, sauKhiChiCoc, taoQuyetToanNcc); LuuAnh (luuAnhBase64, duongDanAnh); TelegramClient (hoiAnhBill, taiFile); thực thể DeXuatChi, PhieuThanhToan, DatHangNcc, MuaHangDong, GiaoDichTho.']],
  ['Thi công – nghiệm thu – quyết toán', [
    '**Đối tượng:** Vận hành, Giao diện Thi công, ThiCongService, ThiCongRepository, DonHangService, PostgreSQL.',
    '**Thông điệp:** 1 lập giai đoạn → 2 POST /api/thi-cong → 3 kiểm tra trùng lịch đội thợ → 4 bắt đầu → tuDongChuyenBuoc(giao_hang → thi_cong) → 5 báo xong giai đoạn cuối → tuDongChuyenBuoc(thi_cong → nghiem_thu) → 6 lưu số lượng thực tế → 7 xác nhận nghiệm thu → tuDongChuyenBuoc(nghiem_thu → quyet_toan) → 8 chốt quyết toán: lưu giá trị, ghiPhaiTraTho(), → hoàn tất.',
    '**Nhánh alt:** hao hụt > 10% → cảnh báo; đội thợ trùng lịch → yêu cầu xác nhận.',
  ], ['**Lớp:** ThiCongController; ThiCongService (lapGiaiDoan, batDau, baoXong, luuNghiemThu, xacNhanNghiemThu, themPhatSinh, chotQuyetToan); ThiCongRepository; DonHangService (tuDongChuyenBuoc); thực thể ThiCong, DoiTho, PhatSinhThiCong, GiaoDichTho, DonHangVatTu.']],
  ['Ghi nhận và xác nhận thanh toán của khách', [
    '**Đối tượng:** Sale, Kế toán, Giao diện Chi tiết đơn, ThuTienService, ThongBaoService, PostgreSQL.',
    '**Thông điệp:** 1 Sale xem QR thu tiền (GET /api/thu-tien/don/:id) → 2 ghi nhận thanh toán + ảnh bill (POST /api/thu-tien) → 3 tao(): kiểm tra quyền theo đơn, BEGIN, khoá đơn, kiểm tra không vượt số còn phải thu, INSERT phiếu "Chờ xác nhận", thông báo Kế toán, COMMIT → 4 Kế toán bấm "Đã nhận tiền" (POST /api/thu-tien/:id/xac-nhan) → 5 cập nhật phiếu, view v_don_hang_tien tính lại còn phải thu → 6 thông báo Sale.',
    '**Nhánh alt:** Kế toán "Chưa thấy tiền" → ghi lý do, báo người ghi nhận; tiền về có mã đơn → webhook ngân hàng tự xác nhận phiếu (xem chức năng Đối soát).',
  ], ['**Lớp:** ThuTienService (tomTat, theoDon, tao, xacNhan, tuChoi, congNo); LuuAnh; ThongBaoService; thực thể ThanhToanKhach, DonHang, view VDonHangTien.']],
  ['Nhập số và chia số theo tỷ lệ', [
    '**Đối tượng:** Admin (hoặc Website qua API), Giao diện Nhập số, NhapSoRoutes, NhapSoService, ThongBaoService, PostgreSQL.',
    '**Thông điệp:** 1 dán danh sách số, bấm Nhập → 2 POST /api/nhap-so { ds } (API: POST /api/nhap-so/tu-dong + X-Api-Key) → 3 nhap() → 4 BEGIN, pg_advisory_xact_lock("chia_so") → 5 [mỗi dòng] chuanHoaSdt() → 6 SELECT khách trùng số → 7 chonSale(): ORDER BY (đã chia trong tháng + 1) / tỷ lệ → 8 INSERT khach_hang, chia_so_log → 9 ThongBaoService.gui(Sale) → 10 COMMIT → 11 trả kết quả từng dòng.',
    '**Nhánh alt:** số trùng → bỏ qua, báo Sale đang giữ; số sai → báo lỗi dòng; Sale nhập → giao chính Sale; Admin chọn Sale → giao thẳng (kiểu admin_chon).',
  ], ['**Lớp:** NhapSoService (nhap, chuanHoaSdt, chonSale, chuyenSale, tyLe, luuTyLe, ganDay, lichSuGiao); middleware khoaApi (so sánh thời gian hằng); ThongBaoService; thực thể KhachHang, TyLeChiaSo, ChiaSoLog, User.']],
  ['Đối soát giao dịch ngân hàng', [
    '**Đối tượng:** Ngân hàng (SePay), NganHangRoutes, NganHangService, CongNoService, ThongBaoService, PostgreSQL.',
    '**Thông điệp:** 1 webhook POST /api/ngan-hang/webhook (Authorization: Apikey) → 2 khoaWebhook() → 3 xuLyGiaoDich(): tuSepay() chuẩn hoá → 4 kiểm tra mã giao dịch đã có → 5 [tiền vào] BEGIN → INSERT giao_dich_ngan_hang → timMaDon(nội dung) → SELECT đơn FOR UPDATE → có phiếu chờ đúng số tiền: UPDATE phiếu đã xác nhận / không: INSERT phiếu đã xác nhận → cập nhật giao dịch "Đã khớp" → thông báo → COMMIT → 6 [tiền ra] tìm đề xuất đã duyệt khớp nội dung + số tiền → CongNoService.daChi(null, id, { giaoDichId }) → giao dịch "Đã khớp" → 7 trả { success: true }.',
    '**Nhánh alt:** không có mã đơn / vượt số còn phải thu / không khớp đề xuất → "Chưa khớp", thông báo Kế toán; Kế toán khopTay() hoặc boQua().',
  ], ['**Lớp:** NganHangService (xuLyGiaoDich, timMaDon, khopTienVao, khopTay, boQua, giaLap, danhSach); CongNoService (daChi); ThongBaoService; thực thể GiaoDichNganHang, ThanhToanKhach, DeXuatChi, PhieuThanhToan, DonHang.']],
];
SO_DO.forEach(([ten, td, lop], i) => {
  H4(`2.8.1.${i + 1}. Chức năng "${ten}"`);
  ChoHinh(`Biểu đồ trình tự chức năng ${ten}`, td);
  ChoHinh(`Biểu đồ lớp chức năng ${ten}`, lop);
});

// ---------- 2.8.2 CSDL: sinh tu CSDL that ----------
H3('2.8.2. Thiết kế cơ sở dữ liệu');
P('Cơ sở dữ liệu PostgreSQL gồm 35 bảng nghiệp vụ, một view và 18 trigger (3 hàm trigger), chia theo phân hệ: người dùng và thông báo; nhập số và chia số; khách hàng và đơn hàng; vật tư, NCC và bảng giá; mua hàng; thi công; chi tiền và công nợ; thu tiền khách và đối soát ngân hàng; quản trị hệ thống. Các trường trạng thái dùng kiểu ENUM hoặc ràng buộc CHECK để giá trị sai không thể lưu vào CSDL. Cấu trúc được quản lý bằng tệp schema.sql và các tệp migration đánh số.');
H4('2.8.2.1. Thiết kế bảng cơ sở dữ liệu');
const MO_TA_BANG = {
  users: 'Tài khoản người dùng', thong_bao: 'Thông báo trong hệ thống', khach_hang: 'Khách hàng', khach_hang_cham_soc: 'Nhật ký chăm sóc khách hàng',
  don_hang: 'Đơn hàng', don_hang_vat_tu: 'Vật tư của đơn hàng', don_hang_giai_doan_log: 'Lịch sử chuyển bước tiến độ', don_hang_phan_cong_log: 'Lịch sử phân công vận hành',
  don_hang_yeu_cau_sua: 'Yêu cầu chỉnh sửa đơn', loai_vat_tu: 'Loại vật tư', vat_tu: 'Vật tư', nha_cung_cap: 'Nhà cung cấp', ncc_stk: 'Tài khoản ngân hàng NCC',
  ncc_bang_gia: 'Bảng giá NCC theo thời gian', mua_hang_dong: 'Dòng mua hàng (mỗi vật tư mua ngoài của đơn)', dat_hang_ncc: 'Đơn đặt hàng gửi NCC',
  mua_bo_sung: 'Phiếu mua bổ sung', mua_bo_sung_dong: 'Vật tư mua bổ sung', mua_bo_sung_trach_nhiem: 'Phân chia trách nhiệm chi phí mua bổ sung',
  doi_tho: 'Đội thợ thi công', thi_cong: 'Giai đoạn thi công', phat_sinh_thi_cong: 'Phát sinh thi công', giao_dich_tho: 'Sổ công nợ đội thợ',
  de_xuat_chi: 'Đề xuất chi', de_xuat_chi_dong: 'Dòng vật tư trong đề xuất quyết toán', de_xuat_chi_duyet_log: 'Nhật ký duyệt đề xuất chi',
  phieu_thanh_toan: 'Phiếu thanh toán (đã chi)', thanh_toan_khach: 'Phiếu thu tiền khách hàng',
  ty_le_chia_so: 'Tỷ lệ chia số khách tiềm năng cho Sale', chia_so_log: 'Nhật ký nhập, chia và chuyển số', giao_dich_ngan_hang: 'Giao dịch ngân hàng (đối soát)',
  quyen: 'Danh mục quyền chức năng', vai_tro_quyen: 'Phân quyền vai trò – chức năng', cau_hinh: 'Tham số nghiệp vụ', nhat_ky_thay_doi: 'Nhật ký thay đổi dữ liệu',
};
const NHOM = [
  ['Người dùng và thông báo', ['users', 'thong_bao']],
  ['Nhập số và chia số', ['ty_le_chia_so', 'chia_so_log']],
  ['Khách hàng và đơn hàng', ['khach_hang', 'khach_hang_cham_soc', 'don_hang', 'don_hang_vat_tu', 'don_hang_giai_doan_log', 'don_hang_phan_cong_log', 'don_hang_yeu_cau_sua']],
  ['Vật tư, nhà cung cấp, bảng giá', ['loai_vat_tu', 'vat_tu', 'nha_cung_cap', 'ncc_stk', 'ncc_bang_gia']],
  ['Mua hàng', ['mua_hang_dong', 'dat_hang_ncc', 'mua_bo_sung', 'mua_bo_sung_dong', 'mua_bo_sung_trach_nhiem']],
  ['Thi công', ['doi_tho', 'thi_cong', 'phat_sinh_thi_cong', 'giao_dich_tho']],
  ['Chi tiền và công nợ', ['de_xuat_chi', 'de_xuat_chi_dong', 'de_xuat_chi_duyet_log', 'phieu_thanh_toan']],
  ['Thu tiền khách hàng và đối soát ngân hàng', ['thanh_toan_khach', 'giao_dich_ngan_hang']],
  ['Quản trị hệ thống', ['quyen', 'vai_tro_quyen', 'cau_hinh', 'nhat_ky_thay_doi']],
];
// Mo ta cot: theo ten chung + rieng theo bang
const COT_CHUNG = {
  id: 'Khoá chính', created_at: 'Thời điểm tạo', ghi_chu: 'Ghi chú', ten: 'Tên', sdt: 'Số điện thoại', dia_chi: 'Địa chỉ', ly_do: 'Lý do', noi_dung: 'Nội dung',
  so_tien: 'Số tiền', don_gia: 'Đơn giá', so_luong: 'Số lượng', vat_pct: 'Thuế VAT (%)', thanh_tien: 'Thành tiền', so_tk: 'Số tài khoản', ten_ngan_hang: 'Tên ngân hàng', chu_tk: 'Chủ tài khoản',
  don_hang_id: 'Đơn hàng', ncc_id: 'Nhà cung cấp', vat_tu_id: 'Vật tư', nguoi_tao_id: 'Người tạo', nguoi_id: 'Người thực hiện', sale_id: 'Sale', doi_tho_id: 'Đội thợ', thi_cong_id: 'Giai đoạn thi công',
  bill_anh: 'Đường dẫn ảnh bill (uploads/...)', noi_dung_ck: 'Nội dung chuyển khoản do hệ thống sinh', ly_do_tu_choi: 'Lý do từ chối', trang_thai: 'Trạng thái',
};
const COT_RIENG = {
  'users.ho_ten': 'Họ tên', 'users.username': 'Tên đăng nhập', 'users.password_hash': 'Mật khẩu băm bcrypt', 'users.vai_tro': 'Vai trò', 'users.phien_ban_token': 'Tăng khi khoá / đổi vai trò / đổi mật khẩu để thu hồi token cũ',
  'users.doi_mat_khau_luc': 'Lần đổi mật khẩu gần nhất', 'users.telegram_username': 'Tài khoản Telegram gắn với người dùng (duyệt / chi qua Telegram)',
  'thong_bao.nguoi_nhan_id': 'Người nhận', 'thong_bao.nguoi_gay_id': 'Người gây ra sự kiện (NULL = hệ thống / Telegram)', 'thong_bao.loai': 'Loại sự kiện', 'thong_bao.tieu_de': 'Tiêu đề', 'thong_bao.link': 'Đường dẫn trong ứng dụng (theo vai trò người nhận)', 'thong_bao.da_doc_luc': 'Thời điểm đọc (NULL = chưa đọc)',
  'khach_hang.sale_phu_trach_id': 'Sale phụ trách', 'khach_hang.nhom_khach_hang': 'Nhóm khách', 'khach_hang.trang_thai_cham_soc': 'Trạng thái chăm sóc',
  'khach_hang_cham_soc.khach_hang_id': 'Khách hàng', 'khach_hang_cham_soc.trang_thai': 'Trạng thái chăm sóc tại thời điểm ghi',
  'don_hang.ma_don': 'Mã đơn (DH-YYMM-NNN)', 'don_hang.khach_hang_id': 'Khách hàng', 'don_hang.sale_id': 'Sale tạo đơn', 'don_hang.vanhanh_phu_trach_id': 'Vận hành phụ trách', 'don_hang.trang_thai': 'Trạng thái chung (nháp, mới, đang xử lý, hoàn tất, huỷ)',
  'don_hang.giai_doan': 'Bước tiến độ (NULL khi là nháp)', 'don_hang.hinh_thuc': 'Vật tư / Hoàn thiện', 'don_hang.ma_hop_dong': 'Mã hợp đồng', 'don_hang.ngay_chot': 'Ngày chốt', 'don_hang.ngay_yc_lap_dat': 'Ngày khách yêu cầu lắp đặt / giao',
  'don_hang.tinh_thanh': 'Tỉnh / thành', 'don_hang.phuong_xa': 'Phường / xã', 'don_hang.dia_chi_cong_trinh': 'Địa chỉ công trình', 'don_hang.phi_van_chuyen': 'Phí vận chuyển thu khách', 'don_hang.phu_thu': 'Phụ thu', 'don_hang.chiet_khau_pct': 'Chiết khấu (%)',
  'don_hang.tien_coc': 'Tiền cọc lúc chốt', 'don_hang.ngay_coc': 'Ngày cọc', 'don_hang.ty_le_tam_ung': 'Tỷ lệ tạm ứng trước giao hàng (%)', 'don_hang.dieu_khoan_nghiem_thu': 'Điều khoản nghiệm thu', 'don_hang.ghi_chu_van_chuyen': 'Ghi chú vận chuyển',
  'don_hang.phuong_an_van_chuyen': 'Phương án vận chuyển', 'don_hang.phuong_an_thi_cong': 'Phương án thi công', 'don_hang.bao_gia_token': 'Mã link báo giá công khai', 'don_hang.bao_gia_tao_luc': 'Thời điểm tạo link báo giá',
  'don_hang.nghiem_thu_luc': 'Thời điểm xác nhận nghiệm thu', 'don_hang.nguoi_nghiem_thu_id': 'Người xác nhận nghiệm thu', 'don_hang.gia_tri_quyet_toan': 'Giá trị chốt quyết toán', 'don_hang.quyet_toan_luc': 'Thời điểm chốt quyết toán', 'don_hang.nguoi_quyet_toan_id': 'Người chốt quyết toán',
  'don_hang.boc_khoi_luong_luc': 'Thời điểm xác nhận khối lượng', 'don_hang.nguoi_boc_khoi_luong_id': 'Người xác nhận khối lượng',
  'don_hang_vat_tu.so_luong_can': 'Số lượng theo đơn / sau bóc khối lượng', 'don_hang_vat_tu.don_gia': 'Đơn giá bán', 'don_hang_vat_tu.loai_thi_cong': 'Kiểu thi công', 'don_hang_vat_tu.dai_mm': 'Chiều dài (mm)', 'don_hang_vat_tu.rong_mm': 'Chiều rộng (mm)', 'don_hang_vat_tu.so_luong_thuc_te': 'Số lượng thực tế khi nghiệm thu',
  'don_hang_giai_doan_log.tu_giai_doan': 'Bước trước', 'don_hang_giai_doan_log.den_giai_doan': 'Bước sau',
  'don_hang_phan_cong_log.tu_van_hanh_id': 'Vận hành cũ (NULL = phân lần đầu)', 'don_hang_phan_cong_log.den_van_hanh_id': 'Vận hành mới', 'don_hang_phan_cong_log.nguoi_id': 'Người chuyển (NULL = hệ thống tự phân)',
  'don_hang_yeu_cau_sua.sale_id': 'Sale gửi yêu cầu',
  'loai_vat_tu.nguon_goc': 'Tự sản xuất / mua ngoài', 'vat_tu.loai_vat_tu_id': 'Loại vật tư', 'vat_tu.don_vi_tinh': 'Đơn vị tính', 'vat_tu.quy_cach': 'Quy cách',
  'nha_cung_cap.ma_so_thue': 'Mã số thuế', 'ncc_bang_gia.ngay_hieu_luc': 'Ngày bắt đầu hiệu lực', 'ncc_bang_gia.ngay_het_hieu_luc': 'Ngày hết hiệu lực (NULL = đang áp dụng)',
  'mua_hang_dong.don_hang_vat_tu_id': 'Dòng vật tư của đơn', 'mua_hang_dong.gia_chot': 'Giá NCC chụp lại lúc chọn', 'mua_hang_dong.nguoi_cap_nhat_id': 'Người cập nhật', 'mua_hang_dong.cap_nhat_luc': 'Thời điểm cập nhật', 'mua_hang_dong.dat_hang_ncc_id': 'Đơn đặt hàng chứa dòng này',
  'dat_hang_ncc.nguoi_dat_id': 'Người đặt hàng', 'dat_hang_ncc.noi_dung': 'Văn bản đơn đặt hàng gửi NCC', 'dat_hang_ncc.tong_tien': 'Tiền hàng gồm VAT lúc đặt', 'dat_hang_ncc.so_tien_coc': 'Số tiền cọc NCC yêu cầu', 'dat_hang_ncc.de_xuat_chi_id': 'Đề xuất cọc sinh ra',
  'dat_hang_ncc.phan_hoi_qua': 'Kênh phản hồi (web / telegram)', 'dat_hang_ncc.nguoi_phan_hoi': 'Người phản hồi', 'dat_hang_ncc.phan_hoi_luc': 'Thời điểm phản hồi', 'dat_hang_ncc.tg_chat_id': 'Nhóm Telegram NCC', 'dat_hang_ncc.tg_message_id': 'Tin nhắn đơn đặt hàng', 'dat_hang_ncc.tg_hoi_coc_message_id': 'Tin bot hỏi số tiền cọc',
  'mua_bo_sung.loai_phat_sinh': 'Loại phát sinh', 'mua_bo_sung.ngay_mua': 'Ngày mua', 'mua_bo_sung_dong.mua_bo_sung_id': 'Phiếu mua bổ sung', 'mua_bo_sung_trach_nhiem.mua_bo_sung_id': 'Phiếu mua bổ sung', 'mua_bo_sung_trach_nhiem.nguon': 'Nguồn trách nhiệm',
  'doi_tho.nang_luc': 'Năng lực thi công', 'thi_cong.nguoi_phu_trach_id': 'Người lập', 'thi_cong.ten_giai_doan': 'Tên giai đoạn', 'thi_cong.don_vi_cong': 'Đơn vị tính công', 'thi_cong.gia_cong': 'Giá công', 'thi_cong.kl_du_kien': 'Khối lượng dự kiến', 'thi_cong.kl_thuc_te': 'Khối lượng thực tế',
  'thi_cong.ngay_du_kien': 'Ngày dự kiến', 'thi_cong.ngay_thuc_hien': 'Ngày bắt đầu', 'thi_cong.ngay_hoan_thanh': 'Ngày báo xong',
  'phat_sinh_thi_cong.loai': 'Phát sinh / phụ thu / giảm trừ / thợ thu hộ', 'giao_dich_tho.loai': 'Phải trả / đã trả / tạm ứng', 'giao_dich_tho.de_xuat_chi_id': 'Đề xuất chi liên quan', 'giao_dich_tho.phat_sinh_id': 'Phát sinh liên quan',
  'de_xuat_chi.loai_chi': 'Cọc / quyết toán / chi bổ sung / trả công / ứng công', 'de_xuat_chi.mua_bo_sung_id': 'Phiếu mua bổ sung', 'de_xuat_chi.gia_tri_hang': 'Tiền hàng gồm VAT (quyết toán)', 'de_xuat_chi.coc_da_tru': 'Cọc đã trừ', 'de_xuat_chi.telegram_message_id': 'Tin nhắn trong nhóm duyệt chi', 'de_xuat_chi.telegram_chat_id': 'Nhóm duyệt chi', 'de_xuat_chi.tg_hoi_bill_message_id': 'Tin bot hỏi ảnh bill',
  'de_xuat_chi_dong.de_xuat_chi_id': 'Đề xuất quyết toán', 'de_xuat_chi_dong.mua_hang_dong_id': 'Dòng mua hàng được quyết toán', 'de_xuat_chi_duyet_log.de_xuat_chi_id': 'Đề xuất chi', 'de_xuat_chi_duyet_log.telegram_user': '@username Telegram hoặc web:<họ tên>', 'de_xuat_chi_duyet_log.nguoi_id': 'Người duyệt (nếu có tài khoản)', 'de_xuat_chi_duyet_log.hanh_dong': 'Duyệt / từ chối', 'de_xuat_chi_duyet_log.thoi_gian': 'Thời điểm',
  'phieu_thanh_toan.de_xuat_chi_id': 'Đề xuất chi', 'phieu_thanh_toan.ma_qr': 'Link QR VietQR', 'phieu_thanh_toan.ngay_thanh_toan': 'Ngày chi',
  'users.totp_khoa': 'Khoá xác thực hai lớp đã mã hoá AES-256-GCM (NULL = chưa bật)', 'users.totp_bat_luc': 'Thời điểm bật xác thực hai lớp', 'users.totp_buoc_cuoi': 'Bước thời gian của mã đã dùng gần nhất (chống dùng lại mã)', 'users.totp_ma_du_phong': 'Hash bcrypt của các mã dự phòng còn lại',
  'khach_hang.nguon': 'Nguồn số (Facebook, Zalo, website, Sale tự tìm...)', 'khach_hang.nhu_cau': 'Nhu cầu khách để lại', 'khach_hang.nguoi_nhap_id': 'Người nhập số (NULL = API tự động)', 'khach_hang.chia_luc': 'Thời điểm số được giao cho Sale',
  'ty_le_chia_so.sale_id': 'Sale (khoá chính)', 'ty_le_chia_so.ty_le': 'Tỷ lệ chia (%) — tổng các Sale bằng 100', 'ty_le_chia_so.nguoi_cap_nhat_id': 'Admin cập nhật', 'ty_le_chia_so.cap_nhat_luc': 'Thời điểm cập nhật',
  'chia_so_log.khach_hang_id': 'Khách (số)', 'chia_so_log.sale_id': 'Sale nhận', 'chia_so_log.kieu': 'Chia theo tỷ lệ / Sale tự nhập / Admin chọn / chuyển', 'chia_so_log.kenh': 'Form / API', 'chia_so_log.nguoi_nhap_id': 'Người nhập hoặc chuyển', 'chia_so_log.tu_sale_id': 'Sale cũ (khi chuyển)',
  'giao_dich_ngan_hang.nguon': 'SePay / giả lập', 'giao_dich_ngan_hang.ma_gd_ngoai': 'Mã giao dịch của dịch vụ ngân hàng', 'giao_dich_ngan_hang.ngan_hang': 'Ngân hàng', 'giao_dich_ngan_hang.loai': 'Tiền vào / tiền ra', 'giao_dich_ngan_hang.noi_dung': 'Nội dung chuyển khoản', 'giao_dich_ngan_hang.ma_tham_chieu': 'Mã tham chiếu ngân hàng',
  'giao_dich_ngan_hang.thoi_gian_gd': 'Thời điểm giao dịch', 'giao_dich_ngan_hang.cach_khop': 'Tự xác nhận phiếu / tự tạo phiếu / tự ghi đã chi / khớp tay', 'giao_dich_ngan_hang.thanh_toan_khach_id': 'Phiếu thu được khớp', 'giao_dich_ngan_hang.de_xuat_chi_id': 'Đề xuất chi được khớp', 'giao_dich_ngan_hang.nguoi_xu_ly_id': 'Kế toán xử lý tay', 'giao_dich_ngan_hang.du_lieu_goc': 'Dữ liệu webhook gốc (JSONB)',
  'quyen.ma': 'Mã quyền (khoá chính), vd chi.duyet', 'quyen.nhom': 'Nhóm chức năng', 'quyen.thu_tu': 'Thứ tự hiển thị', 'quyen.chi_admin': 'Quyền chỉ dành cho Admin', 'vai_tro_quyen.vai_tro': 'Vai trò', 'vai_tro_quyen.ma_quyen': 'Quyền được gán',
  'cau_hinh.khoa': 'Mã tham số (khoá chính)', 'cau_hinh.gia_tri': 'Giá trị', 'cau_hinh.mo_ta': 'Mô tả', 'cau_hinh.don_vi': 'Đơn vị', 'cau_hinh.toi_thieu': 'Giá trị nhỏ nhất cho phép', 'cau_hinh.toi_da': 'Giá trị lớn nhất cho phép', 'cau_hinh.nguoi_cap_nhat_id': 'Người cập nhật', 'cau_hinh.cap_nhat_luc': 'Thời điểm cập nhật',
  'nhat_ky_thay_doi.bang': 'Bảng bị thay đổi', 'nhat_ky_thay_doi.ban_ghi': 'Khoá chính của dòng', 'nhat_ky_thay_doi.hanh_dong': 'INSERT / UPDATE / DELETE', 'nhat_ky_thay_doi.du_lieu_cu': 'Giá trị cũ của các cột thay đổi (JSONB)', 'nhat_ky_thay_doi.du_lieu_moi': 'Giá trị mới của các cột thay đổi (JSONB)', 'nhat_ky_thay_doi.nguoi_id': 'Người thao tác', 'nhat_ky_thay_doi.kenh': 'Web / Telegram / API / ngân hàng', 'nhat_ky_thay_doi.thoi_gian': 'Thời điểm',
  'thanh_toan_khach.giao_dich_id': 'Giao dịch ngân hàng đã đối soát (thay ảnh bill và người xác nhận)',
  'thanh_toan_khach.loai': 'Tạm ứng / quyết toán / khác', 'thanh_toan_khach.hinh_thuc': 'Chuyển khoản / tiền mặt', 'thanh_toan_khach.ngay_thu': 'Ngày khách trả', 'thanh_toan_khach.nguoi_xac_nhan_id': 'Kế toán xác nhận', 'thanh_toan_khach.xac_nhan_luc': 'Thời điểm xác nhận',
};
const arr = (v) => (Array.isArray(v) ? v : String(v || '').replace(/^\{|\}$/g, '').split(',').filter(Boolean).map((x) => x.replace(/^"|"$/g, '')));
const enumGT = Object.fromEntries(schema.en.map((e) => [e.typname, arr(e.v)]));
function kieu(c) {
  const serial = /^nextval/.test(c.column_default || '');
  if (serial) return c.data_type === 'bigint' ? 'BIGSERIAL' : 'SERIAL';
  switch (c.data_type) {
    case 'USER-DEFINED': return c.udt_name;
    case 'character varying': return `VARCHAR(${c.character_maximum_length})`;
    case 'numeric': return `NUMERIC(${c.numeric_precision},${c.numeric_scale})`;
    case 'timestamp with time zone': return 'TIMESTAMPTZ';
    case 'integer': return 'INTEGER'; case 'smallint': return 'SMALLINT'; case 'bigint': return 'BIGINT';
    case 'text': return 'TEXT'; case 'date': return 'DATE'; case 'boolean': return 'BOOLEAN'; case 'jsonb': return 'JSONB';
    case 'ARRAY': return `${c.udt_name.replace(/^_/, '').toUpperCase()}[]`;
    default: return c.data_type.toUpperCase();
  }
}
// CHECK 1 cot -> loi de doc (thay vi cu phap SQL).
function moTaCheck(def) {
  const giaTri = [...def.matchAll(/'([^']+)'/g)].map((m) => m[1]);
  if (/ANY \(/.test(def) && giaTri.length) return `Chỉ nhận: ${giaTri.join(', ')}`;
  if (/length\(TRIM/.test(def)) return 'Không được để trống';
  const khoang = /(\w+) >= \(?(\d+)\)?(?:::\w+)?\)? AND \(\1 <= \(?(\d+)\)?/.exec(def);
  if (khoang) return `Từ ${khoang[2]} đến ${khoang[3]}`;
  const ss = /\(\(?(\w+) (>=|>|<=|<) \(?(\d+)\)?/.exec(def);
  if (ss) return `${{ '>=': '≥', '>': '>', '<=': '≤', '<': '<' }[ss[2]]} ${ss[3]}`;
  return def.replace(/::[\w ]+(\[\])?/g, '');
}
const RANG_BUOC = {
  ck_don_hang_giai_doan: 'Đơn nháp thì chưa có bước tiến độ; đơn đã chốt bắt buộc có bước tiến độ.',
  ck_don_hang_giai_doan_vat_tu: 'Đơn chỉ bán vật tư không được ở các bước Bóc khối lượng, Thi công, Nghiệm thu.',
  ck_bang_gia_khoang_ngay: 'Ngày hết hiệu lực (nếu có) phải không trước ngày hiệu lực.',
  ex_bang_gia_khong_chong: 'Ràng buộc EXCLUDE (chỉ mục GiST): cùng một NCC và vật tư, các khoảng thời gian hiệu lực của giá không được chồng lên nhau — luôn chỉ có một giá đang áp dụng.',
  ck_mhd_da_dat_co_ncc: 'Từ trạng thái "Đã đặt" trở đi bắt buộc đã chọn NCC và có giá chốt.',
  ck_mbs_da_mua: 'Phiếu "Đã mua" bắt buộc có NCC và ngày mua.',
  ck_thi_cong_moc: 'Mốc thời gian khớp trạng thái: lập lịch thì chưa có ngày bắt đầu/hoàn thành; đang thi công phải có ngày bắt đầu; đã xong phải có ngày hoàn thành.',
  ck_thu_ho_co_tho: 'Phát sinh "thợ thu hộ" phải gắn với một giai đoạn thi công (biết đội thợ nào thu).',
  ck_dxc_doi_tuong: 'Cọc, quyết toán, chi bổ sung phải chi cho NCC (không có đội thợ); trả công, ứng công phải chi cho đội thợ (không có NCC).',
  ck_ttk_bill: 'Phiếu thu chuyển khoản bắt buộc có ảnh bill, hoặc được đối soát với một giao dịch ngân hàng.',
  ck_ttk_xac_nhan: 'Phiếu "Đã xác nhận" bắt buộc có thời điểm xác nhận và người xác nhận (hoặc giao dịch ngân hàng tự xác nhận).',
  ck_users_totp: 'Khoá xác thực hai lớp và thời điểm bật luôn cùng có hoặc cùng không.',
  chia_so_log_chuyen_check: 'Lần chuyển số bắt buộc ghi Sale cũ và lý do.',
  ck_gd_da_khop: 'Giao dịch "Đã khớp" bắt buộc ghi cách khớp.',
  ck_gd_bo_qua: 'Giao dịch "Bỏ qua" bắt buộc có ghi chú lý do.',
  cau_hinh_check: 'Giá trị không nhỏ hơn mức tối thiểu (nếu có).',
  cau_hinh_check1: 'Giá trị không lớn hơn mức tối đa (nếu có).',
  ck_ttk_tu_choi: 'Phiếu bị từ chối bắt buộc có lý do.',
  ck_dhn_coc: 'Đơn đặt hàng ở trạng thái "Chờ cọc" bắt buộc có số tiền cọc.',
};
for (const [tenNhom, ds] of NHOM) {
  P(`**Phân hệ ${tenNhom}.**`);
  for (const b of ds) {
    const cot = schema.cot.filter((c) => c.table_name === b);
    const rb = schema.rb.filter((r) => r.bang === b);
    const rows = cot.map((c) => {
      const ghi = [];
      const pk = rb.find((r) => r.contype === 'p' && arr(r.cols).includes(c.column_name));
      const fk = rb.find((r) => r.contype === 'f' && arr(r.cols).length === 1 && arr(r.cols)[0] === c.column_name);
      const uq = rb.find((r) => r.contype === 'u' && arr(r.cols).length === 1 && arr(r.cols)[0] === c.column_name);
      const moTa = COT_RIENG[`${b}.${c.column_name}`] || COT_CHUNG[c.column_name];
      if (pk) ghi.push('Khoá chính');
      else if (moTa) ghi.push(moTa);
      if (fk) ghi.push(`FK → ${/REFERENCES (\w+)\((\w+)\)/.exec(fk.def)?.slice(1).join('.') || ''}`);
      if (uq) ghi.push('Duy nhất');
      if (c.data_type === 'USER-DEFINED' && enumGT[c.udt_name]) ghi.push(`Giá trị: ${enumGT[c.udt_name].join(', ')}`);
      const chk = rb.filter((r) => r.contype === 'c' && arr(r.cols).length === 1 && arr(r.cols)[0] === c.column_name).map((r) => moTaCheck(r.def));
      if (chk.length) ghi.push(chk.join('; '));
      return [c.column_name, kieu(c), c.is_nullable === 'YES' ? 'Có' : 'Không', ghi.join('. ')];
    });
    Bang(`Bảng ${b} — ${MO_TA_BANG[b]}`, ['Tên cột', 'Kiểu dữ liệu', 'Null', 'Ghi chú'], rows, [24, 20, 8, 48]);
    // rang buoc nhieu cot (CHECK theo trang thai...) ghi duoi bang
    const nhieu = rb.filter((r) => (r.contype === 'c' && arr(r.cols).length > 1) || r.contype === 'x');
    if (nhieu.length) {
      P(`Ràng buộc nhiều cột của bảng ${b}:`);
      B(nhieu.map((r) => `**${r.conname}:** ${RANG_BUOC[r.conname] || r.def}`));
    }
  }
}
P('**View v_don_hang_tien** là nguồn duy nhất tính tiền của đơn: tổng vật tư (theo số lượng thực tế nếu đã nghiệm thu), chiết khấu, tổng đơn (ưu tiên giá trị quyết toán), phát sinh thi công, tiền thợ thu hộ, tiền khách đã trả qua phiếu thu đã xác nhận và còn phải thu. Mọi màn hình và báo cáo đọc từ view này nên số liệu luôn thống nhất. **Trigger tg_chan_dong_trung_qt** chặn một dòng mua hàng nằm trong hai đề xuất quyết toán còn hiệu lực (ràng buộc giữa nhiều bảng mà CHECK không làm được).');
P('**Hàm trigger fn_ghi_nhat_ky** gắn vào 16 bảng quan trọng (đơn hàng, vật tư đơn, khách hàng, mua hàng, đề xuất chi, phiếu thu, thi công, bảng giá, người dùng, phân quyền, giao dịch ngân hàng...): mỗi thêm / sửa / xoá ghi vào nhat_ky_thay_doi, với thao tác sửa chỉ lưu các cột thực sự đổi; người thao tác và kênh lấy từ biến phiên do backend đặt trong giao dịch, nên thao tác lỗi bị huỷ thì nhật ký cũng không còn. **Trigger tg_chan_quyen_chi_admin** chặn gán quyền quản trị hệ thống cho vai trò khác Admin ngay cả khi ghi thẳng vào CSDL.');
H4('2.8.2.2. Biểu đồ thực thể liên kết (ERD)');
ChoHinh('Biểu đồ thực thể liên kết của hệ thống', [
  '**Thực thể trung tâm:** don_hang. Quan hệ 1–n: users (sale_id, vanhanh_phu_trach_id) → don_hang; khach_hang → don_hang; don_hang → don_hang_vat_tu, don_hang_giai_doan_log, don_hang_phan_cong_log, don_hang_yeu_cau_sua, thi_cong, phat_sinh_thi_cong, dat_hang_ncc, mua_bo_sung, de_xuat_chi, thanh_toan_khach.',
  '**Mua hàng:** don_hang_vat_tu 1–1 mua_hang_dong; nha_cung_cap → mua_hang_dong, dat_hang_ncc, ncc_bang_gia, ncc_stk; dat_hang_ncc 1–n mua_hang_dong; vat_tu → don_hang_vat_tu, ncc_bang_gia; loai_vat_tu → vat_tu.',
  '**Chi tiền:** de_xuat_chi 1–n de_xuat_chi_dong (n–1 mua_hang_dong), de_xuat_chi_duyet_log; de_xuat_chi 1–1 phieu_thanh_toan; dat_hang_ncc → de_xuat_chi (cọc); doi_tho → thi_cong, de_xuat_chi, giao_dich_tho.',
  '**Nhập số, đối soát, quản trị:** users 1–1 ty_le_chia_so; khach_hang 1–n chia_so_log (n–1 users: sale_id, tu_sale_id, nguoi_nhap_id); giao_dich_ngan_hang 1–n thanh_toan_khach (giao_dich_id), giao_dich_ngan_hang n–1 don_hang, de_xuat_chi; quyen 1–n vai_tro_quyen; users 1–n nhat_ky_thay_doi, cau_hinh (nguoi_cap_nhat_id).',
  '**Khác:** khach_hang 1–n khach_hang_cham_soc; users 1–n thong_bao; mua_bo_sung 1–n mua_bo_sung_dong, mua_bo_sung_trach_nhiem. Ký hiệu chân chim, ghi rõ khoá chính / khoá ngoại.',
]);

// ---------------- 2.9 ----------------
H2('2.9. Thiết kế Front-end');
P('Giao diện được thiết kế theo vai trò: mỗi vai trò có thực đơn, trang Tổng quan và danh sách việc cần làm riêng. Các hình dưới đây là màn hình của phần mềm với dữ liệu mẫu.');
H3('2.9.1. Giao diện chung');
Anh('01_dang_nhap.png', 'Giao diện đăng nhập');
Anh('17_xac_thuc_2_lop.png', 'Giao diện cài đặt xác thực hai lớp (quét mã QR bằng ứng dụng Authenticator)');
Anh('16_tong_quan_admin.png', 'Giao diện trang Tổng quan (Admin): việc cần làm, KPI, tiến độ đơn');
Anh('25_dien_thoai.png', 'Giao diện trên điện thoại (PWA): Tổng quan, chi tiết đơn, báo cáo');
H3('2.9.2. Giao diện phía Sale');
Anh('18_nhap_so.png', 'Giao diện nhập số khách tiềm năng');
Anh('05_khach_hang_sale.png', 'Giao diện quản lý khách hàng');
Anh('03_danh_sach_don_sale.png', 'Giao diện danh sách đơn hàng và bộ lọc');
Anh('04_tao_don_sale.png', 'Giao diện tạo đơn hàng có trợ lý AI');
H3('2.9.3. Giao diện phía Vận hành');
Anh('02_tong_quan_van_hanh.png', 'Giao diện Tổng quan của Vận hành: việc cần làm nổi bật');
Anh('06_chi_tiet_don_tien_do.png', 'Giao diện chi tiết đơn hàng và tiến độ');
Anh('07_mua_hang_dat_hang_ncc.png', 'Giao diện mua hàng: chọn NCC, đơn đặt hàng gửi NCC');
Anh('08_lich_thi_cong.png', 'Giao diện lịch thi công');
Anh('09_nghiem_thu.png', 'Giao diện nghiệm thu theo số lượng thực tế');
H3('2.9.4. Giao diện phía Kế toán');
Anh('10_ncc_bang_gia.png', 'Giao diện so sánh giá nhà cung cấp');
Anh('11_de_xuat_chi_qr.png', 'Giao diện đề xuất chi kèm mã QR chuyển khoản');
Anh('12_cong_no_ncc.png', 'Giao diện công nợ nhà cung cấp');
Anh('13_cong_no_khach.png', 'Giao diện công nợ khách hàng');
Anh('21_doi_soat_ngan_hang.png', 'Giao diện đối soát giao dịch ngân hàng');
Anh('20_bao_cao_lai_lo.png', 'Giao diện báo cáo lãi/lỗ theo đơn');
Anh('14_phan_tich_ai.png', 'Giao diện phân tích vật tư bán chạy và giá NCC với trợ lý AI');
H3('2.9.5. Giao diện phía Admin');
Anh('15_nguoi_dung_admin.png', 'Giao diện quản lý người dùng');
Anh('19_quan_ly_chia_so.png', 'Giao diện quản lý tỷ lệ chia số cho Sale');
Anh('22_phan_quyen.png', 'Giao diện phân quyền theo chức năng');
Anh('23_nhat_ky.png', 'Giao diện nhật ký thay đổi dữ liệu');
Anh('24_sao_luu.png', 'Giao diện sao lưu dữ liệu');

// =====================================================================================
const doc = new Document({
  creator: 'Vương Ngọc Sơn',
  title: 'Chương II - Khảo sát, phân tích và thiết kế hệ thống',
  styles: {
    default: { document: { run: { font: 'Times New Roman', size: 28 }, paragraph: { spacing: { line: 360 }, alignment: AlignmentType.JUSTIFIED } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: 'Times New Roman', size: 32, bold: true }, paragraph: { alignment: AlignmentType.CENTER, spacing: { before: 240, after: 240 }, outlineLevel: 0, keepNext: true } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: 'Times New Roman', size: 28, bold: true }, paragraph: { alignment: AlignmentType.LEFT, spacing: { before: 200, after: 120 }, outlineLevel: 1, keepNext: true } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: 'Times New Roman', size: 28, bold: true }, paragraph: { alignment: AlignmentType.LEFT, spacing: { before: 160, after: 80 }, outlineLevel: 2, keepNext: true } },
      { id: 'Heading4', name: 'Heading 4', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: 'Times New Roman', size: 28, bold: true, italics: true }, paragraph: { alignment: AlignmentType.LEFT, spacing: { before: 120, after: 60 }, outlineLevel: 3, keepNext: true } },
    ],
  },
  numbering: { config: [{ reference: 'cham', levels: [{ level: 0, format: LevelFormat.BULLET, text: '–', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 567, hanging: 283 } } } }] }] },
  sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1418, right: 1134, bottom: 1134, left: 1985 } } }, children: out }],
});
// docx-js xuat vien doan van (w:pBdr) theo thu tu top-bottom-left-right; chuan OOXML yeu cau top-left-bottom-right -> sap lai.
async function sapVien(buf) {
  const JSZip = require('jszip');
  const zip = await JSZip.loadAsync(buf);
  const xml = await zip.file('word/document.xml').async('string');
  const sua = xml.replace(/<w:pBdr>(.*?)<\/w:pBdr>/g, (m, trong) => {
    const lay = (ten) => (trong.match(new RegExp(`<w:${ten}\b[^>]*/>`)) || [''])[0];
    return `<w:pBdr>${['top', 'left', 'bottom', 'right', 'between', 'bar'].map(lay).join('')}</w:pBdr>`;
  });
  zip.file('word/document.xml', sua);
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}
Packer.toBuffer(doc).then(sapVien).then((buf) => {
  const dich = process.argv[2] || path.join(__dirname, 'Chuong2_ERP.docx');
  fs.writeFileSync(dich, buf);
  console.log('Da tao', dich, '| bang:', soBang, '| hinh:', soHinh, '| doan:', out.length);
});
