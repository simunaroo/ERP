# Kết quả kiểm thử tự động

Chạy lúc: 11:11:09 27/11/2026 · Tổng **169** ca · Đạt **169** · Trượt **0**

Môi trường: Node.js `node:test`, CSDL PostgreSQL riêng `datn_erp_test` tạo lại từ `schema.sql` + `seed.sql` cho mỗi nhóm, API gọi qua HTTP thật, Telegram giả lập.

## 01_xac_thuc.test.js

| Mã | Mô tả ca kiểm thử | Kết quả | Thời gian (ms) |
|---|---|---|---|
| TC-AUTH-01 | Đăng nhập đúng trả token và vai trò (vai trò không bắt buộc 2FA: một bước) | ✅ Đạt | 363 |
| TC-AUTH-02 | Sai mật khẩu bị từ chối (401), không lộ tài khoản có tồn tại hay không | ✅ Đạt | 84 |
| TC-AUTH-03 | Gọi API không có token → 401 | ✅ Đạt | 4 |
| TC-AUTH-04 | Admin khoá tài khoản → token đang dùng hết hiệu lực ngay | ✅ Đạt | 458 |
| TC-AUTH-05 | Đổi vai trò → token cũ hết hiệu lực (vai trò lấy từ CSDL, không tin token) | ✅ Đạt | 180 |
| TC-AUTH-06 | Đổi mật khẩu → token cũ hết hiệu lực, nhận token mới | ✅ Đạt | 606 |
| TC-AUTH-07 | Không tự khoá chính mình, luôn còn ít nhất 1 Admin | ✅ Đạt | 21310 |
| TC-AUTH-08 | Sai mật khẩu 5 lần → tạm chặn đăng nhập (429) | ✅ Đạt | 363 |

## 02_don_hang.test.js

| Mã | Mô tả ca kiểm thử | Kết quả | Thời gian (ms) |
|---|---|---|---|
| TC-DH-01 | Chốt đơn thiếu thông tin bắt buộc → 400 liệt kê phần thiếu | ✅ Đạt | 13 |
| TC-DH-02 | Chốt đơn → tự giao cho Vận hành ít việc nhất + Vận hành nhận thông báo | ✅ Đạt | 163 |
| TC-DH-03 | Có Vận hành mới (0 đơn) → đơn tiếp theo giao cho người đó | ✅ Đạt | 276 |
| TC-DH-04 | Sale chỉ thấy đơn của mình | ✅ Đạt | 30 |
| TC-DH-05 | Rời "Lên phương án" khi chưa có phương án → 400; có rồi → qua bước, Sale nhận thông báo tiến độ | ✅ Đạt | 58 |
| TC-DH-06 | Lùi bước bắt buộc ghi lý do | ✅ Đạt | 72 |
| TC-DH-07 | Đơn hoàn thiện phải "Xác nhận khối lượng" mới sang Mua hàng; đổi số lượng → tổng đổi + Sale được báo | ✅ Đạt | 96 |
| TC-DH-08 | Huỷ đơn bắt buộc lý do; Sale không huỷ được | ✅ Đạt | 43 |
| TC-DH-09 | Sale gửi yêu cầu sửa → Vận hành phụ trách nhận; xử lý xong → Sale nhận | ✅ Đạt | 37 |
| TC-DH-10 | Chốt đồng thời nhiều đơn vẫn chia đều cho Vận hành (khoá tư vấn) | ✅ Đạt | 288 |
| TC-DH-11 | Mã hợp đồng tự sinh "SĐT_STT": đơn nháp chưa có mã, chốt đồng thời không trùng, chốt nháp nhận STT kế tiếp | ✅ Đạt | 70 |

## 03_mua_hang.test.js

