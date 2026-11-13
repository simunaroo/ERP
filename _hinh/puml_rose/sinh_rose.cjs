// Sinh bieu do theo kieu Rational Rose (mau bao cao cua khoa): ten khong dau, bieu do trinh tu B-C-E
// (Actor -> Boundary "XxxUI" -> Control "XxxController" -> Entity = bang CSDL), dieu kien ghi bang note,
// bieu do lop phan tich <<boundary>>/<<control>>/<<entity>> SUY RA tu chinh cac thong diep cua bieu do trinh tu.
// Day la ban tam de ve lai bang Rational Rose. Chay: node sinh_rose.cjs  (doc cot bang tu DB test datn_erp_test)
const fs = require('fs');
const path = require('path');
const DIR = __dirname;
const STYLE = `!pragma layout smetana
skinparam dpi 150
skinparam defaultFontName Arial
skinparam defaultFontSize 12
skinparam shadowing false
skinparam ArrowColor #990033
skinparam ActorBorderColor #990033
skinparam ActorBackgroundColor #FFFFCC
skinparam UsecaseBorderColor #990033
skinparam UsecaseBackgroundColor #FFFFCC
skinparam ClassBorderColor #990033
skinparam ClassBackgroundColor #FFFFCC
skinparam ParticipantBorderColor #990033
skinparam ParticipantBackgroundColor #FFFFCC
skinparam BoundaryBackgroundColor #FFFFCC
skinparam BoundaryBorderColor #990033
skinparam ControlBackgroundColor #FFFFCC
skinparam ControlBorderColor #990033
skinparam EntityBackgroundColor #FFFFCC
skinparam EntityBorderColor #990033
skinparam SequenceLifeLineBorderColor #444444
skinparam NoteBackgroundColor #FFFFCC
skinparam NoteBorderColor #990033
skinparam packageStyle rectangle`;
const ghi = (ten, noiDung) => fs.writeFileSync(path.join(DIR, `${ten}.puml`), `@startuml ${ten}\n${STYLE}\n${noiDung.trim()}\n@enduml\n`);

// Bieu do use case: xem ve_usecase.cjs (tu xep cho, net thang, khong dung PlantUML).

// ======================= TRINH TU (B-C-E) + LOP PHAN TICH =======================
// p: danh sach doi tuong [ma, loai(actor|boundary|control|entity), ten]
// m: thong diep [tu, den, noi dung] | [tu, den, noi dung, 'r'] (tra ve, net dut) | ['note', doiTuong, noi dung]
const CN = [];
function chucNang(ma, ten, p, m) {
  CN.push([ma, ten]);
  const loai = Object.fromEntries(p.map(([k, l]) => [k, l]));
  const tenDt = Object.fromEntries(p.map(([k, , t]) => [k, t]));
  let s = 'autonumber\nhide footbox\n';
  for (const [k, l, t] of p) s += `${l} "${t}" as ${k}\n`;
  for (const x of m) {
    if (x[0] === 'note') { s += `note right of ${x[1]}\n${x[2]}\nend note\n`; continue; }
    const [a, b, nd, r] = x;
    s += `${a} ${r ? '-->' : '->'} ${b} : ${nd}\n`;
  }
  ghi(`seq_${ma}`, s);
  // Bieu do lop: thao tac cua lop = thong diep (khong phai tra ve) gui DEN lop do; actor khong la lop.
  const op = Object.fromEntries(p.map(([k]) => [k, []]));
  for (const x of m) {
    if (x[0] === 'note' || x[3] || loai[x[1]] === 'actor') continue;
    let t = x[2].replace(/"/g, '\'');
    if (!/\)$/.test(t)) t += '()';
    if (!op[x[1]].includes(t)) op[x[1]].push(t);
  }
  chucNangLop.push({ ma, p, op, loai, tenDt });
}
const chucNangLop = [];

