// Bo sung du lieu GIA LAP cho DB da co du lieu lon (chi THEM, khong xoa/sua du lieu cu):
//   1) Phieu thu khach cho cac don chua co phieu nao (DB tao truoc migration 021).
//   2) Nhap so: ty le chia cho Sale + ~160 so trong 30 ngay qua (form/API/Sale tu nhap) + lich su cham soc.
// Phan nao da co du lieu thi bo qua -> chay lai nhieu lan khong sinh trung.
// Chay: npm run db:seed:bo-sung   (DB theo PG_DATABASE trong .env)
import 'dotenv/config';
import pg from 'pg';
import { fileURLToPath } from 'node:url';

let seed = 20261020;
const rand = () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const int = (a, b) => a + Math.floor(rand() * (b - a + 1));
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const chance = (p) => rand() < p;
const NGAY_MS = 86400000;
const addDays = (d, n) => new Date(new Date(d).getTime() + n * NGAY_MS);
const isoDate = (d) => new Date(d).toISOString().slice(0, 10);

const HO = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Ngô', 'Dương'];
const DEM = ['Văn', 'Thị', 'Minh', 'Quốc', 'Thanh', 'Hữu', 'Ngọc', 'Đức', 'Thu', 'Gia', 'Anh', 'Bảo'];
const TEN = ['An', 'Bình', 'Cường', 'Dũng', 'Hà', 'Hải', 'Hiếu', 'Hoa', 'Hùng', 'Huy', 'Khánh', 'Lan', 'Linh', 'Long', 'Mai', 'Nam', 'Phong', 'Phúc', 'Quân', 'Tâm', 'Thảo', 'Trang', 'Tuấn', 'Vy', 'Yến'];
const KHU_VUC = ['Quận 7, TP.HCM', 'Bình Thạnh, TP.HCM', 'Gò Vấp, TP.HCM', 'TP. Thủ Đức', 'Biên Hoà, Đồng Nai', 'Cầu Giấy, Hà Nội', 'Hà Đông, Hà Nội', 'Long Biên, Hà Nội', 'Nam Từ Liêm, Hà Nội', 'Hoàng Mai, Hà Nội'];
const NHU_CAU = [
  'Lát sàn gỗ phòng khách khoảng 40m2', 'Sàn SPC cho căn hộ 2 phòng ngủ', 'Ốp tường nano phòng ngủ', 'Tấm ốp PVC vân đá cho sảnh',
  'Hỏi giá sàn nhựa cho văn phòng 120m2', 'Thay sàn gỗ cũ bị phồng', 'Ốp trần nhựa nhà phố', 'Cần báo giá trọn gói vật tư + thi công',
  'Lam sóng trang trí phòng khách', 'Sàn gỗ ngoài trời cho ban công', null, null,
];
const NOI_DUNG = {
  dang_tu_van: ['Đã gọi, khách hẹn gửi ảnh mặt bằng qua Zalo.', 'Tư vấn mẫu, gửi catalogue.', 'Hẹn khảo sát công trình cuối tuần.'],
  da_bao_gia: ['Đã gửi báo giá, chờ khách phản hồi.', 'Báo giá lần 2 theo diện tích mới.'],
  chot: ['Khách đồng ý báo giá, hẹn đặt cọc.', 'Chốt qua điện thoại.'],
  khong_mua: ['Không nghe máy sau 3 lần gọi.', 'Khách chọn bên khác vì giá.', 'Khách chỉ hỏi giá tham khảo.'],
};
// Ty le chia (%): Sale cu nhan nhieu hon, Sale moi nhan it hon.
const TY_LE = { thilan: 20, vanhung: 15, minhtuan: 15, thuha: 10, ducanh: 10, ngocmai: 10, quocbao: 10, thanhhuong: 10 };

async function insertMany(client, table, cols, rows, traVe = 'id') {
  const ids = [];
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const params = [];
    const values = chunk.map((r) => '(' + r.map((v) => { params.push(v); return '$' + params.length; }).join(',') + ')');
    const { rows: out } = await client.query(`INSERT INTO ${table} (${cols.join(',')}) VALUES ${values.join(',')} RETURNING ${traVe} AS id`, params);
    ids.push(...out.map((o) => o.id));
  }
  return ids;
}

