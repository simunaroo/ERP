# Nhật ký phát triển

Mỗi vòng lặp ghi: mục tiêu, đã làm, yêu cầu thay đổi (và lý do), quyết định thiết kế, báo cáo cần cập nhật.
Đây là nguyên liệu cho mục 1.5.2 (mô hình Agile) và phần Kết luận của báo cáo.

---

## Vòng 0 — Phân tích & thiết kế (30/09 – 02/10/2026)

**Mục tiêu:** chốt phạm vi, actor, thiết kế CSDL, viết Chương 1–2.

**Đã làm**
- Chốt phạm vi: ERP chuỗi cung ứng & thi công, 5 module (Đơn hàng, NCC & bảng giá, Mua hàng, Thi công, Công nợ NCC + duyệt chi qua Telegram).
- Actor: Sale, Vận hành, Kế toán, Admin; nhóm duyệt Telegram là actor phụ. Khách hàng, NCC, đội thợ chỉ là dữ liệu.
- Thiết kế CSDL 20 bảng (`sql/schema.sql`), chạy thử thành công trên PostgreSQL 16.
- Viết Chương 1, Chương 2 kèm 29 hình (use case, trình tự, lớp, ERD, mockup).

**Yêu cầu thay đổi**
- Bỏ module Kho: hàng mua ngoài được NCC giao thẳng đến công trình, hệ thống chỉ cần quản lý công nợ.
- Đổi cách trình bày đề tài thành "xây dựng mới từ đầu", không mô tả là sửa lại hệ thống đang chạy.

**Quyết định thiết kế**
- Loại vật tư (tự sản xuất / mua ngoài) lưu thành dữ liệu, không hard-code, để thêm sản phẩm mới mà không sửa code.
- Đơn giá được chụp lại (snapshot) vào đề xuất mua tại thời điểm mua, nên NCC đổi giá sau đó không ảnh hưởng lịch sử.
- Không có bảng số dư công nợ: công nợ = tổng đã mua − tổng đã trả, tính trực tiếp khi truy vấn.
- Dùng ENUM của PostgreSQL cho trạng thái và vai trò, để DB tự chặn giá trị sai.

---

## Vòng 1 — Đăng nhập + Đơn hàng (05/10/2026)

**Mục tiêu:** có app chạy được từ giao diện tới DB cho module đầu tiên.

**Đã làm**
- Backend Express theo kiến trúc routes → controller → service → repository; đăng nhập JWT + bcrypt; middleware phân quyền theo vai trò.
- Frontend React + Vite + Zustand: đăng nhập, danh sách đơn, tạo đơn, chi tiết đơn (Vận hành cập nhật phương án, Sale gửi yêu cầu sửa).
- `sql/seed.sql`: dữ liệu mẫu nhỏ; `npm run db:reset:lon`: sinh khoảng 1.500 đơn giả lập trong 12 tháng, nhất quán nghiệp vụ.
- Kiểm thử: 12 kịch bản API + luồng giao diện thật.

**Yêu cầu thay đổi (phát hiện khi chạy thử với dữ liệu lớn)**
- Danh sách tải cả 1.503 đơn một lần (346 KB) → thêm phân trang, tìm kiếm phía server.
- Use case có "xử lý yêu cầu chỉnh sửa" nhưng code thiếu → thêm endpoint và nút cho Vận hành.
- Điện thoại không có menu → thêm menu trượt.
- Giao diện đổi sang phong cách ERP chính thức của doanh nghiệp (sidebar kem, breadcrumb, chế độ tối).

**Quyết định thiết kế**
- Không sao chép dữ liệu thật của công ty vì chứa dữ liệu cá nhân; dùng dữ liệu giả lập sinh bằng script.
- Mã đơn sinh trong transaction có `pg_advisory_xact_lock`, tránh 2 người tạo đơn cùng lúc bị trùng mã.
- Màu giao diện dùng biến CSS nên chế độ tối chỉ cần đổi biến.

**Báo cáo cần cập nhật**
- Chương 2, mục 2.9: thay mockup sidebar xanh bằng ảnh chụp giao diện thật.
- Chương 3: viết phần cài đặt module Đăng nhập + Đơn hàng, kèm bảng test case.

---

## Vòng 2 — Trợ lý AI nhập đơn (05 – 06/10/2026)

**Mục tiêu:** đáp ứng yêu cầu tích hợp AI. Đổi tên đề tài thành *"Xây dựng hệ thống ERP quản lý chuỗi cung ứng và thi công có trợ lý AI hỗ trợ nghiệp vụ cho doanh nghiệp NST"*.

**Đã làm**
- Endpoint `POST /api/tro-ly/trich-xuat-don` (chỉ Sale): nhận tin nhắn khách, gọi Gemini API, trả về bản nháp đơn hàng (khách hàng, địa chỉ, vật tư, số lượng, ghi chú) kèm danh sách cảnh báo.
- Khung "Trợ lý AI nhập đơn" ở trang Tạo đơn: dán tin nhắn → Trích xuất → form được điền sẵn, Sale kiểm tra rồi tự bấm Lưu.
- Kiểm thử 6 ca bằng phản hồi Gemini giả lập: khớp theo SĐT, theo tên không dấu, chặn id vật tư AI tự bịa, khách của Sale khác, lỗi đầu vào, thiếu key, hết lượt gọi.

**Quyết định thiết kế**
- Chọn Gemini vì có gói miễn phí đủ cho demo. Lời gọi API tách riêng ở `integrations/gemini.client.js`, đổi nhà cung cấp thì chỉ sửa file này.
- **Không gửi danh sách khách hàng sang Google.** AI chỉ nhận tin nhắn và danh mục vật tư; việc khớp khách hàng (SĐT trước, tên sau) làm trong DB của chính Sale đó.
- Dùng structured output (`responseSchema`) để AI bắt buộc trả JSON đúng cấu trúc, `temperature: 0` để kết quả ổn định.
- Không tin tuyệt đối vào AI: backend kiểm tra lại mọi `vat_tu_id`, số lượng; AI chỉ tạo bản nháp, không tự ghi đơn (human-in-the-loop).

**Báo cáo cần cập nhật**
- Chương 1: tên đề tài, mục 1.1 (lý do tích hợp AI), mục 1.6.2 (Gemini API, structured output).
- Chương 2: thêm actor phụ "Dịch vụ AI (Gemini)", use case "Trích xuất đơn hàng bằng AI" + đặc tả, sơ đồ trình tự; yêu cầu phi chức năng về bảo vệ dữ liệu khi gọi AI.

---

## Vòng 3 — (dự kiến) Giai đoạn đơn hàng + NCC & bảng giá

**Đề xuất đang cân nhắc**
- Thêm cột `giai_doan` cho đơn hàng: Mới → Lên phương án → Mua hàng → Chờ giao hàng → Thi công → Nghiệm thu → Hoàn tất (+ Huỷ). Chỉ Service được chuyển giai đoạn, theo luật chuyển hợp lệ.