chucNang('dang_nhap', 'Dang nhap', [
  ['U', 'actor', 'Nguoi dung'], ['UI', 'boundary', 'DangNhapUI'], ['C', 'control', 'DangNhapController'], ['US', 'entity', 'users'],
  ['XT', 'entity', 'xac_thuc_vai_tro']], [
  ['U', 'UI', 'Dieu huong den man hinh dang nhap()'], ['UI', 'UI', 'Hien thi form dang nhap()'],
  ['U', 'UI', 'Nhap ten dang nhap, mat khau va kich nut "Dang nhap"'], ['UI', 'C', 'Kiem tra thong tin dang nhap()'],
  ['C', 'C', 'Kiem tra so lan nhap sai()'], ['C', 'US', 'Tim tai khoan theo ten dang nhap()'], ['US', 'C', 'return thong tin tai khoan', 'r'],
  ['C', 'C', 'So sanh mat khau (bcrypt)()'],
  ['note', 'C', 'Neu sai mat khau hoac tai khoan bi khoa:\ntra ve thong bao loi'],
  ['C', 'XT', 'Kiem tra vai tro co bat xac thuc hai lop()'], ['XT', 'C', 'return cau hinh', 'r'],
  ['C', 'UI', 'return ket qua', 'r'],
  ['note', 'UI', 'Neu vai tro dang bat xac thuc hai lop\n(mac dinh Admin, Ke toan): yeu cau nhap ma.\nVai tro khong bat: cap token ngay'],
  ['UI', 'UI', 'Hien thi form nhap ma 6 so()'], ['U', 'UI', 'Nhap ma 6 so tu ung dung xac thuc'],
  ['UI', 'C', 'Xac minh ma hai lop()'], ['C', 'US', 'Kiem tra ma TOTP()'], ['C', 'US', 'Cap nhat buoc ma da dung()'],
  ['US', 'C', 'return ket qua', 'r'], ['C', 'C', 'Cap token dang nhap()'], ['C', 'UI', 'return token', 'r'],
  ['UI', 'UI', 'Hien thi trang Tong quan theo vai tro()']]);

chucNang('nhap_so', 'Nhap va chia so', [
  ['U', 'actor', 'Admin'], ['UI', 'boundary', 'NhapSoUI'], ['C', 'control', 'NhapSoController'], ['KH', 'entity', 'khach_hang'],
  ['TL', 'entity', 'ty_le_chia_so'], ['LOG', 'entity', 'chia_so_log'], ['TB', 'entity', 'thong_bao']], [
  ['U', 'UI', 'Kich nut "Nhap so"()'], ['UI', 'UI', 'Hien thi form nhap so()'],
  ['U', 'UI', 'Dan danh sach so hoac tai tep Excel, CSV, TXT'], ['UI', 'C', 'Doc tep so dien thoai()'], ['C', 'UI', 'return danh sach xem truoc', 'r'],
  ['UI', 'UI', 'Hien thi danh sach xem truoc()'], ['U', 'UI', 'Kich nut "Nhap"()'], ['UI', 'C', 'Nhap so()'],
  ['C', 'C', 'Chuan hoa so dien thoai()'], ['C', 'KH', 'Kiem tra trung so()'], ['KH', 'C', 'return ket qua', 'r'],
  ['note', 'C', 'Neu so da ton tai: bo qua,\nbao Sale dang giu so'],
  ['C', 'TL', 'Lay ty le chia()'], ['TL', 'C', 'return ty le cua tung Sale', 'r'], ['C', 'C', 'Chon Sale thieu nhieu nhat so voi ty le()'],
  ['C', 'KH', 'Them khach hang moi()'], ['C', 'LOG', 'Ghi nhat ky chia so()'], ['C', 'TB', 'Gui thong bao cho Sale()'],
  ['C', 'UI', 'return ket qua tung dong', 'r'], ['UI', 'UI', 'Hien thi ket qua nhap so()'],
  ['note', 'C', 'Website quang cao goi API nhap so\n(kem khoa API) di cung luong tu buoc "Nhap so"']]);

