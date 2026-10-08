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

**Mục tiêu:** đáp ứng yêu cầu tích hợp AI. Đổi tên đề tài thành *"Xây dựng hệ thống ERP quản lý chuỗi cung ứng và thi công tích hợp trợ lý AI cho doanh nghiệp NST"* (06/10/2026; bỏ cụm "hỗ trợ nghiệp vụ" vì AI hiện chỉ làm nhập đơn, tránh hứa rộng hơn thực tế).

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

**Thay đổi yêu cầu (06/10/2026): AI gắn vào luồng chăm sóc khách**
- Thêm trạng thái chăm sóc khách hàng (Mới → Đang tư vấn → Đã báo giá → Chốt / Không mua) và lịch sử chăm sóc (bảng `khach_hang_cham_soc`, migration `001`).
- Khi Sale chuyển khách sang **Chốt**, hệ thống hỏi "Lên đơn ngay?": **✨ Lên đơn nhanh bằng AI** / **Nhập đơn thủ công** / **Để sau**.
- "Lên đơn nhanh bằng AI" nhận **ảnh** (tối đa 3 ảnh: chụp tin nhắn, phiếu ghi tay, bảng khối lượng; chọn file, kéo thả hoặc Ctrl+V) và/hoặc ghi chú, gọi Gemini đọc ảnh rồi điền sẵn form. Trang Tạo đơn có 2 tab: AI và thủ công.
- Kiểm thử: 12 kịch bản API khách hàng + 7 kịch bản kiểm tra ảnh + luồng giao diện đầy đủ (chốt khách → hộp thoại → tải ảnh → AI điền form → chặn lưu khi còn dòng chưa khớp → lưu đơn).

**Quyết định thiết kế bổ sung**
- Đi từ hồ sơ khách đã chốt thì khách hàng **đã biết**: không cần AI nhận diện khách, prompt dặn AI bỏ qua tên/SĐT.
- Ảnh được **thu nhỏ trên trình duyệt** (cạnh dài 1600 px, JPEG) trước khi gửi: giảm dung lượng tải lên và số token AI phải đọc.
- Chỉ route `/api/tro-ly` được nhận body tới 15 MB; các route khác giữ giới hạn 100 KB. Backend kiểm tra lại định dạng (JPG/PNG/WEBP), dung lượng (≤ 4 MB/ảnh), số ảnh.
- Cập nhật trạng thái chăm sóc và ghi lịch sử trong **cùng một transaction**, nên không bao giờ có trạng thái mà thiếu lịch sử.
- Dòng vật tư AI chưa khớp danh mục được tô vàng; không cho lưu đơn khi còn dòng như vậy, tránh mất vật tư mà không ai để ý.

**Báo cáo cần cập nhật thêm**
- Chương 2: use case "Chăm sóc khách hàng" (cập nhật trạng thái), "Lên đơn nhanh bằng AI" (đầu vào là ảnh), bảng `khach_hang_cham_soc`, ENUM `trang_thai_cham_soc_enum`, ERD.

---

## Vòng 2.1 — Form nhập đơn theo nghiệp vụ thực tế (06/10/2026)

**Mục tiêu:** form nhập đơn sát với form Sale đang dùng ở doanh nghiệp.

**Khảo sát:** chỉ đọc *cấu trúc bảng* (`customers.don_hang_chot`, `don_hang_chot_chi_tiet`) và *số liệu tổng hợp* của hệ thống thật, không đọc dữ liệu khách hàng. Phát hiện: ERP thật không có form tạo đơn trên web; đơn đi từ một app form riêng của Sale rồi đồng bộ sang. Trung bình 2 dòng vật tư/đơn (tối đa 22); 87% đơn có tệp sơ đồ mặt bằng; tỷ lệ hình thức khoảng 384 Hoàn thiện / 221 Vật tư.

**Đã làm**
- Migration `002` (trạng thái `nhap`), `003` (hình thức đơn, nhóm khách, địa chỉ 2 cấp, giá bán từng dòng, phí VC, phụ thu, chiết khấu, cọc, % tạm ứng, điều khoản nghiệm thu, ghi chú VC), `004` (VIEW `v_don_hang_tien`).
- **Đơn nháp**: Sale lưu dần, chỉ mình thấy; "Chốt đơn" mới chuyển Vận hành (trạng thái `moi`, ghi ngày chốt) và khoá sửa trực tiếp. Xoá được đơn nháp.
- Form tạo/sửa dùng chung: khách & hình thức, địa chỉ, vật tư có đơn giá + thành tiền + ghi chú, thanh toán & vận chuyển, ô tổng tiền cập nhật trực tiếp. AI đọc được cả đơn giá trong ảnh báo giá.
- Đơn "Vật tư": nhãn đổi thành ngày yêu cầu giao hàng, ẩn thi công/nghiệm thu; dữ liệu sinh ra không có bản ghi thi công.

**Quyết định thiết kế (sửa những chỗ lộn xộn của hệ thống thật)**
- Điều khoản thanh toán là ô chữ tự do ở hệ thống thật, cùng một ý bị gõ hơn 20 kiểu (`80`, `0.8`, `8020`, `80-20%`...). Thiết kế lại: lưu **một con số** `ty_le_tam_ung`, câu điều khoản sinh tự động.
- Nhóm khách lưu trùng trên từng đơn và lẫn hoa/thường ("Nhà dân"/"Nhà Dân") → chuyển thành thuộc tính ENUM của **khách hàng**.
- Địa chỉ theo đơn vị hành chính **2 cấp** (tỉnh – phường/xã, hiệu lực 01/07/2025), danh sách 34 tỉnh/thành; hệ thống thật vẫn còn quận/huyện.
- Tiền đơn hàng không lưu cứng: VIEW `v_don_hang_tien` là nguồn tính duy nhất (danh sách, chi tiết, sau này công nợ). Frontend chỉ tính để xem trước.
- Điều kiện chốt đơn kiểm tra ở Service: đủ tỉnh/thành, địa chỉ, ≥1 vật tư, mọi dòng có giá, đơn hoàn thiện phải có ngày lắp đặt.