| Mã | Mô tả ca kiểm thử | Kết quả | Thời gian (ms) |
|---|---|---|---|
| TC-MH-01 | Chọn NCC → dòng tự "Đã chọn NCC"; bỏ NCC → "Chưa chọn NCC" (không chọn trạng thái tay) | ✅ Đạt | 72 |
| TC-MH-02 | Đặt hàng → đơn đặt hàng gửi nhóm Telegram NCC (2 nút), nội dung không chứa tên khách | ✅ Đạt | 41 |
| TC-MH-03 | Đã gửi đặt hàng thì không đổi NCC / không đặt lại được (409) | ✅ Đạt | 18 |
| TC-MH-04 | NCC cho xuất hàng → vật tư Sẵn hàng + tự lập đề xuất quyết toán (ảnh QR gửi nhóm duyệt chi) | ✅ Đạt | 70 |
| TC-MH-05 | Lùi "Sẵn hàng" khi quyết toán chưa duyệt → xoá quyết toán; huỷ đặt hàng → về "Đã chọn NCC" | ✅ Đạt | 46 |
| TC-MH-06 | NCC yêu cầu cọc ≥ tiền hàng → 400; hợp lệ → "Chờ cọc" + đề xuất cọc, Kế toán được báo | ✅ Đạt | 61 |
| TC-MH-07 | Cọc đã duyệt → không huỷ đặt hàng; Kế toán chi kèm bill → Sẵn hàng + quyết toán = tiền hàng − cọc | ✅ Đạt | 64 |
| TC-MH-08 | Sale không thao tác mua hàng (403) | ✅ Đạt | 6 |

## 04_telegram.test.js

| Mã | Mô tả ca kiểm thử | Kết quả | Thời gian (ms) |
|---|---|---|---|
| TC-TG-01 | Nút bấm từ nhóm khác hoặc sai tin nhắn bị từ chối | ✅ Đạt | 24 |
| TC-TG-02 | NCC bấm "Cho xuất hàng" → Sẵn hàng, tin nhóm NCC được sửa, quyết toán gửi nhóm duyệt chi | ✅ Đạt | 48 |
| TC-TG-03 | NCC bấm "Yêu cầu cọc" → bot hỏi số tiền; trả lời sai định dạng / vượt tiền hàng → báo lỗi | ✅ Đạt | 19 |
| TC-TG-04 | NCC trả lời "50k" → Chờ cọc + đề xuất cọc 50.000 đ gửi nhóm duyệt chi (ảnh QR + nút Duyệt) | ✅ Đạt | 33 |
| TC-TG-05 | Duyệt trên Telegram: người lạ bị từ chối; người được phép duyệt → nút "Đã chi" xuất hiện | ✅ Đạt | 321 |
| TC-TG-06 | Kế toán chi ngay trong nhóm: phải gắn Telegram; gửi ảnh bill → Đã chi, vật tư Sẵn hàng, tin bỏ nút | ✅ Đạt | 412 |
| TC-TG-07 | Telegram không tải được ảnh QR → tự gửi dạng chữ kèm link QR | ✅ Đạt | 217 |

## 05_thu_tien.test.js

| Mã | Mô tả ca kiểm thử | Kết quả | Thời gian (ms) |
|---|---|---|---|
| TC-TT-01 | Tổng hợp: đã thu = cọc; cần tạm ứng theo %; QR thu tiền đúng số tiền còn thiếu + nội dung mã đơn | ✅ Đạt | 11 |
| TC-TT-02 | Chưa đủ tạm ứng → không đăng ký giao hàng được; "vẫn giao" phải ghi lý do | ✅ Đạt | 19 |
| TC-TT-03 | Ghi nhận thanh toán không hợp lệ bị chặn (CK thiếu bill, vượt số còn nợ, ngày tương lai, Sale khác) | ✅ Đạt | 26 |
| TC-TT-04 | Sale ghi nhận khách chuyển khoản → chờ Kế toán xác nhận, CHƯA tính là đã thu; Kế toán được báo | ✅ Đạt | 33 |
| TC-TT-05 | Ảnh bill chỉ người có quyền xem (Sale của đơn, Kế toán); Sale khác → 403 | ✅ Đạt | 15 |
| TC-TT-06 | Kế toán từ chối phải có lý do; xác nhận → đã thu tăng, đủ tạm ứng, đăng ký giao hàng được | ✅ Đạt | 48 |
| TC-TT-07 | Kế toán từ chối → người ghi nhận được báo kèm lý do; tiền không được tính | ✅ Đạt | 53 |
| TC-TT-08 | Đơn khác: "vẫn giao hàng" có lý do → qua bước, ghi lịch sử, báo Admin + Kế toán | ✅ Đạt | 210 |
| TC-TT-09 | Hoàn tất mà khách còn nợ → hiện ở "Đến hạn"; Kế toán nhập tiền mặt (xác nhận ngay) → hết nợ | ✅ Đạt | 285 |
| TC-TT-10 | Chỉ Kế toán/Admin xem danh sách công nợ và phiếu chờ xác nhận | ✅ Đạt | 8 |