chucNang('cham_soc', 'Cham soc khach hang', [
  ['U', 'actor', 'Sale'], ['UI', 'boundary', 'ChamSocKhachUI'], ['C', 'control', 'ChamSocController'], ['KH', 'entity', 'khach_hang'],
  ['CS', 'entity', 'khach_hang_cham_soc']], [
  ['U', 'UI', 'Kich nut "Khach hang"()'], ['UI', 'C', 'Lay danh sach khach()'], ['C', 'KH', 'Lay khach cua Sale()'],
  ['KH', 'C', 'return danh sach khach', 'r'], ['C', 'UI', 'return ket qua', 'r'],
  ['UI', 'UI', 'Hien thi danh sach khach va ghi chu lan goi truoc()'],
  ['U', 'UI', 'Bam so dien thoai de goi'], ['U', 'UI', 'Kich nut "Cap nhat"()'], ['UI', 'UI', 'Hien thi form cap nhat cham soc()'],
  ['U', 'UI', 'Chon trang thai, nhap ghi chu va kich nut "Luu"'], ['UI', 'C', 'Ghi nhan cham soc()'], ['C', 'C', 'Kiem tra du lieu hop le()'],
  ['note', 'C', 'Hen goi lai: bat buoc chon gio hen\nKhong quan tam, Sai so: bat buoc ghi chu'],
  ['C', 'CS', 'Them lan cham soc()'], ['C', 'KH', 'Cap nhat trang thai cham soc()'], ['C', 'UI', 'return ket qua', 'r'],
  ['UI', 'UI', 'Hien thi lai danh sach khach()'],
  ['note', 'UI', 'Neu trang thai "Chot don":\nhoi "Len don ngay?" va mo form tao don'],
  ['UI', 'UI', 'Hien thi hop thoai "Len don ngay?"()']]);

chucNang('tao_don', 'Tao va chot don hang', [
  ['U', 'actor', 'Sale'], ['UI', 'boundary', 'TaoDonUI'], ['C', 'control', 'DonHangController'], ['KH', 'entity', 'khach_hang'],
  ['DH', 'entity', 'don_hang'], ['VT', 'entity', 'don_hang_vat_tu'], ['SP', 'entity', 'khach_hang_san_pham'], ['US', 'entity', 'users'],
  ['PC', 'entity', 'don_hang_phan_cong_log'], ['TB', 'entity', 'thong_bao']], [
  ['U', 'UI', 'Kich nut "Nhap don"()'], ['UI', 'C', 'Lay danh sach khach va vat tu()'], ['C', 'KH', 'Lay khach cua Sale()'],
  ['KH', 'C', 'return danh sach', 'r'], ['C', 'UI', 'return ket qua', 'r'], ['UI', 'UI', 'Hien thi form tao don()'],
  ['U', 'UI', 'Nhap thong tin don, chon san pham va vat tu'],
  ['U', 'UI', 'Kich nut "Chot don"()'], ['UI', 'C', 'Tao va chot don hang()'], ['C', 'C', 'Kiem tra du thong tin de chot()'],
  ['C', 'DH', 'Them don hang()'], ['C', 'VT', 'Them vat tu cua don()'], ['C', 'DH', 'Sinh ma hop dong SDT_STT()'],
  ['C', 'SP', 'Them san pham quan tam cua khach()'],
  ['C', 'US', 'Chon van hanh it viec nhat()'], ['US', 'C', 'return van hanh', 'r'], ['C', 'PC', 'Ghi lich su phan cong()'],
  ['C', 'TB', 'Gui thong bao cho van hanh()'], ['C', 'UI', 'return ket qua', 'r'], ['UI', 'UI', 'Hien thi chi tiet don hang()']]);

chucNang('dat_hang', 'Dat hang nha cung cap', [
  ['U', 'actor', 'Van hanh'], ['UI', 'boundary', 'MuaHangUI'], ['C', 'control', 'MuaHangController'], ['TG', 'boundary', 'TelegramBot'],
  ['NCC', 'actor', 'Nha cung cap'], ['MH', 'entity', 'mua_hang_dong'], ['BG', 'entity', 'ncc_bang_gia'], ['DAT', 'entity', 'dat_hang_ncc'], ['DX', 'entity', 'de_xuat_chi']], [
  ['U', 'UI', 'Kich nut "Mua hang"()'], ['UI', 'C', 'Lay chi tiet mua hang cua don()'], ['C', 'MH', 'Lay dong vat tu can mua()'],
  ['C', 'BG', 'Lay gia hieu luc cua cac NCC()'], ['BG', 'C', 'return bang gia', 'r'], ['C', 'UI', 'return ket qua', 'r'],
  ['UI', 'UI', 'Hien thi danh sach vat tu can mua()'], ['U', 'UI', 'Chon nha cung cap cho tung vat tu'], ['UI', 'C', 'Cap nhat nha cung cap()'],
  ['C', 'MH', 'Cap nhat NCC va gia chot()'], ['U', 'UI', 'Kich nut "Dat hang"()'], ['UI', 'C', 'Dat hang nha cung cap()'],
  ['C', 'DAT', 'Them don dat hang()'], ['C', 'MH', 'Chuyen trang thai "Da dat"()'], ['C', 'TG', 'Gui don dat hang vao nhom NCC()'],
  ['TG', 'NCC', 'Hien thi tin nhan kem nut "Cho xuat hang", "Yeu cau coc"()'], ['NCC', 'TG', 'Kich nut "Cho xuat hang"'],
  ['TG', 'C', 'Ghi nhan phan hoi nha cung cap()'], ['C', 'MH', 'Chuyen trang thai "San hang"()'], ['C', 'DX', 'Tao de xuat quyet toan NCC()'],
  ['note', 'C', 'Neu NCC "Yeu cau coc": hoi so tien coc,\ntao de xuat coc, vat tu chuyen "Cho coc"'],
  ['C', 'UI', 'return ket qua', 'r'], ['UI', 'UI', 'Hien thi trang thai dat hang()']]);

