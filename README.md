# Xây dựng hệ thống ERP quản lý chuỗi cung ứng và thi công tích hợp trợ lý AI cho doanh nghiệp NST

Đồ án tốt nghiệp.

Hệ thống ERP cho doanh nghiệp NST (vật liệu hoàn thiện: cửa, sàn, tấm ốp): Node.js/Express + PostgreSQL + React (Vite, Zustand), tích hợp Gemini API:

- **Trợ lý sản phẩm** (Cửa, Sàn, Tấm ốp): khung chat nổi ở mọi màn hình, tư vấn cho Sale theo tài liệu kiến thức Admin soạn, hỏi bằng chữ hoặc ảnh.
- **Trợ lý Quản lý** (tình hình chăm sóc khách của Sale) và **trợ lý NCC** (giá nhập, chọn nhà cung cấp, công nợ NCC): dùng function calling. AI chỉ chọn công cụ và tham số; số liệu do truy vấn SQL chỉ đọc tính ra, nên AI không bịa được số.
- **AI nhận xét** báo cáo chăm sóc khách và phân tích giá NCC, có hậu kiểm số liệu.

Dữ liệu nhạy cảm không gửi ra dịch vụ AI:
- Khách chỉ được nhắc bằng mã `KH-<id>`, không kèm tên, SĐT, địa chỉ. Ghi chú của Sale được che SĐT và tên khách.
- Tên NCC được đổi thành `NCC-<id>`. Số tiền được đổi thành mã `[[Tn]]`, kể cả tên NCC (cả tên gọi tắt) và số tiền người dùng tự gõ trong câu hỏi.
- Câu trả lời của AI được đổi lại tên và số thật trước khi hiển thị.

## Cấu trúc

```
backend/            API REST (23 module), kiến trúc routes → controller → service → repository; test/ là bộ kiểm thử tự động
frontend/           Giao diện React (SPA)
sql/                schema.sql (cấu trúc CSDL), seed.sql (dữ liệu mẫu giả lập), migrations/ (các thay đổi CSDL theo thứ tự)
_hinh/              Sơ đồ cho báo cáo: PlantUML (biểu đồ trình tự) và script vẽ SVG (use case, lớp, mô hình CSDL)
_cong_cu_bao_cao/   Script vẽ bản thiết kế giao diện, chụp màn hình và chỉnh báo cáo Word (python-docx)
```

## Chạy ở máy local

Yêu cầu: Node.js 22+, PostgreSQL 16 đang chạy ở `localhost:5432`.

```bash
# 1. Backend
cd backend
npm install
cp .env.example .env        # sửa PG_PASSWORD, JWT_SECRET cho phù hợp
npm run db:reset            # tạo DB datn_erp từ sql/schema.sql + sql/seed.sql (dữ liệu nhỏ)
# hoặc: npm run db:reset:lon  # thêm ~1.500 đơn hàng + ~150 khách đang chăm sóc, giả lập 12 tháng
# DB đã có dữ liệu: npm run db:migrate  # áp các file sql/migrations (chỉ thêm, không xoá)
npm run dev                 # http://localhost:4000

# 2. Frontend (mở terminal khác)
cd frontend
npm install
npm run dev                 # http://localhost:5173
```

`npm run db:migrate` chỉ chạy các migration chưa chạy (ghi trong bảng `schema_migrations`). DB tạo bằng `db:reset` đã được đánh dấu đủ migration.

**Trợ lý AI**:
- Tạo API key miễn phí tại Google AI Studio, rồi thêm `GEMINI_API_KEY=...` vào `backend/.env`.
- `.env.example` đặt model chính là `GEMINI_MODEL=gemini-3.5-flash-lite`, model dự phòng là `GEMINI_MODEL_DU_PHONG=gemini-3.8-flash` (dùng khi model chính quá tải hoặc quá thời gian). Bỏ trống `GEMINI_MODEL` thì code dùng `gemini-3.8-flash`.
- Không có key thì phần còn lại vẫn chạy bình thường, chỉ các nút AI báo chưa cấu hình.
- Nạp tài liệu kiến thức mẫu cho trợ lý sản phẩm: `npm run db:nap-kien-thuc`. Lệnh này chỉ điền trợ lý còn trống; thêm `-- --ghi-de` để ghi đè.
- Trợ lý Quản lý (quyền `tro_ly.quan_ly`) và trợ lý NCC (quyền `tro_ly.ncc`) mặc định chỉ Admin dùng được. Cấp thêm cho vai trò khác ở trang Phân quyền.

**Duyệt chi qua Telegram** (không bắt buộc):
- Tạo bot bằng @BotFather để lấy `TELEGRAM_BOT_TOKEN`, rồi thêm bot vào nhóm duyệt.
- Điền `TELEGRAM_CHAT_ID_DUYET` và `TELEGRAM_NGUOI_DUYET` (username được bấm Duyệt) vào `backend/.env`.
- Chạy trên máy cá nhân thì để `TELEGRAM_CHE_DO=polling`.
- Không cấu hình thì Admin duyệt trên web.

**Đối soát ngân hàng** (không bắt buộc):
- Đặt `NGAN_HANG_WEBHOOK_KEY` trong `backend/.env`.
- Cấu hình webhook SePay gọi `POST /api/ngan-hang/webhook` với header `Authorization: Apikey <khoá>`.
- Tiền về được khớp với đơn theo mã đơn trong nội dung chuyển khoản. Nếu có phiếu thu đang chờ đúng số tiền thì phiếu đó được xác nhận; nếu không thì tạo phiếu mới. Giao dịch chưa khớp được báo cho Kế toán.

