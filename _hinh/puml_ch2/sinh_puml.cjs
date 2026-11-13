// Sinh ma PlantUML cho Chuong 2 (ban tam de doi chieu; ban chinh thuc ve lai bang Rational Rose).
// Chay: node sinh_puml.cjs  -> tao *.puml canh file nay; ERD doc cau truc tu DB test datn_erp_test.
const fs = require('fs');
const path = require('path');
const DIR = __dirname;
const STYLE = `!pragma layout smetana
skinparam dpi 160
skinparam defaultFontName "Times New Roman"
skinparam defaultFontSize 13
skinparam shadowing false
skinparam monochrome true
skinparam packageStyle rectangle
skinparam usecaseBackgroundColor white
skinparam usecaseBorderColor black
skinparam ArrowColor black
skinparam sequenceMessageAlign left
skinparam maxMessageSize 260
hide footbox`;
const ghi = (ten, noiDung) => fs.writeFileSync(path.join(DIR, `${ten}.puml`), `@startuml ${ten}\n${STYLE}\n${noiDung.trim()}\n@enduml\n`);

// ======================= USE CASE =======================
ghi('uc_tongquan', `
left to right direction
actor "Người dùng" as ND
actor "Sale" as SALE
actor "Vận hành" as VH
actor "Kế toán" as KT
actor "Admin" as AD
SALE -up-|> ND
VH -up-|> ND
KT -up-|> ND
AD -up-|> ND
actor "Người duyệt chi\\n(Telegram)" as DC
actor "Nhà cung cấp\\n(Telegram)" as NCC
actor "Khách hàng" as KH
actor "Gemini AI" as AI
actor "Ngân hàng\\n(SePay)" as NH
actor "Website /\\nkênh quảng cáo" as WEB
rectangle "Hệ thống ERP NST" {
  usecase "Đăng nhập" as UC_DN
  usecase "Xác thực hai lớp" as UC_2FA
  usecase "Đổi mật khẩu" as UC_MK
  usecase "Xem thông báo" as UC_TB
  usecase "Nhập số và chia số" as UC_NS
  usecase "Chăm sóc khách hàng" as UC_CS
  usecase "Báo cáo chăm sóc\\nkhách hàng" as UC_BCCS
  usecase "Quản lý đơn hàng" as UC_DH
  usecase "Mua hàng –\\nđặt hàng NCC" as UC_MH
  usecase "Thi công – nghiệm thu\\n– quyết toán" as UC_TC
  usecase "Đề xuất chi\\nvà duyệt chi" as UC_CHI
  usecase "Thu tiền khách hàng" as UC_THU
  usecase "Đối soát ngân hàng" as UC_NH
  usecase "Quản lý NCC –\\nbảng giá – vật tư" as UC_NCC
  usecase "Phân tích, báo cáo\\nlãi/lỗ và trợ lý AI" as UC_BC
  usecase "Quản trị hệ thống" as UC_QT
}
ND --> UC_DN
ND --> UC_MK
ND --> UC_TB
UC_2FA .> UC_DN : <<extend>>
SALE --> UC_NS
SALE --> UC_CS
SALE --> UC_DH
SALE --> UC_THU
VH --> UC_DH
VH --> UC_MH
VH --> UC_TC
KT --> UC_CHI
KT --> UC_THU
KT --> UC_NH
KT --> UC_NCC
KT --> UC_BC
AD --> UC_NS
AD --> UC_BCCS
AD --> UC_CHI
AD --> UC_BC
AD --> UC_QT
DC --> UC_CHI
NCC --> UC_MH
KH --> UC_DH
AI --> UC_BC
AI --> UC_BCCS
NH --> UC_NH
WEB --> UC_NS
`);

ghi('uc_sale', `
left to right direction
actor "Sale" as SALE
actor "Gemini AI" as AI
actor "Khách hàng" as KH
rectangle "Phân hệ nhân viên kinh doanh" {
  usecase "Đăng nhập" as DN
  usecase "Nhập số tự tìm" as NS
  usecase "Kiểm tra trùng số" as TRUNG
  usecase "Chăm sóc khách hàng" as CS
  usecase "Hẹn gọi lại" as HEN
  usecase "Quản lý khách hàng" as QLKH
  usecase "Tạo đơn hàng" as TAO
  usecase "Trích xuất đơn bằng AI" as TRICH
  usecase "Chốt đơn" as CHOT
  usecase "Kiểm tra đủ thông tin" as DU
  usecase "Tạo link báo giá" as LINK
  usecase "Xem báo giá" as XEM
  usecase "Theo dõi tiến độ đơn" as TD
  usecase "Gửi yêu cầu chỉnh sửa" as YC
  usecase "Ghi nhận khách thanh toán" as THU
  usecase "Tải ảnh bill" as BILL
}
SALE --> NS
SALE --> CS
SALE --> QLKH
SALE --> TAO
SALE --> CHOT
SALE --> LINK
SALE --> TD
SALE --> THU
NS ..> TRUNG : <<include>>
HEN ..> CS : <<extend>>
TRICH ..> TAO : <<extend>>
CHOT ..> DU : <<include>>
YC ..> TD : <<extend>>
THU ..> BILL : <<include>>
TRICH -- AI
XEM -- KH
LINK ..> XEM : <<include>>
NS ..> DN : <<include>>
CS ..> DN : <<include>>
TAO ..> DN : <<include>>
`);