chucNang('duyet_chi', 'Duyet de xuat chi', [
  ['U', 'actor', 'Admin'], ['UI', 'boundary', 'DeXuatChiUI'], ['C', 'control', 'DeXuatChiController'], ['TG', 'boundary', 'TelegramBot'],
  ['DX', 'entity', 'de_xuat_chi'], ['LOG', 'entity', 'de_xuat_chi_duyet_log'], ['TB', 'entity', 'thong_bao']], [
  ['U', 'UI', 'Kich nut "Chi & cong no"()'], ['UI', 'C', 'Lay danh sach de xuat()'], ['C', 'DX', 'Lay de xuat cho duyet()'],
  ['DX', 'C', 'return danh sach', 'r'], ['C', 'UI', 'return ket qua', 'r'], ['UI', 'UI', 'Hien thi danh sach de xuat cho duyet()'],
  ['U', 'UI', 'Chon de xuat'], ['UI', 'UI', 'Hien thi chi tiet de xuat kem ma QR()'], ['U', 'UI', 'Kich nut "Duyet"()'],
  ['UI', 'C', 'Duyet de xuat chi()'], ['C', 'DX', 'Cap nhat trang thai "Da duyet"()'],
  ['note', 'C', 'Chi cap nhat khi de xuat con "Cho duyet"\n(hai nguoi bam cung luc chi mot nguoi thanh cong)'],
  ['C', 'LOG', 'Ghi nguoi duyet()'], ['C', 'TB', 'Gui thong bao cho Ke toan()'], ['C', 'TG', 'Sua tin nhan thanh "Da duyet"()'],
  ['C', 'UI', 'return ket qua', 'r'], ['UI', 'UI', 'Hien thi trang thai "Da duyet"()'],
  ['note', 'UI', 'Tu choi: bat buoc nhap ly do.\nNguoi duyet chi co the bam "Duyet" ngay tren Telegram']]);

chucNang('xac_nhan_chi', 'Xac nhan da chi', [
  ['U', 'actor', 'Ke toan'], ['UI', 'boundary', 'DeXuatChiUI'], ['C', 'control', 'DeXuatChiController'], ['DX', 'entity', 'de_xuat_chi'],
  ['PTT', 'entity', 'phieu_thanh_toan'], ['MH', 'entity', 'mua_hang_dong'], ['TB', 'entity', 'thong_bao']], [
  ['U', 'UI', 'Chon de xuat "Da duyet"'], ['UI', 'UI', 'Hien thi ma QR chuyen khoan()'],
  ['note', 'U', 'Ke toan quet QR bang ung dung ngan hang\nva chuyen khoan'],
  ['U', 'UI', 'Kich nut "Da chi" va tai anh bill'], ['UI', 'C', 'Xac nhan da chi()'], ['C', 'C', 'Kiem tra anh bill()'],
  ['C', 'PTT', 'Them phieu thanh toan()'], ['C', 'DX', 'Cap nhat trang thai "Da chi"()'],
  ['note', 'C', 'Neu la tien coc: vat tu chuyen "San hang"\nva tu lap de xuat quyet toan phan con lai'],
  ['C', 'MH', 'Chuyen trang thai "San hang"()'], ['C', 'DX', 'Tao de xuat quyet toan con lai()'], ['C', 'TB', 'Gui thong bao cho nguoi lap()'],
  ['C', 'UI', 'return ket qua', 'r'], ['UI', 'UI', 'Hien thi trang thai "Da chi"()'],
  ['note', 'UI', 'Cung co the xac nhan tren Telegram\nbang cach tra loi tin nhan bang anh bill']]);

