const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, AlignmentType, ShadingType, VerticalAlign, ImageRun,
} = require('docx');

const FONT = 'Times New Roman';
const BODY_SIZE = 26;
const PAGE_WIDTH_DXA = 11906 - 1440 * 2;
const MAX_IMG_W = 600;
const MAX_IMG_H = 820;
const PNG = (n) => path.join(__dirname, 'png', n + '.png');

let hinhNo = 0;
let bangNo = 0;

function body(text) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { line: 360, lineRule: 'auto', after: 160 },
    children: [new TextRun({ text, font: FONT, size: BODY_SIZE })],
  });
}
function heading(text, level, size, italics = false) {
  return new Paragraph({
    heading: level,
    spacing: { before: 240, after: 120, line: 360, lineRule: 'auto' },
    children: [new TextRun({ text, font: FONT, size, bold: true, italics, color: '000000' })],
  });
}
const h1 = (t) => heading(t, HeadingLevel.HEADING_1, 28);
const h2 = (t) => heading(t, HeadingLevel.HEADING_2, 26);
const h3 = (t) => heading(t, HeadingLevel.HEADING_3, 26, true);

function captionPara(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 100, after: 200 },
    children: [new TextRun({ text, font: FONT, size: 24, italics: true })],
  });
}
function bangCaption(title) {
  bangNo++;
  return captionPara(`Bảng 2.${bangNo}. ${title}`);
}

function figure(name, title) {
  const buf = fs.readFileSync(PNG(name));
  let w = buf.readUInt32BE(16);
  let h = buf.readUInt32BE(20);
  const scale = Math.min(MAX_IMG_W / w, MAX_IMG_H / h, 1);
  w = Math.round(w * scale);
  h = Math.round(h * scale);
  hinhNo++;
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 60 },
      children: [new ImageRun({ type: 'png', data: buf, transformation: { width: w, height: h } })],
    }),
    captionPara(`Hình 2.${hinhNo}. ${title}`),
  ];
}

function cell(text, { width, bold = false, shade = null, align = AlignmentType.LEFT } = {}) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    shading: shade ? { type: ShadingType.CLEAR, fill: shade } : undefined,
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    children: [new Paragraph({ alignment: align, children: [new TextRun({ text: String(text), font: FONT, size: 22, bold })] })],
  });
}

function reqTable(rows) {
  const widths = [600, 2400, PAGE_WIDTH_DXA - 3000];
  const header = new TableRow({
    tableHeader: true,
    children: [
      cell('STT', { width: widths[0], bold: true, shade: 'D9D9D9', align: AlignmentType.CENTER }),
      cell('Tên chức năng', { width: widths[1], bold: true, shade: 'D9D9D9' }),
      cell('Mô tả', { width: widths[2], bold: true, shade: 'D9D9D9' }),
    ],
  });
  return new Table({
    width: { size: PAGE_WIDTH_DXA, type: WidthType.DXA },
    columnWidths: widths,
    rows: [header, ...rows.map((r, i) => new TableRow({
      children: [
        cell(i + 1, { width: widths[0], align: AlignmentType.CENTER }),
        cell(r[0], { width: widths[1] }),
        cell(r[1], { width: widths[2] }),
      ],
    }))],
  });
}

function dbTable(columns) {
  const widths = [1900, 2300, 800, PAGE_WIDTH_DXA - 5000];
  const header = new TableRow({
    tableHeader: true,
    children: ['Tên cột', 'Kiểu dữ liệu', 'Null', 'Ghi chú'].map((t, i) =>
      cell(t, { width: widths[i], bold: true, shade: 'D9D9D9', align: i === 2 ? AlignmentType.CENTER : AlignmentType.LEFT })),
  });
  return new Table({
    width: { size: PAGE_WIDTH_DXA, type: WidthType.DXA },
    columnWidths: widths,
    rows: [header, ...columns.map(c => new TableRow({
      children: c.map((v, i) => cell(v, { width: widths[i], align: i === 2 ? AlignmentType.CENTER : AlignmentType.LEFT })),
    }))],
  });
}

function ucSpecTable(uc) {
  const labelW = 2200;
  const valueW = PAGE_WIDTH_DXA - labelW;
  const row = (label, value) => new TableRow({
    children: [
      cell(label, { width: labelW, bold: true, shade: 'F2F2F2' }),
      new TableCell({
        width: { size: valueW, type: WidthType.DXA },
        margins: { top: 60, bottom: 60, left: 80, right: 80 },
        children: (Array.isArray(value) ? value : [value]).map(line => new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 60 },
          children: [new TextRun({ text: line, font: FONT, size: 22 })],
        })),
      }),
    ],
  });
  const rows = [
    row('Mã Use case', uc.ma),
    row('Tên Use case', uc.ten),
    row('Tác nhân', uc.tacNhan),
    row('Mô tả', uc.moTa),
    row('Điều kiện trước', uc.dieuKienTruoc),
    row('Luồng sự kiện chính', uc.luongChinh),
  ];
  if (uc.luongReNhanh) rows.push(row('Luồng rẽ nhánh / ngoại lệ', uc.luongReNhanh));
  rows.push(row('Điều kiện sau', uc.dieuKienSau));
  return new Table({ width: { size: PAGE_WIDTH_DXA, type: WidthType.DXA }, columnWidths: [labelW, valueW], rows });
}

const spacer = () => new Paragraph({ spacing: { after: 160 }, children: [] });
const S = [];

S.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { after: 400 },
  children: [new TextRun({ text: 'CHƯƠNG 2: KHẢO SÁT, PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG', font: FONT, size: 30, bold: true })],
}));