// 1) Phieu thu khach (giong seed-lon nhung lay moc thoi gian tu nhat ky tien do don).
async function phieuThu(db, keToan, homNay) {
  if (Number((await db.query('SELECT count(*) FROM thanh_toan_khach')).rows[0].count) > 0) return 0;
  const { rows } = await db.query(
    `SELECT dh.id, dh.giai_doan, dh.ty_le_tam_ung, dh.tien_coc, dh.sale_id, dh.ngay_chot, t.tong_don, t.tho_thu_ho,
            (SELECT min(created_at) FROM don_hang_giai_doan_log l WHERE l.don_hang_id = dh.id AND l.den_giai_doan = 'giao_hang') AS ngay_giao,
            (SELECT min(created_at) FROM don_hang_giai_doan_log l WHERE l.don_hang_id = dh.id AND l.den_giai_doan IN ('quyet_toan', 'hoan_tat')) AS ngay_qt
       FROM don_hang dh JOIN v_don_hang_tien t ON t.don_hang_id = dh.id
      WHERE dh.trang_thai <> 'nhap' AND dh.giai_doan <> 'huy'`,
  );
  const out = [];
  const phieu = (dh, loai, soTien, ngay, xacNhan) => {
    if (soTien < 1000) return;
    const d = new Date(ngay) > homNay ? homNay : new Date(ngay);
    const ck = chance(0.85);
    out.push([dh.id, loai, Math.round(soTien), ck ? 'chuyen_khoan' : 'tien_mat', isoDate(d), ck ? 'du-lieu-cu' : null,
      xacNhan ? 'da_xac_nhan' : 'cho_xac_nhan', dh.sale_id, xacNhan ? pick(keToan) : null, xacNhan ? addDays(d, 0.3) : null, d]);
  };
  for (const dh of rows) {
    const tong = Number(dh.tong_don);
    const coc = Number(dh.tien_coc);
    const tamUng = Math.max(0, Math.min(Math.round((tong * dh.ty_le_tam_ung) / 100) - coc, tong - coc - Number(dh.tho_thu_ho)));
    const daGiao = ['giao_hang', 'thi_cong', 'nghiem_thu', 'quyet_toan', 'hoan_tat'].includes(dh.giai_doan);
    let daThu = coc + Number(dh.tho_thu_ho);
    if (daGiao && tamUng > 0 && chance(0.93)) { phieu(dh, 'tam_ung', tamUng, addDays(dh.ngay_giao || dh.ngay_chot, -1), true); daThu += tamUng; }
    if (dh.giai_doan === 'mua_hang' && tamUng > 0) {
      if (chance(0.45)) phieu(dh, 'tam_ung', tamUng, addDays(homNay, -int(1, 5)), true);
      else if (chance(0.3)) phieu(dh, 'tam_ung', tamUng, addDays(homNay, -int(0, 2)), false);
    }
    const conLai = tong - daThu;
    const ngayQt = addDays(dh.ngay_qt || homNay, int(0, 6));
    if (conLai > 0 && dh.giai_doan === 'hoan_tat') {
      const r = rand();
      if (r < 0.75) phieu(dh, 'quyet_toan', conLai, ngayQt, true);
      else if (r < 0.9) phieu(dh, 'quyet_toan', conLai * 0.5, ngayQt, true);
    }
    if (conLai > 0 && dh.giai_doan === 'quyet_toan' && chance(0.3)) phieu(dh, 'quyet_toan', conLai, homNay, chance(0.6));
  }
  await insertMany(db, 'thanh_toan_khach', ['don_hang_id', 'loai', 'so_tien', 'hinh_thuc', 'ngay_thu', 'bill_anh', 'trang_thai', 'nguoi_tao_id',
    'nguoi_xac_nhan_id', 'xac_nhan_luc', 'created_at'], out);
  return out.length;
}