chucNang('thi_cong', 'Thi cong, nghiem thu va quyet toan', [
  ['U', 'actor', 'Van hanh'], ['UI', 'boundary', 'ThiCongUI'], ['C', 'control', 'ThiCongController'], ['TC', 'entity', 'thi_cong'],
  ['DH', 'entity', 'don_hang'], ['VT', 'entity', 'don_hang_vat_tu'], ['GDT', 'entity', 'giao_dich_tho']], [
  ['U', 'UI', 'Kich nut "Thi cong"()'], ['UI', 'UI', 'Hien thi form lap giai doan()'],
  ['U', 'UI', 'Nhap giai doan, chon doi tho va kich nut "Luu"'], ['UI', 'C', 'Lap giai doan thi cong()'], ['C', 'TC', 'Kiem tra trung lich doi tho()'],
  ['note', 'C', 'Neu doi tho trung lich: canh bao,\nyeu cau xac nhan'],
  ['C', 'TC', 'Them giai doan()'], ['C', 'UI', 'return ket qua', 'r'], ['U', 'UI', 'Kich nut "Bat dau" / "Bao xong"()'],
  ['UI', 'C', 'Cap nhat giai doan()'], ['C', 'TC', 'Cap nhat trang thai giai doan()'], ['C', 'DH', 'Tu dong chuyen buoc tien do()'],
  ['C', 'UI', 'return ket qua', 'r'], ['U', 'UI', 'Nhap so luong thuc te va kich nut "Xac nhan nghiem thu"'], ['UI', 'C', 'Xac nhan nghiem thu()'],
  ['C', 'VT', 'Cap nhat so luong thuc te()'], ['C', 'DH', 'Chuyen buoc "Quyet toan"()'], ['C', 'UI', 'return ket qua', 'r'],
  ['U', 'UI', 'Kich nut "Chot quyet toan"()'], ['UI', 'C', 'Chot quyet toan()'], ['C', 'DH', 'Luu gia tri quyet toan()'],
  ['C', 'GDT', 'Ghi cong tho phai tra()'], ['C', 'UI', 'return ket qua', 'r'], ['UI', 'UI', 'Hien thi don "Hoan tat"()']]);

chucNang('thu_tien', 'Ghi nhan thanh toan cua khach', [
  ['U', 'actor', 'Sale'], ['KT', 'actor', 'Ke toan'], ['UI', 'boundary', 'ThuTienUI'], ['C', 'control', 'ThuTienController'],
  ['DH', 'entity', 'don_hang'], ['TT', 'entity', 'thanh_toan_khach'], ['TB', 'entity', 'thong_bao']], [
  ['U', 'UI', 'Kich nut "Thu tien"()'], ['UI', 'C', 'Lay ma QR thu tien()'], ['C', 'DH', 'Tinh so con phai thu()'], ['DH', 'C', 'return so tien', 'r'],
  ['C', 'UI', 'return ket qua', 'r'], ['UI', 'UI', 'Hien thi ma QR thu tien()'], ['U', 'UI', 'Nhap so tien, tai anh bill va kich nut "Luu"'],
  ['UI', 'C', 'Ghi nhan thanh toan()'], ['C', 'C', 'Kiem tra khong vuot so con phai thu()'], ['C', 'TT', 'Them phieu "Cho xac nhan"()'],
  ['C', 'TB', 'Gui thong bao cho Ke toan()'], ['C', 'UI', 'return ket qua', 'r'], ['KT', 'UI', 'Doi chieu sao ke, kich nut "Da nhan tien"'],
  ['UI', 'C', 'Xac nhan tien ve()'], ['C', 'TT', 'Cap nhat trang thai "Da xac nhan"()'], ['C', 'TB', 'Gui thong bao cho Sale()'],
  ['C', 'UI', 'return ket qua', 'r'], ['UI', 'UI', 'Cap nhat so con phai thu()'],
  ['note', 'UI', 'Neu Ke toan "Chua thay tien":\nbat buoc ghi ly do, bao nguoi ghi nhan']]);