// 2.1
S.push(h1('2.1. Khảo sát hiện trạng'));
S.push(body('Doanh nghiệp NST hoạt động trong lĩnh vực vật liệu hoàn thiện (sàn, tấm ốp) và tự sản xuất cửa, đồng thời trực tiếp thi công lắp đặt cho khách hàng. Trước khi có phần mềm, toàn bộ quy trình — từ tiếp nhận đơn hàng, lên phương án vận chuyển và thi công, lựa chọn nhà cung cấp (NCC) để mua vật tư, cho đến tạo đề xuất chi, duyệt chi và đối soát công nợ — đều được thực hiện rời rạc qua Excel, Google Sheets và một nhóm Telegram nội bộ dùng để duyệt các khoản chi.'));
S.push(body('Cách làm thủ công này bộc lộ nhiều hạn chế: nhân viên kinh doanh khó theo dõi tiến độ đơn hàng sau khi bàn giao cho vận hành; nhân viên vận hành không có nơi lưu tập trung phương án thi công và thông tin đội thợ; kế toán phải tự tổng hợp từng khoản chi cho NCC bằng tay để đối chiếu công nợ cuối kỳ, dễ phát sinh sai lệch giá giữa các đơn mua, chậm phát hiện chi trùng hoặc chi thiếu, và khó truy vết ai đã phê duyệt một khoản chi cụ thể. Đặc biệt, không có bức tranh tức thời về tổng công nợ đang tồn đọng với từng nhà cung cấp tại bất kỳ thời điểm nào.'));
S.push(body('Từ thực trạng đó, việc xây dựng một hệ thống ERP quản lý chuỗi cung ứng và thi công, số hoá toàn bộ quy trình nói trên lên một nền tảng thống nhất, là cần thiết nhằm giảm sai sót thủ công, tăng tốc độ xử lý và cho phép quản lý kiểm soát dòng tiền một cách minh bạch, có thể truy vết đến từng phê duyệt.'));

// 2.2
S.push(h1('2.2. Cơ sở lý thuyết phân tích và đặc tả yêu cầu hệ thống'));
S.push(body('Phân tích và đặc tả yêu cầu là giai đoạn nền tảng quyết định chất lượng của toàn bộ quá trình phát triển phần mềm, giúp xác định rõ hệ thống cần thực hiện những chức năng nào, phục vụ đối tượng nào và phải đáp ứng các tiêu chí gì về bảo mật, hiệu năng hay khả năng mở rộng. Phân tích yêu cầu chính xác giúp hạn chế sai sót trong thiết kế và lập trình, từ đó tối ưu nguồn lực và đảm bảo sản phẩm phù hợp với nhu cầu thực tế của doanh nghiệp.'));
S.push(body('Trong quá trình thực hiện đề tài, em tiến hành khảo sát thông qua việc tìm hiểu quy trình thủ công hiện tại của doanh nghiệp (trao đổi qua Excel, Google Sheets, Telegram) để xác định các actor tham gia và yêu cầu chức năng trọng tâm. Các yêu cầu thu thập được phân loại thành hai nhóm: yêu cầu chức năng (mô tả các nghiệp vụ hệ thống cần thực hiện) và yêu cầu phi chức năng (các tiêu chí về giao diện, bảo mật, khả năng mở rộng). Do hệ thống được xây dựng theo kiến trúc phân lớp kết hợp RESTful API và mô hình Single Page Application, phần đặc tả còn bao gồm mô tả luồng xử lý cho từng use case, quy tắc chuyển trạng thái nghiệp vụ, và thiết kế cơ sở dữ liệu quan hệ làm nền tảng cho các bước lập trình ở Chương 3.'));

// 2.3
S.push(h1('2.3. Mô tả bài toán'));
S.push(body('Hệ thống ERP quản lý chuỗi cung ứng và thi công được xây dựng nhằm số hoá xuyên suốt vòng đời một đơn hàng: nhân viên kinh doanh (Sale) tạo đơn hàng và chăm sóc khách hàng được phân công; nhân viên vận hành tiếp nhận đơn, cập nhật phương án vận chuyển, phương án thi công, hình ảnh mặt bằng và phân công đội thợ; kế toán phân tích vật tư nào doanh nghiệp tự sản xuất (cửa) và vật tư nào cần mua ngoài (sàn, tấm ốp) để chọn NCC theo bảng giá đã chuẩn hoá, tạo đề xuất mua, tạo đề xuất chi, gửi duyệt qua nhóm Telegram, thanh toán bằng mã QR chuyển khoản và đối soát công nợ theo từng NCC.'));
S.push(body('Do vật tư mua ngoài được NCC giao thẳng đến công trình, hệ thống không quản lý kho vật lý mà tập trung vào quản lý dòng tiền và công nợ với nhà cung cấp. Admin quản lý tài khoản người dùng, phân quyền và các danh mục dùng chung. Khách hàng, nhà cung cấp và đội thợ thi công là các đối tượng được quản lý thông tin trong hệ thống nhưng không trực tiếp thao tác trên phần mềm trong phạm vi đề tài.'));
S.push(body('Hệ thống được triển khai theo kiến trúc phân lớp (routes – controller – service – repository) kết hợp RESTful API và React theo mô hình Single Page Application, giúp tách biệt rõ ràng giữa giao diện, xử lý nghiệp vụ và dữ liệu, tăng khả năng mở rộng và dễ bảo trì trong tương lai.'));

