# Kết quả kiểm thử tự động

Chạy lúc: 15:47:46 14/10/2026 · Tổng **69** ca · Đạt **69** · Trượt **0**

Môi trường: Node.js `node:test`, CSDL PostgreSQL riêng `datn_erp_test` tạo lại từ `schema.sql` + `seed.sql` cho mỗi nhóm, API gọi qua HTTP thật, Telegram giả lập.

## 01_xac_thuc.test.js

| Mã | Mô tả ca kiểm thử | Kết quả | Thời gian (ms) |
|---|---|---|---|
| TC-AUTH-01 | Đăng nhập đúng trả token và vai trò | ✅ Đạt | 284 |
| TC-AUTH-02 | Sai mật khẩu bị từ chối (401), không lộ tài khoản có tồn tại hay không | ✅ Đạt | 101 |
| TC-AUTH-03 | Gọi API không có token → 401 | ✅ Đạt | 4 |
| TC-AUTH-04 | Admin khoá tài khoản → token đang dùng hết hiệu lực ngay | ✅ Đạt | 302 |
| TC-AUTH-05 | Đổi vai trò → token cũ hết hiệu lực (vai trò lấy từ CSDL, không tin token) | ✅ Đạt | 197 |
| TC-AUTH-06 | Đổi mật khẩu → token cũ hết hiệu lực, nhận token mới | ✅ Đạt | 541 |
| TC-AUTH-07 | Không tự khoá chính mình, luôn còn ít nhất 1 Admin | ✅ Đạt | 123 |
| TC-AUTH-08 | Sai mật khẩu 5 lần → tạm chặn đăng nhập (429) | ✅ Đạt | 464 |

## 02_don_hang.test.js

| Mã | Mô tả ca kiểm thử | Kết quả | Thời gian (ms) |
|---|---|---|---|
| TC-DH-01 | Chốt đơn thiếu thông tin bắt buộc → 400 liệt kê phần thiếu | ✅ Đạt | 28 |
| TC-DH-02 | Chốt đơn → tự giao cho Vận hành ít việc nhất + Vận hành nhận thông báo | ✅ Đạt | 165 |
| TC-DH-03 | Có Vận hành mới (0 đơn) → đơn tiếp theo giao cho người đó | ✅ Đạt | 338 |
| TC-DH-04 | Sale chỉ thấy đơn của mình | ✅ Đạt | 32 |
| TC-DH-05 | Rời "Lên phương án" khi chưa có phương án → 400; có rồi → qua bước, Sale nhận thông báo tiến độ | ✅ Đạt | 54 |
| TC-DH-06 | Lùi bước bắt buộc ghi lý do | ✅ Đạt | 65 |
| TC-DH-07 | Đơn hoàn thiện phải "Xác nhận khối lượng" mới sang Mua hàng; đổi số lượng → tổng đổi + Sale được báo | ✅ Đạt | 116 |
| TC-DH-08 | Huỷ đơn bắt buộc lý do; Sale không huỷ được | ✅ Đạt | 43 |
| TC-DH-09 | Sale gửi yêu cầu sửa → Vận hành phụ trách nhận; xử lý xong → Sale nhận | ✅ Đạt | 41 |
| TC-DH-10 | Chốt đồng thời nhiều đơn vẫn chia đều cho Vận hành (khoá tư vấn) | ✅ Đạt | 229 |

## 03_mua_hang.test.js

| Mã | Mô tả ca kiểm thử | Kết quả | Thời gian (ms) |
|---|---|---|---|
| TC-MH-01 | Chọn NCC → dòng tự "Đã chọn NCC"; bỏ NCC → "Chưa chọn NCC" (không chọn trạng thái tay) | ✅ Đạt | 103 |
| TC-MH-02 | Đặt hàng → đơn đặt hàng gửi nhóm Telegram NCC (2 nút), nội dung không chứa tên khách | ✅ Đạt | 25 |
| TC-MH-03 | Đã gửi đặt hàng thì không đổi NCC / không đặt lại được (409) | ✅ Đạt | 12 |
| TC-MH-04 | NCC cho xuất hàng → vật tư Sẵn hàng + tự lập đề xuất quyết toán (ảnh QR gửi nhóm duyệt chi) | ✅ Đạt | 75 |
| TC-MH-05 | Lùi "Sẵn hàng" khi quyết toán chưa duyệt → xoá quyết toán; huỷ đặt hàng → về "Đã chọn NCC" | ✅ Đạt | 51 |
| TC-MH-06 | NCC yêu cầu cọc ≥ tiền hàng → 400; hợp lệ → "Chờ cọc" + đề xuất cọc, Kế toán được báo | ✅ Đạt | 63 |
| TC-MH-07 | Cọc đã duyệt → không huỷ đặt hàng; Kế toán chi kèm bill → Sẵn hàng + quyết toán = tiền hàng − cọc | ✅ Đạt | 76 |
| TC-MH-08 | Sale không thao tác mua hàng (403) | ✅ Đạt | 7 |