chucNang('doi_soat', 'Doi soat giao dich ngan hang', [
  ['NH', 'actor', 'Ngan hang'], ['KT', 'actor', 'Ke toan'], ['WH', 'boundary', 'NganHangWebhook'], ['UI', 'boundary', 'DoiSoatUI'],
  ['C', 'control', 'NganHangController'], ['GD', 'entity', 'giao_dich_ngan_hang'], ['TT', 'entity', 'thanh_toan_khach'], ['DX', 'entity', 'de_xuat_chi'],
  ['TB', 'entity', 'thong_bao']], [
  ['NH', 'WH', 'Gui giao dich (so tien, noi dung chuyen khoan)'], ['WH', 'C', 'Xu ly giao dich()'], ['C', 'C', 'Kiem tra khoa API()'],
  ['C', 'GD', 'Kiem tra giao dich da xu ly()'], ['C', 'GD', 'Them giao dich()'], ['C', 'C', 'Tim ma don trong noi dung chuyen khoan()'],
  ['note', 'C', 'Tien vao: xac nhan phieu thu cua don\nTien ra: ghi "Da chi" cho de xuat khop'],
  ['C', 'TT', 'Xac nhan phieu thu()'], ['C', 'DX', 'Ghi "Da chi"()'], ['C', 'TB', 'Gui thong bao()'], ['C', 'WH', 'return thanh cong', 'r'],
  ['note', 'C', 'Khong tim thay don / khong khop:\ngiao dich "Chua khop", bao Ke toan'],
  ['KT', 'UI', 'Kich nut "Doi soat ngan hang"()'], ['UI', 'C', 'Lay giao dich chua khop()'], ['C', 'GD', 'Lay giao dich chua khop()'],
  ['GD', 'C', 'return danh sach', 'r'], ['C', 'UI', 'return ket qua', 'r'], ['UI', 'UI', 'Hien thi danh sach giao dich()'],
  ['KT', 'UI', 'Chon don va kich nut "Khop tay"'], ['UI', 'C', 'Khop tay giao dich()'], ['C', 'GD', 'Cap nhat trang thai "Da khop"()'],
  ['C', 'UI', 'return ket qua', 'r'], ['UI', 'UI', 'Hien thi ket qua doi soat()']]);

chucNang('bao_cao_cs', 'Bao cao cham soc khach hang', [
  ['U', 'actor', 'Admin'], ['UI', 'boundary', 'BaoCaoChamSocUI'], ['C', 'control', 'BaoCaoChamSocController'], ['AI', 'boundary', 'GeminiAPI'],
  ['KH', 'entity', 'khach_hang'], ['CS', 'entity', 'khach_hang_cham_soc'], ['LOG', 'entity', 'chia_so_log'], ['NX', 'entity', 'ai_nhan_xet_cham_soc']], [
  ['U', 'UI', 'Kich tab "Bao cao cham soc"()'], ['U', 'UI', 'Chon ky bao cao'], ['UI', 'C', 'Tong hop bao cao theo Sale()'],
  ['C', 'KH', 'Thong ke so duoc chia, so ton dong()'], ['C', 'CS', 'Thong ke lan goi, ty le chot()'], ['CS', 'C', 'return so lieu', 'r'],
  ['C', 'UI', 'return ket qua', 'r'], ['UI', 'UI', 'Hien thi bang theo Sale va so ton dong()'],
  ['U', 'UI', 'Chon khach ton dong, Sale nhan, nhap ly do va kich nut "Chuyen khach"'], ['UI', 'C', 'Chuyen nhieu khach()'],
  ['C', 'KH', 'Cap nhat Sale phu trach()'], ['C', 'LOG', 'Ghi nhat ky chuyen so()'], ['C', 'UI', 'return ket qua', 'r'],
  ['U', 'UI', 'Kich nut "Phan tich bang AI"()'], ['UI', 'C', 'Nhan xet bang AI()'], ['C', 'AI', 'Gui so lieu tong hop theo Sale()'],
  ['AI', 'C', 'return nhan xet', 'r'], ['C', 'C', 'Kiem tra lai ten Sale va con so()'], ['C', 'NX', 'Luu ban phan tich()'],
  ['C', 'UI', 'return ket qua', 'r'], ['UI', 'UI', 'Hien thi nhan xet AI va lich su phan tich()'],
  ['note', 'C', 'Chi gui so lieu tong hop,\nkhong gui ten, so dien thoai khach']]);