// 2.4
S.push(h1('2.4. Phân tích yêu cầu'));
S.push(h2('2.4.1. Yêu cầu chức năng'));
S.push(h3('2.4.1.1. Về phía Sale (nhân viên kinh doanh)'));
S.push(bangCaption('Yêu cầu chức năng phía Sale'));
S.push(reqTable([
  ['Đăng nhập', 'Cho phép Sale đăng nhập vào hệ thống bằng tài khoản được cấp.'],
  ['Tạo đơn hàng', 'Cho phép Sale tạo đơn hàng mới gắn với một khách hàng cụ thể.'],
  ['Xem và theo dõi đơn hàng', 'Cho phép Sale xem danh sách đơn hàng mình tạo và theo dõi trạng thái xử lý.'],
  ['Gửi yêu cầu chỉnh sửa đơn hàng', 'Cho phép Sale gửi yêu cầu chỉnh sửa thông tin đơn hàng đến Vận hành khi phát sinh thay đổi.'],
  ['Chăm sóc khách hàng', 'Cho phép Sale xem và cập nhật thông tin các khách hàng được phân công qua tab riêng.'],
]));
S.push(h3('2.4.1.2. Về phía Vận hành'));
S.push(bangCaption('Yêu cầu chức năng phía Vận hành'));
S.push(reqTable([
  ['Đăng nhập', 'Cho phép Vận hành đăng nhập vào hệ thống.'],
  ['Tiếp nhận và cập nhật đơn hàng', 'Cho phép Vận hành cập nhật hình ảnh mặt bằng, phương án vận chuyển và phương án thi công cho đơn hàng.'],
  ['Xử lý yêu cầu chỉnh sửa đơn', 'Cho phép Vận hành xem và xử lý các yêu cầu chỉnh sửa đơn do Sale gửi.'],
  ['Lập lịch thi công', 'Cho phép Vận hành lập lịch thi công, chọn đội thợ phù hợp cho từng đơn hàng.'],
  ['Ghi nhận nghiệm thu', 'Cho phép Vận hành ghi nhận kết quả nghiệm thu sau khi thi công hoàn tất.'],
]));
S.push(h3('2.4.1.3. Về phía Kế toán'));
S.push(bangCaption('Yêu cầu chức năng phía Kế toán'));
S.push(reqTable([
  ['Đăng nhập', 'Cho phép Kế toán đăng nhập vào hệ thống.'],
  ['Quản lý danh mục NCC và bảng giá', 'Cho phép Kế toán thêm, sửa nhà cung cấp và bảng giá vật tư theo từng NCC, có hiệu lực theo thời gian.'],
  ['Phân tích vật tư cần mua', 'Cho phép Kế toán xem vật tư nào tự sản xuất và vật tư nào cần mua ngoài theo từng đơn hàng.'],
  ['Tạo đề xuất mua hàng', 'Cho phép Kế toán chọn NCC và tạo đề xuất mua hàng cho các vật tư cần mua ngoài.'],
  ['Tạo đề xuất chi', 'Cho phép Kế toán tạo đề xuất chi thanh toán cho một hoặc nhiều đề xuất mua hàng của cùng một NCC.'],
  ['Thanh toán qua mã QR', 'Cho phép Kế toán sinh mã QR chuyển khoản và ghi nhận phiếu thanh toán sau khi đề xuất chi được duyệt.'],
  ['Đối soát công nợ NCC', 'Cho phép Kế toán xem báo cáo công nợ hiện tại và lịch sử đối soát theo từng NCC.'],
]));
S.push(h3('2.4.1.4. Về phía Admin'));
S.push(bangCaption('Yêu cầu chức năng phía Admin'));
S.push(reqTable([
  ['Đăng nhập', 'Cho phép Admin đăng nhập vào hệ thống.'],
  ['Quản lý tài khoản người dùng', 'Cho phép Admin thêm, sửa, khoá tài khoản và gán vai trò (Sale/Vận hành/Kế toán/Admin).'],
  ['Quản lý danh mục dùng chung', 'Cho phép Admin quản lý danh mục loại vật tư, đội thợ và các danh mục nền tảng khác.'],
]));
S.push(h3('2.4.1.5. Về phía nhóm duyệt qua Telegram'));
S.push(body('Đây là một actor phụ, không đăng nhập trực tiếp vào hệ thống mà tương tác qua Telegram Bot.'));
S.push(bangCaption('Yêu cầu chức năng phía nhóm duyệt Telegram'));
S.push(reqTable([
  ['Nhận thông báo đề xuất chi', 'Hệ thống tự động gửi thông báo đề xuất chi kèm nút duyệt/từ chối vào nhóm Telegram.'],
  ['Duyệt hoặc từ chối đề xuất chi', 'Cho phép thành viên trong nhóm bấm duyệt/từ chối trực tiếp trên Telegram; kết quả được gửi về hệ thống qua webhook.'],
]));

S.push(h2('2.4.2. Yêu cầu phi chức năng'));
S.push(h3('2.4.2.1. Giao diện người dùng'));
S.push(body('Giao diện được thiết kế theo hướng trực quan, thân thiện, phù hợp với từng vai trò người dùng. Giao diện Sale tập trung vào thao tác tạo và theo dõi đơn hàng; giao diện Vận hành hỗ trợ cập nhật thông tin thi công và phân công đội thợ; giao diện Kế toán hỗ trợ tra cứu bảng giá NCC, tạo đề xuất mua/chi và xem báo cáo công nợ dạng bảng, hỗ trợ tìm kiếm và lọc dữ liệu; giao diện Admin hỗ trợ quản lý tài khoản và danh mục dùng chung. Hệ thống được xây dựng theo mô hình Single Page Application nên phản hồi nhanh, không cần tải lại trang khi chuyển đổi chức năng.'));
S.push(h3('2.4.2.2. Tính bảo mật'));
S.push(body('Hệ thống xác thực người dùng bằng JWT (JSON Web Token) và mã hoá mật khẩu bằng bcrypt trước khi lưu trữ. Quyền truy cập được kiểm soát theo vai trò (Sale/Vận hành/Kế toán/Admin) ngay tại tầng controller trước khi vào tầng nghiệp vụ, đảm bảo mỗi vai trò chỉ thao tác được trên đúng phạm vi chức năng được phép. Riêng endpoint webhook tiếp nhận kết quả duyệt chi từ Telegram được xác thực bằng secret token riêng để tránh giả mạo yêu cầu duyệt; việc cập nhật trạng thái đề xuất chi chỉ thực hiện khi đề xuất còn ở trạng thái "chờ duyệt", nhờ đó một đề xuất không thể bị xử lý hai lần khi nhiều thành viên cùng bấm duyệt.'));
S.push(h3('2.4.2.3. Khả năng mở rộng'));
S.push(body('Loại vật tư (tự sản xuất/mua ngoài) được thiết kế thành dữ liệu thay vì cố định trong mã nguồn, cho phép doanh nghiệp bổ sung sản phẩm mới (ví dụ sơn tường, điện mặt trời) chỉ bằng cách thêm dữ liệu danh mục, không cần sửa đổi logic nghiệp vụ. Kiến trúc phân lớp và giao tiếp qua REST API cũng giúp hệ thống dễ mở rộng thêm kênh duyệt chi khác ngoài Telegram trong tương lai mà không phải thay đổi cấu trúc lõi.'));