## 06_thi_cong.test.js

| Mã | Mô tả ca kiểm thử | Kết quả | Thời gian (ms) |
|---|---|---|---|
| TC-TC-01 | Đủ hàng + đủ tạm ứng → đăng ký giao hàng | ✅ Đạt | 48 |
| TC-TC-02 | Lập giai đoạn: ngày trong quá khứ / khối lượng 0 → 400; hợp lệ → tạo được | ✅ Đạt | 28 |
| TC-TC-03 | Thợ bắt đầu giai đoạn đầu → đơn tự sang Thi công; báo xong giai đoạn cuối → tự sang Nghiệm thu | ✅ Đạt | 53 |
| TC-TC-04 | Lưu số lượng thực tế nghiệm thu trả lại dữ liệu đơn (hồi quy lỗi "Không tìm thấy đơn hàng") | ✅ Đạt | 22 |
| TC-TC-05 | Xác nhận nghiệm thu → tự sang Quyết toán; chốt quyết toán → Hoàn tất, ghi công thợ phải trả | ✅ Đạt | 48 |
| TC-TC-06 | Đơn đã hoàn tất không chuyển bước / huỷ được nữa | ✅ Đạt | 11 |

## 07_thong_bao_phan_quyen.test.js

| Mã | Mô tả ca kiểm thử | Kết quả | Thời gian (ms) |
|---|---|---|---|
| TC-TB-01 | Thao tác lỗi (rollback) không sinh thông báo — ghi cùng transaction | ✅ Đạt | 52 |
| TC-TB-02 | Người thao tác không tự nhận thông báo của chính mình | ✅ Đạt | 203 |
| TC-TB-03 | Link thông báo theo vai trò: Kế toán → mở đề xuất ở Công nợ, Vận hành → màn mua hàng của đơn | ✅ Đạt | 177 |
| TC-TB-04 | Chỉ đọc/đánh dấu thông báo của chính mình; đọc hết → 0 chưa đọc | ✅ Đạt | 21 |
| TC-PQ-01 | Mọi API GET × 4 vai trò không trả lỗi 500 | ✅ Đạt | 609 |
| TC-PQ-02 | van_hanh GET /khach-hang → 403 | ✅ Đạt | 5 |
| TC-PQ-02 | van_hanh GET /danh-muc/khach-hang → 403 | ✅ Đạt | 3 |
| TC-PQ-02 | ke_toan GET /danh-muc/khach-hang → 403 | ✅ Đạt | 3 |
| TC-PQ-02 | van_hanh GET /cong-no/de-xuat-chi → 403 | ✅ Đạt | 4 |
| TC-PQ-02 | sale GET /cong-no/de-xuat-chi → 403 | ✅ Đạt | 4 |
| TC-PQ-02 | ke_toan GET /nguoi-dung → 403 | ✅ Đạt | 3 |
| TC-PQ-02 | sale GET /mua-hang/don → 403 | ✅ Đạt | 3 |
| TC-PQ-02 | van_hanh GET /phan-tich/tong-hop → 403 | ✅ Đạt | 3 |
| TC-PQ-02 | sale GET /thu-tien/cong-no → 403 | ✅ Đạt | 3 |
| TC-PQ-02 | admin GET /nguoi-dung → 200 | ✅ Đạt | 4 |
| TC-PQ-02 | ke_toan GET /cong-no/de-xuat-chi → 200 | ✅ Đạt | 6 |
| TC-PQ-02 | van_hanh GET /thu-tien/don/1 → 200 | ✅ Đạt | 6 |

## 08_tien_ich.test.js

