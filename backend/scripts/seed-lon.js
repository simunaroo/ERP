// Sinh du lieu GIA LAP quy mo lon, chay sau schema.sql + seed.sql (xem db-reset.js --lon).
// Moi ten nguoi, cong ty, so dien thoai, so tai khoan deu la ngau nhien, khong lay tu nguon that.
import pg from 'pg';
import bcrypt from 'bcryptjs';

// Tai khoan demo: ten dem + ten, bo dau (Kinh Doanh C -> doanhc); mat khau = tai khoan + 123456.
const nguoiDung = (hoTen, username, vaiTro) => [hoTen, username, bcrypt.hashSync(`${username}123456`, 10), vaiTro];
const SO_DON = 1500;
const NGAY_BAT_DAU = new Date('2025-10-01T08:00:00+07:00');
const HOM_NAY = new Date('2026-10-05T08:00:00+07:00');
const NGAY_MS = 86400000;

// RNG co dinh hat giong -> moi lan chay sinh dung cung mot bo du lieu.
let seed = 20261005;
const rand = () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const int = (a, b) => a + Math.floor(rand() * (b - a + 1));
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const chance = (p) => rand() < p;
const sample = (arr, n) => [...arr].sort(() => rand() - 0.5).slice(0, n);
const addDays = (d, n) => new Date(d.getTime() + n * NGAY_MS);
const isoDate = (d) => d.toISOString().slice(0, 10);

const HO = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý'];
const DEM = ['Văn', 'Thị', 'Minh', 'Quốc', 'Thanh', 'Hữu', 'Ngọc', 'Đức', 'Thu', 'Gia', 'Hoài', 'Anh', 'Bảo', 'Kim'];
const TEN = ['An', 'Bình', 'Cường', 'Dũng', 'Hà', 'Hải', 'Hiếu', 'Hoa', 'Hùng', 'Huy', 'Khánh', 'Lan', 'Linh', 'Long', 'Mai', 'Nam', 'Nga', 'Phong', 'Phúc', 'Quân', 'Sơn', 'Tâm', 'Thảo', 'Trang', 'Tuấn', 'Vy', 'Yến', 'Đạt', 'Khoa', 'Nhung'];
const hoTen = () => `${pick(HO)} ${pick(DEM)} ${pick(TEN)}`;
const sdt = () => '09' + String(int(0, 99999999)).padStart(8, '0');

const KHU_VUC = [
  ['Quận 7', 'TP.HCM'], ['Quận 2', 'TP.HCM'], ['Bình Thạnh', 'TP.HCM'], ['Gò Vấp', 'TP.HCM'], ['Tân Bình', 'TP.HCM'],
  ['TP. Thủ Đức', 'TP.HCM'], ['Biên Hoà', 'Đồng Nai'], ['Thuận An', 'Bình Dương'],
  ['Cầu Giấy', 'Hà Nội'], ['Hà Đông', 'Hà Nội'], ['Long Biên', 'Hà Nội'], ['Nam Từ Liêm', 'Hà Nội'], ['Tây Hồ', 'Hà Nội'], ['Hoàng Mai', 'Hà Nội'],
];
const DUONG = ['Nguyễn Văn Linh', 'Lê Văn Lương', 'Trần Duy Hưng', 'Phạm Văn Đồng', 'Nguyễn Hữu Thọ', 'Võ Văn Kiệt', 'Hoàng Quốc Việt', 'Xuân Thuỷ', 'Lạc Long Quân', 'Điện Biên Phủ'];
const diaChi = () => {
  const [q, tp] = pick(KHU_VUC);
  return chance(0.5)
    ? `Căn hộ ${pick(['A', 'B', 'C', 'S'])}${int(1, 9)}-${int(2, 35)}${String(int(1, 20)).padStart(2, '0')}, ${q}, ${tp}`
    : `Số ${int(1, 300)} ${pick(DUONG)}, ${q}, ${tp}`;
};

async function insertMany(client, table, cols, rows) {
  const ids = [];
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const params = [];
    const values = chunk.map((r) => '(' + r.map((v) => { params.push(v); return '$' + params.length; }).join(',') + ')');
    const { rows: out } = await client.query(
      `INSERT INTO ${table} (${cols.join(',')}) VALUES ${values.join(',')} RETURNING id`, params);
    ids.push(...out.map((o) => o.id));
  }
  return ids;
}