// 2.5
S.push(h1('2.5. Mô hình hoá Use case'));
S.push(h2('2.5.1. Use case tổng quan'));
S.push(body('Bốn actor Sale, Vận hành, Kế toán và Admin đều kế thừa từ actor chung "Người dùng" nên cùng sử dụng use case Đăng nhập; nhóm duyệt Telegram là actor phụ, chỉ tham gia use case Duyệt đề xuất chi.'));
S.push(...figure('uc_tongquan', 'Sơ đồ Use case tổng quan'));
S.push(h2('2.5.2. Use case phía Sale'));
S.push(...figure('uc_sale', 'Sơ đồ Use case phía Sale'));
S.push(h2('2.5.3. Use case phía Vận hành'));
S.push(...figure('uc_vanhanh', 'Sơ đồ Use case phía Vận hành'));
S.push(h2('2.5.4. Use case phía Kế toán'));
S.push(...figure('uc_ketoan', 'Sơ đồ Use case phía Kế toán và nhóm duyệt Telegram'));
S.push(h2('2.5.5. Use case phía Admin'));
S.push(...figure('uc_admin', 'Sơ đồ Use case phía Admin'));

// 2.6
S.push(h1('2.6. Đặc tả Use case'));
const useCases = [
  { tieu: 'Đăng nhập', ma: 'UC_01', ten: 'Đăng nhập', tacNhan: 'Sale, Vận hành, Kế toán, Admin',
    moTa: 'Người dùng đăng nhập vào hệ thống bằng tài khoản đã được Admin cấp.',
    dieuKienTruoc: 'Người dùng đã có tài khoản trong hệ thống.',
    luongChinh: ['1. Người dùng truy cập màn hình đăng nhập.', '2. Hệ thống hiển thị form nhập username/mật khẩu.', '3. Người dùng nhập thông tin và nhấn "Đăng nhập".', '4. Hệ thống kiểm tra, xác thực và trả về JWT; điều hướng vào màn hình chính theo đúng vai trò.'],
    luongReNhanh: ['4a. Nếu sai username/mật khẩu hoặc tài khoản đã bị khoá: hệ thống hiển thị thông báo lỗi, quay lại bước 2.'],
    dieuKienSau: 'Người dùng đăng nhập thành công và được điều hướng vào hệ thống theo đúng vai trò.' },
  { tieu: 'Tạo đơn hàng', ma: 'UC_02', ten: 'Tạo đơn hàng', tacNhan: 'Sale',
    moTa: 'Sale tạo một đơn hàng mới gắn với khách hàng được phân công.',
    dieuKienTruoc: 'Sale đã đăng nhập hệ thống.',
    luongChinh: ['1. Sale chọn chức năng "Tạo đơn hàng".', '2. Hệ thống hiển thị form nhập thông tin đơn (khách hàng, địa chỉ công trình, mô tả nhu cầu, vật tư dự kiến).', '3. Sale nhập thông tin và nhấn "Lưu".', '4. Hệ thống kiểm tra dữ liệu, tạo bản ghi đơn hàng với trạng thái "mới", hiển thị thông báo thành công.'],
    luongReNhanh: ['4a. Nếu thiếu thông tin bắt buộc: hệ thống báo lỗi và giữ nguyên dữ liệu đã nhập.'],
    dieuKienSau: 'Đơn hàng mới được tạo với trạng thái "mới", sẵn sàng để Vận hành tiếp nhận.' },
  { tieu: 'Gửi yêu cầu chỉnh sửa đơn hàng', ma: 'UC_03', ten: 'Gửi yêu cầu chỉnh sửa đơn hàng', tacNhan: 'Sale',
    moTa: 'Sale gửi yêu cầu chỉnh sửa thông tin đơn hàng đến Vận hành thay vì tự sửa trực tiếp.',
    dieuKienTruoc: 'Đơn hàng đã tồn tại và đã được bàn giao cho Vận hành.',
    luongChinh: ['1. Sale chọn đơn hàng cần chỉnh sửa, chọn "Gửi yêu cầu sửa".', '2. Hệ thống hiển thị form nhập nội dung yêu cầu.', '3. Sale nhập nội dung và gửi yêu cầu.', '4. Hệ thống lưu yêu cầu với trạng thái "chờ xử lý" và hiển thị cho Vận hành.'],
    dieuKienSau: 'Yêu cầu chỉnh sửa được ghi nhận, chờ Vận hành xử lý.' },
  { tieu: 'Cập nhật phương án vận chuyển – thi công', ma: 'UC_04', ten: 'Cập nhật phương án vận chuyển – thi công', tacNhan: 'Vận hành',
    moTa: 'Vận hành cập nhật hình ảnh mặt bằng, phương án vận chuyển và phương án thi công cho đơn hàng.',
    dieuKienTruoc: 'Vận hành đã đăng nhập và đơn hàng đã tồn tại.',
    luongChinh: ['1. Vận hành chọn đơn hàng cần cập nhật.', '2. Hệ thống hiển thị form thông tin thi công của đơn.', '3. Vận hành tải lên hình ảnh mặt bằng, nhập phương án vận chuyển và phương án thi công, nhấn "Lưu".', '4. Hệ thống cập nhật dữ liệu đơn hàng, hiển thị thông báo thành công.'],
    dieuKienSau: 'Thông tin thi công của đơn hàng được cập nhật, sẵn sàng cho bước lập lịch thi công.' },
  { tieu: 'Quản lý NCC và bảng giá', ma: 'UC_05', ten: 'Quản lý NCC và bảng giá', tacNhan: 'Kế toán',
    moTa: 'Kế toán thêm/sửa nhà cung cấp và bảng giá vật tư theo từng NCC, có ngày hiệu lực.',
    dieuKienTruoc: 'Kế toán đã đăng nhập hệ thống.',
    luongChinh: ['1. Kế toán chọn chức năng "Nhà cung cấp & bảng giá".', '2. Hệ thống hiển thị danh sách NCC hiện có.', '3. Kế toán thêm NCC mới hoặc chọn một NCC để thêm giá vật tư (đơn giá, ngày hiệu lực).', '4. Hệ thống kiểm tra, lưu dữ liệu và hiển thị bảng giá đã cập nhật; giá cũ được giữ lại để tra cứu lịch sử.'],
    luongReNhanh: ['4a. Nếu ngày hết hiệu lực không lớn hơn ngày hiệu lực: hệ thống báo lỗi, yêu cầu nhập lại.'],
    dieuKienSau: 'Danh mục NCC/bảng giá được cập nhật, sẵn sàng cho bước tạo đề xuất mua hàng.' },
  { tieu: 'Tạo đề xuất mua hàng', ma: 'UC_06', ten: 'Tạo đề xuất mua hàng', tacNhan: 'Kế toán',
    moTa: 'Kế toán phân tích vật tư cần mua ngoài theo đơn hàng, chọn NCC và tạo đề xuất mua.',
    dieuKienTruoc: 'Đơn hàng đã có danh sách vật tư cần dùng; NCC và bảng giá đã tồn tại.',
    luongChinh: ['1. Kế toán chọn đơn hàng; hệ thống hiển thị vật tư cần mua ngoài, vật tư tự sản xuất được đánh dấu "không cần mua".', '2. Kế toán chọn NCC cho từng vật tư; hệ thống tự lấy đơn giá đang hiệu lực từ bảng giá NCC.', '3. Kế toán xác nhận, nhấn "Tạo đề xuất mua".', '4. Hệ thống lưu đề xuất với trạng thái "chờ duyệt" cùng các dòng chi tiết (vật tư, số lượng, đơn giá tại thời điểm mua).'],
    dieuKienSau: 'Đề xuất mua hàng được tạo, sẵn sàng cho bước đặt hàng và sau này gộp vào đề xuất chi.' },
  { tieu: 'Lập lịch thi công', ma: 'UC_07', ten: 'Lập lịch thi công', tacNhan: 'Vận hành',
    moTa: 'Vận hành lập lịch thi công cho đơn hàng và phân công đội thợ phù hợp.',
    dieuKienTruoc: 'Đơn hàng đã có phương án thi công; danh sách đội thợ đã tồn tại.',
    luongChinh: ['1. Vận hành chọn đơn hàng, chọn "Lập lịch thi công".', '2. Hệ thống hiển thị form chọn ngày dự kiến và danh sách đội thợ đang hoạt động.', '3. Vận hành chọn đội thợ, ngày dự kiến, nhấn "Lưu".', '4. Hệ thống tạo bản ghi thi công với trạng thái "lập lịch".'],
    dieuKienSau: 'Lịch thi công được tạo, đội thợ được phân công cho đơn hàng.' },
  { tieu: 'Ghi nhận nghiệm thu', ma: 'UC_08', ten: 'Ghi nhận nghiệm thu', tacNhan: 'Vận hành',
    moTa: 'Vận hành ghi nhận kết quả nghiệm thu sau khi đội thợ hoàn tất thi công.',
    dieuKienTruoc: 'Bản ghi thi công đang ở trạng thái "đang thi công".',
    luongChinh: ['1. Vận hành chọn bản ghi thi công cần nghiệm thu.', '2. Hệ thống hiển thị form nhập kết quả nghiệm thu.', '3. Vận hành nhập ngày nghiệm thu, kết quả, ghi chú (có thể đính kèm ảnh), nhấn "Lưu".', '4. Hệ thống lưu kết quả nghiệm thu, cập nhật trạng thái thi công thành "đã nghiệm thu".'],
    dieuKienSau: 'Đơn hàng hoàn tất phần thi công.' },
  { tieu: 'Tạo đề xuất chi', ma: 'UC_09', ten: 'Tạo đề xuất chi', tacNhan: 'Kế toán',
    moTa: 'Kế toán gộp một hoặc nhiều đề xuất mua hàng của cùng một NCC thành một đề xuất chi.',
    dieuKienTruoc: 'Tồn tại ít nhất một đề xuất mua hàng ở trạng thái "đã giao" chưa được thanh toán.',
    luongChinh: ['1. Kế toán chọn NCC; hệ thống hiển thị danh sách đề xuất mua hàng chưa thanh toán của NCC đó.', '2. Kế toán chọn các đề xuất mua cần thanh toán; hệ thống tự tính tổng số tiền.', '3. Kế toán nhấn "Tạo đề xuất chi".', '4. Hệ thống tạo đề xuất chi với trạng thái "chờ duyệt", gửi thông báo kèm nút duyệt/từ chối vào nhóm Telegram qua Bot API.'],
    dieuKienSau: 'Đề xuất chi được tạo và gửi sang Telegram, chờ nhóm duyệt phản hồi.' },
  { tieu: 'Duyệt đề xuất chi qua Telegram', ma: 'UC_10', ten: 'Duyệt đề xuất chi qua Telegram', tacNhan: 'Nhóm duyệt Telegram',
    moTa: 'Thành viên nhóm Telegram duyệt hoặc từ chối đề xuất chi ngay trên Telegram.',
    dieuKienTruoc: 'Đề xuất chi đã được gửi thông báo vào nhóm Telegram.',
    luongChinh: ['1. Thành viên nhóm xem tin nhắn thông báo đề xuất chi trên Telegram.', '2. Thành viên bấm nút "Duyệt" hoặc "Từ chối".', '3. Telegram gửi callback đến endpoint webhook của hệ thống.', '4. Hệ thống xác thực webhook bằng secret token, cập nhật trạng thái đề xuất chi (chỉ khi còn "chờ duyệt") và ghi log người duyệt.'],
    luongReNhanh: ['3a. Nếu webhook không xác thực được nguồn gốc: hệ thống từ chối xử lý, không cập nhật trạng thái.', '4a. Nếu đề xuất đã được người khác xử lý trước đó: hệ thống không cập nhật lại, chỉ phản hồi "Đề xuất đã được xử lý" trên Telegram.'],
    dieuKienSau: 'Đề xuất chi chuyển sang trạng thái "đã duyệt" hoặc "từ chối", có log người duyệt.' },
  { tieu: 'Thanh toán và đối soát công nợ NCC', ma: 'UC_11', ten: 'Thanh toán và đối soát công nợ', tacNhan: 'Kế toán',
    moTa: 'Kế toán thực hiện thanh toán cho đề xuất chi đã duyệt và xem báo cáo công nợ theo từng NCC.',
    dieuKienTruoc: 'Đề xuất chi đã ở trạng thái "đã duyệt".',
    luongChinh: ['1. Kế toán chọn đề xuất chi đã duyệt; hệ thống sinh mã QR chuyển khoản theo số tài khoản NCC.', '2. Kế toán xác nhận đã chuyển khoản, nhấn "Ghi nhận thanh toán".', '3. Hệ thống tạo phiếu thanh toán, cập nhật trạng thái đề xuất chi thành "đã thanh toán".', '4. Kế toán xem báo cáo công nợ: hệ thống tính tổng đã mua trừ tổng đã thanh toán theo thời gian thực cho từng NCC.'],
    dieuKienSau: 'Công nợ với NCC được cập nhật chính xác, có thể tra cứu tại thời điểm bất kỳ.' },
  { tieu: 'Quản lý tài khoản người dùng', ma: 'UC_12', ten: 'Quản lý tài khoản người dùng', tacNhan: 'Admin',
    moTa: 'Admin thêm, sửa, khoá tài khoản người dùng và gán vai trò.',
    dieuKienTruoc: 'Admin đã đăng nhập hệ thống.',
    luongChinh: ['1. Admin chọn chức năng "Người dùng".', '2. Hệ thống hiển thị danh sách tài khoản.', '3. Admin thêm mới (nhập thông tin, chọn vai trò) hoặc chỉnh sửa/khoá tài khoản hiện có.', '4. Hệ thống kiểm tra, mã hoá mật khẩu (nếu có), lưu dữ liệu và hiển thị danh sách đã cập nhật.'],
    dieuKienSau: 'Tài khoản người dùng được thêm/sửa/khoá đúng theo yêu cầu của Admin.' },
];
useCases.forEach((uc, i) => {
  S.push(h2(`2.6.${i + 1}. Đặc tả Use case "${uc.tieu}"`));
  S.push(bangCaption(`Đặc tả use case ${uc.ten}`));
  S.push(ucSpecTable(uc));
  S.push(spacer());
});