**Lỗi phát hiện khi kiểm thử & bài học**
- Đọc lại đơn **bên trong** transaction qua pool → nhận dữ liệu cũ (kết nối khác chưa thấy thay đổi chưa commit). Sửa: đọc lại sau khi commit. Bài học về *transaction isolation*.
- Cột `DATE` bị thư viện `pg` đổi sang giờ UTC → lùi 1 ngày ở Việt Nam. Sửa: giữ nguyên chuỗi `YYYY-MM-DD` (`pg.types.setTypeParser`).
- Trên điện thoại trang tràn ngang do lưới `1fr` bị bảng ép giãn và radio ẩn định vị sai. Sửa: `minmax(0, 1fr)`, thẻ cha `position: relative`.

**Báo cáo cần cập nhật**
- Chương 2: bảng `don_hang`, `don_hang_vat_tu`, `khach_hang` (cột mới), VIEW `v_don_hang_tien`, ENUM mới; use case Tạo đơn chia "Lưu nháp"/"Chốt đơn", thêm "Sửa/Xoá đơn nháp"; ERD.

---

## Vòng 2.2 — Nghiệm thu, thi công từng dòng, link báo giá (06/10/2026)

**Mục tiêu:** bù 3 điểm còn thiếu so với form Sale đang chạy (app `DON-HANG-APP` trên máy chủ nội bộ, chỉ đọc mã nguồn để so sánh, không chép mã, không đọc dữ liệu/tệp cấu hình).

**Đã làm**
- Migration `005`: ENUM `dieu_khoan_nghiem_thu_enum` (Vật tư tiêu hao / Số m² thi công / Theo hợp đồng) — đổi cột chữ cũ sang ENUM có ánh xạ dữ liệu cũ; ENUM `loai_thi_cong_enum`; cột `loai_thi_cong`, `dai_mm`, `rong_mm` cho từng dòng vật tư; cột `bao_gia_token`, `bao_gia_tao_luc` cho đơn.
- Form: nghiệm thu là ô chọn, áp dụng cho cả 2 hình thức, gợi ý mặc định theo hình thức (Vật tư → vật tư tiêu hao, Hoàn thiện → số m²); đổi hình thức chỉ đổi gợi ý khi Sale chưa tự chọn khác. Bắt buộc khi chốt đơn.
- Mỗi dòng vật tư có loại thi công + kích thước dài × rộng (mm). AI cũng trích xuất 2 thông tin này (vẫn kiểm tra lại ở server).
- **Link báo giá** gửi khách: Sale phụ trách tạo link `/bao-gia/<mã>`; khách mở không cần đăng nhập, xem/in được trên điện thoại. "Tạo link mới" thu hồi link cũ.

**Quyết định thiết kế**
- Hệ thống thật dùng link `/bao-gia/<id đơn>` — id là số tăng dần nên **ai cũng đoán được báo giá của khách khác** (lộ tên, địa chỉ, giá). Thiết kế lại: mã ngẫu nhiên 192 bit (`crypto.randomBytes(24)`), cột `UNIQUE`, có thể thu hồi. Đây là lỗi *IDOR* (Insecure Direct Object Reference) — đã ghi nhận để báo lại doanh nghiệp.
- API công khai chỉ trả các trường dành cho khách (liệt kê tường minh trong câu SELECT), không trả id, phương án nội bộ, nguồn gốc vật tư, SĐT. Mã sai định dạng trả 404 ngay, không truy vấn DB.
- Báo giá đọc số liệu *hiện tại* của đơn (không chụp lại) — đơn giản, nhưng nếu đơn đổi giá thì báo giá đổi theo. Ghi rõ trên trang.

**Kiểm thử:** 20 ca API (thiếu nghiệm thu không chốt được, giá trị ENUM sai/kích thước âm → 400, sale khác/vận hành không tạo được link → 403, không lộ trường nội bộ, link cũ → 404 sau khi tạo lại, đoán id số → 404) + chụp giao diện desktop/điện thoại.

**Lỗi phát hiện & bài học**
- Trang báo giá trên điện thoại vẫn tràn bảng dù đã ẩn cột: quy tắc chung `td { white-space: nowrap }` trong media query mobile áp cho mọi bảng. Bài học: CSS toàn cục ảnh hưởng trang mới — ghi đè theo phạm vi `.bao-gia td`.

**Báo cáo cần cập nhật**
- Chương 2: 2 ENUM + cột mới, use case "Tạo link báo giá" (Sale) và "Xem báo giá" (Khách – tác nhân ngoài hệ thống), mục bảo mật (IDOR, token ngẫu nhiên).

---

## Vòng 2.3 — Tài khoản demo + bộ lọc đơn hàng (06/10/2026)

**Đã làm**
- Nhân viên demo đặt tên theo bộ phận (Kinh Doanh A, Vận Hành A, Kế Toán A; Admin: Vương Ngọc Sơn). Tài khoản = tên đệm + tên không dấu (`doanha`, `ngocson`), mật khẩu = tài khoản + `123456`, mỗi người một hash bcrypt riêng.
- Danh sách đơn có nút **⛃ Lọc (n)** giống ERP: hình thức, nhóm khách, Sale (ẩn với vai trò Sale), tỉnh/thành, nghiệm thu, công nợ (còn phải thu / đã đủ), khoảng ngày chốt, khoảng ngày lắp đặt, khoảng tổng đơn; chip hiển thị điều kiện đang lọc, bỏ từng cái; sắp xếp 5 kiểu; thêm cột "Còn phải thu".

**Quyết định thiết kế**
- ERP thật tải *toàn bộ* đơn về trình duyệt rồi lọc bằng JavaScript — chậm dần khi dữ liệu lớn. Ở đây lọc **trên server** (SQL `WHERE` + phân trang), trình duyệt chỉ nhận 20 dòng.
- Điều kiện lọc lưu trên **URL** thay vì localStorage: Back/Forward đúng, gửi link cho đồng nghiệp là thấy đúng danh sách đã lọc.
- Giá trị lọc truyền bằng tham số `$n` (chống SQL injection). Riêng `ORDER BY` không dùng được tham số nên chỉ nhận khoá trong danh sách trắng (`moi_nhat`, `tong_giam`...).
- Sale gửi `sale_id` của người khác vẫn chỉ thấy đơn của mình — quyền xác định từ token ở server, không tin tham số client.
- Bảng lọc là bản nháp, bấm "Áp dụng" mới gọi API (tránh gọi API mỗi lần gõ một chữ số ngày/tiền).

**Kiểm thử:** 14 ca API, đối chiếu số đơn của từng bộ lọc với câu SQL đếm trực tiếp trên dữ liệu lớn; chụp giao diện desktop/điện thoại.

---

## Vòng 2.4 — Tiến độ đơn hàng (máy trạng thái) (06/10/2026)