## 04_telegram.test.js

| Mã | Mô tả ca kiểm thử | Kết quả | Thời gian (ms) |
|---|---|---|---|
| TC-TG-01 | Nút bấm từ nhóm khác hoặc sai tin nhắn bị từ chối | ✅ Đạt | 31 |
| TC-TG-02 | NCC bấm "Cho xuất hàng" → Sẵn hàng, tin nhóm NCC được sửa, quyết toán gửi nhóm duyệt chi | ✅ Đạt | 54 |
| TC-TG-03 | NCC bấm "Yêu cầu cọc" → bot hỏi số tiền; trả lời sai định dạng / vượt tiền hàng → báo lỗi | ✅ Đạt | 26 |
| TC-TG-04 | NCC trả lời "50k" → Chờ cọc + đề xuất cọc 50.000 đ gửi nhóm duyệt chi (ảnh QR + nút Duyệt) | ✅ Đạt | 20 |
| TC-TG-05 | Duyệt trên Telegram: người lạ bị từ chối; người được phép duyệt → nút "Đã chi" xuất hiện | ✅ Đạt | 323 |
| TC-TG-06 | Kế toán chi ngay trong nhóm: phải gắn Telegram; gửi ảnh bill → Đã chi, vật tư Sẵn hàng, tin bỏ nút | ✅ Đạt | 376 |
| TC-TG-07 | Telegram không tải được ảnh QR → tự gửi dạng chữ kèm link QR | ✅ Đạt | 123 |

## 05_thu_tien.test.js

| Mã | Mô tả ca kiểm thử | Kết quả | Thời gian (ms) |
|---|---|---|---|
| TC-TT-01 | Tổng hợp: đã thu = cọc; cần tạm ứng theo %; QR thu tiền đúng số tiền còn thiếu + nội dung mã đơn | ✅ Đạt | 14 |
| TC-TT-02 | Chưa đủ tạm ứng → không đăng ký giao hàng được; "vẫn giao" phải ghi lý do | ✅ Đạt | 27 |
| TC-TT-03 | Ghi nhận thanh toán không hợp lệ bị chặn (CK thiếu bill, vượt số còn nợ, ngày tương lai, Sale khác) | ✅ Đạt | 33 |
| TC-TT-04 | Sale ghi nhận khách chuyển khoản → chờ Kế toán xác nhận, CHƯA tính là đã thu; Kế toán được báo | ✅ Đạt | 37 |
| TC-TT-05 | Ảnh bill chỉ người có quyền xem (Sale của đơn, Kế toán); Sale khác → 403 | ✅ Đạt | 18 |
| TC-TT-06 | Kế toán từ chối phải có lý do; xác nhận → đã thu tăng, đủ tạm ứng, đăng ký giao hàng được | ✅ Đạt | 60 |
| TC-TT-07 | Kế toán từ chối → người ghi nhận được báo kèm lý do; tiền không được tính | ✅ Đạt | 53 |
| TC-TT-08 | Đơn khác: "vẫn giao hàng" có lý do → qua bước, ghi lịch sử, báo Admin + Kế toán | ✅ Đạt | 226 |
| TC-TT-09 | Hoàn tất mà khách còn nợ → hiện ở "Đến hạn"; Kế toán nhập tiền mặt (xác nhận ngay) → hết nợ | ✅ Đạt | 275 |
| TC-TT-10 | Chỉ Kế toán/Admin xem danh sách công nợ và phiếu chờ xác nhận | ✅ Đạt | 13 |