// 2.7
S.push(h1('2.7. Cơ sở lý thuyết thiết kế hệ thống'));
S.push(body('Thiết kế hệ thống là bước tiếp theo sau khi hoàn thành phân tích và đặc tả yêu cầu, nhằm chuyển các yêu cầu đã xác định thành mô hình kiến trúc và luồng xử lý rõ ràng để phục vụ cho quá trình lập trình ở Chương 3. Việc thiết kế bao gồm hai phần chính: thiết kế xử lý phía máy chủ (back-end) và thiết kế giao diện người dùng (front-end), kết hợp với nhau tạo nên một hệ thống hoàn chỉnh.'));
S.push(body('Thiết kế back-end hướng đến việc tổ chức logic nghiệp vụ theo kiến trúc phân lớp: Routes tiếp nhận endpoint, Controller xử lý request/response và kiểm tra quyền, Service chứa quy tắc nghiệp vụ, Repository thao tác với PostgreSQL thông qua driver pg. Cách tổ chức này giúp mỗi module (đơn hàng, mua hàng, thi công, công nợ NCC) phát triển và kiểm thử độc lập.'));
S.push(body('Thiết kế front-end tập trung xây dựng giao diện theo mô hình Single Page Application bằng React 18, kết hợp Vite làm công cụ build và Zustand quản lý trạng thái phía client. Dữ liệu được lấy từ backend qua Axios gọi các endpoint RESTful và hiển thị động trên giao diện, giúp người dùng thao tác nhanh mà không cần tải lại trang.'));