| Mã | Mô tả ca kiểm thử | Kết quả | Thời gian (ms) |
|---|---|---|---|
| TC-UT-01 | Đọc số tiền NCC gõ trong Telegram | ✅ Đạt | 1 |
| TC-UT-02 | Điều khoản thanh toán theo tỷ lệ tạm ứng và hình thức đơn | ✅ Đạt | 0 |
| TC-UT-03 | Link VietQR đúng mã ngân hàng, STK, số tiền, nội dung; ngân hàng lạ → null | ✅ Đạt | 0 |

## 09_nhap_so.test.js

| Mã | Mô tả ca kiểm thử | Kết quả | Thời gian (ms) |
|---|---|---|---|
| TC-NS-01 | Chưa cấu hình tỷ lệ → Admin nhập 10 số, chia đều 5/5 cho 2 Sale | ✅ Đạt | 72 |
| TC-NS-02 | Đặt tỷ lệ 70/30 → số mới bù cho đúng tỷ lệ tháng (20 số: 14/6) | ✅ Đạt | 38 |
| TC-NS-03 | Tỷ lệ 0% → Sale đó không nhận số; tổng ≠ 100% bị từ chối | ✅ Đạt | 24 |
| TC-NS-04 | Số trùng (kể cả viết +84 / có dấu cách) không tạo mới, báo Sale đang giữ | ✅ Đạt | 5 |
| TC-NS-05 | Sale tự nhập → số thuộc chính Sale đó, nguồn "Sale tự tìm", không tính vào tỷ lệ chia | ✅ Đạt | 8 |
| TC-NS-06 | API tự động: sai/thiếu key → 401; đúng key → số được chia, Sale nhận thông báo | ✅ Đạt | 81 |
| TC-NS-07 | Phân quyền: Kế toán không nhập số; Sale không xem/sửa tỷ lệ; Sale chỉ thấy số mình nhập | ✅ Đạt | 22 |
| TC-NS-08 | Số mới chia cho Sale hiện trong "Việc cần làm" | ✅ Đạt | 147 |
| TC-NS-09 | Nhập đồng thời 2 lô → không lệch tỷ lệ, không lọt số trùng | ✅ Đạt | 73 |
| TC-NS-10 | Admin chọn Sale khi nhập → số về đúng Sale đó, không tính vào tỷ lệ chia | ✅ Đạt | 13 |
| TC-NS-11 | Admin chuyển khách sang Sale khác → Sale mới thấy và được báo, Sale cũ mất quyền xem, có lịch sử | ✅ Đạt | 48 |
| TC-NS-12 | Sale không chuyển được khách | ✅ Đạt | 3 |
| TC-NS-13 | Danh sách khách mặc định xếp theo thời gian số đẩy về (mới nhất lên đầu), không theo lần chăm sóc | ✅ Đạt | 49 |

## 10_bao_cao.test.js

| Mã | Mô tả ca kiểm thử | Kết quả | Thời gian (ms) |
|---|---|---|---|
| TC-BC-01 | Lãi gộp = doanh thu − chi NCC − mua bổ sung − công thợ; chi NCC = SL × giá chốt × (1 + VAT) | ✅ Đạt | 400 |
| TC-BC-02 | Lọc "chỉ đơn lỗ" chỉ trả đơn lãi gộp < 0; khoảng ngày sai → 400 | ✅ Đạt | 10 |
| TC-BC-03 | Sale và Vận hành không xem được báo cáo lãi/lỗ | ✅ Đạt | 8 |
| TC-BC-04 | Xuất Excel lãi/lỗ: file .xlsx đúng tiêu đề, có dòng tổng khớp số liệu | ✅ Đạt | 75 |
| TC-BC-05 | Xuất Excel danh sách đơn giữ phạm vi dữ liệu: Sale chỉ có đơn của mình | ✅ Đạt | 32 |
| TC-BC-06 | Xuất Excel đề xuất chi và công nợ khách (Kế toán); Sale bị chặn | ✅ Đạt | 44 |

## 11_nhat_ky.test.js