**Sao lưu**:
- Backend tự sao lưu CSDL và ảnh bill hằng ngày (mặc định 2 giờ sáng, giữ 7 bản gần nhất; xem các biến `SAO_LUU_*`).
- Chạy tay: `npm run db:sao-luu`.
- Khôi phục vào một database mới (không ghi đè DB đang chạy): `npm run db:khoi-phuc -- <file .dump> [ten_db_moi]`.

Tài khoản demo: mật khẩu là tên tài khoản + `123456` (ví dụ `thilan123456`).

| Vai trò | Tài khoản |
|---|---|
| Kinh doanh (Sale) | `thilan`, `vanhung` (dữ liệu lớn thêm: `minhtuan`, `thuha`, `ducanh`, `ngocmai`, `quocbao`, `thanhhuong`) |
| Vận hành | `vannam` (dữ liệu lớn: `thithao`, `minhkhoa`) |
| Kế toán | `thihong` (dữ liệu lớn: `vanduc`) |
| Admin | `ngocson` |

## Tiến độ

- [x] Thiết kế CSDL: 42 bảng, 1 view, 20 trigger; thay đổi qua 39 migration
- [x] Đăng nhập (JWT + bcrypt), phân quyền theo vai trò
- [x] Đơn hàng: danh sách, tạo đơn, chi tiết, phương án vận chuyển – thi công, yêu cầu chỉnh sửa
- [x] Khách hàng: trạng thái chăm sóc, lịch sử chăm sóc
- [x] ~~Lên đơn nhanh bằng AI~~ (đã bỏ) → thay bằng trợ lý AI theo sản phẩm: khung chat nổi ở mọi màn hình, hỏi bằng chữ hoặc ảnh, Admin soạn kiến thức
- [x] Sản phẩm quan tâm của khách (tự suy từ nhu cầu + đơn đã đặt), đơn hàng lưu sản phẩm chính
- [x] Xác thực 2 lớp (TOTP) bật/tắt theo từng vai trò
- [x] Form nhập đơn đầy đủ: hình thức đơn, giá bán, chiết khấu, cọc, % tạm ứng, đơn nháp → chốt đơn
- [x] Điều khoản nghiệm thu, loại thi công + kích thước từng dòng, link báo giá gửi khách (không cần đăng nhập)
- [x] Bộ lọc danh sách đơn hàng nhiều điều kiện (lọc ở server, lưu trên URL)
- [x] Tiến độ đơn hàng: máy trạng thái 8 bước (Hoàn thiện) / 5 bước (Vật tư), lịch sử, huỷ đơn
- [x] NCC & bảng giá (giá lưu theo thời gian, so sánh giá, ràng buộc EXCLUDE chống chồng thời gian)
- [x] Phân tích vật tư bán chạy & giá NCC, trợ lý AI nhận xét (có hậu kiểm số liệu)
- [x] Mua hàng (gợi ý NCC rẻ nhất, chụp giá lúc mua, nhận đủ hàng tự chuyển bước)
- [x] Thi công & nghiệm thu (lịch đội thợ, biên bản nghiệm thu, tự đẩy tiến độ đơn)
- [x] Mua hàng / Thi công – nghiệm thu – quyết toán / Đề xuất chi & công nợ làm lại theo luồng ERP thực tế (mua theo dòng, cọc/quyết toán NCC, công thợ, bill bắt buộc)
- [x] Công nợ NCC + thợ, duyệt chi qua Telegram, VietQR
- [x] Quản trị người dùng (thu hồi phiên ngay khi khoá/đổi vai trò), đổi mật khẩu, chặn dò mật khẩu
- [x] Danh mục vật tư (ngừng kinh doanh = ẩn), trang Tổng quan theo vai trò
- [x] Tự động phân Vận hành phụ trách khi chốt đơn (ít việc nhất), chỉ người phụ trách + Admin thao tác, Admin chuyển phụ trách có lịch sử
- [x] Trạng thái dòng mua hàng tự động; tự lập đề xuất quyết toán khi NCC báo sẵn hàng
- [x] Thông báo trong hệ thống (nút chuông): thao tác xong báo người liên quan
- [x] Đặt hàng NCC (gửi nhóm Telegram NCC / chép gửi Zalo), NCC cho xuất hoặc yêu cầu cọc → tự lập đề xuất cọc/quyết toán
- [x] Công nợ khách hàng: phiếu thu (Kế toán xác nhận tiền về), điều kiện tạm ứng trước giao hàng, QR thu tiền
- [x] Nhập số khách tiềm năng (Excel .xlsx / CSV / TXT, API đẩy số tự động), chia số cho Sale theo tỷ lệ, chuyển số bắt buộc ghi lý do
- [x] Báo cáo chăm sóc khách theo Sale (tốc độ gọi, tỷ lệ liên hệ / chốt, tồn đọng) + AI nhận xét, lưu nhật ký các lần phân tích
- [x] Trợ lý AI Quản lý và trợ lý AI NCC (function calling, truy vấn chỉ đọc), ẩn danh tên NCC, số tiền, thông tin khách trước khi gửi AI
- [x] Đối soát ngân hàng qua webhook SePay: tiền về tự khớp phiếu thu theo mã đơn
- [x] Báo cáo lãi/lỗ theo đơn; xuất Excel (lãi/lỗ, danh sách đơn, đề xuất chi)
- [x] Phân quyền theo chức năng: 30 quyền, Admin bật/tắt cho từng vai trò
- [x] Nhật ký thay đổi dữ liệu: trigger ghi thêm / sửa / xoá trên 18 bảng (ai làm, qua kênh nào, dữ liệu trước / sau)
- [x] Sao lưu CSDL + ảnh bill tự động hằng ngày, khôi phục bằng lệnh
- [x] Bộ kiểm thử tự động 169 ca (`cd backend && npm test`, báo cáo: `npm run test:bao-cao`)
