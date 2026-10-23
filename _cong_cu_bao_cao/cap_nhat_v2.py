# Cap nhat tao_ch2.cjs theo pham vi tinh nang da chot (23/10/2026):
# nhap so & chia so, bao cao lai/lo + Excel, nhat ky thay doi, phan quyen RBAC, doi soat ngan hang, 2FA, sao luu, PWA.
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
p = 'tao_ch2.cjs'
s = open(p, encoding='utf-8').read()

def r(a, b):
    global s
    assert a in s, a[:120]
    s = s.replace(a, b, 1)

# ---------- 2.1 ----------
r("""  '**Thông tin phân tán:** muốn biết vật tư nào bán chạy, NCC nào giá tốt phải tự lọc nhiều bảng tính.',
]);""", """  '**Số khách tiềm năng chia tay:** phòng marketing và các kênh quảng cáo gửi số điện thoại khách qua tin nhắn, người quản lý tự chia cho từng Sale; không biết mỗi Sale đã nhận bao nhiêu số, số trùng bị gọi nhiều lần, số chia rồi không ai gọi.',
  '**Không biết lãi lỗ từng đơn:** doanh thu, tiền hàng NCC, công thợ nằm ở các bảng tính khác nhau nên chỉ biết lãi lỗ tổng cuối kỳ, không phát hiện kịp đơn bán dưới giá vốn.',
  '**Đối soát sao kê thủ công:** kế toán dò từng dòng sao kê ngân hàng để khớp với khoản khách trả và khoản đã chi.',
  '**Thông tin phân tán, khó kiểm soát:** muốn biết vật tư nào bán chạy, NCC nào giá tốt phải tự lọc nhiều bảng tính; không biết ai đã sửa số liệu gì, dữ liệu chỉ nằm trên máy cá nhân, không có bản sao lưu.',
]);""")
r("có phân quyền rõ ràng, lưu vết mọi phê duyệt và tích hợp các kênh doanh nghiệp đang dùng (Telegram, chuyển khoản QR) là cần thiết.",
  "có phân quyền rõ ràng, lưu vết mọi phê duyệt và thay đổi, tích hợp các kênh doanh nghiệp đang dùng (Telegram, chuyển khoản QR, sao kê ngân hàng) và cho biết lãi lỗ của từng đơn là cần thiết.")

# ---------- 2.3 ----------
r("P('Hệ thống quản lý xuyên suốt vòng đời một đơn hàng. Sale chăm sóc khách hàng,",
  "P('Vòng đời bắt đầu từ **số khách tiềm năng**: số điện thoại do marketing nhập vào hệ thống (nhập tay, dán hàng loạt từ bảng tính, hoặc website và quảng cáo tự đẩy qua API). Hệ thống chống trùng số và **tự chia số cho Sale theo tỷ lệ** Admin đặt — mỗi số giao cho Sale đang thiếu nhiều nhất so với tỷ lệ của mình trong tháng; Admin có thể chọn Sale nhận hoặc chuyển số sang Sale khác. Sale tự tìm được khách thì tự nhập, số thuộc về chính Sale đó.');\nP('Hệ thống quản lý xuyên suốt vòng đời một đơn hàng. Sale chăm sóc khách hàng,")
r("""P('**Dòng tiền thu:** Sale hoặc vận hành ghi nhận khách thanh toán kèm ảnh bill; kế toán đối chiếu sao kê rồi xác nhận "đã nhận tiền".""",
  """P('**Đối soát ngân hàng:** dịch vụ báo giao dịch (SePay) gửi về hệ thống mỗi khoản tiền vào/ra tài khoản công ty. Tiền vào có mã đơn trong nội dung chuyển khoản được tự xác nhận vào phiếu thu; tiền ra khớp nội dung chuyển khoản của đề xuất chi đã duyệt được tự ghi "đã chi". Giao dịch không khớp được chuyển cho kế toán xử lý.');
P('**Dòng tiền thu:** Sale hoặc vận hành ghi nhận khách thanh toán kèm ảnh bill; kế toán đối chiếu sao kê (hoặc hệ thống tự khớp như trên) rồi xác nhận "đã nhận tiền".""")
r("""Khách hàng xem báo giá qua đường dẫn công khai; NCC và người duyệt chi tương tác qua Telegram mà không cần tài khoản trên hệ thống.');""",
  """Khách hàng xem báo giá qua đường dẫn công khai; NCC và người duyệt chi tương tác qua Telegram mà không cần tài khoản trên hệ thống.');
P('Ở tầng quản trị, Admin và kế toán xem **báo cáo lãi/lỗ gộp theo đơn** (doanh thu trừ chi NCC, giá vốn hàng tự sản xuất, mua bổ sung, công thợ) và xuất Excel. Admin cấu hình **phân quyền theo chức năng** cho từng vai trò, tham số nghiệp vụ, theo dõi **nhật ký thay đổi** (ai sửa gì, giá trị cũ và mới) và **sao lưu dữ liệu** tự động hằng ngày. Tài khoản Admin và kế toán — những người duyệt và chi tiền — bắt buộc **xác thực hai lớp**.');""")

# ---------- 2.4.1 ----------
r("Khách hàng xem báo giá qua đường dẫn; dịch vụ AI Gemini là hệ thống ngoài phục vụ trợ lý AI.');",
  "Khách hàng xem báo giá qua đường dẫn; các hệ thống ngoài gồm dịch vụ AI Gemini (trợ lý AI), Ngân hàng (dịch vụ báo giao dịch SePay) và Website / kênh quảng cáo (đẩy số khách tiềm năng qua API).');")
