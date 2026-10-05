// Sinh du lieu GIA LAP quy mo lon, chay sau schema.sql + seed.sql (xem db-reset.js --lon).
// Moi ten nguoi, cong ty, so dien thoai, so tai khoan deu la ngau nhien, khong lay tu nguon that.
import pg from 'pg';

const DEMO_HASH = '$2b$10$UEwUsyxonOHE/Xnxy56azuGbw42mqhooshMQqO6DKEGi/cIFQu1W6';
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
  for (let i = 3; i <= 8; i++) nguoiDungMoi.push([hoTen(), `sale${i}`, DEMO_HASH, 'sale']);
  for (let i = 2; i <= 3; i++) nguoiDungMoi.push([hoTen(), `vanhanh${i}`, DEMO_HASH, 'van_hanh']);
  nguoiDungMoi.push([hoTen(), 'ketoan2', DEMO_HASH, 'ke_toan']);
  await insertMany(db, 'users', ['ho_ten', 'username', 'password_hash', 'vai_tro'], nguoiDungMoi);
  const users = (await db.query('SELECT id, vai_tro FROM users')).rows;
  const sales = users.filter((u) => u.vai_tro === 'sale').map((u) => u.id);
  const vanHanh = users.filter((u) => u.vai_tro === 'van_hanh').map((u) => u.id);
  const keToan = users.filter((u) => u.vai_tro === 'ke_toan').map((u) => u.id);

  // ---- Khach hang ----
  const khRows = Array.from({ length: 420 }, () => [hoTen(), sdt(), diaChi(), pick(sales)]);
  await insertMany(db, 'khach_hang', ['ten', 'sdt', 'dia_chi', 'sale_phu_trach_id'], khRows);
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
    `SELECT vt.id, vt.ten, lvt.nguon_goc FROM vat_tu vt JOIN loai_vat_tu lvt ON lvt.id = vt.loai_vat_tu_id`)).rows;
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
  await insertMany(db, 'doi_tho', ['ten', 'sdt', 'nang_luc'],
    Array.from({ length: 9 }, () => [`Đội anh ${pick(TEN)} ${pick(['A', 'B', 'C', ''])}`.trim(), sdt(), pick(NANG_LUC)]));
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
    const thang = isoDate(d.ngay).slice(2, 7).replace('-', '');
    demThang[thang] = (demThang[thang] || 100) + 1;
    d.maDon = `DH-${thang}-${String(demThang[thang]).padStart(3, '0')}`;
    d.vanHanh = d.trangThai === 'moi' ? null : pick(vanHanh);
    return [
      d.maDon, d.kh.id, d.kh.sale_phu_trach_id, d.vanHanh, d.trangThai,
      chance(0.85) ? d.kh.dia_chi : diaChi(),
      d.vanHanh ? pick(['NCC giao thẳng đến công trình, cửa xuất từ xưởng.', 'NCC giao thẳng, nhận hàng tại hầm.', 'Giao 2 đợt theo tiến độ thi công.']) : null,
      d.vanHanh ? pick(['Thi công trong 1 ngày.', 'Lát sàn ngày 1, ốp tường ngày 2.', 'Thi công 2 ngày, làm ngoài giờ hành chính.', 'Lắp cửa trước, hoàn thiện sau.']) : null,
      d.ngay,
    ];
  });
  const donIds = await insertMany(db, 'don_hang',
    ['ma_don', 'khach_hang_id', 'sale_id', 'vanhanh_phu_trach_id', 'trang_thai', 'dia_chi_cong_trinh', 'phuong_an_van_chuyen', 'phuong_an_thi_cong', 'created_at'], donRows);
  donSpec.forEach((d, i) => { d.id = donIds[i]; });

  // ---- Vat tu cua don ----
  const dvtRows = [];
  for (const d of donSpec) {
    d.items = sample(vatTu, int(1, 4)).map((v) => ({ vt: v, sl: v.nguon_goc === 'tu_san_xuat' ? int(1, 6) : int(8, 90) }));
    for (const it of d.items) dvtRows.push([d.id, it.vt.id, it.sl]);
  }
  await insertMany(db, 'don_hang_vat_tu', ['don_hang_id', 'vat_tu_id', 'so_luong_can'], dvtRows);

  // ---- Yeu cau sua (khoang 8% don) ----
  const NOI_DUNG_SUA = ['Khách đổi màu tấm ốp phòng ngủ.', 'Tăng diện tích sàn thêm 5 m2.', 'Đổi lịch thi công sang cuối tuần.', 'Khách muốn đổi cửa sang loại 4 cánh.', 'Bổ sung len chân tường cho phòng khách.'];
  const ycRows = donSpec.filter(() => chance(0.08)).map((d) => [d.id, d.kh.sale_phu_trach_id, pick(NOI_DUNG_SUA),
    d.trangThai === 'moi' ? 'cho_xu_ly' : (chance(0.8) ? 'da_xu_ly' : 'cho_xu_ly'), addDays(d.ngay, int(1, 5))]);
  await insertMany(db, 'don_hang_yeu_cau_sua', ['don_hang_id', 'sale_id', 'noi_dung', 'trang_thai', 'created_at'], ycRows);

  // ---- De xuat mua hang: gom vat tu mua ngoai theo NCC re nhat tai ngay dat ----
  const dxm = []; // {don, ncc, ngay, trangThai, lines:[{vt,sl,gia}]}
  for (const d of donSpec) {
    if (d.trangThai === 'moi') continue;
    const ngayMua = addDays(d.ngay, int(1, 4));
    const theoNcc = {};
    for (const it of d.items.filter((x) => x.vt.nguon_goc === 'mua_ngoai')) {
      const gia = giaTai(it.vt.id, ngayMua).sort((a, b) => a.gia - b.gia);
      if (!gia.length) continue;
      const chon = chance(0.75) ? gia[0] : pick(gia);
      (theoNcc[chon.ncc] ||= []).push({ vt: it.vt.id, sl: it.sl, gia: chon.gia });
    }
    for (const [ncc, lines] of Object.entries(theoNcc)) {
      const trangThai = d.trangThai === 'hoan_tat' ? 'da_giao' : pick(['cho_duyet', 'da_dat', 'da_dat', 'da_giao']);
      dxm.push({ don: d.id, ncc: Number(ncc), ngay: ngayMua, trangThai, lines, nguoi: pick(keToan) });
    }
  }
  const dxmIds = await insertMany(db, 'de_xuat_mua_hang', ['don_hang_id', 'ncc_id', 'nguoi_tao_id', 'trang_thai', 'created_at'],
    dxm.map((x) => [x.don, x.ncc, x.nguoi, x.trangThai, x.ngay]));
  dxm.forEach((x, i) => { x.id = dxmIds[i]; x.tong = x.lines.reduce((s, l) => s + l.sl * l.gia, 0); });
  await insertMany(db, 'de_xuat_mua_hang_ct', ['de_xuat_mua_hang_id', 'vat_tu_id', 'so_luong', 'don_gia'],
    dxm.flatMap((x) => x.lines.map((l) => [x.id, l.vt, l.sl, l.gia])));

  // ---- Thi cong + nghiem thu ----
  const tcList = donSpec.filter((d) => d.trangThai !== 'moi').map((d) => {
    const duKien = addDays(d.ngay, int(5, 12));
    const trangThai = d.trangThai === 'hoan_tat' ? 'da_nghiem_thu' : (duKien < HOM_NAY ? 'dang_thi_cong' : 'lap_lich');
    return { d, duKien, trangThai };
  });
  const tcIds = await insertMany(db, 'thi_cong', ['don_hang_id', 'doi_tho_id', 'nguoi_phu_trach_id', 'ngay_du_kien', 'ngay_thuc_hien', 'trang_thai'],
    tcList.map((t) => [t.d.id, pick(doiTho), t.d.vanHanh, isoDate(t.duKien),
      t.trangThai === 'lap_lich' ? null : isoDate(addDays(t.duKien, int(0, 2))), t.trangThai]));
  const ntRows = [];
  tcList.forEach((t, i) => {
    if (t.trangThai !== 'da_nghiem_thu') return;
    const dat = chance(0.93);
    ntRows.push([tcIds[i], isoDate(addDays(t.duKien, int(1, 4))), dat ? 'Đạt' : 'Đạt, có chỉnh sửa nhỏ',
      dat ? pick(['Khách hài lòng.', 'Không phát sinh.', null]) : 'Đã xử lý mép sàn theo yêu cầu khách.']);
  });
  await insertMany(db, 'nghiem_thu', ['thi_cong_id', 'ngay_nghiem_thu', 'ket_qua', 'ghi_chu'], ntRows);

  // ---- De xuat chi: gom de xuat mua da_giao theo NCC + thang ----
  const nhom = {};
  for (const x of dxm.filter((x) => x.trangThai === 'da_giao')) {
    const key = `${x.ncc}|${isoDate(x.ngay).slice(0, 7)}`;
    (nhom[key] ||= []).push(x);
  }
  const dxc = [];
  for (const [key, ds] of Object.entries(nhom)) {
    const [ncc, thang] = key.split('|');
    const ngayTao = addDays(new Date(`${thang}-01T09:00:00+07:00`), 32);
    if (ngayTao > HOM_NAY) continue; // thang hien tai chua chot de xuat chi
    const cachDay = (HOM_NAY - ngayTao) / NGAY_MS;
    const trangThai = cachDay > 20 ? (chance(0.96) ? 'da_thanh_toan' : 'tu_choi')
      : pick(['cho_duyet', 'da_duyet', 'da_thanh_toan', 'cho_duyet']);
    dxc.push({ ncc: Number(ncc), ngay: ngayTao, trangThai, ds, tong: ds.reduce((s, x) => s + x.tong, 0), nguoi: pick(keToan) });
  }
  const dxcIds = await insertMany(db, 'de_xuat_chi', ['ncc_id', 'nguoi_tao_id', 'so_tien', 'trang_thai', 'telegram_message_id', 'created_at'],
    dxc.map((c) => [c.ncc, c.nguoi, c.tong, c.trangThai, String(int(10000, 99999)), c.ngay]));
  dxc.forEach((c, i) => { c.id = dxcIds[i]; });
  await insertMany(db, 'de_xuat_chi_muc', ['de_xuat_chi_id', 'de_xuat_mua_hang_id'], dxc.flatMap((c) => c.ds.map((x) => [c.id, x.id])));
  const NGUOI_DUYET = ['@duyet_demo_1', '@duyet_demo_2', '@duyet_demo_3'];
  await insertMany(db, 'de_xuat_chi_duyet_log', ['de_xuat_chi_id', 'telegram_user', 'hanh_dong', 'thoi_gian'],
    dxc.filter((c) => c.trangThai !== 'cho_duyet').map((c) => [c.id, pick(NGUOI_DUYET), c.trangThai === 'tu_choi' ? 'tu_choi' : 'duyet', addDays(c.ngay, rand() * 2)]));
  await insertMany(db, 'phieu_thanh_toan', ['de_xuat_chi_id', 'ma_qr', 'so_tien', 'ngay_thanh_toan'],
    dxc.filter((c) => c.trangThai === 'da_thanh_toan').map((c) => [c.id, `VIETQR-DEMO-${c.id}`, c.tong, isoDate(addDays(c.ngay, int(2, 6)))]));

  await db.query('COMMIT');
  await db.end();
  return { don: SO_DON, khachHang: khRows.length, deXuatMua: dxm.length, deXuatChi: dxc.length };
}