**Mục tiêu:** thanh tiến độ trên trang đơn hàng giống ERP, nhưng đặt lại tên bước cho rõ nghĩa và có luật chuyển bước.

**Đặt lại tên so với ERP**

| ERP | Đồ án | Lý do |
|---|---|---|
| Đơn hàng | Chốt đơn | Cả hệ thống đều là "đơn hàng"; mốc thật là lúc Sale chốt |
| Bảng hỏi | Lên phương án | Nội dung bước là chốt phương án vận chuyển – thi công |
| KLVT | Bóc khối lượng | Viết tắt nội bộ, người ngoài không hiểu |
| Vận chuyển | Giao hàng | Mốc là hàng đến công trình |
| Thanh toán thợ / lái xe | (gộp vào Quyết toán) | Trả thợ/nhà xe là một phần đối chiếu chi phí cuối đơn |
| — | Nghiệm thu (thêm) | Căn cứ thu nốt tiền theo điều khoản, phải là mốc riêng |

- Hoàn thiện: Chốt đơn → Lên phương án → Bóc khối lượng → Mua hàng → Giao hàng → Thi công → Nghiệm thu → Quyết toán (8 bước). Vật tư: Chốt đơn → Lên phương án → Mua hàng → Giao hàng → Quyết toán (5 bước). Huỷ được trước khi giao hàng.
- **Thanh toán không phải một bước**: tiền thu rải rác (cọc → tạm ứng khi giao → phần còn lại sau nghiệm thu) nên là trục riêng (cột "Còn phải thu"), không xếp vào chuỗi.

**Đã làm**
- Migration `006` (trạng thái `huy` — tách file vì giá trị ENUM mới chưa dùng được trong cùng transaction), `007` (ENUM + cột `giai_doan`, bảng lịch sử `don_hang_giai_doan_log`, suy giai đoạn đơn cũ từ dữ liệu mua hàng/thi công).
- Service: chuyển tiếp / lùi bước (bắt buộc lý do) / huỷ (bắt buộc lý do). Quyền theo bước: Vận hành xử lý các bước, **Quyết toán thuộc Kế toán**; Sale chỉ xem. Rời "Lên phương án" phải có phương án vận chuyển (+ thi công với đơn Hoàn thiện).
- Giao diện: stepper (xong ✓ xanh / đang làm xanh dương / huỷ ✕ đỏ, tự cuộn tới bước hiện tại trên điện thoại), nút chuyển bước, lịch sử; danh sách có cột Tiến độ (nhãn + thanh %) và lọc theo tiến độ.

**Quyết định thiết kế**
- ERP tính tiến độ *tự động* từ dữ liệu (có bảng hỏi chưa, có phiếu xuất chưa…) + cho ghi đè tay. Đồ án chưa có các module đó nên dùng **máy trạng thái tường minh**: bảng `buoc kế tiếp hợp lệ` + kiểm tra ở Service; khi làm module Mua hàng/Thi công sẽ cho các module này tự đẩy bước.
- **Khoá lạc quan**: `UPDATE ... WHERE id = $1 AND giai_doan = <bước đang thấy>` — hai người bấm cùng lúc thì người sau nhận 409 thay vì cùng ghi đè (đã test bấm đồng thời).
- **Ràng buộc CHECK ở CSDL**: đơn nháp không có giai đoạn, đơn đã chốt bắt buộc có; đơn Vật tư không thể ở bước Thi công/Nghiệm thu — kể cả khi code có bug.

**Kiểm thử:** 27 ca API (đi hết quy trình Hoàn thiện và Vật tư, sai quyền, thiếu phương án, lùi/huỷ thiếu lý do, huỷ sau giao hàng, bấm đồng thời, CHECK của CSDL, lọc theo tiến độ) + kiểm tra lịch sử sinh trong dữ liệu lớn khớp giai đoạn hiện tại và đúng thứ tự thời gian.

**Lỗi phát hiện & bài học**
- Dữ liệu giả: đơn tạo sau mốc "hôm nay" giả lập bị giới hạn thời gian → bước sau sớm hơn bước trước. Phát hiện nhờ câu SQL đối chiếu "log cuối = giai đoạn hiện tại". Bài học: dữ liệu sinh ra cũng cần được kiểm tra bằng truy vấn.

---

## Vòng 3.1 — Module Nhà cung cấp & bảng giá (06/10/2026)

**Đã làm**
- API `/api/nha-cung-cap`: danh sách (tìm theo tên/MST, lọc trạng thái), chi tiết, thêm/sửa, ngừng hợp tác (xoá mềm), tài khoản ngân hàng, cập nhật giá, ngừng cung cấp mặt hàng, **so sánh giá tại một ngày** (dùng lại cho module Mua hàng).
- Giao diện: danh sách NCC, chi tiết (thông tin, STK, bảng giá + lịch sử từng mặt hàng), tab So sánh giá (rẻ nhất, các NCC khác, % chênh lệch, đổi ngày để xem giá quá khứ).
- Phân quyền: Kế toán/Admin sửa; Vận hành chỉ xem; Sale không thấy menu. Số tài khoản bị che (`••••7890`) với người không làm thanh toán.

**Quyết định thiết kế**
- **Giá lưu theo thời gian** (kiểu SCD loại 2): cập nhật giá = đóng giá cũ (hết hiệu lực trước ngày mới 1 ngày) + thêm dòng mới; không sửa/xoá giá cũ → tra được "ngày X mua của NCC này giá bao nhiêu". Không cho nhập giá hồi tố trước giá đang áp dụng.
- **CSDL tự chặn giá chồng thời gian**: ràng buộc `EXCLUDE USING gist (ncc_id =, vat_tu_id =, daterange(...) &&)` (extension `btree_gist`). UNIQUE chỉ chặn trùng *giá trị*, EXCLUDE chặn trùng *khoảng*.
- Hai kế toán cập nhật cùng lúc: `SELECT ... FOR UPDATE` khoá dòng giá đang mở, người sau phải đợi rồi bị từ chối (đã test) — khoá bi quan, khác khoá lạc quan ở module tiến độ.
- NCC không xoá cứng vì đề xuất mua/công nợ tham chiếu → chỉ "ngừng hợp tác"; NCC ngừng hợp tác tự biến khỏi bảng so sánh.
- Mã số thuế không trùng: `UNIQUE INDEX ... WHERE ma_so_thue IS NOT NULL` (unique một phần, cho phép nhiều NCC chưa có MST).