// 2.8
S.push(h1('2.8. Thiết kế Back-end'));
S.push(h2('2.8.1. Các biểu đồ mô tả chức năng'));
S.push(body('Với mỗi chức năng chính, biểu đồ trình tự mô tả thứ tự tương tác giữa giao diện, Controller, Service, Repository, PostgreSQL (và Telegram Bot API đối với luồng đề xuất chi), còn biểu đồ lớp mô tả các lớp xử lý và thực thể dữ liệu liên quan.'));
const funcs = [
  ['dangnhap', 'Đăng nhập'],
  ['taodonhang', 'Tạo đơn hàng'],
  ['dexuatmua', 'Tạo đề xuất mua hàng'],
  ['lichthicong', 'Lập lịch thi công'],
  ['dexuatchi', 'Tạo đề xuất chi'],
  ['duyetchi', 'Duyệt đề xuất chi qua Telegram'],
  ['thanhtoan', 'Thanh toán và đối soát công nợ'],
];
funcs.forEach(([key, name], i) => {
  S.push(h3(`2.8.1.${i + 1}. Chức năng "${name}"`));
  S.push(body('* Biểu đồ trình tự'));
  S.push(...figure(`seq_${key}`, `Biểu đồ trình tự chức năng ${name}`));
  S.push(body('* Biểu đồ lớp'));
  S.push(...figure(`cls_${key}`, `Biểu đồ lớp chức năng ${name}`));
});