r("""  ['8', 'Ghi nhận khách thanh toán', 'Ghi nhận khách chuyển khoản (kèm bill) hoặc trả tiền mặt; gửi QR thu tiền cho khách.'],
], [8, 26, 66]);""", """  ['8', 'Ghi nhận khách thanh toán', 'Ghi nhận khách chuyển khoản (kèm bill) hoặc trả tiền mặt; gửi QR thu tiền cho khách.'],
  ['9', 'Nhập số tự tìm', 'Nhập số khách tiềm năng tự tìm được (từng số hoặc dán nhiều số); số thuộc về chính Sale; chống trùng số.'],
  ['10', 'Chăm sóc số được chia', 'Nhận thông báo khi được chia số; "Việc cần làm" nhắc số mới chưa liên hệ, số quá 2 giờ chưa gọi.'],
], [8, 26, 66]);""")
r("""  ['8', 'Mua bổ sung', 'Chốt phiếu mua bổ sung (NCC, giá, chia tiền trách nhiệm) và lập đề xuất chi bổ sung.'],
], [8, 26, 66]);""", """  ['8', 'Mua bổ sung', 'Chốt phiếu mua bổ sung (NCC, giá, chia tiền trách nhiệm) và lập đề xuất chi bổ sung.'],
  ['9', 'Đối soát ngân hàng', 'Xem giao dịch ngân hàng hệ thống đã tự khớp; khớp tay giao dịch tiền vào chưa khớp vào đơn, hoặc bỏ qua kèm lý do.'],
  ['10', 'Báo cáo lãi/lỗ, xuất Excel', 'Lãi gộp theo đơn, theo Sale, theo hình thức; lọc đơn lỗ; xuất Excel báo cáo, danh sách đơn, đề xuất chi, công nợ khách.'],
  ['11', 'Đăng nhập hai lớp', 'Bắt buộc xác thực hai lớp bằng ứng dụng Authenticator; mã dự phòng khi mất điện thoại.'],
], [8, 26, 66]);""")
r("""  ['1', 'Quản lý người dùng', 'Tạo tài khoản (mật khẩu tạm), đổi vai trò, khoá/mở khoá, đặt lại mật khẩu, gắn tài khoản Telegram.'],""",
  """  ['1', 'Quản lý người dùng', 'Tạo tài khoản (mật khẩu tạm), đổi vai trò, khoá/mở khoá, đặt lại mật khẩu, gắn tài khoản Telegram, đặt lại xác thực hai lớp khi nhân viên mất điện thoại.'],""")
r("""  ['4', 'Giám sát toàn công ty', 'Xem mọi đơn, mọi công nợ; KPI doanh thu, công nợ trên trang Tổng quan.'],
], [8, 26, 66]);""", """  ['4', 'Giám sát toàn công ty', 'Xem mọi đơn, mọi công nợ; KPI doanh thu, công nợ trên trang Tổng quan; báo cáo lãi/lỗ.'],
  ['5', 'Nhập số và quản lý chia số', 'Nhập số khách tiềm năng (tay, dán hàng loạt, API); đặt tỷ lệ chia cho từng Sale; chọn Sale nhận; chuyển số sang Sale khác (ghi lý do).'],
  ['6', 'Phân quyền theo chức năng', 'Tick chức năng mỗi vai trò được làm trên ma trận quyền; có hiệu lực ngay.'],
  ['7', 'Nhật ký thay đổi', 'Xem ai đã thêm / sửa / xoá dữ liệu gì, giá trị cũ và mới, lúc nào, qua kênh nào.'],
  ['8', 'Sao lưu, cấu hình', 'Xem và tạo bản sao lưu dữ liệu, tải bản sao lưu; chỉnh tham số nghiệp vụ (giá vốn ước tính hàng tự sản xuất).'],
], [8, 26, 66]);""")
r("""  ['Dịch vụ Gemini AI', 'Trích xuất, nhận xét', 'Trích xuất đơn từ văn bản/ảnh; viết nhận xét cho số liệu phân tích.'],
], [24, 26, 50]);""", """  ['Dịch vụ Gemini AI', 'Trích xuất, nhận xét', 'Trích xuất đơn từ văn bản/ảnh; viết nhận xét cho số liệu phân tích.'],
  ['Ngân hàng (SePay)', 'Báo giao dịch', 'Gửi webhook mỗi giao dịch tiền vào/ra tài khoản công ty (số tiền, nội dung chuyển khoản) để hệ thống tự đối soát.'],
  ['Website / kênh quảng cáo', 'Đẩy số khách tiềm năng', 'Gọi API nhập số (kèm khoá API) mỗi khi có khách để lại số; số được chia cho Sale như khi nhập tay.'],
], [24, 26, 50]);""")

# ---------- 2.4.2 ----------
r("hiển thị tốt trên điện thoại (Sale và vận hành thường thao tác ngoài công trình).",
  "hiển thị tốt trên điện thoại (Sale và vận hành thường thao tác ngoài công trình): các trang được rà soát ở khổ màn hình 390 px, bảng rộng cuộn ngang, thanh tab vuốt ngang. Ứng dụng là **PWA** — cài được lên màn hình chính điện thoại như một ứng dụng, mở toàn màn hình.")
r("""  'Xác thực bằng JWT; mật khẩu băm bằng bcrypt; sai mật khẩu 5 lần trong 15 phút bị tạm chặn đăng nhập.',""",
  """  'Xác thực bằng JWT; mật khẩu băm bằng bcrypt; sai mật khẩu 5 lần trong 15 phút bị tạm chặn đăng nhập.',
  '**Xác thực hai lớp (TOTP, RFC 6238)** bắt buộc cho Admin và Kế toán: sau mật khẩu phải nhập mã 6 số đổi mỗi 30 giây từ ứng dụng Authenticator; khoá bí mật lưu mã hoá AES-256-GCM, mỗi mã chỉ dùng một lần, có 8 mã dự phòng dùng một lần.',""")
r("""  '**Phân quyền hai lớp:** theo vai trò ở tầng route và theo dữ liệu ở tầng nghiệp vụ (Sale chỉ thấy đơn của mình, Vận hành chỉ thấy đơn mình phụ trách); mọi kiểm tra thực hiện ở máy chủ.',""",
  """  '**Phân quyền hai lớp:** theo chức năng (RBAC — Admin cấu hình ma trận vai trò × quyền) ở tầng route và theo dữ liệu ở tầng nghiệp vụ (Sale chỉ thấy khách, đơn của mình; Vận hành chỉ thấy đơn mình phụ trách); mọi kiểm tra thực hiện ở máy chủ. Quyền quản trị hệ thống luôn thuộc Admin để không thể tự khoá mình.',
  '**API cho hệ thống ngoài** (nhập số, webhook ngân hàng) xác thực bằng khoá API so sánh thời gian hằng (chống dò khoá theo thời gian phản hồi).',
  '**Lưu vết:** trigger CSDL ghi nhật ký mọi thay đổi trên các bảng quan trọng kèm người thao tác và kênh (web, Telegram, API, ngân hàng); mật khẩu và khoá xác thực không bao giờ xuất hiện trong nhật ký.',""")