| Mã | Mô tả ca kiểm thử | Kết quả | Thời gian (ms) |
|---|---|---|---|
| TC-NK-01 | Dữ liệu mẫu (seed) không sinh nhật ký | ✅ Đạt | 2 |
| TC-NK-02 | Tạo đơn qua web → ghi INSERT kèm đúng người thao tác, kênh web | ✅ Đạt | 139 |
| TC-NK-03 | UPDATE chỉ lưu các cột thực sự đổi (cũ → mới) | ✅ Đạt | 59 |
| TC-NK-04 | Đổi mật khẩu → có nhật ký nhưng không lộ hash mật khẩu | ✅ Đạt | 212 |
| TC-NK-05 | Thao tác lỗi (rollback) không để lại nhật ký | ✅ Đạt | 26 |
| TC-NK-06 | Chỉ Admin xem nhật ký | ✅ Đạt | 7 |

## 12_phan_quyen.test.js

| Mã | Mô tả ca kiểm thử | Kết quả | Thời gian (ms) |
|---|---|---|---|
| TC-PQ-01 | Quyền mặc định giữ đúng phân quyền cũ; /auth/me trả danh sách quyền | ✅ Đạt | 171 |
| TC-PQ-02 | Admin cấp quyền "Duyệt chi" cho Kế toán → có hiệu lực ngay; thu lại → bị chặn ngay | ✅ Đạt | 111 |
| TC-PQ-03 | Bỏ quyền "Xem khách hàng" của Sale → API khách hàng trả 403 | ✅ Đạt | 49 |
| TC-PQ-04 | Không gán được quyền quản trị cho vai trò khác; Admin không tự mất quyền quản trị | ✅ Đạt | 22 |
| TC-PQ-05 | Chỉ Admin vào màn phân quyền; thay đổi quyền được ghi nhật ký | ✅ Đạt | 13 |

## 13_ngan_hang.test.js

| Mã | Mô tả ca kiểm thử | Kết quả | Thời gian (ms) |
|---|---|---|---|
| TC-NH-01 | Sai/thiếu API key → 401; tiền vào có mã đơn → tự tạo phiếu thu đã xác nhận | ✅ Đạt | 101 |
| TC-NH-02 | Có phiếu chờ xác nhận đúng số tiền → ngân hàng tự xác nhận phiếu đó (nội dung mất dấu gạch vẫn nhận) | ✅ Đạt | 77 |
| TC-NH-03 | Ngân hàng gửi lại cùng giao dịch → không xử lý lần hai | ✅ Đạt | 36 |
| TC-NH-04 | Không có mã đơn / vượt số còn phải thu → chưa khớp, báo Kế toán; Kế toán khớp tay hoặc bỏ qua | ✅ Đạt | 96 |
| TC-NH-05 | Tiền ra khớp nội dung CK của đề xuất chi đã duyệt → tự ghi "đã chi", không cần ảnh bill | ✅ Đạt | 178 |
| TC-NH-06 | Giả lập giao dịch chạy cùng luồng xử lý; Sale không được dùng | ✅ Đạt | 11 |

## 14_hai_lop.test.js

| Mã | Mô tả ca kiểm thử | Kết quả | Thời gian (ms) |
|---|---|---|---|
| TC-2FA-01 | Kế toán đăng nhập lần đầu → chưa có token, bắt cài 2FA; "mã tạm" không dùng làm token được | ✅ Đạt | 186 |
| TC-2FA-02 | Cài 2FA: QR + khoá; mã sai bị từ chối; mã đúng → token + 8 mã dự phòng; khoá lưu mã hoá | ✅ Đạt | 255 |
| TC-2FA-03 | Lần sau phải nhập mã; một mã chỉ dùng được một lần | ✅ Đạt | 138 |
| TC-2FA-04 | Mất điện thoại: dùng mã dự phòng (chỉ một lần); Admin đặt lại 2FA → phải cài lại | ✅ Đạt | 522 |
| TC-2FA-05 | Nhập sai mã 5 lần → tạm khoá; Sale và Vận hành đăng nhập một bước | ✅ Đạt | 212 |

## 15_sao_luu.test.js