S.push(h2('2.8.2. Thiết kế cơ sở dữ liệu'));
S.push(h3('2.8.2.1. Thiết kế bảng cơ sở dữ liệu'));
S.push(body('Cơ sở dữ liệu được thiết kế mới từ đầu dựa trên kết quả khảo sát, sử dụng PostgreSQL với các kiểu ENUM cho các trường trạng thái/vai trò nhằm đảm bảo ràng buộc toàn vẹn dữ liệu ngay tại tầng cơ sở dữ liệu.'));
const dbTables = [
  ['users', [['id', 'SERIAL', 'Không', 'Khoá chính'], ['ho_ten', 'TEXT', 'Không', 'Họ tên người dùng'], ['username', 'TEXT', 'Không', 'Tên đăng nhập (duy nhất)'], ['password_hash', 'TEXT', 'Không', 'Mật khẩu đã mã hoá bằng bcrypt'], ['vai_tro', 'vai_tro_enum', 'Không', 'sale | van_hanh | ke_toan | admin'], ['trang_thai', 'trang_thai_hoat_dong_enum', 'Không', 'active | ngung_hoat_dong'], ['created_at', 'TIMESTAMPTZ', 'Không', 'Thời gian tạo']]],
  ['khach_hang', [['id', 'SERIAL', 'Không', 'Khoá chính'], ['ten', 'TEXT', 'Không', 'Tên khách hàng'], ['sdt', 'TEXT', 'Có', 'Số điện thoại'], ['dia_chi', 'TEXT', 'Có', 'Địa chỉ'], ['sale_phu_trach_id', 'INTEGER', 'Không', 'FK → users(id)']]],
  ['don_hang', [['id', 'SERIAL', 'Không', 'Khoá chính'], ['ma_don', 'TEXT', 'Không', 'Mã đơn hàng (duy nhất)'], ['khach_hang_id', 'INTEGER', 'Không', 'FK → khach_hang(id)'], ['sale_id', 'INTEGER', 'Không', 'FK → users(id), người tạo'], ['vanhanh_phu_trach_id', 'INTEGER', 'Có', 'FK → users(id)'], ['trang_thai', 'trang_thai_don_hang_enum', 'Không', 'moi | dang_xu_ly | hoan_tat'], ['dia_chi_cong_trinh', 'TEXT', 'Có', 'Địa chỉ thi công'], ['phuong_an_van_chuyen', 'TEXT', 'Có', 'Phương án vận chuyển'], ['phuong_an_thi_cong', 'TEXT', 'Có', 'Phương án thi công']]],
  ['don_hang_hinh_anh', [['id', 'SERIAL', 'Không', 'Khoá chính'], ['don_hang_id', 'INTEGER', 'Không', 'FK → don_hang(id)'], ['url', 'TEXT', 'Không', 'Đường dẫn hình ảnh'], ['loai', 'loai_hinh_anh_enum', 'Không', 'mat_bang | nghiem_thu | khac']]],
  ['don_hang_yeu_cau_sua', [['id', 'SERIAL', 'Không', 'Khoá chính'], ['don_hang_id', 'INTEGER', 'Không', 'FK → don_hang(id)'], ['sale_id', 'INTEGER', 'Không', 'FK → users(id)'], ['noi_dung', 'TEXT', 'Không', 'Nội dung yêu cầu sửa'], ['trang_thai', 'trang_thai_yeu_cau_sua_enum', 'Không', 'cho_xu_ly | da_xu_ly']]],
  ['loai_vat_tu', [['id', 'SERIAL', 'Không', 'Khoá chính'], ['ten', 'TEXT', 'Không', 'Tên loại (Cửa, Sàn, Tấm ốp...)'], ['nguon_goc', 'nguon_goc_vat_tu_enum', 'Không', 'tu_san_xuat | mua_ngoai']]],
  ['vat_tu', [['id', 'SERIAL', 'Không', 'Khoá chính'], ['ten', 'TEXT', 'Không', 'Tên vật tư'], ['loai_vat_tu_id', 'INTEGER', 'Không', 'FK → loai_vat_tu(id)'], ['don_vi_tinh', 'TEXT', 'Không', 'Đơn vị tính'], ['quy_cach', 'TEXT', 'Có', 'Quy cách']]],
  ['don_hang_vat_tu', [['id', 'SERIAL', 'Không', 'Khoá chính'], ['don_hang_id', 'INTEGER', 'Không', 'FK → don_hang(id)'], ['vat_tu_id', 'INTEGER', 'Không', 'FK → vat_tu(id)'], ['so_luong_can', 'NUMERIC(12,2)', 'Không', 'Số lượng cần, > 0']]],
  ['nha_cung_cap', [['id', 'SERIAL', 'Không', 'Khoá chính'], ['ten', 'TEXT', 'Không', 'Tên NCC'], ['dia_chi', 'TEXT', 'Có', 'Địa chỉ'], ['ma_so_thue', 'TEXT', 'Có', 'Mã số thuế'], ['trang_thai', 'trang_thai_hoat_dong_enum', 'Không', 'active | ngung_hoat_dong']]],
  ['ncc_stk', [['id', 'SERIAL', 'Không', 'Khoá chính'], ['ncc_id', 'INTEGER', 'Không', 'FK → nha_cung_cap(id)'], ['so_tk', 'TEXT', 'Không', 'Số tài khoản'], ['ten_ngan_hang', 'TEXT', 'Không', 'Tên ngân hàng'], ['chu_tk', 'TEXT', 'Không', 'Chủ tài khoản']]],
  ['ncc_bang_gia', [['id', 'SERIAL', 'Không', 'Khoá chính'], ['ncc_id', 'INTEGER', 'Không', 'FK → nha_cung_cap(id)'], ['vat_tu_id', 'INTEGER', 'Không', 'FK → vat_tu(id)'], ['don_gia', 'NUMERIC(12,2)', 'Không', 'Đơn giá, ≥ 0'], ['ngay_hieu_luc', 'DATE', 'Không', 'Ngày bắt đầu hiệu lực'], ['ngay_het_hieu_luc', 'DATE', 'Có', 'Ngày hết hiệu lực']]],
  ['de_xuat_mua_hang', [['id', 'SERIAL', 'Không', 'Khoá chính'], ['don_hang_id', 'INTEGER', 'Không', 'FK → don_hang(id)'], ['ncc_id', 'INTEGER', 'Không', 'FK → nha_cung_cap(id)'], ['nguoi_tao_id', 'INTEGER', 'Không', 'FK → users(id)'], ['trang_thai', 'trang_thai_mua_hang_enum', 'Không', 'cho_duyet | da_dat | da_giao']]],
  ['de_xuat_mua_hang_ct', [['id', 'SERIAL', 'Không', 'Khoá chính'], ['de_xuat_mua_hang_id', 'INTEGER', 'Không', 'FK → de_xuat_mua_hang(id)'], ['vat_tu_id', 'INTEGER', 'Không', 'FK → vat_tu(id)'], ['so_luong', 'NUMERIC(12,2)', 'Không', 'Số lượng, > 0'], ['don_gia', 'NUMERIC(12,2)', 'Không', 'Đơn giá tại thời điểm mua']]],
  ['doi_tho', [['id', 'SERIAL', 'Không', 'Khoá chính'], ['ten', 'TEXT', 'Không', 'Tên đội thợ'], ['sdt', 'TEXT', 'Có', 'Số điện thoại'], ['nang_luc', 'TEXT', 'Có', 'Năng lực thi công'], ['trang_thai', 'trang_thai_hoat_dong_enum', 'Không', 'active | ngung_hoat_dong']]],
  ['thi_cong', [['id', 'SERIAL', 'Không', 'Khoá chính'], ['don_hang_id', 'INTEGER', 'Không', 'FK → don_hang(id)'], ['doi_tho_id', 'INTEGER', 'Không', 'FK → doi_tho(id)'], ['nguoi_phu_trach_id', 'INTEGER', 'Không', 'FK → users(id)'], ['ngay_du_kien', 'DATE', 'Có', 'Ngày thi công dự kiến'], ['ngay_thuc_hien', 'DATE', 'Có', 'Ngày thi công thực tế'], ['trang_thai', 'trang_thai_thi_cong_enum', 'Không', 'lap_lich | dang_thi_cong | da_nghiem_thu']]],
  ['nghiem_thu', [['id', 'SERIAL', 'Không', 'Khoá chính'], ['thi_cong_id', 'INTEGER', 'Không', 'FK → thi_cong(id)'], ['ngay_nghiem_thu', 'DATE', 'Không', 'Ngày nghiệm thu'], ['ket_qua', 'TEXT', 'Không', 'Kết quả nghiệm thu'], ['ghi_chu', 'TEXT', 'Có', 'Ghi chú']]],
  ['de_xuat_chi', [['id', 'SERIAL', 'Không', 'Khoá chính'], ['ncc_id', 'INTEGER', 'Không', 'FK → nha_cung_cap(id)'], ['nguoi_tao_id', 'INTEGER', 'Không', 'FK → users(id)'], ['so_tien', 'NUMERIC(14,2)', 'Không', 'Số tiền đề xuất chi, > 0'], ['trang_thai', 'trang_thai_de_xuat_chi_enum', 'Không', 'cho_duyet | da_duyet | tu_choi | da_thanh_toan'], ['telegram_message_id', 'TEXT', 'Có', 'Mã tin nhắn Telegram đã gửi']]],
  ['de_xuat_chi_muc', [['id', 'SERIAL', 'Không', 'Khoá chính'], ['de_xuat_chi_id', 'INTEGER', 'Không', 'FK → de_xuat_chi(id)'], ['de_xuat_mua_hang_id', 'INTEGER', 'Không', 'FK → de_xuat_mua_hang(id)']]],
  ['de_xuat_chi_duyet_log', [['id', 'SERIAL', 'Không', 'Khoá chính'], ['de_xuat_chi_id', 'INTEGER', 'Không', 'FK → de_xuat_chi(id)'], ['telegram_user', 'TEXT', 'Không', 'Người duyệt trên Telegram'], ['hanh_dong', 'hanh_dong_duyet_enum', 'Không', 'duyet | tu_choi'], ['thoi_gian', 'TIMESTAMPTZ', 'Không', 'Thời điểm duyệt']]],
  ['phieu_thanh_toan', [['id', 'SERIAL', 'Không', 'Khoá chính'], ['de_xuat_chi_id', 'INTEGER', 'Không', 'FK → de_xuat_chi(id)'], ['ma_qr', 'TEXT', 'Có', 'Nội dung mã QR chuyển khoản'], ['so_tien', 'NUMERIC(14,2)', 'Không', 'Số tiền thanh toán, > 0'], ['ngay_thanh_toan', 'DATE', 'Không', 'Ngày thanh toán']]],
];
for (const [name, cols] of dbTables) {
  S.push(bangCaption(`Cấu trúc bảng ${name}`));
  S.push(dbTable(cols));
  S.push(spacer());
}
S.push(h3('2.8.2.2. Biểu đồ thực thể liên kết (ERD)'));
S.push(body('Sơ đồ ERD tổng hợp quan hệ giữa 20 bảng trên theo ký hiệu chân chim, thể hiện các ràng buộc khoá ngoại và quan hệ một – nhiều giữa các module Đơn hàng, NCC & Bảng giá, Mua hàng, Thi công và Công nợ NCC.'));
S.push(...figure('erd', 'Biểu đồ thực thể liên kết của hệ thống'));