r("trigger chặn một dòng vật tư nằm trong hai đề xuất quyết toán.');",
  "trigger chặn một dòng vật tư nằm trong hai đề xuất quyết toán. Mỗi giao dịch ngân hàng chỉ được xử lý một lần (khoá duy nhất theo mã giao dịch) dù ngân hàng gửi lại; chia số khách tiềm năng dùng khoá tư vấn để nhập đồng thời vẫn đúng tỷ lệ và không lọt số trùng.');")
r("Cấu trúc CSDL được quản lý bằng các tệp migration đánh số, chạy đúng một lần trên mỗi máy, giúp nâng cấp an toàn khi triển khai.');",
  """Cấu trúc CSDL được quản lý bằng các tệp migration đánh số, chạy đúng một lần trên mỗi máy, giúp nâng cấp an toàn khi triển khai. Quyền của từng vai trò và tham số nghiệp vụ được lưu trong CSDL nên thay đổi quy định không cần sửa mã nguồn; hệ thống ngoài kết nối qua API (nhập số) và webhook theo định dạng chuẩn của dịch vụ ngân hàng.');
H4('2.4.2.5. Sao lưu và khôi phục dữ liệu');
P('Hệ thống tự sao lưu hằng ngày toàn bộ cơ sở dữ liệu (pg_dump) và thư mục ảnh bill, giữ số bản gần nhất theo cấu hình; Admin có thể sao lưu ngay và tải bản sao lưu về. Công cụ khôi phục luôn khôi phục vào một cơ sở dữ liệu mới, không ghi đè cơ sở dữ liệu đang chạy, để kiểm tra trước khi chuyển sang dùng.');""")

# ---------- 2.5 ----------
r("Người duyệt chi, Nhà cung cấp, Khách hàng và Gemini AI là actor bên ngoài.');",
  "Người duyệt chi, Nhà cung cấp, Khách hàng, Gemini AI, Ngân hàng và Website / kênh quảng cáo là actor bên ngoài.');")
r("""  '**Actor:** Người dùng (tổng quát hoá: Sale, Vận hành, Kế toán, Admin); Người duyệt chi (Telegram); Nhà cung cấp (Telegram); Khách hàng; Gemini AI (hệ thống ngoài).',
  '**Use case (gói theo nhóm):** Đăng nhập; Đổi mật khẩu; Xem thông báo; Quản lý khách hàng; Quản lý đơn hàng; Mua hàng – đặt hàng NCC; Thi công – nghiệm thu – quyết toán; Đề xuất chi & duyệt chi; Thu tiền khách hàng; Quản lý NCC – bảng giá – vật tư; Phân tích & trợ lý AI; Quản lý người dùng.',
  '**Liên kết:** Người dùng — Đăng nhập, Đổi mật khẩu, Xem thông báo. Sale — Quản lý khách hàng, Quản lý đơn hàng, Thu tiền khách hàng. Vận hành — Quản lý đơn hàng, Mua hàng, Thi công. Kế toán — Đề xuất chi, Thu tiền, Quản lý NCC, Phân tích. Admin — Quản lý người dùng, Đề xuất chi & duyệt chi. Người duyệt chi — Đề xuất chi & duyệt chi. Nhà cung cấp — Mua hàng – đặt hàng NCC. Khách hàng — Quản lý đơn hàng (xem báo giá). Gemini AI — Phân tích & trợ lý AI.',""",
  """  '**Actor:** Người dùng (tổng quát hoá: Sale, Vận hành, Kế toán, Admin); Người duyệt chi (Telegram); Nhà cung cấp (Telegram); Khách hàng; Gemini AI, Ngân hàng (SePay), Website / kênh quảng cáo (hệ thống ngoài).',
  '**Use case (gói theo nhóm):** Đăng nhập (extend: Xác thực hai lớp); Đổi mật khẩu; Xem thông báo; Nhập số và chia số; Quản lý khách hàng; Quản lý đơn hàng; Mua hàng – đặt hàng NCC; Thi công – nghiệm thu – quyết toán; Đề xuất chi & duyệt chi; Thu tiền khách hàng; Đối soát ngân hàng; Quản lý NCC – bảng giá – vật tư; Phân tích, báo cáo lãi/lỗ & trợ lý AI; Quản trị hệ thống (người dùng, phân quyền, nhật ký, sao lưu, cấu hình).',
  '**Liên kết:** Người dùng — Đăng nhập, Đổi mật khẩu, Xem thông báo. Sale — Nhập số và chia số (số tự tìm), Quản lý khách hàng, Quản lý đơn hàng, Thu tiền khách hàng. Vận hành — Quản lý đơn hàng, Mua hàng, Thi công. Kế toán — Đề xuất chi, Thu tiền, Đối soát ngân hàng, Quản lý NCC, Phân tích & báo cáo. Admin — Nhập số và chia số, Quản trị hệ thống, Đề xuất chi & duyệt chi, Báo cáo lãi/lỗ. Người duyệt chi — Đề xuất chi & duyệt chi. Nhà cung cấp — Mua hàng – đặt hàng NCC. Khách hàng — Quản lý đơn hàng (xem báo giá). Gemini AI — Phân tích & trợ lý AI. Ngân hàng — Đối soát ngân hàng. Website / kênh quảng cáo — Nhập số và chia số.',""")