| Mã | Mô tả ca kiểm thử | Kết quả | Thời gian (ms) |
|---|---|---|---|
| TC-SL-01 | Admin bấm "Sao lưu ngay" → có file CSDL (.dump) và file ảnh (.tar.gz) | ✅ Đạt | 480 |
| TC-SL-02 | Chỉ giữ số bản theo cấu hình (2 bản), bản cũ nhất bị xoá | ✅ Đạt | 2936 |
| TC-SL-03 | Tải bản sao lưu; tên file lạ (../) bị chặn; Kế toán không có quyền | ✅ Đạt | 24 |

## 16_e2e_vong_doi_don.test.js

| Mã | Mô tả ca kiểm thử | Kết quả | Thời gian (ms) |
|---|---|---|---|
| E2E-01 | Website đẩy số qua API → chia cho Sale theo tỷ lệ, Sale được thông báo | ✅ Đạt | 96 |
| E2E-02 | Sale thấy số trong "Việc cần làm", chăm sóc đến chốt; Sale khác không xem được khách này | ✅ Đạt | 201 |
| E2E-03 | Sale lên đơn hoàn thiện và chốt → đơn tự giao cho Vận hành, Vận hành được thông báo | ✅ Đạt | 89 |
| E2E-04 | Lên phương án → tính KLVT (đo thực tế 12 m²) → tổng đơn đổi, Sale được báo → sang Mua hàng | ✅ Đạt | 110 |
| E2E-05 | Chưa đủ hàng → không đăng ký giao hàng được (kể cả khi chưa ai mở màn Mua hàng) | ✅ Đạt | 11 |
| E2E-06 | Chọn NCC rẻ nhất; đặt hàng NCC A → NCC bấm "Cho xuất hàng" trên Telegram → sẵn hàng, tự lập quyết toán | ✅ Đạt | 114 |
| E2E-07 | Đặt hàng NCC B → NCC "Yêu cầu cọc" 100k → chờ cọc; giám đốc duyệt cọc trên Telegram | ✅ Đạt | 289 |
| E2E-08 | Kế toán chuyển cọc → sao kê ngân hàng tự ghi "đã chi" → vật tư B sẵn hàng, tự lập quyết toán phần còn lại | ✅ Đạt | 40 |
| E2E-09 | Admin duyệt hai quyết toán NCC trên web; ngân hàng báo đã chuyển → công nợ NCC của đơn về 0 | ✅ Đạt | 49 |
| E2E-10 | Đủ hàng nhưng khách chưa tạm ứng 50% → chặn giao hàng; khách chuyển khoản → ngân hàng tự xác nhận → giao hàng | ✅ Đạt | 51 |
| E2E-11 | Lấy hàng từ hai NCC; lập giai đoạn thi công, phân đội thợ → thợ bắt đầu → đơn tự sang Thi công | ✅ Đạt | 45 |
| E2E-12 | Ghi phụ thu thi công; báo xong → nghiệm thu theo thực tế → quyết toán → hoàn tất, ghi công thợ | ✅ Đạt | 113 |
| E2E-13 | Đơn hoàn tất còn nợ hiện trong công nợ đến hạn; khách trả nốt qua ngân hàng → hết nợ | ✅ Đạt | 48 |
| E2E-14 | Kế toán đề xuất trả công thợ → Admin duyệt → chi kèm bill trên web → công nợ thợ của đơn về 0 | ✅ Đạt | 85 |
| E2E-15 | Báo cáo lãi/lỗ có đơn (đã quyết toán, lãi = doanh thu − NCC − công thợ); nhật ký và thông báo đủ vết | ✅ Đạt | 49 |

## 17_nhap_so_file.test.js

| Mã | Mô tả ca kiểm thử | Kết quả | Thời gian (ms) |
|---|---|---|---|
| TC-NSF-01 | Excel có tiêu đề (cột đảo thứ tự), SĐT kiểu số mất số 0 đầu → đọc đúng, tự thêm 0 | ✅ Đạt | 59 |
| TC-NSF-02 | CSV dấu phẩy, địa chỉ có dấu phẩy trong ngoặc kép, có BOM; không có tiêu đề → theo thứ tự cột | ✅ Đạt | 11 |
| TC-NSF-03 | TXT dạng "SĐT \| Tên \| Địa chỉ \| Nhu cầu" giống ô dán | ✅ Đạt | 5 |
| TC-NSF-04 | File mẫu tải về đọc lại được đúng 2 dòng ví dụ; file .xls cũ / rỗng / quá lớn bị từ chối | ✅ Đạt | 52 |
| TC-NSF-05 | Đọc xong nhập được (luồng xem trước → nhập); Kế toán không có quyền đọc file | ✅ Đạt | 33 |