// 2.9
S.push(h1('2.9. Thiết kế Front-end'));
S.push(h2('2.9.1. Giao diện đăng nhập'));
S.push(...figure('ui_login', 'Thiết kế giao diện màn hình đăng nhập'));
S.push(h2('2.9.2. Thiết kế giao diện phía Sale'));
S.push(...figure('ui_sale_donhang', 'Thiết kế giao diện màn hình danh sách đơn hàng (Sale)'));
S.push(...figure('ui_sale_taodon', 'Thiết kế giao diện màn hình tạo đơn hàng (Sale)'));
S.push(h2('2.9.3. Thiết kế giao diện phía Vận hành'));
S.push(...figure('ui_vh_phuongan', 'Thiết kế giao diện màn hình cập nhật phương án vận chuyển – thi công'));
S.push(...figure('ui_vh_lichthicong', 'Thiết kế giao diện màn hình lập lịch thi công'));
S.push(h2('2.9.4. Thiết kế giao diện phía Kế toán'));
S.push(...figure('ui_kt_ncc', 'Thiết kế giao diện màn hình quản lý NCC và bảng giá'));
S.push(...figure('ui_kt_dexuatmua', 'Thiết kế giao diện màn hình tạo đề xuất mua hàng'));
S.push(...figure('ui_kt_congno', 'Thiết kế giao diện màn hình công nợ nhà cung cấp'));
S.push(h2('2.9.5. Thiết kế giao diện phía Admin'));
S.push(...figure('ui_ad_users', 'Thiết kế giao diện màn hình quản lý người dùng'));

const doc = new Document({
  styles: { default: { document: { run: { font: FONT, size: BODY_SIZE } } } },
  sections: [{ properties: {}, children: S }],
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(path.join(__dirname, 'Chuong2_ERP.docx'), buf);
  console.log('WROTE', buf.length, 'bytes; Hinh:', hinhNo, 'Bang:', bangNo);
});