ghi('uc_vanhanh', `
left to right direction
actor "Vận hành" as VH
actor "Nhà cung cấp\\n(Telegram)" as NCC
rectangle "Phân hệ nhân viên vận hành" {
  usecase "Cập nhật phương án" as PA
  usecase "Chuyển / lùi bước tiến độ" as CB
  usecase "Ghi lý do" as LD
  usecase "Huỷ đơn" as HUY
  usecase "Xác nhận khối lượng" as KL
  usecase "Chọn NCC cho vật tư" as CHON
  usecase "Đặt hàng NCC" as DAT
  usecase "Gửi đơn đặt hàng\\nqua Telegram" as GUI
  usecase "Phản hồi đơn đặt hàng" as PH
  usecase "Huỷ đặt hàng" as HDAT
  usecase "Đăng ký giao hàng" as GH
  usecase "Bỏ qua tạm ứng có lý do" as BQ
  usecase "Lập giai đoạn thi công" as GD
  usecase "Bắt đầu / báo xong\\ngiai đoạn" as BX
  usecase "Ghi phát sinh thi công" as PS
  usecase "Nghiệm thu" as NT
  usecase "Chốt quyết toán" as QT
  usecase "Lập phiếu mua bổ sung" as MBS
  usecase "Xử lý yêu cầu sửa" as XL
}
VH --> PA
VH --> CB
VH --> HUY
VH --> KL
VH --> CHON
VH --> DAT
VH --> HDAT
VH --> GH
VH --> GD
VH --> BX
VH --> PS
VH --> NT
VH --> QT
VH --> MBS
VH --> XL
CB ..> LD : <<include>>
HUY ..> LD : <<include>>
DAT ..> GUI : <<include>>
GUI -- NCC
NCC --> PH
BQ ..> GH : <<extend>>
`);

ghi('uc_ketoan', `
left to right direction
actor "Kế toán" as KT
actor "Người duyệt chi\\n(Telegram)" as DC
actor "Gemini AI" as AI
actor "Ngân hàng\\n(SePay)" as NH
rectangle "Phân hệ nhân viên kế toán" {
  usecase "Quản lý NCC và bảng giá" as NCC
  usecase "Quản lý danh mục vật tư" as VT
  usecase "Lập đề xuất chi" as DX
  usecase "Gửi đề xuất kèm QR\\nvào nhóm Telegram" as GUI
  usecase "Gửi lại đề xuất bị từ chối" as GL
  usecase "Xác nhận đã chi" as CHI
  usecase "Tải ảnh bill" as BILL
  usecase "Xác nhận qua Telegram" as TG
  usecase "Xem công nợ NCC, đội thợ" as CN
  usecase "Xác nhận tiền khách về" as XN
  usecase "Xem công nợ khách hàng" as CNK
  usecase "Đối soát giao dịch ngân hàng" as DS
  usecase "Chốt phiếu mua bổ sung" as MBS
  usecase "Phân tích vật tư bán chạy\\nvà giá NCC" as PT
  usecase "AI nhận xét" as AINX
  usecase "Xem báo cáo lãi/lỗ" as LL
  usecase "Xuất Excel" as XL
}
KT --> NCC
KT --> VT
KT --> DX
KT --> GL
KT --> CHI
KT --> CN
KT --> XN
KT --> CNK
KT --> DS
KT --> MBS
KT --> PT
KT --> LL
DX ..> GUI : <<include>>
GUI -- DC
CHI ..> BILL : <<include>>
TG ..> CHI : <<extend>>
AINX ..> PT : <<extend>>
AINX -- AI
XL ..> LL : <<extend>>
NH --> DS
`);

ghi('uc_admin', `
left to right direction
actor "Admin" as AD
actor "Người duyệt chi\\n(Telegram)" as DC
actor "Website /\\nkênh quảng cáo" as WEB
actor "Gemini AI" as AI
rectangle "Phân hệ quản lý" {
  usecase "Quản lý người dùng" as ND
  usecase "Đặt lại xác thực hai lớp" as DL2
  usecase "Nhập số khách tiềm năng" as NS
  usecase "Chia số theo tỷ lệ" as CHIA
  usecase "Quản lý tỷ lệ chia số" as TL
  usecase "Chuyển số sang Sale khác" as CHUYEN
  usecase "Xem báo cáo chăm sóc\\nkhách hàng" as BCCS
  usecase "AI nhận xét Sale" as AINX
  usecase "Duyệt / từ chối đề xuất chi" as DUYET
  usecase "Thu hồi đề xuất đã duyệt" as THU
  usecase "Chuyển vận hành phụ trách" as PT
  usecase "Ghi lý do" as LD
  usecase "Phân quyền theo chức năng" as PQ
  usecase "Xem nhật ký thay đổi" as NK
  usecase "Sao lưu dữ liệu" as SL
  usecase "Cấu hình tham số" as CH
  usecase "Xem tổng quan,\\nbáo cáo lãi/lỗ" as TQ
}
AD --> ND
AD --> NS
AD --> TL
AD --> CHUYEN
AD --> BCCS
AD --> DUYET
AD --> THU
AD --> PT
AD --> PQ
AD --> NK
AD --> SL
AD --> CH
AD --> TQ
DL2 ..> ND : <<extend>>
NS ..> CHIA : <<include>>
CHUYEN ..> LD : <<include>>
PT ..> LD : <<include>>
CHUYEN ..> BCCS : <<extend>>
AINX ..> BCCS : <<extend>>
AINX -- AI
DC --> DUYET
WEB --> NS
`);