## 18_cham_soc.test.js

| Mã | Mô tả ca kiểm thử | Kết quả | Thời gian (ms) |
|---|---|---|---|
| TC-CS-01 | Không chuyển về "Mới"; trạng thái lạ bị từ chối; "Không nghe máy" → "Thuê bao" ghi được | ✅ Đạt | 122 |
| TC-CS-02 | "Hẹn gọi lại" bắt buộc có thời điểm ở tương lai; đến giờ thì hiện việc gấp; chuyển trạng thái khác thì xoá lịch hẹn | ✅ Đạt | 278 |
| TC-CS-03 | "Không quan tâm" / "Sai số" bắt buộc ghi lý do | ✅ Đạt | 11 |
| TC-CS-04 | "Chốt đơn" → khách sang Chốt, lịch sử đủ các lần liên hệ theo thứ tự | ✅ Đạt | 33 |

## 19_bao_cao_cham_soc.test.js

| Mã | Mô tả ca kiểm thử | Kết quả | Thời gian (ms) |
|---|---|---|---|
| TC-BCS-01 | Đếm đúng: được chia 3, đã liên hệ 2, chốt 1; tồn đọng: 1 số quá 1 ngày, 1 khách quan tâm quá 3 ngày | ✅ Đạt | 9 |
| TC-BCS-02 | Danh sách tồn đọng trả đúng khách; loại lạ → 400 | ✅ Đạt | 13 |
| TC-BCS-03 | Chuyển nhiều số sang Sale khác (bắt buộc lý do) → hết tồn đọng ở Sale cũ, Sale mới được tính lại thời hạn từ lúc nhận | ✅ Đạt | 29 |
| TC-BCS-04 | AI nhận xét: bỏ tên Sale bịa, đánh dấu số không có trong dữ liệu, dùng bộ nhớ đệm | ✅ Đạt | 18 |
| TC-BCS-06 | Mỗi lần AI phân tích mới được lưu nhật ký (lần lấy từ bộ nhớ đệm không lưu trùng), xem lại được nguyên bản | ✅ Đạt | 24 |
| TC-BCS-05 | Sale không xem được báo cáo chăm sóc | ✅ Đạt | 8 |

## 20_san_pham.test.js

| Mã | Mô tả ca kiểm thử | Kết quả | Thời gian (ms) |
|---|---|---|---|
| TC-SP-01 | Dữ liệu mẫu đã có sản phẩm: khách có đơn → theo đơn; đơn → loại vật tư nhiều tiền nhất | ✅ Đạt | 35 |
| TC-SP-02 | Thêm khách kèm sản phẩm; Sale sửa lại; id sai → 400; Sale khác → 403 | ✅ Đạt | 76 |
| TC-SP-03 | Nhập số có "Nhu cầu" → tự đoán sản phẩm theo từ khoá (không nhầm "của" thành "cửa") | ✅ Đạt | 32 |
| TC-SP-04 | Đơn lưu sản phẩm: bỏ trống → tự lấy loại nhiều tiền nhất; chọn tay → giữ; khách được thêm sản phẩm quan tâm | ✅ Đạt | 178 |

## 21_tro_ly_san_pham.test.js