chucNang('tro_ly', 'Hoi tro ly AI san pham', [
  ['U', 'actor', 'Sale'], ['UI', 'boundary', 'TroLyChatUI'], ['C', 'control', 'TroLyController'], ['AI', 'boundary', 'GeminiAPI'],
  ['TL', 'entity', 'tro_ly_san_pham'], ['VT', 'entity', 'vat_tu'], ['KH', 'entity', 'khach_hang'], ['HT', 'entity', 'tro_ly_hoi_thoai'],
  ['TN', 'entity', 'tro_ly_tin_nhan']], [
  ['U', 'UI', 'Kich nut "Tro ly AI" va chon san pham'], ['UI', 'UI', 'Hien thi khung chat()'],
  ['U', 'UI', 'Nhap cau hoi, dinh kem anh (neu co) va kich nut "Gui"'], ['UI', 'C', 'Hoi tro ly()'], ['C', 'C', 'Kiem tra cau hoi va anh hop le()'],
  ['C', 'TL', 'Lay kien thuc san pham()'], ['TL', 'C', 'return kien thuc', 'r'],
  ['note', 'C', 'Chua co kien thuc: bao "chua duoc nap\nkien thuc", khong goi AI'],
  ['C', 'VT', 'Lay danh muc vat tu dang ban()'], ['C', 'KH', 'Lay nhom khach va nhu cau()'], ['C', 'TN', 'Lay 10 luot hoi dap gan nhat()'],
  ['note', 'C', 'Chi gui nhom khach va nhu cau;\nkhong gui ten, SDT khach, gia nhap NCC'],
  ['C', 'AI', 'Gui huong dan, kien thuc, lich su, cau hoi va anh()'], ['AI', 'C', 'return cau tra loi', 'r'],
  ['note', 'C', 'Qua tai: thu lai, chuyen mo hinh du phong.\nCau hoi ngoai pham vi: AI tu choi'],
  ['C', 'HT', 'Tao cuoc tro chuyen (lan hoi dau)()'], ['C', 'TN', 'Luu cau hoi va cau tra loi()'],
  ['C', 'UI', 'return cau tra loi', 'r'], ['UI', 'UI', 'Hien thi cau tra loi va nut "Chep tin nhan gui khach"()']]);

fs.writeFileSync(path.join(DIR, 'chuc_nang.json'), JSON.stringify(CN, null, 1));