r("""  '**Use case:** Quản lý khách hàng; Ghi nhật ký chăm sóc; Tạo đơn hàng;""", """  '**Use case:** Nhập số tự tìm; Quản lý khách hàng; Ghi nhật ký chăm sóc; Tạo đơn hàng;""")
r("""  '**Quan hệ:** Tạo đơn hàng «extend» Trích xuất đơn bằng AI (liên kết Gemini AI);""", """  '**Quan hệ:** Nhập số tự tìm «include» Kiểm tra trùng số; Tạo đơn hàng «extend» Trích xuất đơn bằng AI (liên kết Gemini AI);""")
r("""  '**Actor:** Kế toán; Người duyệt chi (Telegram); Gemini AI.',
  '**Use case:** Quản lý NCC và bảng giá; Quản lý danh mục vật tư; Lập đề xuất chi; Gửi lại đề xuất bị từ chối; Xác nhận đã chi; Xem công nợ NCC; Xem công nợ đội thợ; Xác nhận tiền khách về; Xem công nợ khách hàng; Chốt phiếu mua bổ sung; Phân tích vật tư bán chạy và giá NCC.',
  '**Quan hệ:** Lập đề xuất chi «include» Gửi đề xuất kèm QR vào nhóm Telegram (liên kết Người duyệt chi); Xác nhận đã chi «include» Tải ảnh bill; Xác nhận đã chi «extend» Xác nhận qua Telegram; Phân tích «extend» AI nhận xét (liên kết Gemini AI).',""",
  """  '**Actor:** Kế toán; Người duyệt chi (Telegram); Gemini AI; Ngân hàng (SePay).',
  '**Use case:** Quản lý NCC và bảng giá; Quản lý danh mục vật tư; Lập đề xuất chi; Gửi lại đề xuất bị từ chối; Xác nhận đã chi; Xem công nợ NCC; Xem công nợ đội thợ; Xác nhận tiền khách về; Xem công nợ khách hàng; Đối soát giao dịch ngân hàng; Chốt phiếu mua bổ sung; Phân tích vật tư bán chạy và giá NCC; Xem báo cáo lãi/lỗ; Xuất Excel.',
  '**Quan hệ:** Lập đề xuất chi «include» Gửi đề xuất kèm QR vào nhóm Telegram (liên kết Người duyệt chi); Xác nhận đã chi «include» Tải ảnh bill; Xác nhận đã chi «extend» Xác nhận qua Telegram; Ngân hàng — Đối soát giao dịch ngân hàng (tự xác nhận tiền khách về / tự ghi đã chi); Xem báo cáo lãi/lỗ «extend» Xuất Excel; Phân tích «extend» AI nhận xét (liên kết Gemini AI).',""")
r("""  '**Actor:** Admin; Người duyệt chi (Telegram).',
  '**Use case:** Quản lý người dùng (tạo, đổi vai trò, khoá, đặt lại mật khẩu, gắn Telegram); Duyệt / từ chối đề xuất chi; Thu hồi đề xuất đã duyệt; Chuyển vận hành phụ trách đơn; Xem tổng quan toàn công ty.',
  '**Quan hệ:** Duyệt đề xuất chi được thực hiện trên web (Admin) hoặc trên Telegram (Người duyệt chi) — vẽ Người duyệt chi liên kết cùng use case; Từ chối «include» Ghi lý do; Chuyển phụ trách «include» Ghi lý do.',""",
  """  '**Actor:** Admin; Người duyệt chi (Telegram); Website / kênh quảng cáo.',
  '**Use case:** Quản lý người dùng (tạo, đổi vai trò, khoá, đặt lại mật khẩu, gắn Telegram, đặt lại xác thực hai lớp); Nhập số khách tiềm năng; Quản lý tỷ lệ chia số; Chuyển số sang Sale khác; Duyệt / từ chối đề xuất chi; Thu hồi đề xuất đã duyệt; Chuyển vận hành phụ trách đơn; Phân quyền theo chức năng; Xem nhật ký thay đổi; Sao lưu dữ liệu; Cấu hình tham số; Xem tổng quan, báo cáo lãi/lỗ toàn công ty.',
  '**Quan hệ:** Duyệt đề xuất chi được thực hiện trên web (Admin) hoặc trên Telegram (Người duyệt chi) — vẽ Người duyệt chi liên kết cùng use case; Website / kênh quảng cáo liên kết Nhập số khách tiềm năng (qua API); Nhập số «include» Chia số theo tỷ lệ; Từ chối, Chuyển phụ trách, Chuyển số «include» Ghi lý do.',""")

# ---------- 2.6 ----------
r("""    '1. Người dùng nhập tên đăng nhập, mật khẩu.\\n2. Hệ thống kiểm tra mật khẩu (bcrypt), trạng thái tài khoản.\\n3. Hệ thống cấp JWT kèm số phiên bản token, chuyển đến trang Tổng quan theo vai trò.',
    '2a. Sai thông tin: báo "Sai tên đăng nhập hoặc mật khẩu" (không tiết lộ tài khoản có tồn tại).\\n2b. Sai 5 lần trong 15 phút: tạm chặn đăng nhập.\\n2c. Tài khoản bị khoá: báo đã bị khoá.', 'Người dùng vào hệ thống đúng vai trò.']],""",
  """    '1. Người dùng nhập tên đăng nhập, mật khẩu.\\n2. Hệ thống kiểm tra mật khẩu (bcrypt), trạng thái tài khoản.\\n3. Với Admin, Kế toán: hệ thống cấp "mã tạm" 10 phút và yêu cầu mã xác thực hai lớp; người dùng nhập mã 6 số từ ứng dụng Authenticator.\\n4. Hệ thống kiểm tra mã (lệch tối đa ±30 giây, mã chưa dùng), cấp JWT kèm số phiên bản token, chuyển đến trang Tổng quan theo vai trò.',
    '2a. Sai thông tin: báo "Sai tên đăng nhập hoặc mật khẩu" (không tiết lộ tài khoản có tồn tại).\\n2b. Sai 5 lần trong 15 phút: tạm chặn đăng nhập.\\n2c. Tài khoản bị khoá: báo đã bị khoá.\\n3a. Lần đầu (chưa cài): hệ thống hiện mã QR để quét bằng ứng dụng; nhập đúng mã đầu tiên thì bật xác thực hai lớp và hiện 8 mã dự phòng (chỉ một lần).\\n3b. Mất điện thoại: nhập một mã dự phòng (mỗi mã dùng một lần) hoặc nhờ Admin đặt lại.\\n4a. Sai mã 5 lần: tạm khoá 15 phút. Sale, Vận hành không bắt buộc bước 3.', 'Người dùng vào hệ thống đúng vai trò.']],""")
r("""    '2a. Không phải ảnh / quá 4 MB: báo lỗi.\\n3a. Chi trả công thợ: ghi sổ thợ.', 'Công nợ NCC / thợ được cập nhật.']],""",
  """    '2a. Không phải ảnh / quá 4 MB: báo lỗi.\\n3a. Chi trả công thợ: ghi sổ thợ.\\n1a. Đã nối dịch vụ báo giao dịch: khi tiền ra tài khoản khớp nội dung chuyển khoản và số tiền của đề xuất, hệ thống tự ghi "đã chi" không cần ảnh bill (UC16).', 'Công nợ NCC / thợ được cập nhật.']],""")