// ======================= TRINH TU + LOP =======================
const CN = [];
// Than lop viet gon "{ +a() -b() }" tren 1 dong -> moi thanh vien 1 dong (PlantUML khong nhan dang gon).
const moRong = (cls) => cls.split('\n').map((d) => {
  const m = d.match(/^(class .*?)\{ (.*) \}$/);
  return m ? `${m[1]}{\n${m[2].split(/\s(?=[+-][A-Za-z/])/).join('\n')}\n}` : d;
}).join('\n').replace(/^(class [^\n{]*)\{ /gm, '$1{\n').replace(/ \}$/gm, '\n}');
const cn =(ma, ten, seq, cls) => { CN.push([ma, ten]); ghi(`seq_${ma}`, seq); ghi(`cls_${ma}`, `hide empty members\nskinparam classAttributeIconSize 0\n${moRong(cls)}`); };

cn('dang_nhap', 'Đăng nhập', `
autonumber
actor "Người dùng" as U
boundary "Giao diện\\nĐăng nhập" as FE
control "AuthController" as C
control "AuthService" as S
control "HaiLopService" as H
entity "AuthRepository" as R
database "PostgreSQL" as DB
U -> FE : Nhập tên đăng nhập, mật khẩu
FE -> C : POST /api/auth/login
C -> S : dangNhap(username, matKhau, ip)
S -> S : kiểm tra số lần sai (chặn nếu >= 5 lần / 15 phút)
S -> R : findByUsername(username)
R -> DB : SELECT ... FROM users
DB --> R : bản ghi người dùng
R --> S : user
alt sai mật khẩu hoặc tài khoản khoá
  S --> C : lỗi 401 / 403 (tăng bộ đếm sai)
  C --> FE : thông báo lỗi
else Sale, Vận hành
  S -> S : kyToken(id, vai trò, phiên bản token)
  S --> C : { token, user }
else Admin, Kế toán (bắt buộc 2FA)
  S -> H : kyMaTam(user)
  H --> FE : { buoc: nhap_ma_2fa, ma_tam }
  U -> FE : Nhập mã 6 số từ ứng dụng xác thực
  FE -> C : POST /api/auth/2fa/xac-minh
  C -> H : xacMinh(ma_tam, ma)
  H -> R : đọc totp_khoa, totp_buoc_cuoi
  H -> H : giaiMa(khoá) và kiemTra(mã TOTP, lệch ±1 bước)
  H -> DB : UPDATE users SET totp_buoc_cuoi (chống dùng lại mã)
  H --> C : { token, user }
end
C --> FE : 200 OK + token
FE -> FE : lưu token (Zustand), chuyển trang Tổng quan
`, `
class AuthController { +login(req, res) +me(req, res) +doiMatKhau(req, res) }
class AuthService { +dangNhap(username, matKhau, ip) +phienDangNhap(user) +kyToken(user) +doiMatKhau(user, data) }
class HaiLopService { +kyMaTam(user) +khoiTao(maTam) +kichHoat(maTam, ma) +xacMinh(maTam, ma) +datLai(id) }
class Totp { +taoKhoa() +maTai(khoa, buoc) +kiemTra(khoa, ma) }
class MaHoa { +maHoa(chuoi) +giaiMa(chuoi) }
class AuthRepository { +findByUsername(username) +findById(id) +layHash(id) +doiMatKhau(id, hash) }
class "xacThuc / coQuyen" as MW <<middleware>>
class User <<entity>> { id : SERIAL
username : TEXT
password_hash : TEXT
vai_tro : vai_tro_enum
trang_thai : enum
phien_ban_token : INTEGER
totp_khoa : TEXT
totp_buoc_cuoi : BIGINT
totp_ma_du_phong : TEXT[] }
AuthController --> AuthService
AuthController --> HaiLopService
HaiLopService --> Totp
HaiLopService --> MaHoa
AuthService --> AuthRepository
HaiLopService --> AuthRepository
AuthRepository ..> User
MW ..> User
`);

cn('nhap_so', 'Nhập và chia số', `
autonumber
actor "Admin / Website (API)" as U
boundary "Giao diện\\nNhập số" as FE
control "NhapSoRoutes" as C
control "NhapSoService" as S
control "ThongBaoService" as TB
database "PostgreSQL" as DB
U -> FE : Dán danh sách số / tải tệp Excel, CSV, TXT
FE -> C : POST /api/nhap-so { ds }
note right of C : API ngoài: POST /api/nhap-so/tu-dong\\nkèm khoá API (so sánh thời gian hằng)
C -> S : nhap(user, ds)
S -> DB : BEGIN; pg_advisory_xact_lock('chia_so')
loop mỗi dòng
  S -> S : chuanHoaSdt() (+84 -> 0, bỏ dấu cách)
  S -> DB : SELECT khách có cùng số
  alt số đã có
    S -> S : ghi kết quả "trùng", Sale đang giữ
  else số mới
    S -> DB : chonSale(): (đã chia trong tháng + 1) / tỷ lệ nhỏ nhất
    S -> DB : INSERT khach_hang, chia_so_log
    S -> TB : gui(Sale nhận số)
  end
end
S -> DB : COMMIT
S --> C : kết quả từng dòng
C --> FE : 200 OK
FE --> U : hiển thị đã chia cho ai / trùng / lỗi
`, `
class NhapSoRoutes { +POST / +POST /tu-dong +POST /doc-file +PUT /ty-le +PUT /khach/:id/chuyen-sale }
class NhapSoService { +nhap(user, ds) -chuanHoaSdt(sdt) -chonSale(client) +chuyenSale(user, id, data) +tyLe() +luuTyLe(ds) +ganDay() }
class DocFile { +docFile(ten, base64) +fileMau() }
class ThongBaoService { +gui(client, thongTin) }
class KhachHang <<entity>> { id : SERIAL
sdt : VARCHAR
sale_phu_trach_id : INTEGER
nguon : VARCHAR
chia_luc : TIMESTAMPTZ }
class TyLeChiaSo <<entity>> { sale_id : INTEGER
ty_le : SMALLINT }
class ChiaSoLog <<entity>> { khach_hang_id : INTEGER
sale_id : INTEGER
kieu : VARCHAR
kenh : VARCHAR
tu_sale_id : INTEGER
ly_do : TEXT }
NhapSoRoutes --> NhapSoService
NhapSoRoutes --> DocFile
NhapSoService --> ThongBaoService
NhapSoService ..> KhachHang
NhapSoService ..> TyLeChiaSo
NhapSoService ..> ChiaSoLog
KhachHang "1" -- "n" ChiaSoLog
`);

cn('cham_soc', 'Chăm sóc khách hàng', `
autonumber
actor "Sale" as U
boundary "Danh sách / chi tiết\\nkhách hàng" as FE
control "KhachHangController" as C
control "KhachHangService" as S
entity "KhachHangRepository" as R
database "PostgreSQL" as DB
U -> FE : Bấm số để gọi; chọn trạng thái, nhập ghi chú, bấm Lưu
FE -> C : POST /api/khach-hang/:id/cham-soc
C -> S : ghiChamSoc(user, id, { trang_thai, noi_dung, hen_goi_lai_luc })
S -> S : kiểm tra trạng thái hợp lệ (không chọn lại "Mới")
alt hẹn gọi lại thiếu giờ / giờ đã qua
  S --> FE : 400 "Chọn thời điểm hẹn trong tương lai"
else không quan tâm / sai số thiếu ghi chú
  S --> FE : 400 "Bắt buộc ghi lý do"
end
S -> R : findById(id), kiểm tra khách thuộc Sale
S -> DB : BEGIN
S -> R : ghiChamSoc(client, {...})
R -> DB : INSERT khach_hang_cham_soc
R -> DB : UPDATE khach_hang SET trang_thai_cham_soc, hen_goi_lai_luc
S -> DB : COMMIT
S --> C : lần chăm sóc vừa ghi
C --> FE : 201 Created
alt trạng thái "Chốt đơn"
  FE --> U : hỏi "Lên đơn ngay?" -> mở form tạo đơn cho khách
else
  FE --> U : cập nhật dòng, ghi chú lần gọi gần nhất
end
`, `
class KhachHangController { +list(req, res) +detail(req, res) +create(req, res) +chamSoc(req, res) }
class KhachHangService { +danhSach(user, loc) +chiTiet(user, id) +taoKhach(user, data) +ghiChamSoc(user, id, data) }
class KhachHangRepository { +findAll(loc) +findById(id) +findLichSu(id) +create(data) +ghiChamSoc(client, data) }
class CapNhatChamSoc <<React>> { +luu() +HoiLenDon() }
class KhachHang <<entity>> { id : SERIAL
ten : TEXT
sdt : VARCHAR
trang_thai_cham_soc : enum
hen_goi_lai_luc : TIMESTAMPTZ
chia_luc : TIMESTAMPTZ }
class KhachHangChamSoc <<entity>> { id : SERIAL
khach_hang_id : INTEGER
sale_id : INTEGER
trang_thai : enum
noi_dung : TEXT
hen_goi_lai_luc : TIMESTAMPTZ
created_at : TIMESTAMPTZ }
CapNhatChamSoc ..> KhachHangController : HTTP
KhachHangController --> KhachHangService
KhachHangService --> KhachHangRepository
KhachHangRepository ..> KhachHang
KhachHangRepository ..> KhachHangChamSoc
KhachHang "1" -- "n" KhachHangChamSoc
`);

cn('tao_don', 'Tạo và chốt đơn hàng', `
autonumber
actor "Sale" as U
boundary "Giao diện\\nTạo đơn" as FE
control "DonHangController" as C
control "DonHangService" as S
entity "DonHangRepository" as R
control "ThongBaoService" as TB
database "PostgreSQL" as DB
U -> FE : Nhập khách, vật tư, giá, cọc; bấm "Chốt đơn"
FE -> C : POST /api/don-hang (chot = true)
C -> S : taoDonHang(user, data)
S -> S : kiemTraDuDeChot()
alt thiếu thông tin
  S --> FE : 400 + danh sách phần còn thiếu
end
S -> DB : BEGIN
S -> R : create(đơn, vật tư)
S -> R : ghi lịch sử bước "Lên phương án"
S -> R : phanCongTuDong(): chonVanHanhItViec() (pg_advisory_xact_lock)
alt có vận hành hoạt động
  S -> R : ganVanHanh() + ghi phân công
  S -> TB : giaoDon(vận hành)
else không có
  S -> S : đơn "chưa phân công" (Admin phân sau)
end
S -> DB : COMMIT
S --> C : đơn đã chốt
C --> FE : 201 Created
`, `
class DonHangController { +list() +detail() +create() +giaiDoan() +doiPhuTrach() }
class DonHangService { +taoDonHang(user, data) -kiemTraDuDeChot(don) -phanCongTuDong(client, don) +chuyenGiaiDoan(user, id, data) +bocKhoiLuong(user, id, ds) +doiPhuTrach(user, id, data) }
class DonHangRepository { +create(client, don) +findById(id) +ghiLichSuGiaiDoan(client, data) +chonVanHanhItViec(client) +ganVanHanh(client, id, vh) +dieuKienRoiBuoc(id) }
class ThongBaoService { +giaoDon() +tienDoDon() }
class DonHang <<entity>> { id : SERIAL
ma_don : VARCHAR
khach_hang_id : INTEGER
sale_id : INTEGER
vanhanh_phu_trach_id : INTEGER
giai_doan : enum }
class DonHangVatTu <<entity>> { don_hang_id : INTEGER
vat_tu_id : INTEGER
so_luong_can : NUMERIC
don_gia : NUMERIC }
class DonHangPhanCongLog <<entity>>
class DonHangGiaiDoanLog <<entity>>
DonHangController --> DonHangService
DonHangService --> DonHangRepository
DonHangService --> ThongBaoService
DonHangRepository ..> DonHang
DonHang "1" -- "n" DonHangVatTu
DonHang "1" -- "n" DonHangPhanCongLog
DonHang "1" -- "n" DonHangGiaiDoanLog
`);

cn('dat_hang', 'Đặt hàng nhà cung cấp', `
autonumber
actor "Vận hành" as U
boundary "Giao diện\\nMua hàng" as FE
control "MuaHangService" as S
control "CongNoService" as CN
participant "Telegram\\nBot API" as TG
actor "Nhà cung cấp" as NCC
database "PostgreSQL" as DB
U -> FE : Bấm "Đặt hàng" tại một NCC
FE -> S : POST /api/mua-hang/don/:id/dat-hang
S -> DB : BEGIN; khoá đơn; lấy dòng "Đã chọn NCC"
S -> DB : INSERT dat_hang_ncc; dòng -> "Đã đặt"; COMMIT
S -> TG : sendMessage(đơn đặt hàng + nút "Cho xuất hàng" / "Yêu cầu cọc")
TG -> NCC : tin nhắn trong nhóm NCC
alt NCC bấm "Cho xuất hàng"
  NCC -> TG : callback_query
  TG -> S : xuLyTelegramNcc() (kiểm tra đúng nhóm, đúng tin)
  S -> DB : ghiPhanHoiNcc(): dòng -> "Sẵn hàng"
  S -> CN : taoQuyetToanNcc() (gửi đề xuất kèm QR vào nhóm duyệt chi)
else NCC bấm "Yêu cầu cọc"
  S -> TG : hỏi số tiền cọc (ForceReply)
  NCC -> TG : trả lời "2tr"
  S -> CN : taoCocTuNcc(); dòng -> "Chờ cọc"
end
S -> TG : sửa tin nhóm NCC "Đã ghi nhận"
`, `
class MuaHangController { +chiTietDon() +capNhatDong() +datHang() +phanHoiNcc() +huyDatHang() +layHang() }
class MuaHangService { +capNhatDong(user, id, data) +datHang(user, donId, nccId) -ghiPhanHoiNcc(client, dh, data) +phanHoiNccWeb(user, id, data) +huyDatHang(user, id) +xuLyTelegramNcc(update) }
class MuaHangRepository
class CongNoService { +taoQuyetToanNcc(client, datHangId) +taoCocTuNcc(client, datHangId, soTien) }
class TelegramClient { +guiDatHangNcc(dh) +hoiSoTienCoc(chatId) +capNhatTinNhan() }
class MuaHangDong <<entity>> { don_hang_vat_tu_id : INTEGER
ncc_id : INTEGER
gia_chot : NUMERIC
trang_thai : enum }
class DatHangNcc <<entity>> { id : SERIAL
don_hang_id : INTEGER
ncc_id : INTEGER
trang_thai : enum
so_tien_coc : NUMERIC }
class NhaCungCap <<entity>>
MuaHangController --> MuaHangService
MuaHangService --> MuaHangRepository
MuaHangService --> CongNoService
MuaHangService --> TelegramClient
MuaHangRepository ..> MuaHangDong
MuaHangRepository ..> DatHangNcc
DatHangNcc "1" -- "n" MuaHangDong
NhaCungCap "1" -- "n" DatHangNcc
`);

cn('duyet_chi', 'Duyệt đề xuất chi', `
autonumber
actor "Người duyệt chi" as U
participant "Telegram\\nBot API" as TG
control "TelegramRouter" as R
control "CongNoService" as S
control "ThongBaoService" as TB
database "PostgreSQL" as DB
U -> TG : Bấm "Duyệt" trên tin đề xuất (ảnh QR)
TG -> R : callback_query (webhook có secret token / long polling)
R -> R : xuLyUpdate(): kiểm tra đúng nhóm duyệt, đúng tin nhắn
R -> S : xuLyDuyet(deXuatId, nguoiBam)
S -> S : kiểm tra người bấm có quyền duyệt
S -> DB : BEGIN
S -> DB : UPDATE de_xuat_chi SET trang_thai = 'da_duyet' WHERE trang_thai = 'cho_duyet'
alt đã được xử lý trước đó
  S --> R : bỏ qua, báo "Đề xuất đã được xử lý"
else cập nhật thành công
  S -> DB : INSERT de_xuat_chi_duyet_log
  S -> TB : deXuatChi(... 'da_duyet') -> thông báo Kế toán
  S -> DB : COMMIT
  S -> TG : editMessageCaption("Đã duyệt") + nút "Đã chi"
end
R -> TG : answerCallbackQuery
`, `
class TelegramRouter { +xuLyUpdate(update) }
class TelegramClient { +guiDeXuatChi(dx) +capNhatTinNhan(id, noiDung) +nutDaChi(id) }
class CongNoService { +taoDeXuat(user, data) +xuLyDuyet(id, hanhDong, nguoi) +thuHoi(user, id) +guiLai(user, id) +suaTinDuyet(dx) }
class CongNoRepository
class ThongBaoService { +deXuatChi(client, id, suKien) }
class DeXuatChi <<entity>> { id : SERIAL
loai_chi : enum
so_tien : NUMERIC
trang_thai : enum
noi_dung_ck : TEXT
telegram_message_id : BIGINT }
class DeXuatChiDuyetLog <<entity>> { de_xuat_chi_id : INTEGER
hanh_dong : VARCHAR
telegram_user : TEXT
nguoi_id : INTEGER
thoi_gian : TIMESTAMPTZ }
TelegramRouter --> CongNoService
CongNoService --> TelegramClient
CongNoService --> CongNoRepository
CongNoService --> ThongBaoService
CongNoRepository ..> DeXuatChi
DeXuatChi "1" -- "n" DeXuatChiDuyetLog
`);

cn('xac_nhan_chi', 'Xác nhận đã chi', `
autonumber
actor "Kế toán" as U
participant "Telegram Bot API\\n/ Giao diện Công nợ" as TG
control "CongNoService" as S
control "LuuAnh" as A
database "PostgreSQL" as DB
U -> TG : Bấm "Đã chi – gửi ảnh bill"
TG -> U : hỏi ảnh bill (ForceReply)
U -> TG : trả lời bằng ảnh bill
TG -> S : xuLyAnhBill(): kiểm tra người gửi là Kế toán đã gắn Telegram
S -> TG : getFile, tải ảnh
S -> A : luuAnhBase64() (kiểm tra magic bytes, <= 4 MB)
S -> DB : BEGIN
S -> DB : INSERT phieu_thanh_toan; đề xuất -> "Đã chi"
alt đề xuất là tiền cọc
  S -> DB : dòng "Chờ cọc" -> "Sẵn hàng"
  S -> S : taoQuyetToanNcc() phần còn lại
else trả công thợ
  S -> DB : INSERT giao_dich_tho
end
S -> DB : COMMIT
S -> TG : sửa tin "Đã chi", bỏ nút; báo nhóm NCC (nếu cọc)
note over S : Tiền ra khớp sao kê ngân hàng:\\nNganHangService gọi daChi(null, id, { giaoDichId })\\nkhông cần ảnh bill
`, `
class CongNoService { +daChi(user, id, data, kenh) +xuLyAnhBill(update) -sauKhiChiCoc(client, dx) +taoQuyetToanNcc(client, id) }
class LuuAnh { +luuAnhBase64(base64) +duongDanAnh(ten) }
class TelegramClient { +hoiAnhBill(chatId) +taiFile(fileId) }
class NganHangService { +xuLyGiaoDich(payload) }
class DeXuatChi <<entity>> { id : SERIAL
trang_thai : enum
so_tien : NUMERIC }
class PhieuThanhToan <<entity>> { de_xuat_chi_id : INTEGER
so_tien : NUMERIC
bill_anh : TEXT
nguoi_tao_id : INTEGER }
class GiaoDichTho <<entity>>
CongNoService --> LuuAnh
CongNoService --> TelegramClient
NganHangService --> CongNoService
CongNoService ..> DeXuatChi
CongNoService ..> PhieuThanhToan
CongNoService ..> GiaoDichTho
DeXuatChi "1" -- "0..1" PhieuThanhToan
`);

cn('thi_cong', 'Thi công, nghiệm thu và quyết toán', `
autonumber
actor "Vận hành" as U
boundary "Giao diện\\nThi công" as FE
control "ThiCongService" as S
control "DonHangService" as D
database "PostgreSQL" as DB
U -> FE : Lập giai đoạn (đội thợ, khối lượng, giá công, ngày)
FE -> S : POST /api/thi-cong
S -> DB : kiểm tra trùng lịch đội thợ
alt trùng lịch
  S --> FE : cảnh báo, yêu cầu xác nhận
end
S -> DB : INSERT thi_cong
U -> FE : Bắt đầu giai đoạn đầu
S -> D : tuDongChuyenBuoc(giao_hang -> thi_cong)
U -> FE : Báo xong giai đoạn cuối
S -> D : tuDongChuyenBuoc(thi_cong -> nghiem_thu)
U -> FE : Nhập số lượng, khối lượng thực tế; "Xác nhận nghiệm thu"
S -> S : cảnh báo nếu hao hụt > 10%
S -> D : tuDongChuyenBuoc(nghiem_thu -> quyet_toan)
U -> FE : "Chốt quyết toán"
S -> DB : lưu giá trị quyết toán; ghi công thợ phải trả (giao_dich_tho)
S -> D : chuyển đơn sang "Hoàn tất"
`, `
class ThiCongController
class ThiCongService { +lapGiaiDoan(user, data) +batDau(user, id) +baoXong(user, id) +luuNghiemThu(user, donId, ds) +xacNhanNghiemThu(user, donId) +themPhatSinh(user, data) +chotQuyetToan(user, donId) }
class ThiCongRepository
class DonHangService { +tuDongChuyenBuoc(client, donId, tu, den) }
class ThiCong <<entity>> { don_hang_id : INTEGER
doi_tho_id : INTEGER
ten_giai_doan : TEXT
kl_du_kien : NUMERIC
gia_cong : NUMERIC
trang_thai : enum }
class DoiTho <<entity>>
class PhatSinhThiCong <<entity>>
class GiaoDichTho <<entity>>
ThiCongController --> ThiCongService
ThiCongService --> ThiCongRepository
ThiCongService --> DonHangService
ThiCongRepository ..> ThiCong
DoiTho "1" -- "n" ThiCong
DoiTho "1" -- "n" GiaoDichTho
ThiCong "1" -- "n" PhatSinhThiCong
`);

cn('thu_tien', 'Ghi nhận thanh toán của khách', `
autonumber
actor "Sale" as U
actor "Kế toán" as KT
boundary "Giao diện\\nChi tiết đơn" as FE
control "ThuTienService" as S
control "ThongBaoService" as TB
database "PostgreSQL" as DB
U -> FE : Xem QR thu tiền (GET /api/thu-tien/don/:id)
U -> FE : Ghi nhận khoản thu + ảnh bill
FE -> S : POST /api/thu-tien
S -> S : kiểm tra quyền theo đơn
S -> DB : BEGIN; khoá đơn
S -> DB : kiểm tra không vượt số còn phải thu (v_don_hang_tien)
S -> DB : INSERT thanh_toan_khach ("Chờ xác nhận")
S -> TB : gui(Kế toán)
S -> DB : COMMIT
KT -> FE : Đối chiếu sao kê, bấm "Đã nhận tiền"
FE -> S : xuLy(): xác nhận phiếu
S -> DB : UPDATE phiếu "Đã xác nhận"
S -> TB : gui(Sale)
alt Kế toán "Chưa thấy tiền"
  S -> DB : ghi lý do, báo người ghi nhận
end
`, `
class ThuTienService { +tomTat(donId) +qrThuTien(donId) +theoDon(user, donId) +tao(user, data) +xuLy(user, id) +tuChoi(user, id, lyDo) +choXacNhan() +congNo(loc) }
class LuuAnh { +luuAnhBase64() }
class ThongBaoService { +gui() }
class ThanhToanKhach <<entity>> { don_hang_id : INTEGER
loai : enum
so_tien : NUMERIC
hinh_thuc : enum
bill_anh : TEXT
trang_thai : enum
nguoi_xac_nhan_id : INTEGER }
class DonHang <<entity>>
class "v_don_hang_tien" as V <<view>> { tong_don
da_thu
con_phai_thu }
ThuTienService --> LuuAnh
ThuTienService --> ThongBaoService
ThuTienService ..> ThanhToanKhach
ThuTienService ..> V
DonHang "1" -- "n" ThanhToanKhach
V ..> DonHang
`);

cn('doi_soat', 'Đối soát giao dịch ngân hàng', `
autonumber
participant "Ngân hàng\\n(SePay)" as NH
control "NganHangRoutes" as R
control "NganHangService" as S
control "CongNoService" as CN
control "ThongBaoService" as TB
database "PostgreSQL" as DB
NH -> R : POST /api/ngan-hang/webhook (Authorization: Apikey)
R -> R : kiểm tra khoá webhook
R -> S : xuLyGiaoDich(payload)
S -> S : tuSepay(): chuẩn hoá dữ liệu
S -> DB : mã giao dịch đã xử lý? (UNIQUE nguon, ma_gd_ngoai)
alt tiền vào
  S -> DB : BEGIN; INSERT giao_dich_ngan_hang
  S -> S : timMaDon(nội dung chuyển khoản)
  alt có phiếu chờ đúng số tiền
    S -> DB : UPDATE phiếu -> "Đã xác nhận"
  else không có phiếu chờ
    S -> DB : INSERT phiếu thu đã xác nhận
  end
  S -> TB : thông báo Sale, Kế toán
  S -> DB : COMMIT
else tiền ra
  S -> DB : tìm đề xuất đã duyệt khớp nội dung + số tiền
  S -> CN : daChi(null, id, { giaoDichId })
end
alt không khớp
  S -> DB : giao dịch "Chưa khớp"; báo Kế toán (khớp tay / bỏ qua)
end
R --> NH : { success: true }
`, `
class NganHangRoutes { +POST /webhook +POST /gia-lap +POST /:id/khop-tay +POST /:id/bo-qua }
class NganHangService { +xuLyGiaoDich(payload, nguon) -tuSepay(p) -timMaDon(noiDung) -khopTienVao(client, gd) -timDxcTienRa(client, gd) +khopTay(user, id, donId) +boQua(user, id, lyDo) +giaLap(user, data) }
class CongNoService { +daChi(user, id, data) }
class ThongBaoService
class GiaoDichNganHang <<entity>> { id : SERIAL
nguon : VARCHAR
ma_gd_ngoai : TEXT
loai : vao / ra
so_tien : NUMERIC
noi_dung : TEXT
trang_thai : enum
cach_khop : VARCHAR
thanh_toan_khach_id : INTEGER
de_xuat_chi_id : INTEGER }
class ThanhToanKhach <<entity>>
class DeXuatChi <<entity>>
NganHangRoutes --> NganHangService
NganHangService --> CongNoService
NganHangService --> ThongBaoService
NganHangService ..> GiaoDichNganHang
ThanhToanKhach "1" -- "0..1" GiaoDichNganHang
DeXuatChi "1" -- "0..1" GiaoDichNganHang
`);

cn('bao_cao_cs', 'Báo cáo chăm sóc khách hàng', `
autonumber
actor "Admin" as U
boundary "Báo cáo\\nchăm sóc" as FE
control "ChamSocRoutes" as R
control "ChamSocService" as S
control "NhapSoService" as NS
participant "Gemini API" as AI
database "PostgreSQL" as DB
U -> FE : Chọn kỳ (7 ngày / 30 ngày / tháng này)
FE -> R : GET /api/cham-soc/bao-cao?tu&den
R -> S : tongHop({ tu, den })
S -> DB : tổng hợp theo Sale: được chia, đã gọi, gọi trong 2 giờ, chốt...; tồn đọng hiện tại
S --> FE : bảng theo Sale + tổng
U -> FE : Chọn khách tồn đọng, Sale nhận, lý do; bấm "Chuyển"
FE -> R : POST /api/cham-soc/chuyen-nhieu
R -> S : chuyenNhieu(user, { khach_ids, sale_id, ly_do })
loop mỗi khách
  S -> NS : chuyenSale(user, id, { sale_id, ly_do })
end
U -> FE : Bấm "Phân tích bằng AI"
FE -> R : POST /api/cham-soc/ai-nhan-xet
R -> S : nhanXetAi(user, { tu, den })
S -> AI : sinhJson(số liệu tổng hợp theo Sale, không có tên/SĐT khách)
AI --> S : nhận xét JSON
S -> S : bỏ tên Sale không có; đánh dấu số không khớp dữ liệu
S -> DB : INSERT ai_nhan_xet_cham_soc
S --> FE : kết quả + mã bản lưu
`, `
class ChamSocRoutes { +GET /bao-cao +GET /ton-dong +POST /chuyen-nhieu +POST /ai-nhan-xet +GET /ai-lich-su }
class ChamSocService { +tongHop(ky) +tonDong(loai, saleId) +chuyenNhieu(user, data) +nhanXetAi(user, ky) +lichSuAi(trang) +xemAi(id) -khongDau(kq) }
class NhapSoService { +chuyenSale(user, id, data) }
class GeminiClient { +sinhJson(systemPrompt, userText, schema) }
class KhachHang <<entity>>
class KhachHangChamSoc <<entity>>
class ChiaSoLog <<entity>>
class AiNhanXetChamSoc <<entity>> { id : SERIAL
tu_ngay : DATE
den_ngay : DATE
ket_qua : JSONB
so_lieu : JSONB
nguoi_tao_id : INTEGER }
ChamSocRoutes --> ChamSocService
ChamSocService --> NhapSoService
ChamSocService --> GeminiClient
ChamSocService ..> KhachHang
ChamSocService ..> KhachHangChamSoc
ChamSocService ..> ChiaSoLog
ChamSocService ..> AiNhanXetChamSoc
`);

fs.writeFileSync(path.join(DIR, 'chuc_nang.json'), JSON.stringify(CN, null, 1));

// ======================= ERD (doc tu DB test) =======================
(async () => {
  const req = require('module').createRequire('F:/DATN/backend/package.json');
  req('dotenv').config({ path: 'F:/DATN/backend/.env', quiet: true });
  const pg = req('pg');
  const c = new pg.Client({ host: process.env.PG_HOST, port: +process.env.PG_PORT, user: process.env.PG_USER, password: process.env.PG_PASSWORD, database: 'datn_erp_test' });
  await c.connect();
  const bang = (await c.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' AND table_name <> 'schema_migrations' ORDER BY 1`)).rows.map((r) => r.table_name);
  const pk = (await c.query(`SELECT tc.table_name, kcu.column_name FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage kcu USING (constraint_name, table_schema) WHERE tc.constraint_type='PRIMARY KEY' AND tc.table_schema='public'`)).rows;
  const fk = (await c.query(`SELECT cl.relname AS bang, a.attname AS cot, cf.relname AS den
    FROM pg_constraint co JOIN pg_class cl ON cl.oid = co.conrelid JOIN pg_class cf ON cf.oid = co.confrelid
    JOIN pg_attribute a ON a.attrelid = co.conrelid AND a.attnum = co.conkey[1]
    WHERE co.contype = 'f' ORDER BY 1, 2`)).rows;
  await c.end();
  let s = 'hide circle\nleft to right direction\nskinparam defaultFontSize 12\n';
  for (const b of bang) {
    const k = pk.filter((x) => x.table_name === b).map((x) => x.column_name);
    const f = fk.filter((x) => x.bang === b).map((x) => x.cot).filter((x) => !k.includes(x));
    s += `entity ${b} {\n${k.map((x) => `  * ${x} <<PK>>`).join('\n')}\n  --\n${f.map((x) => `  ${x} <<FK>>`).join('\n')}\n}\n`;
  }
  const da = new Set();
  for (const r of fk) {
    const key = `${r.bang}|${r.den}`;
    if (da.has(key)) continue; da.add(key);
    s += `${r.den} ||--o{ ${r.bang}\n`;
  }
  ghi('erd', s);
  console.log('Đã sinh', CN.length, 'chức năng, ERD', bang.length, 'bảng');
})();
