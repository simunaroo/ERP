const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
} = require("docx");

const H1 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 320, after: 160 },
  children: [new TextRun({ text, bold: true, size: 26 })],
});

const H2 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  spacing: { before: 240, after: 120 },
  children: [new TextRun({ text, bold: true, size: 24 })],
});

const P = (text) => new Paragraph({
  spacing: { after: 160, line: 360 },
  alignment: AlignmentType.JUSTIFIED,
  children: [new TextRun({ text, size: 26 })],
});

const TITLE = new Paragraph({
  heading: HeadingLevel.TITLE,
  alignment: AlignmentType.CENTER,
  spacing: { after: 400 },
  children: [new TextRun({ text: "CHƯƠNG 1: TỔNG QUAN VỀ ĐỀ TÀI VÀ CÔNG NGHỆ SỬ DỤNG", bold: true, size: 30 })],
});

const children = [];
children.push(TITLE);

children.push(H1("1.1. Giới thiệu chung về đề tài"));
children.push(P("Trong quá trình mở rộng quy mô sản xuất – thi công, các doanh nghiệp hoạt động trong lĩnh vực vật liệu sàn và tấm ốp phải làm việc với số lượng lớn nhà cung cấp (NCC), mỗi NCC lại có bảng giá, quy cách và chính sách công nợ riêng. Trước khi có phần mềm, hoạt động mua hàng thường được thực hiện thủ công qua trao đổi Zalo, điện thoại và ghi chép trên Excel: nhân viên mua hàng tự chọn NCC theo kinh nghiệm, giá cả không được lưu vết theo thời điểm chốt, còn kế toán phải tự tổng hợp từng dòng chi để đối chiếu công nợ cuối kỳ. Cách làm này dễ phát sinh sai lệch giá giữa các đơn, khó truy vết ai là người duyệt một khoản chi, chậm phát hiện chi trùng hoặc chi thiếu cho NCC, đồng thời không có bức tranh tức thời về tổng công nợ đang tồn đọng với từng nhà cung cấp."));
children.push(P("Xuất phát từ thực tế đó, đề tài hướng tới xây dựng phân hệ Quản lý Mua hàng và Công nợ Nhà cung cấp trong hệ thống ERP nội bộ của doanh nghiệp. Phân hệ số hoá toàn bộ vòng đời của một lần mua hàng: từ phân tích vật tư cần mua, chọn NCC theo bảng giá đã được chuẩn hoá, đặt mua, nhập kho, cho đến tạo đề xuất chi, phê duyệt, thanh toán qua mã QR chuyển khoản và đối soát công nợ theo từng NCC. Việc đưa toàn bộ quy trình lên một nền tảng thống nhất giúp nhân viên mua hàng thao tác nhanh và ít sai sót hơn, đồng thời giúp người quản lý kiểm soát dòng tiền chi cho NCC một cách minh bạch, có thể truy vết đến từng phê duyệt."));
children.push(P("Đề tài có ý nghĩa thực tiễn cao vì được xây dựng từ nhu cầu vận hành thật của doanh nghiệp, đồng thời có ý nghĩa học thuật khi cho phép vận dụng kiến thức về phân tích thiết kế hệ thống, thiết kế cơ sở dữ liệu quan hệ, xây dựng API và giao diện quản trị, cũng như tư duy thiết kế lại (redesign) một hệ thống đang vận hành sao cho gọn nhẹ, chuẩn hoá và dễ bảo trì hơn."));

children.push(H1("1.2. Giới thiệu dự án phần mềm"));
children.push(P("Phần mềm được phát triển theo kiến trúc phân lớp (layered architecture) kết hợp RESTful API và mô hình Single Page Application (SPA), tách bạch rõ giữa tầng giao diện, tầng xử lý nghiệp vụ và tầng dữ liệu. Ở tầng backend, mỗi nghiệp vụ được tổ chức thành một module riêng theo bốn lớp: Routes (khai báo endpoint) → Controller (tiếp nhận request, gắn thông tin người dùng/quyền) → Service (xử lý nghiệp vụ, quy tắc chuyển trạng thái) → Repository (thao tác truy vấn cơ sở dữ liệu). Cách tổ chức này giúp mỗi module — ví dụ module đề xuất mua hàng hay module công nợ NCC — có thể phát triển, kiểm thử và bảo trì độc lập với các module khác."));
children.push(P("Dự án cung cấp các nhóm chức năng chính: quản lý danh mục nhà cung cấp và bảng giá vật tư theo NCC; tạo và theo dõi đề xuất mua hàng qua các trạng thái chờ duyệt – đã đặt – đã mua; ghi nhận nhập kho và cập nhật tồn kho vật tư; tạo, phê duyệt và thanh toán đề xuất chi cho NCC kèm sinh mã QR chuyển khoản; và cuối cùng là đối soát, báo cáo công nợ theo từng nhà cung cấp. Kiến trúc phân lớp và giao tiếp qua REST API giúp hệ thống dễ mở rộng để tích hợp thêm các phân hệ khác của ERP như vận chuyển hay thi công trong tương lai mà không phải thay đổi cấu trúc lõi."));