## 06_thi_cong.test.js

| Mã | Mô tả ca kiểm thử | Kết quả | Thời gian (ms) |
|---|---|---|---|
| TC-TC-01 | Đủ hàng + đủ tạm ứng → đăng ký giao hàng | ✅ Đạt | 39 |
| TC-TC-02 | Lập giai đoạn: ngày trong quá khứ / khối lượng 0 → 400; hợp lệ → tạo được | ✅ Đạt | 26 |
| TC-TC-03 | Thợ bắt đầu giai đoạn đầu → đơn tự sang Thi công; báo xong giai đoạn cuối → tự sang Nghiệm thu | ✅ Đạt | 57 |
| TC-TC-04 | Lưu số lượng thực tế nghiệm thu trả lại dữ liệu đơn (hồi quy lỗi "Không tìm thấy đơn hàng") | ✅ Đạt | 22 |
| TC-TC-05 | Xác nhận nghiệm thu → tự sang Quyết toán; chốt quyết toán → Hoàn tất, ghi công thợ phải trả | ✅ Đạt | 49 |
| TC-TC-06 | Đơn đã hoàn tất không chuyển bước / huỷ được nữa | ✅ Đạt | 17 |

## 07_thong_bao_phan_quyen.test.js

| Mã | Mô tả ca kiểm thử | Kết quả | Thời gian (ms) |
|---|---|---|---|
| TC-TB-01 | Thao tác lỗi (rollback) không sinh thông báo — ghi cùng transaction | ✅ Đạt | 73 |
| TC-TB-02 | Người thao tác không tự nhận thông báo của chính mình | ✅ Đạt | 107 |
| TC-TB-03 | Link thông báo theo vai trò: Kế toán → mở đề xuất ở Công nợ, Vận hành → màn mua hàng của đơn | ✅ Đạt | 236 |
| TC-TB-04 | Chỉ đọc/đánh dấu thông báo của chính mình; đọc hết → 0 chưa đọc | ✅ Đạt | 28 |
| TC-PQ-01 | Mọi API GET × 4 vai trò không trả lỗi 500 | ✅ Đạt | 755 |
| TC-PQ-02 | van_hanh GET /khach-hang → 403 | ✅ Đạt | 3 |
| TC-PQ-02 | van_hanh GET /danh-muc/khach-hang → 403 | ✅ Đạt | 3 |
| TC-PQ-02 | ke_toan GET /danh-muc/khach-hang → 403 | ✅ Đạt | 3 |
| TC-PQ-02 | van_hanh GET /cong-no/de-xuat-chi → 403 | ✅ Đạt | 3 |
| TC-PQ-02 | sale GET /cong-no/de-xuat-chi → 403 | ✅ Đạt | 3 |
| TC-PQ-02 | ke_toan GET /nguoi-dung → 403 | ✅ Đạt | 3 |
| TC-PQ-02 | sale GET /mua-hang/don → 403 | ✅ Đạt | 3 |
| TC-PQ-02 | van_hanh GET /phan-tich/tong-hop → 403 | ✅ Đạt | 3 |
| TC-PQ-02 | sale GET /thu-tien/cong-no → 403 | ✅ Đạt | 4 |
| TC-PQ-02 | admin GET /nguoi-dung → 200 | ✅ Đạt | 4 |
| TC-PQ-02 | ke_toan GET /cong-no/de-xuat-chi → 200 | ✅ Đạt | 6 |
| TC-PQ-02 | van_hanh GET /thu-tien/don/1 → 200 | ✅ Đạt | 7 |

## 08_tien_ich.test.js

| Mã | Mô tả ca kiểm thử | Kết quả | Thời gian (ms) |
|---|---|---|---|
| TC-UT-01 | Đọc số tiền NCC gõ trong Telegram | ✅ Đạt | 1 |
| TC-UT-02 | Điều khoản thanh toán theo tỷ lệ tạm ứng và hình thức đơn | ✅ Đạt | 0 |
| TC-UT-03 | Link VietQR đúng mã ngân hàng, STK, số tiền, nội dung; ngân hàng lạ → null | ✅ Đạt | 0 |