// 2) Nhap so + chia so theo ty le (mo phong dung thuat toan cua service: min (da_chia + 1) / ty_le trong thang).
async function nhapSo(db, homNay) {
  if (Number((await db.query('SELECT count(*) FROM chia_so_log')).rows[0].count) > 0) return null;
  const { rows: sales } = await db.query(`SELECT id, username FROM users WHERE vai_tro = 'sale' AND trang_thai = 'active' ORDER BY id`);
  const admin = (await db.query(`SELECT id FROM users WHERE vai_tro = 'admin' ORDER BY id LIMIT 1`)).rows[0]?.id ?? null;
  const tyLe = sales.map((s) => ({ ...s, ty_le: TY_LE[s.username] ?? 0 }));
  if (tyLe.reduce((a, s) => a + s.ty_le, 0) !== 100) { const deu = Math.floor(100 / sales.length); tyLe.forEach((s, i) => { s.ty_le = i === 0 ? 100 - deu * (sales.length - 1) : deu; }); }
  await insertMany(db, 'ty_le_chia_so', ['sale_id', 'ty_le', 'nguoi_cap_nhat_id'], tyLe.map((s) => [s.id, s.ty_le, admin]), 'sale_id');

  const daCo = new Set((await db.query('SELECT sdt FROM khach_hang WHERE sdt IS NOT NULL')).rows.map((r) => r.sdt));
  const sdtMoi = () => { let s; do { s = pick(['03', '07', '08']) + String(int(10000000, 99999999)); } while (daCo.has(s)); daCo.add(s); return s; };

  // Thoi diem nhap: rai 30 ngay, gio hanh chinh, tang dan.
  const moc = Array.from({ length: 160 }, () => {
    const d = addDays(homNay, -rand() * 30);
    d.setHours(int(8, 20), int(0, 59), 0, 0);
    return d > homNay ? addDays(homNay, -0.05) : d;
  }).sort((a, b) => a - b);
  const demThang = {}; // "YYYY-MM:saleId" -> so da chia tu dong
  const khRows = []; const meta = [];
  for (const t of moc) {
    const saleTuNhap = chance(0.15);
    let sale;
    if (saleTuNhap) sale = pick(sales).id;
    else {
      const th = isoDate(t).slice(0, 7);
      sale = tyLe.filter((s) => s.ty_le > 0)
        .map((s) => ({ id: s.id, k: ((demThang[`${th}:${s.id}`] || 0) + 1) / s.ty_le, w: s.ty_le }))
        .sort((a, b) => a.k - b.k || b.w - a.w || a.id - b.id)[0].id;
      demThang[`${th}:${sale}`] = (demThang[`${th}:${sale}`] || 0) + 1;
    }
    const kenh = saleTuNhap ? 'form' : chance(0.55) ? 'api' : 'form';
    const nguoiNhap = saleTuNhap ? sale : kenh === 'api' ? null : admin;
    const nguon = saleTuNhap ? 'sale_tu_tim' : pick(['facebook', 'facebook', 'facebook', 'zalo', 'google', 'website', 'tiktok', 'gioi_thieu']);
    // Trang thai theo tuoi so: so trong 1 ngay gan nhat de "Moi"; cu hon thi da duoc cham soc dan.
    const tuoi = (homNay - t) / NGAY_MS;
    const tt = tuoi < 1 ? 'moi'
      : tuoi < 3 ? pick(['moi', 'dang_tu_van', 'dang_tu_van'])
        : pick(['moi', 'dang_tu_van', 'dang_tu_van', 'da_bao_gia', 'da_bao_gia', 'chot', 'khong_mua', 'khong_mua']);
    const ten = chance(0.8) ? `${pick(HO)} ${pick(DEM)} ${pick(TEN)}` : null;
    const sdt = sdtMoi();
    khRows.push([ten || `Khách ${sdt.slice(-4)}`, sdt, chance(0.7) ? pick(KHU_VUC) : null, sale, tt, nguon, pick(NHU_CAU), nguoiNhap, t, t]);
    meta.push({ t, sale, tt, kieu: saleTuNhap ? 'sale_tu_nhap' : 'tu_dong', kenh, nguoiNhap });
  }
  const ids = await insertMany(db, 'khach_hang',
    ['ten', 'sdt', 'dia_chi', 'sale_phu_trach_id', 'trang_thai_cham_soc', 'nguon', 'nhu_cau', 'nguoi_nhap_id', 'chia_luc', 'created_at'], khRows);
  await insertMany(db, 'chia_so_log', ['khach_hang_id', 'sale_id', 'kieu', 'kenh', 'nguoi_nhap_id', 'created_at'],
    meta.map((m, i) => [ids[i], m.sale, m.kieu, m.kenh, m.nguoiNhap, m.t]));

  const log = [];
  meta.forEach((m, i) => {
    if (m.tt === 'moi') return;
    const chuoi = { dang_tu_van: ['dang_tu_van'], da_bao_gia: ['dang_tu_van', 'da_bao_gia'], chot: ['dang_tu_van', 'da_bao_gia', 'chot'], khong_mua: ['khong_mua'] }[m.tt];
    let t = addDays(m.t, 0.02 + rand() * 0.3);
    for (const tt of chuoi) {
      if (t > homNay) t = homNay;
      log.push([ids[i], m.sale, tt, pick(NOI_DUNG[tt]), t]);
      t = addDays(t, 0.5 + rand() * 3);
    }
  });
  await insertMany(db, 'khach_hang_cham_soc', ['khach_hang_id', 'sale_id', 'trang_thai', 'noi_dung', 'created_at'], log);
  return { so: ids.length, chamSoc: log.length };
}

export async function seedBoSung(conn) {
  const db = new pg.Client(conn);
  await db.connect();
  try {
    await db.query('BEGIN');
    const homNay = new Date();
    const keToan = (await db.query(`SELECT id FROM users WHERE vai_tro = 'ke_toan'`)).rows.map((r) => r.id);
    const thu = await phieuThu(db, keToan, homNay);
    const so = await nhapSo(db, homNay);
    await db.query('COMMIT');
    return { phieuThu: thu || 'bỏ qua (đã có)', nhapSo: so || 'bỏ qua (đã có)' };
  } catch (e) {
    await db.query('ROLLBACK');
    throw e;
  } finally {
    await db.end();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const conn = { host: process.env.PG_HOST, port: Number(process.env.PG_PORT), user: process.env.PG_USER, password: process.env.PG_PASSWORD, database: process.env.PG_DATABASE };
  console.log(`Bổ sung dữ liệu mẫu vào DB "${conn.database}"...`);
  console.log(await seedBoSung(conn));
}