r("""    '2a. Chuyển khoản không có bill / vượt số còn phải thu / ngày tương lai: báo lỗi.\\n4a. Kế toán "Chưa thấy tiền": ghi lý do, báo người ghi nhận.\\n2b. Kế toán tự nhập: xác nhận luôn.', 'Số đã thu, còn phải thu được cập nhật.']],""",
  """    '2a. Chuyển khoản không có bill / vượt số còn phải thu / ngày tương lai: báo lỗi.\\n4a. Kế toán "Chưa thấy tiền": ghi lý do, báo người ghi nhận.\\n2b. Kế toán tự nhập: xác nhận luôn.\\n4b. Tiền về tài khoản có mã đơn trong nội dung: hệ thống tự xác nhận phiếu chờ đúng số tiền hoặc tự tạo phiếu đã xác nhận (UC16).', 'Số đã thu, còn phải thu được cập nhật.']],""")
r("""    '2a. Tự khoá chính mình hoặc khoá Admin cuối cùng: từ chối.\\n3a. Username Telegram đã gắn cho người khác: từ chối.', 'Tài khoản cập nhật, phiên cũ bị thu hồi khi cần.']],
];""", """    '2a. Tự khoá chính mình hoặc khoá Admin cuối cùng: từ chối.\\n3a. Username Telegram đã gắn cho người khác: từ chối.\\n2b. Nhân viên mất điện thoại: Admin "Đặt lại xác thực hai lớp", lần đăng nhập sau phải quét QR cài lại.', 'Tài khoản cập nhật, phiên cũ bị thu hồi khi cần.']],
  ['Nhập số và chia số cho Sale', ['UC15', 'Admin, Sale; Website / kênh quảng cáo (API)', 'Đưa số khách tiềm năng vào hệ thống và giao cho Sale theo tỷ lệ.', 'Admin đã đặt tỷ lệ chia (chưa đặt thì chia đều cho mọi Sale đang hoạt động).',
    '1. Người dùng nhập một số, hoặc dán nhiều dòng "SĐT | Tên | Địa chỉ | Nhu cầu" từ bảng tính và chọn nguồn; hệ thống ngoài gọi API nhập số kèm khoá API.\\n2. Hệ thống chuẩn hoá số (bỏ dấu cách, đổi +84 thành 0), kiểm tra hợp lệ.\\n3. Hệ thống khoá tư vấn, kiểm tra trùng với khách đã có.\\n4. Hệ thống chọn Sale có (số đã chia trong tháng + 1) / tỷ lệ nhỏ nhất, tạo khách trạng thái "Mới", ghi nhật ký giao số, thông báo Sale.\\n5. Hệ thống trả kết quả từng dòng: đã chia cho ai, trùng (thuộc Sale nào), lỗi.',
    '1a. Sale nhập: số thuộc chính Sale, không tính vào tỷ lệ.\\n1b. Admin chọn Sale nhận: giao thẳng, không tính vào tỷ lệ.\\n3a. Số đã có: không tạo mới, báo Sale đang giữ.\\n4a. Không Sale nào có tỷ lệ > 0: báo lỗi.\\n6. Admin chuyển số sang Sale khác: bắt buộc lý do; Sale cũ mất quyền xem, Sale mới được thông báo.', 'Số được giao cho Sale, đúng tỷ lệ theo tháng.']],
  ['Đối soát giao dịch ngân hàng', ['UC16', 'Ngân hàng (SePay); Kế toán', 'Tự khớp giao dịch ngân hàng với phiếu thu khách và đề xuất chi.', 'Đã cấu hình khoá webhook; dịch vụ báo giao dịch đã nối tài khoản công ty.',
    '1. Ngân hàng gửi webhook giao dịch (mã giao dịch, số tiền, nội dung chuyển khoản, chiều vào/ra).\\n2. Hệ thống kiểm tra khoá API, bỏ qua nếu mã giao dịch đã xử lý.\\n3. Tiền vào: tìm mã đơn trong nội dung (chấp nhận mất dấu gạch); có phiếu chờ xác nhận đúng số tiền thì xác nhận, không có thì tạo phiếu thu đã xác nhận; thông báo Sale, Kế toán.\\n4. Tiền ra: tìm đề xuất chi đã duyệt có nội dung chuyển khoản và số tiền khớp, ghi "đã chi" theo đúng luồng UC08.',
    '3a. Không có mã đơn / đơn không tồn tại / vượt số còn phải thu: giao dịch "Chưa khớp", báo Kế toán.\\n5. Kế toán khớp tay giao dịch chưa khớp vào một đơn, hoặc bỏ qua kèm lý do.\\n1a. Chưa có tài khoản thật: Kế toán dùng màn giả lập gửi đúng dữ liệu webhook.', 'Phiếu thu / đề xuất chi được cập nhật tự động, giao dịch có trạng thái rõ ràng.']],
  ['Phân quyền theo chức năng', ['UC17', 'Admin', 'Cấu hình chức năng mỗi vai trò được thực hiện.', 'Admin đã đăng nhập (đã xác thực hai lớp).',
    '1. Admin mở ma trận phân quyền (chức năng theo nhóm × vai trò).\\n2. Admin tick / bỏ tick quyền của một vai trò, bấm Lưu.\\n3. Hệ thống thay toàn bộ quyền của vai trò trong một giao dịch, xoá bộ nhớ đệm quyền, ghi nhật ký thay đổi.\\n4. Quyền có hiệu lực ngay ở request kế tiếp; thực đơn của người dùng cập nhật khi tải lại.',
    '2a. Gán quyền quản trị hệ thống cho vai trò khác Admin: từ chối (trigger CSDL cũng chặn).\\n2b. Bỏ quyền quản trị của Admin: hệ thống tự giữ lại.', 'Vai trò có đúng tập quyền đã chọn.']],
];""")