**Kiểm thử:** 24 ca API (phân quyền, MST sai/trùng, che STK, đóng giá cũ đúng ngày, giá hồi tố, cập nhật đồng thời, EXCLUDE ở CSDL, tra giá quá khứ, NCC ngừng hợp tác) + chụp giao diện.

**Lỗi phát hiện & bài học**
- Migration 008 chạy lần 2 bị lỗi: ràng buộc EXCLUDE tạo kèm một *index* cùng tên nên PostgreSQL báo `duplicate_table` (42P07), không phải `duplicate_object`. Bài học: test migration bằng cách **chạy 2 lần liên tiếp**.

---

## Vòng 3.2 — Phân tích bán chạy & giá NCC có trợ lý AI (06/10/2026)

**Mục tiêu:** Kế toán xem trong một kỳ (mặc định 30 ngày) vật tư nào bán chạy, nhà cung cấp nào giá hợp lý; AI viết nhận xét và đề xuất.

**Đã làm**
- `GET /api/phan-tich/tong-hop`: doanh thu, số đơn, tiền mua NCC so với kỳ trước cùng độ dài; vật tư bán chạy (số lượng, doanh thu, tăng trưởng, lãi gộp ước tính, NCC rẻ nhất); NCC theo **chỉ số giá** (giá từng mặt hàng / giá trung vị thị trường × 100), số mặt hàng rẻ nhất, đổi giá trong kỳ, tiền đã mua.
- `POST /api/phan-tich/nhan-xet-ai`: Gemini đọc số liệu tổng hợp → tóm tắt, điểm nổi bật, đề xuất NCC, cảnh báo, việc nên làm.
- Tab "📊 Phân tích & AI" (Kế toán/Admin): chọn kỳ nhanh, ô KPI, bảng có thanh doanh thu, khung AI.

**Quyết định thiết kế — AI không được tự tính số**
- **Hai lớp:** SQL tính mọi con số (kiểm thử được, chạy được khi không có AI); AI chỉ diễn giải.
- **Hậu kiểm tự động:** bỏ dòng AI nhắc tới vật tư/NCC không có trong dữ liệu; trích mọi con số trong câu chữ AI và đối chiếu với dữ liệu đã gửi, số "lạ" được liệt kê cho người đọc (vd ngưỡng "trên 105" do AI tự đặt).
- **Code định dạng số, không nhờ AI** (4526553000 → "4,53 tỷ"): định dạng là việc tất định, giao cho LLM dễ sai.
- Server **tự tính lại số liệu** trước khi gửi AI, không nhận số từ trình duyệt (chặn sửa số để "lái" AI). Chỉ gửi số tổng hợp, không có tên/SĐT khách hàng.
- **Bộ nhớ đệm 30 phút** theo kỳ + gộp request trùng (3 người bấm cùng lúc → 1 lượt gọi AI); "Phân tích lại" bỏ qua cache.
- Dùng **trung vị** thay vì trung bình làm "giá thị trường": một NCC báo giá bất thường không kéo lệch chuẩn so sánh.

**Sự cố khi tích hợp Gemini thật & cách xử lý**
- `gemini-2.5-flash` trả 404 "no longer available to new users" → tính năng AI nhập đơn cũng đang hỏng. Không đoán tên model mà gọi API liệt kê model của key, đổi sang `gemini-3.8-flash`.
- Model mới trả 503 (quá tải) liên tục → client Gemini **thử lại với thời gian chờ tăng dần** (0,8s → 1,6s), vẫn lỗi thì **chuyển model dự phòng** (`GEMINI_MODEL_DU_PHONG`), timeout cũng chuyển dự phòng; thông báo lỗi dễ hiểu cho người dùng.

**Kiểm thử:** 18 ca (phân quyền, khoảng ngày sai/quá dài, kỳ trước đúng độ dài, doanh thu và chỉ số giá đối chiếu với SQL viết theo cách khác, AI giả lập có tên/số bịa bị bắt, cache, gộp request đồng thời, kỳ rỗng không tốn lượt AI) + gọi Gemini thật và chụp giao diện.

---

## Vòng 3.3 — Mua hàng, Thi công & nghiệm thu, Công nợ NCC + duyệt chi Telegram (06/10/2026)

### Mua hàng (migration 009)
- Tab "Cần mua": đơn đang ở bước Mua hàng + dòng vật tư **mua ngoài** (cửa tự sản xuất không hiện), số cần / đã đề xuất / đã nhận; mỗi dòng chọn NCC, mặc định NCC **rẻ nhất hôm nay** (dùng lại bảng giá theo thời gian). Một lần tạo tự **tách thành nhiều đề xuất theo NCC**.
- Luồng: chờ đặt hàng → Kế toán đặt hàng → nhận hàng. **Nhận đủ mọi vật tư mua ngoài → đơn tự sang bước Giao hàng**, trong cùng transaction.
- Giá **chụp lại lúc mua**: NCC tăng giá sau đó, đề xuất cũ giữ giá cũ.
- `SELECT ... FOR UPDATE` trên đơn: 2 người cùng đề xuất mua thì người sau thấy số đã đề xuất mới nhất → không mua vượt. CHECK: trạng thái phải khớp mốc thời gian (đã giao ⇒ có ngày nhận hàng).
- **Lỗi gặp:** `inconsistent types deduced for parameter $3` — cùng một tham số vừa gán vào cột ENUM vừa so sánh với chuỗi → ép kiểu `$3::trang_thai_mua_hang_enum`. Giao diện phát hiện vật tư chưa NCC nào báo giá vẫn bấm được "Tạo đề xuất" → bỏ qua dòng đó, khoá nút, gợi ý bổ sung bảng giá.

### Thi công & nghiệm thu (migration 010)
- Đội thợ (thêm, ngừng hoạt động, số việc đang mở); lịch thi công gom theo ngày; danh sách "Cần xếp lịch".
- Luồng: xếp lịch → **Bắt đầu** (đơn tự sang Thi công) → **Báo xong** (đơn tự sang Nghiệm thu) → **Biên bản nghiệm thu**: Đạt → đơn sang Quyết toán; Không đạt (bắt buộc ghi hạng mục sửa) → đơn tự lùi về Thi công.
- Điều khoản "nghiệm thu theo số m²" → bắt buộc nhập khối lượng thực tế. Kết quả nghiệm thu chuyển từ chữ tự do sang ENUM.
- **Unique index một phần** `(don_hang_id) WHERE trang_thai <> 'da_nghiem_thu'`: mỗi đơn tối đa 1 đợt thi công đang mở. Trùng lịch đội thợ chỉ **cảnh báo** (409 → hỏi lại → gửi kèm xác nhận) vì đội có thể làm 2 việc nhỏ/ngày.
- **Lỗ hổng nghiệp vụ phát hiện khi chạy giao diện:** bắt đầu thi công được cả khi đơn còn ở Mua hàng (chưa có hàng) → chặn, chỉ cho bắt đầu khi đơn ở Giao hàng/Thi công.

