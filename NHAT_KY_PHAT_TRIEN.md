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

## Vòng 3 — (dự kiến) Giai đoạn đơn hàng + NCC & bảng giá

**Đề xuất đang cân nhắc**
- Thêm cột `giai_doan` cho đơn hàng: Mới → Lên phương án → Mua hàng → Chờ giao hàng → Thi công → Nghiệm thu → Hoàn tất (+ Huỷ). Chỉ Service được chuyển giai đoạn, theo luật chuyển hợp lệ.