# ---------- 2.7 ----------
r("Các tích hợp ngoài (Telegram Bot API, Gemini API, VietQR) nằm ở tầng tích hợp riêng, nghiệp vụ không phụ thuộc trực tiếp vào giao thức của bên thứ ba.');",
  "Các tích hợp ngoài (Telegram Bot API, Gemini API, VietQR, webhook ngân hàng SePay) nằm ở tầng tích hợp riêng, nghiệp vụ không phụ thuộc trực tiếp vào giao thức của bên thứ ba. Middleware **coQuyen** kiểm tra quyền chức năng theo bảng phân quyền; ngữ cảnh người thao tác của mỗi request được truyền xuống PostgreSQL qua biến phiên trong giao dịch để trigger nhật ký ghi đúng người.');")
r("Bộ lọc của danh sách nằm trên URL để có thể chia sẻ đường dẫn và dùng nút Quay lại của trình duyệt.');",
  "Bộ lọc của danh sách nằm trên URL để có thể chia sẻ đường dẫn và dùng nút Quay lại của trình duyệt. Service worker của PWA lưu đệm phần vỏ ứng dụng để mở nhanh, không bao giờ lưu đệm dữ liệu API.');")

# ---------- 2.8.1 so do ----------
r("""    '**Thông điệp:** 1 nhập tên đăng nhập, mật khẩu → 2 POST /api/auth/login → 3 dangNhap() → 4 kiểm tra số lần sai (chặn nếu ≥ 5) → 5 findByUsername() → 6 SELECT users → 7 so sánh bcrypt → 8 kyToken(id, vai trò, phiên bản token) → 9 trả token → 10 lưu token, chuyển trang Tổng quan.',
    '**Nhánh alt:** sai mật khẩu → tăng bộ đếm, trả 401; tài khoản khoá → 403.',
  ], ['**Lớp:** AuthController (login, me, doiMatKhau); AuthService (dangNhap, doiMatKhau, kyToken); AuthRepository (findByUsername, doiMatKhau); middleware xacThuc, phanQuyen; thực thể User (id, ho_ten, username, password_hash, vai_tro, trang_thai, phien_ban_token, telegram_username).']],""",
  """    '**Thông điệp:** 1 nhập tên đăng nhập, mật khẩu → 2 POST /api/auth/login → 3 dangNhap() → 4 kiểm tra số lần sai (chặn nếu ≥ 5) → 5 findByUsername() → 6 SELECT users → 7 so sánh bcrypt → 8 [Admin/Kế toán] kyMaTam() → trả { buoc: nhap_ma_2fa, ma_tam } → 9 nhập mã 6 số → 10 POST /api/auth/2fa/xac-minh → 11 HaiLopService.xacMinh(): giaiMa(khoá) → kiemTra(TOTP, ±1 bước) → UPDATE totp_buoc_cuoi (chỉ khi lớn hơn bước đã dùng) → 12 kyToken(id, vai trò, phiên bản token) → 13 lưu token, chuyển trang Tổng quan.',
    '**Nhánh alt:** sai mật khẩu → tăng bộ đếm, trả 401; tài khoản khoá → 403; Sale/Vận hành → cấp token ngay ở bước 8; lần đầu → khoiTao() trả QR, kichHoat() lưu khoá mã hoá + 8 mã dự phòng; sai mã 5 lần → 429.',
  ], ['**Lớp:** AuthController (login, me, doiMatKhau); AuthService (dangNhap, phienDangNhap, kyToken); HaiLopService (kyMaTam, khoiTao, kichHoat, xacMinh, datLai); Totp (taoKhoa, maTai, kiemTra); MaHoa (maHoa, giaiMa); AuthRepository; middleware xacThuc, coQuyen; thực thể User (id, ho_ten, username, password_hash, vai_tro, trang_thai, phien_ban_token, totp_khoa, totp_buoc_cuoi, totp_ma_du_phong).']],""")
r("""    '**Nhánh alt:** không phải ảnh / không đúng Kế toán → báo lỗi trong nhóm.',
  ], ['**Lớp:** CongNoService (daChi, xuLyAnhBill, sauKhiChiCoc, taoQuyetToanNcc);""",
  """    '**Nhánh alt:** không phải ảnh / không đúng Kế toán → báo lỗi trong nhóm; tiền ra khớp sao kê ngân hàng → NganHangService gọi daChi(null, id, { giaoDichId }) không cần ảnh bill.',
  ], ['**Lớp:** CongNoService (daChi, xuLyAnhBill, sauKhiChiCoc, taoQuyetToanNcc);""")
r("""    '**Nhánh alt:** Kế toán "Chưa thấy tiền" → ghi lý do, báo người ghi nhận.',
  ], ['**Lớp:** ThuTienService (tomTat, theoDon, tao, xacNhan, tuChoi, congNo); LuuAnh; ThongBaoService; thực thể ThanhToanKhach, DonHang, view VDonHangTien.']],
];""", """    '**Nhánh alt:** Kế toán "Chưa thấy tiền" → ghi lý do, báo người ghi nhận; tiền về có mã đơn → webhook ngân hàng tự xác nhận phiếu (xem chức năng Đối soát).',
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
];""")

# ---------- 2.8.2 CSDL ----------
r("P('Cơ sở dữ liệu PostgreSQL gồm 28 bảng, một view và một trigger, chia theo phân hệ: người dùng và thông báo; khách hàng và đơn hàng; vật tư, NCC và bảng giá; mua hàng; thi công; chi tiền và công nợ; thu tiền khách.",
  "P('Cơ sở dữ liệu PostgreSQL gồm 35 bảng nghiệp vụ, một view và 18 trigger (3 hàm trigger), chia theo phân hệ: người dùng và thông báo; nhập số và chia số; khách hàng và đơn hàng; vật tư, NCC và bảng giá; mua hàng; thi công; chi tiền và công nợ; thu tiền khách và đối soát ngân hàng; quản trị hệ thống.")
r("  phieu_thanh_toan: 'Phiếu thanh toán (đã chi)', thanh_toan_khach: 'Phiếu thu tiền khách hàng',\n};",
  """  phieu_thanh_toan: 'Phiếu thanh toán (đã chi)', thanh_toan_khach: 'Phiếu thu tiền khách hàng',
  ty_le_chia_so: 'Tỷ lệ chia số khách tiềm năng cho Sale', chia_so_log: 'Nhật ký nhập, chia và chuyển số', giao_dich_ngan_hang: 'Giao dịch ngân hàng (đối soát)',
  quyen: 'Danh mục quyền chức năng', vai_tro_quyen: 'Phân quyền vai trò – chức năng', cau_hinh: 'Tham số nghiệp vụ', nhat_ky_thay_doi: 'Nhật ký thay đổi dữ liệu',
};""")
r("""  ['Người dùng và thông báo', ['users', 'thong_bao']],
  ['Khách hàng và đơn hàng',""", """  ['Người dùng và thông báo', ['users', 'thong_bao']],
  ['Nhập số và chia số', ['ty_le_chia_so', 'chia_so_log']],
  ['Khách hàng và đơn hàng',""")