### Công nợ NCC + duyệt chi Telegram (migration 011)
- Công nợ phát sinh khi **nhận hàng**; mỗi NCC: còn nợ, tuổi nợ (≤30 / 31–60 / >60 ngày), chờ duyệt/chi, chưa lập đề xuất chi.
- Luồng: Kế toán lập đề xuất chi (gom đề xuất mua đã nhận hàng, **số tiền server tự tính**) → gửi Telegram tin có nút ✅ Duyệt / ❌ Từ chối → giám đốc bấm → Kế toán thanh toán, hệ thống tạo **mã VietQR** đúng số tiền + nội dung CK. Không cấu hình Telegram thì Admin duyệt trên web. **Tách người lập (Kế toán) và người duyệt (Admin).**
- Chống trả tiền 2 lần: **TRIGGER** chặn một đề xuất mua nằm trong 2 đề xuất chi còn hiệu lực (CHECK không tham chiếu được bảng khác) + `FOR UPDATE` khi lập (trigger không thấy giao dịch chưa commit). UNIQUE: mỗi đề xuất chi chỉ một phiếu thanh toán.
- Bảo mật webhook: header secret so sánh **thời gian hằng số** (`timingSafeEqual`); chỉ username trong danh sách được duyệt (ai trong nhóm chat cũng thấy nút); callback phải khớp đúng message_id đã gửi; bấm lần 2 không có tác dụng (`UPDATE ... WHERE trang_thai = 'cho_duyet'`); escape HTML tên NCC/ghi chú; không gửi số tài khoản lên Telegram.
- Gửi Telegram **sau khi commit**: Telegram lỗi không làm mất đề xuất chi. Máy cá nhân dùng **polling**, server thật dùng **webhook**.

**Kiểm thử:** Mua hàng 20 ca, Thi công 26 ca, Công nợ 27 ca (Telegram giả lập: sai secret, người lạ bấm, callback giả, bấm 2 lần, Telegram lỗi) + chạy cả 3 luồng trên giao diện.

---

## Vòng 3.4 — Làm lại Mua hàng, Thi công, Công nợ theo luồng ERP thực tế (06–07/10/2026)

**Lý do:** sau khi đọc (chỉ tham khảo nghiệp vụ, không chép mã) cách ERP công ty vận hành, mô hình cũ của đồ án khác thực tế ở 3 điểm lớn: mua hàng theo *phiếu đề xuất* thay vì theo *từng dòng vật tư*; công nợ NCC ghi khi nhận hàng thay vì khi *đề xuất chi được duyệt*; thi công không tính công thợ và nghiệm thu không theo số lượng thực tế.

**Đã làm (migration 012 + 013)**
- **Mua hàng theo dòng** (`mua_hang_dong`): mỗi dòng vật tư mua ngoài có NCC (gợi ý top 3 rẻ nhất hôm nay), giá chốt chụp lại, VAT, trạng thái: Chưa xử lý → Đang hỏi → Đã đặt → Đã sẵn hàng → (hệ thống) Đã lấy → Đã giao. Đủ 100% sẵn hàng mới "Đăng ký giao hàng" (Vận hành bấm, không tự động — ERP cũng bỏ tự động). Rời bước Giao hàng thì mọi dòng tự thành "Đã giao hàng".
- **Mua bổ sung** có loại phát sinh (hàng hỏng, NCC giao thiếu, thợ làm hỏng...) và chia tiền trách nhiệm cho từng nguồn; tổng trách nhiệm phải bằng tiền hàng.
- **Đề xuất chi** 1 đơn × 1 NCC hoặc 1 đội thợ, 5 loại: Cọc (khi đã đặt, tổng cọc < tiền hàng) / Quyết toán (khi sẵn hàng, server tính = tiền hàng + VAT − cọc đã duyệt) / Chi bổ sung / Trả công / Ứng công (≤ 50% công dự kiến). Luồng: Chờ duyệt → Duyệt (web hoặc Telegram) → Đã chi (**bắt buộc ảnh bill**, kiểm tra định dạng bằng magic bytes); Từ chối → Kế toán sửa, hệ thống tính lại, gửi lại; Thu hồi khi đã duyệt mà chưa chi. Dòng đã vào quyết toán bị khoá NCC/giá/VAT.
- **Công nợ NCC** = tiền hàng (quyết toán + chi bổ sung đã duyệt) − đã chi; âm là "chi thừa" (cọc trước khi có hàng). **Công nợ thợ** = phải trả − đã trả − tạm ứng − thợ thu hộ.
- **Thi công theo giai đoạn**: mỗi giai đoạn 1 đội thợ, giá công × khối lượng. Bắt đầu giai đoạn đầu → đơn sang Thi công; mọi giai đoạn báo xong → Nghiệm thu.
- **Nghiệm thu** = nhập số lượng thực tế từng dòng vật tư + khối lượng thực tế từng giai đoạn; hao hụt > 10% cảnh báo. **Phát sinh thi công**: phát sinh/phụ thu (+), giảm trừ (−), thợ thu hộ (trừ công thợ, coi như khách đã trả).
- **Quyết toán** do Vận hành chốt (giống ERP): tổng = SL thực tế × giá − chiết khấu + phí VC + phụ thu + phát sinh; khoá giá trị đơn, ghi công thợ "phải trả", đơn hoàn tất. VIEW `v_don_hang_tien` tính theo SL thực tế và lấy giá trị chốt khi đã quyết toán.

**Giữ chặt hơn ERP ở chỗ ERP còn yếu:** duyệt chi trên web phải đúng vai trò; bot Telegram chỉ tin danh sách người duyệt (ERP tin mọi thành viên nhóm); không ghi cứng tên người trong mã.