// ======================= LOP PHAN TICH + ERD (doc cot tu DB test) =======================
(async () => {
  const req = require('module').createRequire('F:/DATN/backend/package.json');
  req('dotenv').config({ path: 'F:/DATN/backend/.env', quiet: true });
  const pg = req('pg');
  const c = new pg.Client({ host: process.env.PG_HOST, port: +process.env.PG_PORT, user: process.env.PG_USER, password: process.env.PG_PASSWORD, database: 'datn_erp_test' });
  await c.connect();
  const cot = (await c.query(`SELECT table_name t, column_name c, data_type d FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name, ordinal_position`)).rows;
  const pk = new Set((await c.query(`SELECT tc.table_name||'.'||kcu.column_name k FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage kcu USING (constraint_name, table_schema) WHERE tc.constraint_type='PRIMARY KEY' AND tc.table_schema='public'`)).rows.map((r) => r.k));
  const fk = (await c.query(`SELECT cl.relname AS bang, a.attname AS cot, cf.relname AS den FROM pg_constraint co JOIN pg_class cl ON cl.oid = co.conrelid JOIN pg_class cf ON cf.oid = co.confrelid JOIN pg_attribute a ON a.attrelid = co.conrelid AND a.attnum = co.conkey[1] WHERE co.contype = 'f'`)).rows;
  await c.end();
  const cotCua = (b) => cot.filter((x) => x.t === b);

  // Lop phan tich: boundary/control chi co thao tac; entity co thuoc tinh (toi da 9 cot) + thao tac.
  for (const { ma, p, op, loai, tenDt } of chucNangLop) {
    let s = 'hide circle\nskinparam classAttributeIconSize 0\n';
    for (const [k, l, t] of p) {
      if (l === 'actor') continue;
      s += `class "${t}" as ${k} <<${l}>> {\n`;
      if (l === 'entity') {
        const cs = cotCua(t);
        for (const x of cs.slice(0, 9)) s += `  -${x.c}\n`;
        if (cs.length > 9) s += '  -...\n';
      }
      s += '  --\n';
      for (const o of op[k]) s += `  +${o}\n`;
      s += '}\n';
    }
    const ui = p.filter(([, l]) => l === 'boundary').map(([k]) => k);
    const ctrl = p.find(([, l]) => l === 'control')[0];
    for (const b of ui) s += `${b} "1" -- "1" ${ctrl}\n`;
    const ents = p.filter(([, l]) => l === 'entity');
    for (const [k] of ents) s += `${ctrl} "1" -- "*" ${k}\n`;
    const tenSangMa = Object.fromEntries(ents.map(([k, , t]) => [t, k]));
    const da = new Set();
    for (const r of fk) {
      if (tenSangMa[r.bang] && tenSangMa[r.den] && r.bang !== r.den && !da.has(r.bang + r.den)) {
        da.add(r.bang + r.den); s += `${tenSangMa[r.den]} "1" -- "*" ${tenSangMa[r.bang]}\n`;
      }
    }
    ghi(`cls_${ma}`, s);
  }

  // ERD theo phan he: day du cot (giong so do cua cong cu quan tri CSDL); bang ngoai phan he chi ve ten.
  const PH = {
    erd_1_khach_hang: ['users', 'thong_bao', 'ty_le_chia_so', 'chia_so_log', 'khach_hang', 'khach_hang_cham_soc', 'khach_hang_san_pham', 'ai_nhan_xet_cham_soc'],
    erd_2_don_hang_thi_cong: ['don_hang', 'don_hang_vat_tu', 'don_hang_giai_doan_log', 'don_hang_phan_cong_log', 'don_hang_yeu_cau_sua', 'don_hang_hinh_anh', 'thi_cong', 'doi_tho', 'phat_sinh_thi_cong', 'giao_dich_tho'],
    erd_3_vat_tu_mua_hang: ['loai_vat_tu', 'vat_tu', 'nha_cung_cap', 'ncc_stk', 'ncc_bang_gia', 'mua_hang_dong', 'dat_hang_ncc', 'mua_bo_sung', 'mua_bo_sung_dong', 'mua_bo_sung_trach_nhiem'],
    erd_4_tien_quan_tri: ['de_xuat_chi', 'de_xuat_chi_dong', 'de_xuat_chi_duyet_log', 'phieu_thanh_toan', 'thanh_toan_khach', 'giao_dich_ngan_hang', 'quyen', 'vai_tro_quyen', 'xac_thuc_vai_tro', 'cau_hinh', 'nhat_ky_thay_doi'],
    erd_5_tro_ly_ai: ['tro_ly_san_pham', 'tro_ly_hoi_thoai', 'tro_ly_tin_nhan'],
  };
  for (const [ten, ds] of Object.entries(PH)) {
    const tap = new Set(ds);
    let s = 'hide circle\nhide empty members\nskinparam linetype ortho\nskinparam ClassBackgroundColor #FFFFFF\nskinparam ClassHeaderBackgroundColor #1F5FAF\nskinparam ClassFontColor #FFFFFF\n';
    const ngoai = new Set();
    for (const b of ds) {
      s += `entity ${b} {\n`;
      for (const x of cotCua(b)) s += `  ${pk.has(b + '.' + x.c) ? '* ' : ''}${x.c} : ${x.d.replace('timestamp with time zone', 'timestamptz').replace('character varying', 'varchar').replace('USER-DEFINED', 'enum')}${pk.has(b + '.' + x.c) ? ' <<PK>>' : (fk.some((f) => f.bang === b && f.cot === x.c) ? ' <<FK>>' : '')}\n`;
      s += '}\n';
    }
    const da = new Set(); let qh = '';
    for (const r of fk) {
      if (!tap.has(r.bang) || da.has(r.bang + r.den)) continue;
      da.add(r.bang + r.den);
      if (!tap.has(r.den)) ngoai.add(r.den);
      qh += `${r.den} ||--o{ ${r.bang}\n`;
    }
    for (const b of ngoai) s += `entity ${b} #EEEEEE;text:black\n`; // bang ngoai phan he: nen xam, chu den cho de doc
    ghi(ten, s + qh);
  }
  console.log('Da sinh', CN.length, 'chuc nang + 5 ERD phan he');
})();