r("""  ['Thu tiền khách hàng', ['thanh_toan_khach']],
];""", """  ['Thu tiền khách hàng và đối soát ngân hàng', ['thanh_toan_khach', 'giao_dich_ngan_hang']],
  ['Quản trị hệ thống', ['quyen', 'vai_tro_quyen', 'cau_hinh', 'nhat_ky_thay_doi']],
];""")
r("  'thanh_toan_khach.loai': 'Tạm ứng / quyết toán / khác',",
  """  'users.totp_khoa': 'Khoá xác thực hai lớp đã mã hoá AES-256-GCM (NULL = chưa bật)', 'users.totp_bat_luc': 'Thời điểm bật xác thực hai lớp', 'users.totp_buoc_cuoi': 'Bước thời gian của mã đã dùng gần nhất (chống dùng lại mã)', 'users.totp_ma_du_phong': 'Hash bcrypt của các mã dự phòng còn lại',
  'khach_hang.nguon': 'Nguồn số (Facebook, Zalo, website, Sale tự tìm...)', 'khach_hang.nhu_cau': 'Nhu cầu khách để lại', 'khach_hang.nguoi_nhap_id': 'Người nhập số (NULL = API tự động)', 'khach_hang.chia_luc': 'Thời điểm số được giao cho Sale',
  'ty_le_chia_so.sale_id': 'Sale (khoá chính)', 'ty_le_chia_so.ty_le': 'Tỷ lệ chia (%) — tổng các Sale bằng 100', 'ty_le_chia_so.nguoi_cap_nhat_id': 'Admin cập nhật', 'ty_le_chia_so.cap_nhat_luc': 'Thời điểm cập nhật',
  'chia_so_log.khach_hang_id': 'Khách (số)', 'chia_so_log.sale_id': 'Sale nhận', 'chia_so_log.kieu': 'Chia theo tỷ lệ / Sale tự nhập / Admin chọn / chuyển', 'chia_so_log.kenh': 'Form / API', 'chia_so_log.nguoi_nhap_id': 'Người nhập hoặc chuyển', 'chia_so_log.tu_sale_id': 'Sale cũ (khi chuyển)',
  'giao_dich_ngan_hang.nguon': 'SePay / giả lập', 'giao_dich_ngan_hang.ma_gd_ngoai': 'Mã giao dịch của dịch vụ ngân hàng', 'giao_dich_ngan_hang.ngan_hang': 'Ngân hàng', 'giao_dich_ngan_hang.loai': 'Tiền vào / tiền ra', 'giao_dich_ngan_hang.noi_dung': 'Nội dung chuyển khoản', 'giao_dich_ngan_hang.ma_tham_chieu': 'Mã tham chiếu ngân hàng',
  'giao_dich_ngan_hang.thoi_gian_gd': 'Thời điểm giao dịch', 'giao_dich_ngan_hang.cach_khop': 'Tự xác nhận phiếu / tự tạo phiếu / tự ghi đã chi / khớp tay', 'giao_dich_ngan_hang.thanh_toan_khach_id': 'Phiếu thu được khớp', 'giao_dich_ngan_hang.de_xuat_chi_id': 'Đề xuất chi được khớp', 'giao_dich_ngan_hang.nguoi_xu_ly_id': 'Kế toán xử lý tay', 'giao_dich_ngan_hang.du_lieu_goc': 'Dữ liệu webhook gốc (JSONB)',
  'quyen.ma': 'Mã quyền (khoá chính), vd chi.duyet', 'quyen.nhom': 'Nhóm chức năng', 'quyen.thu_tu': 'Thứ tự hiển thị', 'quyen.chi_admin': 'Quyền chỉ dành cho Admin', 'vai_tro_quyen.vai_tro': 'Vai trò', 'vai_tro_quyen.ma_quyen': 'Quyền được gán',
  'cau_hinh.khoa': 'Mã tham số (khoá chính)', 'cau_hinh.gia_tri': 'Giá trị', 'cau_hinh.mo_ta': 'Mô tả', 'cau_hinh.don_vi': 'Đơn vị', 'cau_hinh.toi_thieu': 'Giá trị nhỏ nhất cho phép', 'cau_hinh.toi_da': 'Giá trị lớn nhất cho phép', 'cau_hinh.nguoi_cap_nhat_id': 'Người cập nhật', 'cau_hinh.cap_nhat_luc': 'Thời điểm cập nhật',
  'nhat_ky_thay_doi.bang': 'Bảng bị thay đổi', 'nhat_ky_thay_doi.ban_ghi': 'Khoá chính của dòng', 'nhat_ky_thay_doi.hanh_dong': 'INSERT / UPDATE / DELETE', 'nhat_ky_thay_doi.du_lieu_cu': 'Giá trị cũ của các cột thay đổi (JSONB)', 'nhat_ky_thay_doi.du_lieu_moi': 'Giá trị mới của các cột thay đổi (JSONB)', 'nhat_ky_thay_doi.nguoi_id': 'Người thao tác', 'nhat_ky_thay_doi.kenh': 'Web / Telegram / API / ngân hàng', 'nhat_ky_thay_doi.thoi_gian': 'Thời điểm',
  'thanh_toan_khach.giao_dich_id': 'Giao dịch ngân hàng đã đối soát (thay ảnh bill và người xác nhận)',
  'thanh_toan_khach.loai': 'Tạm ứng / quyết toán / khác',""")
r("""    case 'text': return 'TEXT'; case 'date': return 'DATE'; case 'boolean': return 'BOOLEAN';""",
  """    case 'text': return 'TEXT'; case 'date': return 'DATE'; case 'boolean': return 'BOOLEAN'; case 'jsonb': return 'JSONB';
    case 'ARRAY': return `${c.udt_name.replace(/^_/, '').toUpperCase()}[]`;""")