**Quyết định kỹ thuật**
- **Bảng `schema_migrations`**: mỗi migration chạy đúng 1 lần (như Flyway/Knex). Lý do: 013 xoá bảng cũ mà migration 007–011 còn tham chiếu, chạy lại từ đầu sẽ lỗi. DB tạo mới từ `schema.sql` được đánh dấu "đã chạy" (baseline). Migration 004 sửa thành "chỉ tạo VIEW khi chưa có" vì 013 định nghĩa lại VIEW (lỗi `cannot drop columns from view` khi chạy lại).
- Chống trả tiền 2 lần: TRIGGER chặn 1 dòng vào 2 đề xuất quyết toán + `FOR UPDATE` khi lập.
- Migration 013 **chuyển dữ liệu cũ** (suy NCC/giá/trạng thái từng dòng từ đề xuất mua cũ, dựng lại quyết toán theo đơn × NCC) thay vì bắt reset DB. Trước khi chạy trên DB thật đã **sao lưu bằng pg_dump**.

**Lỗi phát hiện & bài học**
- **Sai số số thực khi tính tiền**: 40 × 180.000 × 1,08 = `7776000.000000001` → kiểm tra "cọc ≥ tiền hàng" sai đúng ở ranh giới. Sửa: làm tròn về đồng từng dòng trước khi cộng/so sánh.
- Gửi lại đề xuất bị từ chối có nguy cơ gom nhầm dòng đang ở đề xuất *khác* (điều kiện thừa) — phát hiện khi đọc lại mã, sửa trước khi chạy.

**Kiểm thử:** 58 ca API đi trọn 1 đơn (chọn NCC → cọc → duyệt/từ chối/gửi lại/thu hồi → đã chi kèm bill → giao hàng → 2 giai đoạn thợ → ứng công → nghiệm thu, hao hụt → thợ thu hộ → quyết toán → trả công → mua bổ sung → công nợ khớp SQL) + chạy cả luồng trên giao diện bằng 4 vai trò.

---

## Vòng 3.5 — Quản trị người dùng, Danh mục vật tư, Tổng quan (07/10/2026, migration 014)

**Quản trị người dùng (Admin)**: tạo tài khoản (mật khẩu tạm ngẫu nhiên hiện 1 lần), đổi vai trò, khoá/mở, đặt lại mật khẩu; ai cũng tự đổi được mật khẩu (≥ 8 ký tự, có chữ và số).
- **Thu hồi JWT**: thêm `phien_ban_token`; khoá / đổi vai trò / đổi mật khẩu thì tăng số này, middleware đối chiếu với CSDL mỗi request → token cũ hết hiệu lực **ngay** (trước đây phải đợi 8 giờ). Vai trò lấy từ CSDL, không tin token. Đổi lại: thêm 1 truy vấn theo khoá chính mỗi request.
- Không tự khoá/tự hạ quyền mình; luôn còn ít nhất 1 Admin (khoá các dòng admin `FOR UPDATE` để 2 người không cùng lúc bỏ 2 admin cuối). Không xoá người dùng (lịch sử tham chiếu) — chỉ khoá.
- **Chặn dò mật khẩu**: sai 5 lần / 15 phút theo tên đăng nhập + IP thì tạm chặn (lưu trong bộ nhớ, nhiều server thì cần Redis).

**Danh mục vật tư (Kế toán, Admin)**: thêm/sửa vật tư và loại vật tư; tên không trùng (UNIQUE trên `lower(trim(ten))`); vật tư đã dùng trong đơn không đổi loại (tránh đổi nguồn gốc tự SX ↔ mua ngoài); **ngừng kinh doanh = ẩn** khỏi form tạo đơn, AI và bảng giá mới, server chặn cả khi gọi thẳng API; đơn cũ giữ nguyên.

**Tổng quan (mọi vai trò)**: KPI (doanh thu tháng so cùng kỳ tháng trước, đơn chốt, đơn đang xử lý, còn phải trả NCC), biểu đồ doanh thu 6 tháng (có bảng dữ liệu thay thế), đơn theo tiến độ, **việc cần làm theo vai trò** có đường dẫn tới màn xử lý (Sale: đơn nháp, khách lâu chưa chăm sóc; Vận hành: chờ lên phương án, đủ hàng chờ giao, chưa phân thợ, chờ nghiệm thu/quyết toán; Kế toán: dòng chưa đặt, chưa lập quyết toán NCC, đề xuất bị từ chối, chờ chuyển khoản, công thợ chưa trả; Admin: đề xuất chờ duyệt). Sale chỉ thấy số liệu của mình.

**Kiểm thử:** 34 ca API (thu hồi token khi khoá/đổi vai trò/đổi mật khẩu, admin cuối cùng, chặn dò mật khẩu, trùng tên vật tư, vật tư ngừng bị chặn ở API, KPI khớp SQL, phạm vi số liệu Sale) + giao diện desktop/điện thoại.

---

## Vòng 3.6 — Phân công Vận hành phụ trách đơn (07/10/2026, migration 015)

**Vấn đề:** trước đây đơn mới chốt không thuộc về ai; Vận hành nào bấm chuyển bước trước thì thành người phụ trách → dễ 2 người cùng làm một đơn hoặc đơn bị bỏ sót.

- **Tự động phân khi Sale chốt đơn**: chọn Vận hành đang hoạt động có **ít đơn đang mở nhất** (chưa hoàn tất/huỷ), hoà thì lấy id nhỏ hơn. Chạy trong cùng transaction với việc chốt; dùng `pg_advisory_xact_lock` để 2 đơn chốt cùng lúc không cùng đọc một số liệu cũ rồi cùng giao cho 1 người (đã thử 6 đơn chốt đồng thời → chia đều, lệch ≤ 1). Không có Vận hành nào → để trống, Admin thấy mục "Đơn chưa có Vận hành phụ trách" ở Tổng quan.
- **Chỉ người phụ trách + Admin được thao tác**: hàm dùng chung `damBaoPhuTrach(user, donHangId)` (403 nếu Vận hành khác) gọi ở mọi thao tác của Vận hành: chuyển bước, huỷ, phương án, yêu cầu sửa, mua hàng (sửa dòng, lấy hàng, mua bổ sung), thi công (giai đoạn, bắt đầu/báo xong, nghiệm thu, phát sinh, chốt quyết toán). Kiểm tra ở **server**; giao diện chỉ ẩn nút cho dễ dùng.
- **Admin chuyển phụ trách** (`PUT /don-hang/:id/phu-trach`, bắt buộc lý do; người nhận phải là Vận hành đang hoạt động). Mọi lần phân/chuyển ghi vào `don_hang_phan_cong_log` (từ ai → ai, ai làm, lý do) — hiện ở chi tiết đơn.
- Sửa lỗi cũ: lưu phương án từng **ghi đè** người phụ trách → đổi sang `COALESCE`.
- Danh sách đơn có bộ lọc "Vận hành phụ trách" (Đơn tôi phụ trách / Chưa phân công / từng người); "Việc cần làm" của Vận hành chỉ đếm đơn mình phụ trách.
- Migration 015: bảng log + index; đơn cũ chưa có người phụ trách được chia quay vòng.