| Mã | Mô tả ca kiểm thử | Kết quả | Thời gian (ms) |
|---|---|---|---|
| TC-TL-01 | Mỗi sản phẩm một trợ lý: prompt chỉ chứa kiến thức + danh mục của đúng sản phẩm đó | ✅ Đạt | 122 |
| TC-TL-02 | Hỏi tiếp trong cùng cuộc trò chuyện → gửi kèm lịch sử; gửi ảnh → ảnh đi kèm câu hỏi, không lưu ảnh | ✅ Đạt | 175 |
| TC-TL-03 | Gắn khách đang tư vấn → AI chỉ nhận nhóm khách + nhu cầu, không nhận tên/SĐT; khách của Sale khác → 403 | ✅ Đạt | 40 |
| TC-TL-04 | Kiểm tra đầu vào: trống → 400; ảnh sai định dạng → 400; trợ lý chưa có kiến thức → 409 (không gọi AI) | ✅ Đạt | 23 |
| TC-TL-05 | Admin soạn kiến thức (có nhật ký); đọc tài liệu PDF; Sale/Vận hành không sửa được; Vận hành không hỏi được | ✅ Đạt | 52 |
| TC-TL-06 | Đã bỏ "Lên đơn nhanh bằng AI": API trích xuất đơn không còn | ✅ Đạt | 3 |

## 22_xac_thuc_vai_tro.test.js

| Mã | Mô tả ca kiểm thử | Kết quả | Thời gian (ms) |
|---|---|---|---|
| TC-XT-01 | Mặc định giữ như cũ: Admin, Kế toán bật; Sale, Vận hành tắt; có thống kê số tài khoản đã cài | ✅ Đạt | 10 |
| TC-XT-02 | Bật cho Sale → Sale đăng nhập phải cài 2FA; "đăng xuất ngay" làm token cũ của Sale chưa cài hết hiệu lực | ✅ Đạt | 173 |
| TC-XT-03 | Tắt cho Kế toán đã cài → đăng nhập chỉ bằng mật khẩu; bật lại → nhập mã ngay (không phải quét QR lại) | ✅ Đạt | 466 |
| TC-XT-04 | Đầu vào sai → 400; không phải Admin → 403; lưu lại cùng giá trị không sinh nhật ký thừa | ✅ Đạt | 91 |

## 23_tro_ly_quan_ly.test.js

| Mã | Mô tả ca kiểm thử | Kết quả | Thời gian (ms) |
|---|---|---|---|
| TC-QL-01 | Hỏi về một Sale → AI gọi công cụ, backend trả số liệu thật, lưu cuộc trò chuyện loại "quản lý" | ✅ Đạt | 108 |
| TC-QL-02 | Không gửi tên, SĐT khách ra ngoài: ghi chú có SĐT/tên khách bị che | ✅ Đạt | 27 |
| TC-QL-03 | Tên Sale mơ hồ / không tồn tại → công cụ báo lại để AI hỏi người dùng | ✅ Đạt | 12 |
| TC-QL-04 | Hỏi tiếp trong cùng cuộc trò chuyện gửi kèm lịch sử; trợ lý sản phẩm không nhận cuộc trò chuyện quản lý | ✅ Đạt | 26 |
| TC-QL-05 | Phân quyền: Sale, Vận hành không dùng được; câu hỏi trống → 400 | ✅ Đạt | 13 |

## 24_tro_ly_ncc.test.js

| Mã | Mô tả ca kiểm thử | Kết quả | Thời gian (ms) |
|---|---|---|---|
| TC-NCC-01 | "Vật tư này nên mua của NCC nào" → so sánh giá thật; AI chỉ thấy mã NCC + mã tiền, câu trả lời được đổi lại tên và số thật | ✅ Đạt | 182 |
| TC-NCC-02 | Người dùng gõ tên NCC → đổi thành mã trước khi gửi; hỏi tiếp gửi lịch sử ẩn danh, mã tiền đánh số tiếp | ✅ Đạt | 67 |
| TC-NCC-03 | Lịch sử giá, vật tư mơ hồ, AI truyền tên NCC thay vì mã → vẫn chỉ trả mã | ✅ Đạt | 73 |
| TC-NCC-04 | Xếp hạng NCC, vật tư bán chạy, công nợ: mọi số tiền gửi AI đều là mã | ✅ Đạt | 48 |
| TC-NCC-05 | Nhận xét AI ở trang Phân tích NCC: không gửi tên NCC / số tiền; mã NCC trong kết quả đổi về tên thật | ✅ Đạt | 18 |
| TC-NCC-06 | Phân quyền: Sale, Vận hành, Kế toán (mặc định) không dùng được; cuộc trò chuyện NCC không dùng chéo trợ lý khác | ✅ Đạt | 46 |