r("""  ck_ttk_bill: 'Phiếu thu chuyển khoản bắt buộc có ảnh bill.',
  ck_ttk_xac_nhan: 'Phiếu "Đã xác nhận" bắt buộc ghi người và thời điểm xác nhận.',""",
  """  ck_ttk_bill: 'Phiếu thu chuyển khoản bắt buộc có ảnh bill, hoặc được đối soát với một giao dịch ngân hàng.',
  ck_ttk_xac_nhan: 'Phiếu "Đã xác nhận" bắt buộc có thời điểm xác nhận và người xác nhận (hoặc giao dịch ngân hàng tự xác nhận).',
  ck_users_totp: 'Khoá xác thực hai lớp và thời điểm bật luôn cùng có hoặc cùng không.',
  chia_so_log_chuyen_check: 'Lần chuyển số bắt buộc ghi Sale cũ và lý do.',
  ck_gd_da_khop: 'Giao dịch "Đã khớp" bắt buộc ghi cách khớp.',
  ck_gd_bo_qua: 'Giao dịch "Bỏ qua" bắt buộc có ghi chú lý do.',
  cau_hinh_check: 'Giá trị không nhỏ hơn mức tối thiểu (nếu có).',
  cau_hinh_check1: 'Giá trị không lớn hơn mức tối đa (nếu có).',""")
r("**Trigger tg_chan_dong_trung_qt** chặn một dòng mua hàng nằm trong hai đề xuất quyết toán còn hiệu lực (ràng buộc giữa nhiều bảng mà CHECK không làm được).');",
  """**Trigger tg_chan_dong_trung_qt** chặn một dòng mua hàng nằm trong hai đề xuất quyết toán còn hiệu lực (ràng buộc giữa nhiều bảng mà CHECK không làm được).');
P('**Hàm trigger fn_ghi_nhat_ky** gắn vào 16 bảng quan trọng (đơn hàng, vật tư đơn, khách hàng, mua hàng, đề xuất chi, phiếu thu, thi công, bảng giá, người dùng, phân quyền, giao dịch ngân hàng...): mỗi thêm / sửa / xoá ghi vào nhat_ky_thay_doi, với thao tác sửa chỉ lưu các cột thực sự đổi; người thao tác và kênh lấy từ biến phiên do backend đặt trong giao dịch, nên thao tác lỗi bị huỷ thì nhật ký cũng không còn. **Trigger tg_chan_quyen_chi_admin** chặn gán quyền quản trị hệ thống cho vai trò khác Admin ngay cả khi ghi thẳng vào CSDL.');""")
r("""  '**Khác:** khach_hang 1–n khach_hang_cham_soc; users 1–n thong_bao; mua_bo_sung 1–n mua_bo_sung_dong, mua_bo_sung_trach_nhiem. Ký hiệu chân chim, ghi rõ khoá chính / khoá ngoại.',""",
  """  '**Nhập số, đối soát, quản trị:** users 1–1 ty_le_chia_so; khach_hang 1–n chia_so_log (n–1 users: sale_id, tu_sale_id, nguoi_nhap_id); giao_dich_ngan_hang 1–n thanh_toan_khach (giao_dich_id), giao_dich_ngan_hang n–1 don_hang, de_xuat_chi; quyen 1–n vai_tro_quyen; users 1–n nhat_ky_thay_doi, cau_hinh (nguoi_cap_nhat_id).',
  '**Khác:** khach_hang 1–n khach_hang_cham_soc; users 1–n thong_bao; mua_bo_sung 1–n mua_bo_sung_dong, mua_bo_sung_trach_nhiem. Ký hiệu chân chim, ghi rõ khoá chính / khoá ngoại.',""")

# ---------- 2.9 giao dien ----------
r("""H3('2.9.1. Giao diện chung');
Anh('01_dang_nhap.png', 'Giao diện đăng nhập');
Anh('16_tong_quan_admin.png', 'Giao diện trang Tổng quan (Admin): việc cần làm, KPI, tiến độ đơn');
H3('2.9.2. Giao diện phía Sale');
Anh('05_khach_hang_sale.png', 'Giao diện quản lý khách hàng');""", """H3('2.9.1. Giao diện chung');
Anh('01_dang_nhap.png', 'Giao diện đăng nhập');
Anh('17_xac_thuc_2_lop.png', 'Giao diện cài đặt xác thực hai lớp (quét mã QR bằng ứng dụng Authenticator)');
Anh('16_tong_quan_admin.png', 'Giao diện trang Tổng quan (Admin): việc cần làm, KPI, tiến độ đơn');
Anh('25_dien_thoai.png', 'Giao diện trên điện thoại (PWA): Tổng quan, chi tiết đơn, báo cáo');
H3('2.9.2. Giao diện phía Sale');
Anh('18_nhap_so.png', 'Giao diện nhập số khách tiềm năng');
Anh('05_khach_hang_sale.png', 'Giao diện quản lý khách hàng');""")
r("""Anh('14_phan_tich_ai.png', 'Giao diện phân tích vật tư bán chạy và giá NCC với trợ lý AI');
H3('2.9.5. Giao diện phía Admin');
Anh('15_nguoi_dung_admin.png', 'Giao diện quản lý người dùng');""", """Anh('21_doi_soat_ngan_hang.png', 'Giao diện đối soát giao dịch ngân hàng');
Anh('20_bao_cao_lai_lo.png', 'Giao diện báo cáo lãi/lỗ theo đơn');
Anh('14_phan_tich_ai.png', 'Giao diện phân tích vật tư bán chạy và giá NCC với trợ lý AI');
H3('2.9.5. Giao diện phía Admin');
Anh('15_nguoi_dung_admin.png', 'Giao diện quản lý người dùng');
Anh('19_quan_ly_chia_so.png', 'Giao diện quản lý tỷ lệ chia số cho Sale');
Anh('22_phan_quyen.png', 'Giao diện phân quyền theo chức năng');
Anh('23_nhat_ky.png', 'Giao diện nhật ký thay đổi dữ liệu');
Anh('24_sao_luu.png', 'Giao diện sao lưu dữ liệu');""")

# Duong dan ra: dat ngay canh file bao cao
open(p, 'w', encoding='utf-8', newline='').write(s)
print('da cap nhat tao_ch2.cjs')