**Kiểm thử:** 30 ca API (tự phân đúng người ít việc, bỏ qua người bị khoá, 403 cho Vận hành khác ở đơn hàng/mua hàng/thi công, Admin không bị chặn, chuyển phụ trách + các ca lỗi, người cũ mất quyền ngay, lọc, chốt đồng thời) + chạy migration trên bản sao CSDL thật trước khi áp dụng.

---

## Vòng 3.7 — Trạng thái dòng mua hàng tự động (07/10/2026)

**Vấn đề:** người dùng phải chọn trạng thái cho **từng dòng** vật tư (dropdown) — việc thừa, dễ quên, dễ sai.

**Nguyên tắc:** trạng thái là **hệ quả của thao tác**, không phải một việc riêng. Chỉ sự kiện xảy ra **ngoài hệ thống** (NCC gọi báo có hàng) mới cần bấm — và bấm **1 lần cho cả NCC**, không theo từng dòng.

| Trạng thái | Do đâu |
|---|---|
| ⏳ Chưa chọn NCC → 🛒 Đã chọn NCC | Tự động khi chọn / bỏ NCC; đổi NCC = đặt lại từ đầu với NCC mới |
| 📦 Đã đặt hàng | Nút "Đã đặt hàng" theo NCC |
| ✅ Sẵn hàng | Nút "NCC báo sẵn hàng" theo NCC (NCC có sẵn kho thì bấm thẳng, bỏ qua bước đặt) |
| 🚚 Đã lấy / 🏠 Đã giao | Đã tự động từ trước (xác nhận lấy hàng, rời bước Giao hàng) |

- Nút "↩ Lùi" khi bấm nhầm: lùi 1 nấc; không lùi dòng đã vào đề xuất quyết toán, không lùi về "chưa đặt" khi NCC đã có đề xuất cọc (giữ khớp chứng từ tiền).
- Huỷ / khôi phục dòng là thao tác riêng; dòng đã huỷ không sửa được.
- **Cố ý không tự động** chuyển đơn sang Giao hàng khi đủ hàng: Vận hành còn phải soát tạm ứng của khách trước khi giao — đó là một quyết định, không phải nhập liệu.
- API: `POST /mua-hang/don/:id/ncc {ncc_id, hanh_dong: dat_hang|san_hang|lui}`; `PUT /mua-hang/dong/:id` bỏ trường `trang_thai`, thêm `huy`. Không đổi CSDL (ENUM giữ nguyên, chỉ đổi nhãn hiển thị).

**Kiểm thử:** 18 ca API (tự chuyển khi chọn/bỏ NCC, đặt/sẵn hàng theo NCC không ảnh hưởng NCC khác, bấm lặp → 409, khoá lùi khi có cọc/quyết toán, huỷ/khôi phục, phân quyền).

---

## Vòng 3.8 — Vận hành chỉ thấy đơn mình phụ trách (07/10/2026)

Giống Sale chỉ thấy đơn của mình: Vận hành chỉ **xem và thao tác** đơn có `vanhanh_phu_trach_id = mình`. Admin, Kế toán vẫn thấy toàn bộ (Kế toán làm tiền cho mọi đơn).
- **Lọc ở server, không tin client**: hàm `vanHanhCua(user)` trả id Vận hành (hoặc NULL = không lọc) đưa vào WHERE của mọi danh sách: đơn hàng, mua hàng, mua bổ sung, lịch thi công, đơn cần lập lịch, chờ quyết toán, KPI/biểu đồ Tổng quan. Gửi `van_hanh_id` người khác lên vẫn bị bỏ qua.
- **Chi tiết**: mở thẳng URL đơn người khác (đơn hàng, mua hàng, thi công, nghiệm thu, quyết toán) → 403.
- **Đơn chưa phân công** (không có Vận hành nào đang hoạt động lúc chốt): Vận hành không thấy, không nhận được — Admin phân. Trước đây Vận hành nào bấm trước thì nhận; bỏ để khớp nguyên tắc “chỉ thấy đơn của mình”.
- Giao diện: bỏ bộ lọc “Vận hành phụ trách” với Vận hành (đã mặc định), Tổng quan hiện “Số liệu các đơn bạn phụ trách”.

**Kiểm thử:** 28 ca API (danh sách từng module, giả mạo tham số lọc, 403 khi mở URL đơn người khác, Kế toán/Admin không bị giới hạn, Sale không ảnh hưởng, đơn chưa phân công → Admin phân → Vận hành thấy).

---

## Vòng 3.9 — Tự lập đề xuất quyết toán + Thông báo trong hệ thống (07/10/2026, migration 016)

**Tự lập đề xuất quyết toán NCC:** bấm "NCC báo sẵn hàng" → hệ thống tự lập đề xuất quyết toán (số tiền = tiền hàng + VAT − cọc đã duyệt), gửi Admin duyệt. Lùi "sẵn hàng" khi đề xuất chưa duyệt → xoá đề xuất theo; đã duyệt/đã chi → không lùi (Admin thu hồi). Cọc vẫn lập tay (số tiền do thoả thuận).

**Thông báo (nút 🔔 trên thanh trên cùng):** thao tác xong → người liên quan nhận thông báo, bấm vào mở đúng trang xử lý.

| Sự kiện | Người nhận |
|---|---|
| Chốt đơn (tự phân) / Admin chuyển phụ trách | Vận hành được giao (và người cũ khi chuyển) |
| Đơn chuyển bước (tay hoặc tự động), huỷ đơn | Sale của đơn |
| Sale gửi yêu cầu sửa / Vận hành xử lý xong | Vận hành phụ trách / Sale |
| Đề xuất chi mới, gửi lại | Admin |
| Admin duyệt | Kế toán (cần chuyển khoản) + người lập |
| Từ chối, thu hồi | Kế toán + người lập (kèm lý do) |
| Kế toán đã chi | Người lập + Vận hành phụ trách đơn |
| Tạo phiếu mua bổ sung / đã mua | Kế toán / Vận hành phụ trách |