export async function seedLon(conn) {
  const db = new pg.Client(conn);
  await db.connect();
  await db.query('BEGIN');

  // ---- Nguoi dung ----
  const nguoiDungMoi = [];
  // Ten nhan vien theo bo phan + chu cai (Kinh Doanh C) de demo khong dung ten nguoi that.
  const chu = (i) => String.fromCharCode(64 + i);
  for (let i = 3; i <= 8; i++) nguoiDungMoi.push(nguoiDung(`Kinh Doanh ${chu(i)}`, `doanh${chu(i).toLowerCase()}`, 'sale'));
  for (let i = 2; i <= 3; i++) nguoiDungMoi.push(nguoiDung(`Vận Hành ${chu(i)}`, `hanh${chu(i).toLowerCase()}`, 'van_hanh'));
  nguoiDungMoi.push(nguoiDung('Kế Toán B', 'toanb', 'ke_toan'));
  await insertMany(db, 'users', ['ho_ten', 'username', 'password_hash', 'vai_tro'], nguoiDungMoi);
  const users = (await db.query('SELECT id, vai_tro FROM users')).rows;
  const sales = users.filter((u) => u.vai_tro === 'sale').map((u) => u.id);
  const vanHanh = users.filter((u) => u.vai_tro === 'van_hanh').map((u) => u.id);
  const keToan = users.filter((u) => u.vai_tro === 'ke_toan').map((u) => u.id);

  // ---- Khach hang ----
  const nhomKhach = () => pick(['nha_dan', 'nha_dan', 'nha_dan', 'nha_dan', 'nha_dan', 'nha_thau', 'doi_tac', 'khac']);
  const khRows = Array.from({ length: 420 }, () => [hoTen(), sdt(), diaChi(), pick(sales), nhomKhach()]);
  await insertMany(db, 'khach_hang', ['ten', 'sdt', 'dia_chi', 'sale_phu_trach_id', 'nhom_khach_hang'], khRows);
  const khachHang = (await db.query('SELECT id, dia_chi, sale_phu_trach_id FROM khach_hang')).rows;

  // ---- Vat tu ----
  const VT_MOI = [
    ['Cửa nhôm Xingfa 1 cánh', 1, 'bộ', '900x2200'], ['Cửa nhôm Xingfa 4 cánh', 1, 'bộ', '2400x2200'],
    ['Cửa sổ nhôm Xingfa mở quay', 1, 'bộ', '1200x1400'], ['Cửa gỗ chống cháy', 1, 'bộ', '1000x2200'],
    ['Cửa nhựa lõi thép', 1, 'bộ', '800x2100'],
    ['Sàn SPC vân gỗ 6mm', 2, 'm2', '1220x180'], ['Sàn gỗ công nghiệp 8mm', 2, 'm2', '1200x190'],
    ['Sàn gỗ công nghiệp 12mm', 2, 'm2', '1200x190'], ['Sàn nhựa dán keo 2mm', 2, 'm2', '914x152'],
    ['Len chân tường PVC', 2, 'md', '80mm'],
    ['Tấm ốp lam sóng', 3, 'm2', '160x3000'], ['Tấm ốp than tre', 3, 'm2', '1220x2440'],
    ['Tấm ốp nano 9mm vân gỗ', 3, 'm2', '400x3000'], ['Tấm ốp PVC giả gạch', 3, 'm2', '1220x2440'],
  ];
  await insertMany(db, 'vat_tu', ['ten', 'loai_vat_tu_id', 'don_vi_tinh', 'quy_cach'], VT_MOI);
  const vatTu = (await db.query(
    `SELECT vt.id, vt.ten, vt.don_vi_tinh, lvt.ten AS loai, lvt.nguon_goc FROM vat_tu vt JOIN loai_vat_tu lvt ON lvt.id = vt.loai_vat_tu_id`)).rows;
  const vtMuaNgoai = vatTu.filter((v) => v.nguon_goc === 'mua_ngoai');
  const giaGoc = Object.fromEntries(vtMuaNgoai.map((v) => [v.id, int(9, 32) * 10000]));

  // ---- Nha cung cap + STK + bang gia theo ky ----
  const TEN_NCC = ['Sàn Đẹp Phương Nam', 'Vật liệu Hoàn Thiện Bắc Việt', 'Tấm ốp An Khang', 'SPC Floor Toàn Cầu', 'Gỗ Nội Thất Thành Đạt',
    'Nano Panel Việt', 'Vật tư Xây dựng Hưng Thịnh', 'Ốp lát Đại Phát', 'Sàn nhựa Minh Long', 'Decor Tường Xinh', 'Vật liệu Phú Gia', 'Sàn gỗ Kim Cương'];
  await insertMany(db, 'nha_cung_cap', ['ten', 'dia_chi', 'ma_so_thue'],
    TEN_NCC.map((t) => [`${t} (giả lập)`, diaChi(), String(int(100000000, 999999999)) + '0']));
  const nccIds = (await db.query('SELECT id FROM nha_cung_cap')).rows.map((r) => r.id);
  const daCoStk = new Set((await db.query('SELECT ncc_id FROM ncc_stk')).rows.map((r) => r.ncc_id));
  await insertMany(db, 'ncc_stk', ['ncc_id', 'so_tk', 'ten_ngan_hang', 'chu_tk'],
    nccIds.filter((id) => !daCoStk.has(id)).map((id) => [id, String(int(1e9, 9e9)), pick(['Vietcombank', 'Techcombank', 'BIDV', 'VPBank', 'MB Bank', 'ACB']), `NCC GIA LAP ${id}`]));

  // Moi NCC cung cap 3-6 vat tu mua ngoai, gia doi 2 lan trong nam (ky 1 -> ky 2 -> ky 3).
  const KY = [['2025-10-01', '2026-02-28'], ['2026-03-01', '2026-07-31'], ['2026-08-01', null]];
  const bangGia = []; // {ncc, vt, gia, tu, den}
  const nccMoi = nccIds.filter((id) => id > 3);
  for (const ncc of nccMoi) {
    for (const vt of sample(vtMuaNgoai, int(3, 6))) {
      let gia = Math.round(giaGoc[vt.id] * (0.9 + rand() * 0.2) / 1000) * 1000;
      for (const [tu, den] of KY) {
        bangGia.push({ ncc, vt: vt.id, gia, tu, den });
        gia = Math.round(gia * (1.02 + rand() * 0.06) / 1000) * 1000;
      }
    }
  }
  await insertMany(db, 'ncc_bang_gia', ['ncc_id', 'vat_tu_id', 'don_gia', 'ngay_hieu_luc', 'ngay_het_hieu_luc'],
    bangGia.map((g) => [g.ncc, g.vt, g.gia, g.tu, g.den]));
  const giaTai = (vtId, ngay) => {
    const d = isoDate(ngay);
    return bangGia.filter((g) => g.vt === vtId && g.tu <= d && (!g.den || g.den >= d));
  };

  // ---- Doi tho ----
  const NANG_LUC = ['Sàn SPC, sàn gỗ', 'Tấm ốp, trần', 'Cửa nhôm, cửa gỗ', 'Sàn + tấm ốp', 'Cửa + tấm ốp'];
  await insertMany(db, 'doi_tho', ['ten', 'sdt', 'nang_luc', 'so_tk', 'ten_ngan_hang', 'chu_tk'],
    Array.from({ length: 9 }, (_, i) => [`Đội anh ${pick(TEN)} ${pick(['A', 'B', 'C', ''])}`.trim(), sdt(), pick(NANG_LUC),
      String(int(1e9, 9e9)), pick(['Vietcombank', 'Techcombank', 'BIDV', 'MB Bank', 'ACB']), `DOI THO GIA LAP ${i + 4}`]));
  const doiTho = (await db.query('SELECT id FROM doi_tho')).rows.map((r) => r.id);

  // ---- Don hang ----
  const tongNgay = (HOM_NAY - NGAY_BAT_DAU) / NGAY_MS;
  const donSpec = Array.from({ length: SO_DON }, () => {
    const ngay = addDays(NGAY_BAT_DAU, Math.pow(rand(), 0.8) * tongNgay); // nhieu don hon ve cuoi ky (tang truong)
    ngay.setHours(int(8, 18), int(0, 59));
    return { ngay, kh: pick(khachHang) };
  }).sort((a, b) => a.ngay - b.ngay);

  const demThang = {};
  const donRows = donSpec.map((d) => {
    const tuoi = (HOM_NAY - d.ngay) / NGAY_MS;
    d.trangThai = tuoi > 45 ? (chance(0.95) ? 'hoan_tat' : 'dang_xu_ly')
      : tuoi > 12 ? (chance(0.35) ? 'hoan_tat' : 'dang_xu_ly')
        : (chance(0.55) ? 'moi' : 'dang_xu_ly');
    if (d.trangThai !== 'moi' && tuoi > 7 && chance(0.03)) d.trangThai = 'huy'; // ~3% don huy giua chung
    const thang = isoDate(d.ngay).slice(2, 7).replace('-', '');
    demThang[thang] = (demThang[thang] || 100) + 1;
    d.maDon = `DH-${thang}-${String(demThang[thang]).padStart(3, '0')}`;
    d.vanHanh = pick(vanHanh); // moi don da chot deu co Van hanh phu trach (phan luc chot)
    d.hinhThuc = chance(0.35) ? 'vat_tu' : 'hoan_thien'; // gan ti le that: 384 hoan thien / 221 vat tu
    const diaChiCt = chance(0.85) ? d.kh.dia_chi : diaChi();
    const tinh = /TP\.HCM|Thủ Đức|Bình Dương/.test(diaChiCt) ? 'TP. Hồ Chí Minh' : diaChiCt.split(', ').pop();
    return [
      // giai_doan tam (CHECK bat buoc co khi da chot); tinh lai chinh xac sau khi co mua hang + thi cong.
      d.maDon, d.kh.id, d.kh.sale_phu_trach_id, d.vanHanh, d.trangThai,
      { moi: 'len_phuong_an', hoan_tat: 'hoan_tat', huy: 'huy' }[d.trangThai] || 'giao_hang', d.hinhThuc,
      chance(0.6) ? `HĐ-${int(1000, 9999)}` : null, isoDate(d.ngay), isoDate(addDays(d.ngay, int(5, 15))),
      tinh, diaChiCt,
      d.hinhThuc === 'vat_tu' ? pick([0, 300000, 500000, 800000]) : pick([0, 0, 500000]),
      chance(0.2) ? pick([200000, 500000, 1000000]) : 0,
      chance(0.25) ? pick([3, 5, 7, 10]) : 0,
      chance(0.7) ? pick([2000000, 3000000, 5000000, 10000000]) : 0,
      pick([80, 80, 80, 100, 70, 50]),
      d.hinhThuc === 'vat_tu' ? 'vat_tu_tieu_hao' : pick(['so_m2_thi_cong', 'so_m2_thi_cong', 'vat_tu_tieu_hao', 'theo_hop_dong']),
      d.vanHanh ? pick(['NCC giao thẳng đến công trình, cửa xuất từ xưởng.', 'NCC giao thẳng, nhận hàng tại hầm.', 'Giao 2 đợt theo tiến độ thi công.']) : null,
      d.vanHanh && d.hinhThuc === 'hoan_thien' ? pick(['Thi công trong 1 ngày.', 'Lát sàn ngày 1, ốp tường ngày 2.', 'Thi công 2 ngày, làm ngoài giờ hành chính.', 'Lắp cửa trước, hoàn thiện sau.']) : null,
      d.ngay,
    ];
  });
  const donIds = await insertMany(db, 'don_hang',
    ['ma_don', 'khach_hang_id', 'sale_id', 'vanhanh_phu_trach_id', 'trang_thai', 'giai_doan', 'hinh_thuc', 'ma_hop_dong', 'ngay_chot', 'ngay_yc_lap_dat',
      'tinh_thanh', 'dia_chi_cong_trinh', 'phi_van_chuyen', 'phu_thu', 'chiet_khau_pct', 'tien_coc', 'ty_le_tam_ung', 'dieu_khoan_nghiem_thu',
      'phuong_an_van_chuyen', 'phuong_an_thi_cong', 'created_at'], donRows);
  donSpec.forEach((d, i) => { d.id = donIds[i]; });

  // ---- Vat tu cua don (hang mua ngoai chi lay mat hang co NCC bao gia tai ngay chot) ----
  const coGia = (v, ngay) => v.nguon_goc === 'tu_san_xuat' || giaTai(v.id, ngay).length > 0;
  const dvtRows = [];
  for (const d of donSpec) {
    d.items = sample(vatTu.filter((v) => coGia(v, d.ngay)), int(1, 4))
      .map((v) => ({ vt: v, sl: v.nguon_goc === 'tu_san_xuat' ? int(1, 6) : int(8, 90) }));
    for (const it of d.items) {
      // Gia ban: hang mua ngoai = gia NCC goc x 1,3-1,5; cua tu san xuat 3,5-7 trieu/bo.
      it.giaBan = it.vt.nguon_goc === 'mua_ngoai'
        ? Math.round(giaGoc[it.vt.id] * (1.3 + rand() * 0.2) / 1000) * 1000
        : int(35, 70) * 100000;
      dvtRows.push([d.id, it.vt.id, it.sl, it.giaBan]);
    }
  }
  const dvtIds = await insertMany(db, 'don_hang_vat_tu', ['don_hang_id', 'vat_tu_id', 'so_luong_can', 'don_gia'], dvtRows);
  let k = 0;
  for (const d of donSpec) for (const it of d.items) it.dvtId = dvtIds[k++];

  // ---- Yeu cau sua (khoang 8% don) ----
  const NOI_DUNG_SUA = ['Khách đổi màu tấm ốp phòng ngủ.', 'Tăng diện tích sàn thêm 5 m2.', 'Đổi lịch thi công sang cuối tuần.', 'Khách muốn đổi cửa sang loại 4 cánh.', 'Bổ sung len chân tường cho phòng khách.'];
  const ycRows = donSpec.filter(() => chance(0.08)).map((d) => [d.id, d.kh.sale_phu_trach_id, pick(NOI_DUNG_SUA),
    d.trangThai === 'moi' ? 'cho_xu_ly' : (chance(0.8) ? 'da_xu_ly' : 'cho_xu_ly'), addDays(d.ngay, int(1, 5))]);
  await insertMany(db, 'don_hang_yeu_cau_sua', ['don_hang_id', 'sale_id', 'noi_dung', 'trang_thai', 'created_at'], ycRows);

  // ---- Giai doan hien tai cua don (theo tuoi don) + lich su chuyen buoc ----
  const BUOC = {
    hoan_thien: ['len_phuong_an', 'boc_khoi_luong', 'mua_hang', 'giao_hang', 'thi_cong', 'nghiem_thu', 'quyet_toan'],
    vat_tu: ['len_phuong_an', 'mua_hang', 'giao_hang', 'quyet_toan'],
  };
  const LY_DO_HUY = ['Khách đổi ý, hoàn cọc theo thoả thuận.', 'Khách chọn đơn vị khác.', 'Công trình tạm dừng vô thời hạn.'];
  // Buoc sau: cong them vai ngay nhung khong vuot qua 'hom nay', va luon sau buoc truoc it nhat 1 phut.
  const sau = (t, ngay) => new Date(Math.max(t.getTime() + 60000, Math.min(addDays(t, ngay).getTime(), HOM_NAY.getTime())));
  const gdLog = [];
  for (const d of donSpec) {
    const buoc = BUOC[d.hinhThuc];
    const tuoi = (HOM_NAY - d.ngay) / NGAY_MS;
    if (d.trangThai === 'moi') d.giaiDoan = 'len_phuong_an';
    else if (d.trangThai === 'hoan_tat' || d.trangThai === 'huy') d.giaiDoan = d.trangThai;
    else d.giaiDoan = buoc[Math.max(1, Math.min(buoc.length - 1, Math.floor(tuoi / (d.hinhThuc === 'vat_tu' ? 8 : 5)) + int(0, 1)))];
    d.idx = d.giaiDoan === 'hoan_tat' ? buoc.length : d.giaiDoan === 'huy' ? int(0, buoc.indexOf('mua_hang')) : buoc.indexOf(d.giaiDoan);
    d.tBuoc = {};
    const nguoiVh = d.vanHanh || pick(vanHanh);
    let t = d.ngay;
    d.tBuoc.len_phuong_an = t;
    gdLog.push([d.id, null, 'len_phuong_an', d.kh.sale_phu_trach_id, 'Chốt đơn', t]);
    const den = d.giaiDoan === 'hoan_tat' ? buoc.length - 1 : d.idx;
    for (let i = 1; i <= den; i++) {
      t = sau(t, 0.2 + rand() * 3);
      d.tBuoc[buoc[i]] = t;
      gdLog.push([d.id, buoc[i - 1], buoc[i], nguoiVh, buoc[i] === 'giao_hang' ? 'Đã sẵn đủ hàng, đăng ký giao hàng' : null, t]);
    }
    if (d.giaiDoan === 'hoan_tat') { d.tBuoc.hoan_tat = sau(t, 0.5 + rand() * 4); gdLog.push([d.id, 'quyet_toan', 'hoan_tat', pick(keToan), 'Đã chốt quyết toán.', d.tBuoc.hoan_tat]); }
    if (d.giaiDoan === 'huy') gdLog.push([d.id, buoc[d.idx], 'huy', nguoiVh, pick(LY_DO_HUY), sau(t, 0.2 + rand() * 3)]);
  }
  await db.query(
    `UPDATE don_hang dh SET giai_doan = v.gd::giai_doan_don_enum FROM unnest($1::int[], $2::text[]) AS v(id, gd) WHERE dh.id = v.id`,
    [donSpec.map((d) => d.id), donSpec.map((d) => d.giaiDoan)],
  );
  await insertMany(db, 'don_hang_giai_doan_log', ['don_hang_id', 'tu_giai_doan', 'den_giai_doan', 'nguoi_id', 'ghi_chu', 'created_at'], gdLog);
  // Vi tri so voi buoc Mua hang / Giao hang (don huy: coi nhu chua qua mua hang).
  const viTri = (d, ten) => (d.giaiDoan === 'huy' ? -1 : d.idx - BUOC[d.hinhThuc].indexOf(ten));

  // ---- Mua hang theo dong: NCC re nhat (75%) tai ngay mua, chot gia, trang thai theo buoc cua don ----
  const mhdRows = [];
  const mhd = []; // {d, it, ncc, gia, vat, trangThai}
  for (const d of donSpec) {
    const vsMua = viTri(d, 'mua_hang');
    const ngayMua = addDays(d.ngay, int(1, 4));
    const dongMua = d.items.filter((x) => x.vt.nguon_goc === 'mua_ngoai');
    dongMua.forEach((it, i) => {
      const gia = giaTai(it.vt.id, ngayMua).sort((a, b) => a.gia - b.gia);
      const chon = gia.length ? (chance(0.75) ? gia[0] : pick(gia)) : null;
      let tt;
      if (d.giaiDoan === 'huy') tt = 'huy';
      else if (vsMua < 0) tt = chance(0.3) && chon ? 'dang_hoi' : 'cho_xu_ly';
      else if (vsMua === 0) tt = i === 0 ? pick(['dang_hoi', 'da_dat_hang', 'da_dat_hang']) : pick(['dang_hoi', 'da_dat_hang', 'san_hang', 'san_hang']);
      else if (viTri(d, 'giao_hang') === 0) tt = chance(0.4) ? 'da_lay_hang' : 'san_hang';
      else tt = 'da_giao_hang';
      if (!chon && !['cho_xu_ly', 'huy'].includes(tt)) tt = 'cho_xu_ly';
      const coNcc = chon && tt !== 'cho_xu_ly';
      const x = { d, it, ncc: coNcc ? chon.ncc : null, gia: coNcc ? chon.gia : null, vat: pick([0, 8, 8, 10]), trangThai: tt, ngay: ngayMua };
      mhd.push(x);
      mhdRows.push([it.dvtId, x.ncc, x.gia, x.vat, tt, d.vanHanh, ngayMua]);
    });
  }
  const mhdIds = await insertMany(db, 'mua_hang_dong', ['don_hang_vat_tu_id', 'ncc_id', 'gia_chot', 'vat_pct', 'trang_thai', 'nguoi_cap_nhat_id', 'cap_nhat_luc'], mhdRows);
  mhd.forEach((x, i) => { x.id = mhdIds[i]; });
  const SAU_SAN_HANG = ['san_hang', 'da_lay_hang', 'da_giao_hang'];

  // ---- Mua bo sung (~6% don da qua thi cong): ghi ro nguon trach nhiem ----
  const LOAI_MBS = {
    hang_hong: ['van_chuyen', 'Hàng bị xước, vỡ góc khi vận chuyển.'], giao_thieu_sai: ['ncc', 'NCC giao thiếu so với phiếu đặt.'],
    boc_khoi_luong_thieu: ['khao_sat', 'Bóc khối lượng thiếu diện tích ban công.'], tho_lam_hong: ['tho', 'Thợ cắt hỏng 2 tấm khi thi công.'],
    khach_bo_sung: ['khach_hang', 'Khách bổ sung thêm phòng làm việc.'], mat_hang: ['van_chuyen', 'Thất lạc 1 kiện hàng khi bốc xếp.'],
  };
  const mbs = [];
  for (const d of donSpec.filter((x) => x.hinhThuc === 'hoan_thien' && viTri(x, 'thi_cong') >= 0 && chance(0.06))) {
    const it = d.items.find((x) => x.vt.nguon_goc === 'mua_ngoai');
    if (!it) continue;
    const loai = pick(Object.keys(LOAI_MBS));
    const ngay = addDays(d.tBuoc.thi_cong || d.ngay, int(0, 2));
    const gia = giaTai(it.vt.id, ngay).sort((a, b) => a.gia - b.gia)[0];
    const daMua = gia && (d.giaiDoan === 'hoan_tat' || chance(0.5));
    mbs.push({ d, it, loai, ngay, daMua, ncc: daMua ? gia.ncc : null, gia: daMua ? gia.gia : null, sl: int(1, 5) });
  }
  const mbsIds = await insertMany(db, 'mua_bo_sung', ['don_hang_id', 'loai_phat_sinh', 'ly_do', 'trang_thai', 'ncc_id', 'ngay_mua', 'nguoi_tao_id', 'created_at'],
    mbs.map((m) => [m.d.id, m.loai, LOAI_MBS[m.loai][1], m.daMua ? 'da_mua' : 'cho_xu_ly', m.ncc, m.daMua ? isoDate(m.ngay) : null, m.d.vanHanh || pick(vanHanh), m.ngay]));
  mbs.forEach((m, i) => { m.id = mbsIds[i]; m.tong = m.daMua ? m.sl * m.gia : 0; });
  await insertMany(db, 'mua_bo_sung_dong', ['mua_bo_sung_id', 'vat_tu_id', 'so_luong', 'don_gia'], mbs.map((m) => [m.id, m.it.vt.id, m.sl, m.gia]));
  await insertMany(db, 'mua_bo_sung_trach_nhiem', ['mua_bo_sung_id', 'nguon', 'so_tien'], mbs.map((m) => [m.id, LOAI_MBS[m.loai][0], m.tong]));

  // ---- Thi cong theo giai doan: moi nhom vat tu (san / tam op / cua) = 1 giai doan, 1 doi tho ----
  const GIAI_DOAN_TC = {
    'Sàn': { ten: 'Lát sàn', dv: 'm²', gia: () => int(50, 70) * 1000 },
    'Tấm ốp': { ten: 'Ốp tường, trần', dv: 'm²', gia: () => int(70, 95) * 1000 },
    'Cửa': { ten: 'Lắp cửa', dv: 'bộ', gia: () => int(25, 45) * 10000 },
  };
  const tc = []; // {d, ten, dv, gia, klDuKien, klThucTe, trangThai, ngayDuKien, batDau, xong, tho}
  for (const d of donSpec.filter((x) => x.hinhThuc === 'hoan_thien' && viTri(x, 'giao_hang') >= 0)) {
    const vsTc = viTri(d, 'thi_cong');
    for (const [loai, g] of Object.entries(GIAI_DOAN_TC)) {
      const ds = d.items.filter((x) => x.vt.loai === loai && x.vt.don_vi_tinh !== 'md');
      if (!ds.length) continue;
      const klDuKien = ds.reduce((s, x) => s + x.sl, 0);
      const ngayDuKien = addDays(d.tBuoc.giao_hang || d.ngay, int(1, 4));
      const dongTc = { d, ten: g.ten, dv: g.dv, gia: g.gia(), klDuKien, tho: pick(doiTho), ngayDuKien };
      if (vsTc < 0) dongTc.trangThai = 'lap_lich';
      else if (vsTc === 0) { dongTc.trangThai = 'dang_thi_cong'; dongTc.batDau = d.tBuoc.thi_cong; if (chance(0.4)) dongTc.xong = d.tBuoc.thi_cong; }
      else if (d.giaiDoan === 'nghiem_thu') { dongTc.trangThai = 'dang_thi_cong'; dongTc.batDau = d.tBuoc.thi_cong; dongTc.xong = d.tBuoc.nghiem_thu; }
      else {
        dongTc.trangThai = 'da_nghiem_thu'; dongTc.batDau = d.tBuoc.thi_cong; dongTc.xong = d.tBuoc.nghiem_thu;
        dongTc.klThucTe = g.dv === 'bộ' ? klDuKien : Math.round(klDuKien * (0.93 + rand() * 0.07) * 10) / 10;
      }
      tc.push(dongTc);
    }
  }
  const tcIds = await insertMany(db, 'thi_cong',
    ['don_hang_id', 'doi_tho_id', 'nguoi_phu_trach_id', 'ten_giai_doan', 'don_vi_cong', 'gia_cong', 'kl_du_kien', 'kl_thuc_te',
      'ngay_du_kien', 'ngay_thuc_hien', 'ngay_hoan_thanh', 'trang_thai'],
    tc.map((x) => [x.d.id, x.tho, x.d.vanHanh || pick(vanHanh), x.ten, x.dv, x.gia, x.klDuKien, x.klThucTe ?? null,
      isoDate(x.ngayDuKien), x.batDau ? isoDate(x.batDau) : null, x.xong ? isoDate(x.xong) : null, x.trangThai]));
  tc.forEach((x, i) => { x.id = tcIds[i]; });

  // ---- Nghiem thu: SL thuc te tung dong vat tu (hao hut nho) cho don da qua buoc Nghiem thu ----
  const thucTe = [];
  for (const d of donSpec.filter((x) => ['quyet_toan', 'hoan_tat'].includes(x.giaiDoan))) {
    for (const it of d.items) {
      const tt = d.hinhThuc === 'hoan_thien' && it.vt.don_vi_tinh === 'm2' ? Math.round(it.sl * (0.94 + rand() * 0.06) * 10) / 10 : it.sl;
      thucTe.push([it.dvtId, tt]);
    }
  }
  await db.query(`UPDATE don_hang_vat_tu x SET so_luong_thuc_te = v.tt FROM unnest($1::int[], $2::numeric[]) AS v(id, tt) WHERE x.id = v.id`,
    [thucTe.map((r) => r[0]), thucTe.map((r) => r[1])]);

  // ---- Phat sinh thi cong (~10% don dang/da thi cong) ----
  const LY_DO_PS = {
    phat_sinh: 'Khách yêu cầu làm thêm nẹp góc.', phu_thu: 'Phụ thu thi công ngoài giờ.',
    giam_tru: 'Giảm trừ do sàn có vết xước nhỏ.', thu_ho: 'Thợ thu hộ tiền khách còn thiếu.',
  };
  const ps = [];
  for (const d of donSpec.filter((x) => x.hinhThuc === 'hoan_thien' && viTri(x, 'thi_cong') >= 0 && chance(0.1))) {
    const g = tc.find((x) => x.d === d);
    const loai = g ? pick(Object.keys(LY_DO_PS)) : pick(['phat_sinh', 'phu_thu', 'giam_tru']);
    ps.push({ d, g, loai, tien: int(4, 40) * 50000, t: d.tBuoc.thi_cong || d.ngay });
  }
  const psIds = await insertMany(db, 'phat_sinh_thi_cong', ['don_hang_id', 'thi_cong_id', 'loai', 'so_tien', 'ly_do', 'nguoi_tao_id', 'created_at'],
    ps.map((p) => [p.d.id, p.loai === 'thu_ho' ? p.g.id : (p.g?.id ?? null), p.loai, p.tien, LY_DO_PS[p.loai], p.d.vanHanh || pick(vanHanh), p.t]));
  ps.forEach((p, i) => { p.id = psIds[i]; });

  // ---- Chot quyet toan cac don hoan tat (gia tri lay tu VIEW: SL thuc te + phat sinh) ----
  const dongQt = donSpec.filter((d) => d.giaiDoan === 'hoan_tat');
  await db.query(
    `UPDATE don_hang dh SET gia_tri_quyet_toan = t.tong_don, quyet_toan_luc = v.qt, nguoi_quyet_toan_id = $4,
            nghiem_thu_luc = v.nt, nguoi_nghiem_thu_id = dh.vanhanh_phu_trach_id
       FROM unnest($1::int[], $2::timestamptz[], $3::timestamptz[]) AS v(id, qt, nt), v_don_hang_tien t
      WHERE dh.id = v.id AND t.don_hang_id = dh.id`,
    [dongQt.map((d) => d.id), dongQt.map((d) => d.tBuoc.hoan_tat), dongQt.map((d) => d.tBuoc.quyet_toan), keToan[0]],
  );
  const choQt = donSpec.filter((d) => d.giaiDoan === 'quyet_toan');
  await db.query(
    `UPDATE don_hang dh SET nghiem_thu_luc = v.nt, nguoi_nghiem_thu_id = dh.vanhanh_phu_trach_id
       FROM unnest($1::int[], $2::timestamptz[]) AS v(id, nt) WHERE dh.id = v.id`,
    [choQt.map((d) => d.id), choQt.map((d) => d.tBuoc.quyet_toan)],
  );

  // ---- De xuat chi NCC: 1 don x 1 NCC; Coc (khi da dat hang) + Quyet toan (khi du hang) + Chi bo sung ----
  const LY_DO_TU_CHOI = ['Sai đơn giá so với báo giá NCC, kiểm tra lại.', 'Thiếu hoá đơn NCC.', 'Số lượng chưa khớp phiếu giao.'];
  const dxc = []; // {loai, ncc, tho, d, mbs, giaTriHang, cocTru, soTien, trangThai, t, dong:[mhd], lyDo}
  const trangThaiTheoTuoi = (t) => {
    const tuoi = (HOM_NAY - t) / NGAY_MS;
    if (chance(0.02)) return 'tu_choi';
    return tuoi > 12 ? 'da_thanh_toan' : tuoi > 4 ? pick(['da_duyet', 'da_thanh_toan']) : pick(['cho_duyet', 'cho_duyet', 'da_duyet']);
  };
  const nhomNcc = new Map();
  for (const x of mhd.filter((m) => m.ncc)) {
    const key = `${x.d.id}|${x.ncc}`;
    if (!nhomNcc.has(key)) nhomNcc.set(key, []);
    nhomNcc.get(key).push(x);
  }
  for (const ds of nhomNcc.values()) {
    const d = ds[0].d;
    const giaTri = Math.round(ds.reduce((s, x) => s + x.it.sl * x.gia * (1 + x.vat / 100), 0));
    let coc = 0;
    if (ds.some((x) => x.trangThai !== 'dang_hoi') && chance(0.35)) {
      const t = addDays(ds[0].ngay, 0.5);
      const c = { loai: 'coc', ncc: ds[0].ncc, d, giaTriHang: 0, cocTru: 0, soTien: Math.round(giaTri * 0.3 / 1000) * 1000, t, dong: [] };
      c.trangThai = trangThaiTheoTuoi(t);
      if (['da_duyet', 'da_thanh_toan'].includes(c.trangThai)) coc = c.soTien;
      dxc.push(c);
    }
    if (ds.every((x) => SAU_SAN_HANG.includes(x.trangThai)) && (d.giaiDoan === 'hoan_tat' || chance(0.85))) {
      const t = addDays(d.tBuoc.giao_hang || ds[0].ngay, -0.5 + rand());
      const q = { loai: 'quyet_toan', ncc: ds[0].ncc, d, giaTriHang: giaTri, cocTru: coc, soTien: Math.max(0, giaTri - coc), t: t > HOM_NAY ? HOM_NAY : t, dong: ds };
      q.trangThai = d.giaiDoan === 'hoan_tat' ? 'da_thanh_toan' : trangThaiTheoTuoi(q.t);
      if (q.soTien === 0 && q.trangThai !== 'tu_choi') q.trangThai = 'da_thanh_toan';
      dxc.push(q);
    }
  }
  for (const m of mbs.filter((x) => x.daMua && chance(0.7))) {
    dxc.push({ loai: 'chi_bo_sung', ncc: m.ncc, d: m.d, mbs: m.id, giaTriHang: m.tong, cocTru: 0, soTien: m.tong, t: addDays(m.ngay, 1), trangThai: trangThaiTheoTuoi(addDays(m.ngay, 1)), dong: [] });
  }

  // ---- Tho: phai tra khi quyet toan, ung cong khi dang thi cong, de xuat tra cong sau quyet toan ----
  const gdTho = []; // [doi_tho_id, don_hang_id, thi_cong_id, loai, so_tien, dxcIndex|null, phat_sinh_id, ghi_chu, created_at]
  for (const x of tc.filter((g) => g.trangThai === 'da_nghiem_thu' && g.d.giaiDoan === 'hoan_tat')) {
    gdTho.push([x.tho, x.d.id, x.id, 'phai_tra', Math.round(x.gia * x.klThucTe), null, null, `Công ${x.ten}: ${x.klThucTe} ${x.dv}`, x.d.tBuoc.hoan_tat]);
  }
  for (const p of ps.filter((q) => q.loai === 'thu_ho')) {
    gdTho.push([p.g.tho, p.d.id, p.g.id, 'thu_ho', p.tien, null, p.id, p.d.giaiDoan === 'hoan_tat' ? 'Thợ thu hộ khách' : 'Thợ thu hộ khách', p.t]);
  }
  for (const x of tc.filter((g) => g.trangThai === 'dang_thi_cong' && chance(0.2))) {
    const t = addDays(x.batDau, 0.3);
    dxc.push({ loai: 'ung_cong', tho: x.tho, d: x.d, giaTriHang: 0, cocTru: 0, soTien: Math.round(x.gia * x.klDuKien * 0.3 / 1000) * 1000, t, trangThai: trangThaiTheoTuoi(t), dong: [], tc: x });
  }
  // Tra cong: moi doi tho x don hoan tat; so tien = phai tra - thu ho.
  const congTho = new Map();
  for (const r of gdTho) {
    const key = `${r[0]}|${r[1]}`;
    congTho.set(key, (congTho.get(key) || 0) + (r[3] === 'phai_tra' ? r[4] : -r[4]));
  }
  for (const [key, con] of congTho) {
    if (con <= 0) continue;
    const [tho, donId] = key.split('|').map(Number);
    const d = donSpec.find((x) => x.id === donId);
    const t = addDays(d.tBuoc.hoan_tat, 0.5 + rand() * 2);
    dxc.push({ loai: 'tra_cong', tho, d, giaTriHang: 0, cocTru: 0, soTien: con, t: t > HOM_NAY ? HOM_NAY : t, trangThai: trangThaiTheoTuoi(t > HOM_NAY ? HOM_NAY : t), dong: [] });
  }

  const dxcIds = await insertMany(db, 'de_xuat_chi',
    ['loai_chi', 'ncc_id', 'doi_tho_id', 'don_hang_id', 'mua_bo_sung_id', 'nguoi_tao_id', 'gia_tri_hang', 'coc_da_tru', 'so_tien', 'trang_thai', 'ly_do_tu_choi', 'created_at'],
    dxc.map((c) => {
      c.lyDo = c.trangThai === 'tu_choi' ? pick(LY_DO_TU_CHOI) : null;
      return [c.loai, c.ncc ?? null, c.tho ?? null, c.d.id, c.mbs ?? null, pick(keToan), c.giaTriHang, c.cocTru, c.soTien, c.trangThai, c.lyDo, c.t];
    }));
  dxc.forEach((c, i) => { c.id = dxcIds[i]; });
  // Noi dung CK do he thong sinh: NCC "<ma don>-11-<id>", tho "<sdt tho> <ma don>".
  await db.query(`UPDATE de_xuat_chi c SET noi_dung_ck = CASE WHEN c.doi_tho_id IS NULL THEN dh.ma_don || '-11-' || c.id
                    ELSE COALESCE(dt.sdt, 'THO' || dt.id) || ' ' || dh.ma_don END
                    FROM don_hang dh LEFT JOIN doi_tho dt ON true
                   WHERE dh.id = c.don_hang_id AND (c.doi_tho_id IS NULL OR dt.id = c.doi_tho_id)`);
  await insertMany(db, 'de_xuat_chi_dong', ['de_xuat_chi_id', 'mua_hang_dong_id', 'so_luong', 'don_gia', 'vat_pct', 'thanh_tien'],
    dxc.flatMap((c) => c.dong.map((x) => [c.id, x.id, x.it.sl, x.gia, x.vat, Math.round(x.it.sl * x.gia * (1 + x.vat / 100))])));
  const NGUOI_DUYET = ['@duyet_demo_1', '@duyet_demo_2', 'web:Vương Ngọc Sơn'];
  await insertMany(db, 'de_xuat_chi_duyet_log', ['de_xuat_chi_id', 'telegram_user', 'hanh_dong', 'ghi_chu', 'thoi_gian'],
    dxc.filter((c) => c.trangThai !== 'cho_duyet').map((c) => [c.id, pick(NGUOI_DUYET), c.trangThai === 'tu_choi' ? 'tu_choi' : 'duyet', c.lyDo, addDays(c.t, rand() * 0.5)]));
  const daChi = dxc.filter((c) => c.trangThai === 'da_thanh_toan' && c.soTien > 0);
  const ngayChi = (c) => { const t = addDays(c.t, 1 + rand() * 2); return isoDate(t > HOM_NAY ? HOM_NAY : t); };
  daChi.forEach((c) => { c.ngayChi = ngayChi(c); });
  await insertMany(db, 'phieu_thanh_toan', ['de_xuat_chi_id', 'so_tien', 'ngay_thanh_toan', 'nguoi_tao_id', 'bill_anh'],
    daChi.map((c) => [c.id, c.soTien, c.ngayChi, pick(keToan), 'du-lieu-cu']));
  await db.query(`UPDATE phieu_thanh_toan p SET noi_dung_ck = c.noi_dung_ck FROM de_xuat_chi c WHERE c.id = p.de_xuat_chi_id`);
  // So tho: tien da chi cho tho (tra cong -> da_tra, ung cong -> tam_ung).
  for (const c of daChi.filter((x) => x.tho)) {
    gdTho.push([c.tho, c.d.id, c.tc?.id ?? null, c.loai === 'tra_cong' ? 'da_tra' : 'tam_ung', c.soTien, c.id, null,
      c.loai === 'tra_cong' ? `Trả công theo DXC-${c.id}` : `Ứng công theo DXC-${c.id}`, new Date(`${c.ngayChi}T10:00:00+07:00`)]);
  }
  await insertMany(db, 'giao_dich_tho', ['doi_tho_id', 'don_hang_id', 'thi_cong_id', 'loai', 'so_tien', 'de_xuat_chi_id', 'phat_sinh_id', 'ghi_chu', 'created_at'], gdTho);

  // ---- Cham soc khach hang ----
  // Khach da co don: lich su moi -> tu van -> bao gia -> chot, truoc ngay don dau tien.
  const donDauTien = {};
  for (const d of donSpec) if (!donDauTien[d.kh.id]) donDauTien[d.kh.id] = d.ngay;
  const NOI_DUNG_CS = {
    dang_tu_van: ['Khách hỏi giá sàn SPC, đã gửi catalogue.', 'Tư vấn mẫu tấm ốp qua Zalo.', 'Hẹn khảo sát công trình cuối tuần.', 'Khách cần cửa nhôm cho ban công.'],
    da_bao_gia: ['Đã gửi báo giá, chờ khách phản hồi.', 'Báo giá lần 2 sau khi khách giảm diện tích.', 'Gửi báo giá trọn gói vật tư + thi công.'],
    chot: ['Khách đồng ý, đặt cọc 30%.', 'Chốt qua điện thoại.', 'Khách ký xác nhận báo giá.'],
    khong_mua: ['Khách chọn bên khác vì giá.', 'Khách hoãn sửa nhà sang năm sau.', 'Không liên lạc được sau 3 lần gọi.'],
  };
  const logRows = [];
  await db.query(`UPDATE khach_hang SET trang_thai_cham_soc = 'chot' WHERE id = ANY($1)`, [Object.keys(donDauTien).map(Number)]);
  for (const [khId, ngayDon] of Object.entries(donDauTien)) {
    const kh = khachHang.find((k) => k.id === Number(khId));
    let t = addDays(ngayDon, -int(5, 20));
    for (const tt of ['dang_tu_van', 'da_bao_gia', 'chot']) {
      if (tt === 'da_bao_gia' && chance(0.2)) continue;
      logRows.push([kh.id, kh.sale_phu_trach_id, tt, pick(NOI_DUNG_CS[tt]), t]);
      t = addDays(t, int(1, 6));
      if (t > ngayDon) t = ngayDon;
    }
  }

  // Khach tiem nang chua chot (dang o cac giai doan cham soc).
  const leads = Array.from({ length: 150 }, () => {
    const tt = pick(['moi', 'moi', 'dang_tu_van', 'dang_tu_van', 'dang_tu_van', 'da_bao_gia', 'da_bao_gia', 'khong_mua']);
    return { row: [hoTen(), sdt(), diaChi(), pick(sales), tt], tt };
  });
  const leadIds = await insertMany(db, 'khach_hang', ['ten', 'sdt', 'dia_chi', 'sale_phu_trach_id', 'trang_thai_cham_soc'], leads.map((l) => l.row));
  leads.forEach((l, i) => {
    if (l.tt === 'moi') return;
    let t = addDays(HOM_NAY, -int(3, 60));
    const chuoi = l.tt === 'dang_tu_van' ? ['dang_tu_van'] : l.tt === 'da_bao_gia' ? ['dang_tu_van', 'da_bao_gia'] : ['dang_tu_van', 'khong_mua'];
    for (const tt of chuoi) {
      logRows.push([leadIds[i], l.row[3], tt, pick(NOI_DUNG_CS[tt]), t]);
      t = addDays(t, int(1, 5));
    }
  });
  await insertMany(db, 'khach_hang_cham_soc', ['khach_hang_id', 'sale_id', 'trang_thai', 'noi_dung', 'created_at'], logRows);

  await db.query('COMMIT');
  await db.end();
  return {
    don: SO_DON, khachHang: khRows.length + leads.length, dongMuaHang: mhd.length, muaBoSung: mbs.length, giaiDoanThiCong: tc.length,
    phatSinh: ps.length, deXuatChi: dxc.length, soTho: gdTho.length, nhatKyChamSoc: logRows.length, lichSuTienDo: gdLog.length,
  };
}