children.push(H1("1.3. Phương pháp thực hiện"));
children.push(P("Đề tài được triển khai theo quy trình có cấu trúc, bắt đầu từ khảo sát quy trình mua hàng và thanh toán công nợ thực tế tại doanh nghiệp: cách nhân viên mua hàng chọn NCC, cách đề xuất chi được tạo và duyệt, cách kế toán đối soát công nợ cuối kỳ. Từ kết quả khảo sát, em xác định các actor và yêu cầu chức năng trọng tâm, sau đó đặc tả bằng sơ đồ use case, mô tả luồng sự kiện cho từng use case và thiết kế mô hình dữ liệu quan hệ (ERD) cho phạm vi đã chọn."));
children.push(P("Về công nghệ, em lựa chọn Node.js với Express cho backend, PostgreSQL cho tầng dữ liệu và React cho giao diện, tạo thành một hệ sinh thái JavaScript thống nhất giữa backend và frontend, thuận lợi cho việc phát triển và bảo trì trong phạm vi đồ án cá nhân. Thay vì kế thừa nguyên trạng cơ sở dữ liệu của hệ thống thực tế — vốn có nhiều bảng chắp vá theo lịch sử phát triển — em chủ động thiết kế lại cơ sở dữ liệu theo hướng chuẩn hoá, đảm bảo các ràng buộc khoá ngoại rõ ràng và loại bỏ các cơ chế lưu trữ tạm bợ không cần thiết cho phạm vi đề tài."));
children.push(P("Trong giai đoạn lập trình, hệ thống được tổ chức theo từng module nghiệp vụ độc lập, áp dụng nguyên tắc tách trách nhiệm giữa các lớp (routes/controller/service/repository) để giảm sự phụ thuộc chéo. Về bảo mật, hệ thống xác thực người dùng bằng JWT, mã hoá mật khẩu bằng bcrypt và kiểm soát truy cập theo vai trò (nhân viên mua hàng / quản lý). Hệ thống được kiểm thử theo từng luồng nghiệp vụ trọng yếu — đặc biệt là luồng tạo và duyệt đề xuất chi vì liên quan trực tiếp đến dòng tiền — trước khi triển khai thử nghiệm."));

children.push(H1("1.4. Đối tượng sử dụng"));
children.push(P("Hệ thống phục vụ hai nhóm người dùng chính là nhân viên mua hàng và quản lý (trưởng phòng/admin). Nhân viên mua hàng sử dụng hệ thống để phân tích vật tư cần mua theo từng hợp đồng, chọn nhà cung cấp phù hợp dựa trên bảng giá đã được chuẩn hoá, tạo đơn đặt mua, xác nhận nhập kho và tạo đề xuất chi khi cần thanh toán cho NCC."));
children.push(P("Quản lý sử dụng hệ thống để phê duyệt hoặc từ chối các đề xuất chi, quản lý danh mục nhà cung cấp cùng chính sách giá, theo dõi tồn kho vật tư và xem báo cáo, đối soát công nợ theo từng nhà cung cấp nhằm đảm bảo dòng tiền chi ra được kiểm soát chặt chẽ, minh bạch và có thể truy vết trách nhiệm phê duyệt. Nhà cung cấp là đối tượng được quản lý thông tin trong hệ thống (danh bạ, bảng giá, tài khoản ngân hàng) nhưng không trực tiếp thao tác trên phần mềm trong phạm vi đồ án."));