- **Ghi cùng transaction** với thao tác gốc: thao tác lỗi (rollback) thì không có thông báo "ma". Không gửi cho chính người vừa thao tác; chỉ gửi tài khoản đang hoạt động.
- Duyệt qua Telegram cũng sinh thông báo (dùng chung hàm duyệt).
- **Polling 30 giây**, dừng khi tab ẩn. Chọn polling thay WebSocket/SSE vì đơn giản, hợp quy mô vài chục người dùng; nhược điểm trễ ≤ 30 giây và tốn request rỗng — quy mô lớn sẽ chuyển SSE/WebSocket.
- Bảo mật: chỉ đọc/đánh dấu thông báo của chính mình (`WHERE nguoi_nhan_id = req.user.id`), đoán id thông báo người khác → 404.
- Index riêng cho đếm chưa đọc (partial index `WHERE da_doc_luc IS NULL`).

**Kiểm thử:** 13 ca API tự lập quyết toán + 19 ca API thông báo (đúng người nhận từng sự kiện, không tự nhận, rollback không sinh thông báo, đọc/đọc hết, không đọc được của người khác, 401) + giao diện desktop/điện thoại.

**Rà soát trước khi commit:**
- So `pg_dump --schema-only` của DB chạy migration với DB tạo mới từ `schema.sql` → lệch 2 chỗ (2 ENUM cũ còn sót sau migration 013; default `don_hang.trang_thai` là `moi` thay vì `nhap`) → migration **017** đồng bộ, so lại: 0 chỗ lệch.
- Quét mọi API GET × 4 vai trò trên dữ liệu lớn: không lỗi 500. Phát hiện **lộ dữ liệu**: `/danh-muc/khach-hang` (có SĐT, địa chỉ) mở cho cả Vận hành/Kế toán dù module Khách hàng chặn họ → giới hạn Sale + Admin.
- Không có khoá bí mật trong file sắp commit; `.env`, `uploads/`, `dist/` nằm ngoài git.

---

## Vòng 3.10 — Đặt hàng NCC qua Telegram, cọc theo yêu cầu NCC; làm nổi bật Việc cần làm (08/10/2026, migration 018–019)

**Luồng mới (thay nút "Đã đặt hàng"/"NCC báo sẵn hàng" bấm tay):**
```
Chọn NCC ─► [🛒 Đặt hàng] ─► Đơn đặt hàng ĐH-x (văn bản chép gửi Zalo + gửi nhóm Telegram NCC có 2 nút)
                 │
                 ├─ NCC "✅ Cho xuất hàng"  ─► vật tư Sẵn hàng + tự lập đề xuất quyết toán
                 └─ NCC "💰 Yêu cầu cọc" ─► bot hỏi số tiền (ForceReply) ─► vật tư Chờ cọc + tự lập đề xuất cọc
                        ─► Admin duyệt (web / nhóm Telegram duyệt chi) ─► Kế toán chi + bill
                        ─► vật tư tự Sẵn hàng + tự lập quyết toán phần còn lại + bot báo nhóm NCC "đã chuyển cọc, đề nghị xuất hàng"
Tất cả vật tư Sẵn hàng ─► Vận hành [Đăng ký giao hàng]
```
- Bảng `dat_hang_ncc` lưu nội dung đã gửi, phản hồi (qua web/Telegram, ai, lúc nào), đề xuất cọc, id tin Telegram; dòng mua gắn `dat_hang_ncc_id`. Trạng thái dòng mới `cho_coc` (ENUM ADD VALUE ở migration riêng 018).
- NCC trả lời qua điện thoại/Zalo → Vận hành bấm "NCC cho xuất hàng" / "NCC yêu cầu cọc" trên web — dùng chung một hàm với Telegram.
- Văn bản gửi NCC **không chứa tên/SĐT/địa chỉ khách** (NCC không cần, tránh lộ thông tin).
- Huỷ đặt hàng: khi đang chờ phản hồi hoặc chờ cọc chưa duyệt (đề xuất cọc bị xoá theo, tin Telegram được sửa "đã huỷ"). Cọc đã duyệt/đã chi → không huỷ, không lùi.
- Đã gửi đặt hàng thì khoá đổi NCC/giá/huỷ dòng (phải huỷ đặt hàng trước) — tránh lệch với đơn NCC đang cầm.
- Dữ liệu cũ (dòng "đã đặt" chưa có đơn đặt hàng) vẫn bấm Đặt hàng lại được.

**Telegram — một bot, hai nhóm** (`telegram.router.js` điều phối): nhóm duyệt chi (nút `dxc:*`, chỉ username được phép) và nhóm NCC (nút `dh:*`, tin trả lời số tiền). Chống giả mạo: chỉ nhận nút/tin trong đúng `TELEGRAM_CHAT_ID_NCC` và đúng id tin nhắn của đơn đặt hàng đó. Đọc số tiền: "2000000", "2.000.000", "2tr", "2,5tr", "500k". Polling nhận thêm loại `message`.

**Việc cần làm nổi bật:** đưa lên đầu trang Tổng quan, ô lớn số to, việc **gấp** (trễ hạn / đang chặn người khác) tô đỏ và xếp trước, tiêu đề ghi tổng số việc + số việc gấp. Thêm việc: đơn đặt hàng chờ NCC quá 1 ngày, đơn có vật tư chưa đặt hàng, cọc NCC chờ duyệt.

**Kiểm thử:** 35 ca API luồng web + 20 ca Telegram giả lập (thay `fetch` tới api.telegram.org: nút từ nhóm khác/sai tin nhắn bị chặn, hỏi cọc, trả lời sai định dạng/vượt tiền hàng, huỷ) + mở mọi trang × 4 vai trò bằng trình duyệt bắt lỗi JS → phát hiện và sửa lỗi xoá nhầm 2 hàm ở trang Mua hàng (build không bắt được, chỉ lộ khi chạy).

---

## Vòng 3 — (dự kiến) Giai đoạn đơn hàng + NCC & bảng giá

**Đề xuất đang cân nhắc**
- Thêm cột `giai_doan` cho đơn hàng: Mới → Lên phương án → Mua hàng → Chờ giao hàng → Thi công → Nghiệm thu → Hoàn tất (+ Huỷ). Chỉ Service được chuyển giai đoạn, theo luật chuyển hợp lệ.
