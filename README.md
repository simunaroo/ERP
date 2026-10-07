# Xây dựng hệ thống ERP quản lý chuỗi cung ứng và thi công tích hợp trợ lý AI cho doanh nghiệp NST

Đồ án tốt nghiệp.

Hệ thống ERP cho doanh nghiệp NST: Node.js/Express + PostgreSQL + React (Vite, Zustand), tích hợp trợ lý AI (Gemini API) hỗ trợ nhập đơn hàng.

## Cấu trúc

```
backend/    API REST, kiến trúc routes → controller → service → repository
frontend/   Giao diện React (SPA)
sql/        schema.sql (cấu trúc CSDL), seed.sql (dữ liệu mẫu giả lập)
_hinh/      Mã nguồn sơ đồ UML (PlantUML) và mockup giao diện cho báo cáo
```

## Chạy ở máy local

Yêu cầu: Node.js 20+, PostgreSQL 16 đang chạy ở `localhost:5432`.

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

Duyệt chi qua Telegram (không bắt buộc): tạo bot bằng @BotFather lấy `TELEGRAM_BOT_TOKEN`, thêm bot vào nhóm duyệt, điền `TELEGRAM_CHAT_ID_DUYET`, `TELEGRAM_NGUOI_DUYET` (username được bấm Duyệt) vào `backend/.env`; chạy máy cá nhân để `TELEGRAM_CHE_DO=polling`. Không cấu hình thì Admin duyệt trên web.

`npm run db:migrate` chỉ chạy migration chưa chạy (ghi trong bảng `schema_migrations`); DB tạo bằng `db:reset` đã được đánh dấu đủ migration.

Trợ lý AI: tạo API key miễn phí tại Google AI Studio, thêm `GEMINI_API_KEY=...` vào `backend/.env`; `GEMINI_MODEL` (mặc định `gemini-3.8-flash`) và `GEMINI_MODEL_DU_PHONG` dùng khi model chính quá tải. Không có key thì phần còn lại vẫn chạy bình thường, chỉ các nút AI báo chưa cấu hình.

Tài khoản demo — mật khẩu là tên tài khoản + `123456` (ví dụ `doanha123456`):

| Vai trò | Tài khoản |
|---|---|
| Kinh doanh (Sale) | `doanha`, `doanhb` (dữ liệu lớn: đến `doanhh`) |
| Vận hành | `hanha` (dữ liệu lớn: `hanhb`, `hanhc`) |
| Kế toán | `toana` (dữ liệu lớn: `toanb`) |
| Admin | `ngocson` |

## Tiến độ

- [x] Thiết kế CSDL (20 bảng)
- [x] Đăng nhập (JWT + bcrypt), phân quyền theo vai trò
- [x] Đơn hàng: danh sách, tạo đơn, chi tiết, phương án vận chuyển – thi công, yêu cầu chỉnh sửa
- [x] Khách hàng: trạng thái chăm sóc, lịch sử chăm sóc
- [x] Lên đơn nhanh bằng AI: đọc ảnh tin nhắn/phiếu ghi tay khi khách chốt; kèm nhập đơn thủ công
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