children.push(H1("1.5. Kiến trúc và mô hình phát triển hệ thống"));
children.push(H2("1.5.1. Kiến trúc hệ thống"));
children.push(P("Hệ thống được xây dựng theo kiến trúc ba tầng kết hợp RESTful API và mô hình Single Page Application. Tầng giao diện (frontend) được phát triển bằng React 18 kết hợp Vite làm công cụ build, Zustand quản lý trạng thái phía client và Axios gọi API, cho phép giao diện phản hồi nhanh và cập nhật dữ liệu linh hoạt mà không cần tải lại trang."));
children.push(P("Tầng xử lý nghiệp vụ (backend) được xây dựng bằng Node.js và Express, tổ chức theo hướng module hoá: mỗi nghiệp vụ — danh mục NCC, đề xuất mua hàng, kho, đề xuất chi — là một module riêng gồm bốn lớp routes, controller, service và repository. Backend expose các endpoint REST trả dữ liệu JSON, xác thực bằng JWT và kiểm soát quyền truy cập theo vai trò người dùng ngay tại tầng controller trước khi vào tầng nghiệp vụ."));
children.push(P("Tầng dữ liệu sử dụng PostgreSQL, được truy vấn trực tiếp thông qua driver pg ở tầng repository thay vì qua một lớp ORM trung gian. Cách tiếp cận này giúp kiểm soát chính xác các câu truy vấn phức tạp trong nghiệp vụ đối soát công nợ — vốn cần tổng hợp dữ liệu từ nhiều bảng (đề xuất mua, đề xuất chi, phiếu thanh toán) theo thời gian thực thay vì đọc từ một bảng số dư được lưu sẵn."));
children.push(H2("1.5.2. Mô hình phát triển"));
children.push(P("Dự án được phát triển theo mô hình Agile, lặp theo từng nhóm chức năng: danh mục NCC và bảng giá, đề xuất mua và kho, rồi đến đề xuất chi và đối soát công nợ. Mỗi vòng lặp đều trải qua đầy đủ các bước phân tích, thiết kế, lập trình và kiểm thử trước khi chuyển sang nhóm chức năng tiếp theo, giúp kiểm soát tiến độ và kịp thời điều chỉnh thiết kế khi phát hiện bất cập trong các vòng lặp trước."));

children.push(H1("1.6. Công cụ và công nghệ sử dụng để phát triển phần mềm"));
children.push(H2("1.6.1. Công cụ phát triển phần mềm"));
children.push(P("Em sử dụng Visual Studio Code làm môi trường phát triển chính cho cả backend và frontend, tận dụng hệ sinh thái extension phong phú cho JavaScript/Node.js và React. Git và GitHub được dùng để quản lý phiên bản mã nguồn, lưu lịch sử thay đổi theo từng module nghiệp vụ và hỗ trợ làm việc có kiểm soát trong suốt quá trình phát triển. DBeaver được sử dụng để thiết kế, truy vấn và kiểm tra dữ liệu trên PostgreSQL, còn Postman được dùng để kiểm thử các API trong quá trình xây dựng backend."));
children.push(H2("1.6.2. Công nghệ phát triển phần mềm"));
children.push(P("Hệ thống được phát triển trên nền tảng Node.js với framework Express theo kiến trúc module hoá, đảm bảo mỗi phân hệ nghiệp vụ được tách biệt và dễ bảo trì. Backend cung cấp API theo chuẩn RESTful, trao đổi dữ liệu dạng JSON; xác thực người dùng bằng JWT và mã hoá mật khẩu bằng bcrypt để đảm bảo an toàn thông tin."));
children.push(P("PostgreSQL được lựa chọn làm hệ quản trị cơ sở dữ liệu nhờ khả năng xử lý tốt các truy vấn quan hệ phức tạp, hỗ trợ ràng buộc toàn vẹn dữ liệu chặt chẽ — yếu tố quan trọng đối với nghiệp vụ có liên quan trực tiếp đến tiền như đề xuất chi và công nợ nhà cung cấp."));
children.push(P("Ở phía giao diện, hệ thống sử dụng React 18 theo mô hình Single Page Application, kết hợp Vite giúp rút ngắn thời gian build và tải trang, Zustand quản lý trạng thái ứng dụng gọn nhẹ thay cho các thư viện quản lý state phức tạp hơn, và Axios đảm nhiệm việc gọi API và xử lý dữ liệu trả về từ backend."));

const doc = new Document({
  sections: [
    {
      properties: {
        page: { size: { width: 11906, height: 16838 } },
      },
      children,
    },
  ],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync("F:/DATN/Chuong1_ERP_MuaHang_CongNoNCC.docx", buf);
  console.log("done");
});
