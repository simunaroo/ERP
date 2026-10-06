import { AppError } from '../../utils/AppError.js';
import { sinhJson } from '../../integrations/gemini.client.js';
import * as repo from './phan_tich.repository.js';

const NGAY_MS = 86400000;
const homNay = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
const congNgay = (ymd, n) => new Date(Date.parse(`${ymd}T00:00:00Z`) + n * NGAY_MS).toISOString().slice(0, 10);
const laNgay = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v || '') && !Number.isNaN(Date.parse(v));
const phanTram = (moi, cu) => (Number(cu) > 0 ? Math.round(((moi - cu) / cu) * 1000) / 10 : null);

// Mac dinh: 30 ngay gan nhat. Ky truoc = cung so ngay, lien ngay truoc do (de so sanh tang/giam).
export function chuanHoaKy({ tu, den }) {
  const d = den || homNay();
  const t = tu || congNgay(d, -29);
  if (!laNgay(t) || !laNgay(d)) throw new AppError(400, 'Khoảng ngày không hợp lệ');
  if (t > d) throw new AppError(400, 'Ngày bắt đầu phải trước ngày kết thúc');
  const soNgay = Math.round((Date.parse(d) - Date.parse(t)) / NGAY_MS) + 1;
  if (soNgay > 366) throw new AppError(400, 'Chỉ phân tích tối đa 1 năm');
  return { tu: t, den: d, soNgay, tuTruoc: congNgay(t, -soNgay), denTruoc: congNgay(t, -1) };
}

// Toan bo so lieu do SQL tinh - chinh xac, kiem thu duoc, dung duoc ca khi khong co AI.
export async function tongHop(query) {
  const ky = chuanHoaKy(query);
  const [ban, don, thiTruong, ncc] = await Promise.all([repo.banChay(ky), repo.tongDon(ky), repo.giaThiTruong(ky.den), repo.giaNcc(ky)]);
  const tt = new Map(thiTruong.map((r) => [r.vat_tu_id, r]));

  const vatTu = ban.map((v) => {
    const m = tt.get(v.vat_tu_id);
    const soLuong = Number(v.so_luong);
    const giaBanTb = soLuong > 0 ? Math.round(Number(v.doanh_thu) / soLuong) : null;
    // Lai gop uoc tinh chi cho hang mua ngoai: so gia ban TB voi gia mua re nhat hien tai.
    const laiGop = m && giaBanTb ? Math.round(((giaBanTb - Number(m.re_nhat)) / giaBanTb) * 1000) / 10 : null;
    return {
      vat_tu_id: v.vat_tu_id, ten: v.ten, don_vi_tinh: v.don_vi_tinh, loai: v.loai, nguon_goc: v.nguon_goc,
      so_luong: soLuong, doanh_thu: Number(v.doanh_thu), so_don: v.so_don,
      tang_truong_pct: phanTram(Number(v.doanh_thu), Number(v.doanh_thu_truoc)),
      gia_ban_tb: giaBanTb,
      gia_mua_re_nhat: m ? Number(m.re_nhat) : null, ncc_re_nhat: m?.ncc_re_nhat ?? null,
      lai_gop_uoc_tinh_pct: laiGop,
    };
  }).filter((v) => v.so_luong > 0 || v.doanh_thu > 0);

  const doanhThu = vatTu.reduce((s, v) => s + v.doanh_thu, 0);
  const doanhThuTruoc = ban.reduce((s, v) => s + Number(v.doanh_thu_truoc), 0);
  return {
    ky: { tu: ky.tu, den: ky.den, so_ngay: ky.soNgay, tu_truoc: ky.tuTruoc, den_truoc: ky.denTruoc },
    tong: {
      doanh_thu: doanhThu, doanh_thu_truoc: doanhThuTruoc, doanh_thu_tang_pct: phanTram(doanhThu, doanhThuTruoc),
      so_don: don.so_don, so_don_truoc: don.so_don_truoc, so_don_tang_pct: phanTram(don.so_don, don.so_don_truoc),
      tien_mua_ncc: ncc.reduce((s, n) => s + Number(n.tien_mua), 0),
    },
    vat_tu: vatTu,
    ncc: ncc.map((n) => ({
      ...n, tien_mua: Number(n.tien_mua), doi_gia_tb_pct: n.doi_gia_tb_pct === null ? null : Number(n.doi_gia_tb_pct),
    })),
  };
}

// ---------------- Nhan xet bang AI ----------------
const SCHEMA = {
  type: 'OBJECT',
  properties: {
    tom_tat: { type: 'STRING' },
    diem_noi_bat: { type: 'ARRAY', items: { type: 'STRING' } },
    vat_tu: { type: 'ARRAY', items: { type: 'OBJECT', properties: { ten: { type: 'STRING' }, nhan_xet: { type: 'STRING' } }, required: ['ten', 'nhan_xet'] } },
    ncc_de_xuat: {
      type: 'ARRAY',
      items: { type: 'OBJECT', properties: { vat_tu: { type: 'STRING' }, ncc: { type: 'STRING' }, ly_do: { type: 'STRING' } }, required: ['vat_tu', 'ncc', 'ly_do'] },
    },
    canh_bao: { type: 'ARRAY', items: { type: 'STRING' } },
    hanh_dong: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['tom_tat', 'diem_noi_bat', 'vat_tu', 'ncc_de_xuat', 'canh_bao', 'hanh_dong'],
};

const SYSTEM_PROMPT = `Bạn là chuyên viên phân tích mua hàng của doanh nghiệp vật liệu hoàn thiện (cửa, sàn, tấm ốp).
Nhiệm vụ: đọc bảng số liệu JSON đã được hệ thống tính sẵn và viết nhận xét ngắn gọn bằng tiếng Việt cho Kế toán/Ban giám đốc.

Quy tắc bắt buộc:
- CHỈ dùng con số có trong dữ liệu. Không tự tính tổng, trung bình hay tỷ lệ mới; không đoán số liệu thị trường bên ngoài.
- Khi nhắc tới vật tư hoặc nhà cung cấp, chép ĐÚNG tên như trong dữ liệu.
- "chi_so_gia" của NCC: 100 = ngang giá trung vị thị trường; nhỏ hơn 100 là rẻ hơn, lớn hơn 100 là đắt hơn.
- "tang_truong_pct" so với kỳ trước cùng độ dài; null nghĩa là kỳ trước không bán.
- "lai_gop_uoc_tinh_pct" chỉ là ước tính (giá bán trung bình so với giá mua rẻ nhất hiện tại), hãy nói rõ là ước tính.
- Dữ liệu ít (ít đơn, ít NCC cho một mặt hàng) thì nói rõ mức độ tin cậy thấp, không kết luận mạnh.
- ncc_de_xuat: với các vật tư bán chạy mua ngoài, đề xuất NCC nên ưu tiên và lý do (giá, ổn định giá, đã mua nhiều). Tối đa 5 dòng.
- Viết số đúng như trong dữ liệu (không làm tròn, không đổi đơn vị); hệ thống sẽ tự định dạng khi hiển thị.
- diem_noi_bat tối đa 4 ý, canh_bao tối đa 3 ý, hanh_dong tối đa 4 ý, mỗi ý một câu.`;

// Chi gui so lieu tong hop (khong co ten/sdt khach hang) va gioi han do dai de tiet kiem token.
function duLieuChoAi(th) {
  return {
    ky: th.ky,
    tong: th.tong,
    vat_tu_ban_chay: th.vat_tu.slice(0, 12).map((v) => ({
      ten: v.ten, loai: v.loai, nguon_goc: v.nguon_goc, don_vi_tinh: v.don_vi_tinh, so_luong: v.so_luong, doanh_thu: v.doanh_thu,
      so_don: v.so_don, tang_truong_pct: v.tang_truong_pct, gia_mua_re_nhat: v.gia_mua_re_nhat, ncc_re_nhat: v.ncc_re_nhat,
      lai_gop_uoc_tinh_pct: v.lai_gop_uoc_tinh_pct,
    })),
    ncc: th.ncc.map((n) => ({
      ten: n.ncc, chi_so_gia: n.chi_so_gia, so_mat_hang: n.so_mat_hang, so_mat_hang_re_nhat: n.so_mat_hang_re_nhat,
      so_lan_doi_gia: n.so_lan_doi_gia, doi_gia_tb_pct: n.doi_gia_tb_pct, tien_mua: n.tien_mua, so_lan_mua: n.so_lan_mua,
    })),
  };
}

// ---- Hau kiem: khong tin tuyet doi AI ----
// So trong cau chu cua AI (bo ngay thang, bo so nho < 10 nhu "2 cánh", "1 ngày").
function soTrongCau(text) {
  return (String(text).replace(/\d{4}-\d{2}-\d{2}/g, ' ').match(/\d+(?:[.,]\d+)?/g) || [])
    .map((x) => Number(x.replace(',', '.')))
    .filter((n) => Number.isFinite(n) && Math.abs(n) >= 10);
}
// Tap moi so co trong du lieu gui AI (lay gia tri tuyet doi, de "giam 17.7" van khop voi -17.7).
function tapSoDuLieu(obj, tap = new Set()) {
  if (typeof obj === 'number') tap.add(Math.abs(obj));
  else if (obj && typeof obj === 'object') Object.values(obj).forEach((v) => tapSoDuLieu(v, tap));
  return tap;
}
// Dinh dang so do CODE lam, khong nho AI. Thu tu quan trong: doi dau thap phan TRUOC,
// them dau cham hang nghin SAU (neu lam nguoc, "235.000" bi hieu nham la so thap phan).
export function dinhDangSo(text) {
  const tien = (n) => (n >= 1e9
    ? `${(n / 1e9).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} tỷ`
    : `${(n / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} triệu`);
  return String(text)
    .replace(/(\d{4})-(\d{2})-(\d{2})/g, '$3/$2/$1')               // 2026-09-07 -> 07/09/2026
    .replace(/(\d+)\.(\d+)/g, '$1,$2')                             // 17.7 -> 17,7
    .replace(/\s*phần trăm/g, '%')
    .replace(/(giảm|tăng)\s+-/g, '$1 ')                            // "giảm -17,7%" -> "giảm 17,7%"
    .replace(/(?<!\d|\d,|\/)\d{7,}(?!\d|,\d|\/)/g, (m) => tien(Number(m))) // 4526553000 -> 4,53 tỷ
    .replace(/(?<!\d|\d,|\/)\d{5,6}(?!\d|,\d|\/)/g, (m) => Number(m).toLocaleString('vi-VN')); // 235000 -> 235.000
}

// Bo dong nhac toi vat tu/NCC khong co trong du lieu (AI "bia" ten); liet ke so khong kiem chung duoc.
function locKetQua(kq, th, duLieu) {
  const tenVt = new Set(th.vat_tu.map((v) => v.ten));
  const tenNcc = new Set(th.ncc.map((n) => n.ncc));
  const ds = (a, n) => (Array.isArray(a) ? a.filter((x) => typeof x === 'string' && x.trim()).slice(0, n) : []);
  const vatTuGoc = Array.isArray(kq.vat_tu) ? kq.vat_tu : [];
  const nccGoc = Array.isArray(kq.ncc_de_xuat) ? kq.ncc_de_xuat : [];
  const vatTu = vatTuGoc.filter((v) => tenVt.has(v.ten)).slice(0, 6);
  const nccDeXuat = nccGoc.filter((d) => tenVt.has(d.vat_tu) && tenNcc.has(d.ncc)).slice(0, 5);
  const kqLoc = {
    tom_tat: String(kq.tom_tat || '').slice(0, 1200),
    diem_noi_bat: ds(kq.diem_noi_bat, 4),
    vat_tu: vatTu,
    ncc_de_xuat: nccDeXuat,
    canh_bao: ds(kq.canh_bao, 3),
    hanh_dong: ds(kq.hanh_dong, 4),
  };

  const coTrongDuLieu = [...tapSoDuLieu(duLieu)];
  const khop = (n) => coTrongDuLieu.some((x) => Math.abs(x - n) <= Math.max(0.05, x * 0.0005));
  const tatCaCau = [kqLoc.tom_tat, ...kqLoc.diem_noi_bat, ...kqLoc.vat_tu.map((v) => v.nhan_xet),
    ...kqLoc.ncc_de_xuat.map((d) => d.ly_do), ...kqLoc.canh_bao, ...kqLoc.hanh_dong];
  const soLa = [...new Set(tatCaCau.flatMap(soTrongCau).filter((n) => !khop(n)))];

  return {
    tom_tat: dinhDangSo(kqLoc.tom_tat),
    diem_noi_bat: kqLoc.diem_noi_bat.map(dinhDangSo),
    vat_tu: kqLoc.vat_tu.map((v) => ({ ...v, nhan_xet: dinhDangSo(v.nhan_xet) })),
    ncc_de_xuat: kqLoc.ncc_de_xuat.map((d) => ({ ...d, ly_do: dinhDangSo(d.ly_do) })),
    canh_bao: kqLoc.canh_bao.map(dinhDangSo),
    hanh_dong: kqLoc.hanh_dong.map(dinhDangSo),
    kiem_chung: {
      so_dong_ten_khong_co: (vatTuGoc.length - vatTuGoc.filter((v) => tenVt.has(v.ten)).length)
        + (nccGoc.length - nccGoc.filter((d) => tenVt.has(d.vat_tu) && tenNcc.has(d.ncc)).length),
      so_khong_co_trong_du_lieu: soLa, // vd nguong AI tu dat ("tren 105") hoac so AI tu tinh
    },
  };
}

// Cache 30 phut theo ky: bam lai khong ton them luot goi AI; 2 nguoi bam cung luc dung chung 1 request.
const CACHE_MS = 30 * 60 * 1000;
const cache = new Map(); // key -> { het: timestamp, hua: Promise }

export async function nhanXetAi(body) {
  const ky = chuanHoaKy(body || {});
  const khoa = `${ky.tu}|${ky.den}`;
  const daCo = cache.get(khoa);
  if (daCo && daCo.het > Date.now() && !body?.lam_moi) return { ...(await daCo.hua), tu_bo_nho_dem: true };

  const hua = (async () => {
    // Tinh lai so lieu O SERVER, khong nhan so lieu tu trinh duyet gui len (tranh bi sua so de "lai" AI).
    const th = await tongHop(ky);
    if (th.vat_tu.length === 0) throw new AppError(400, 'Không có đơn hàng nào trong kỳ để phân tích');
    const duLieu = duLieuChoAi(th);
    const kq = await sinhJson({
      systemPrompt: SYSTEM_PROMPT,
      userText: `Số liệu kỳ ${ky.tu} đến ${ky.den}:\n${JSON.stringify(duLieu)}`,
      schema: SCHEMA,
    });
    return { ky: th.ky, ...locKetQua(kq, th, duLieu), tao_luc: new Date().toISOString() };
  })();
  cache.set(khoa, { het: Date.now() + CACHE_MS, hua });
  if (cache.size > 50) cache.delete(cache.keys().next().value); // gioi han bo nho
  try {
    return await hua;
  } catch (err) {
    cache.delete(khoa); // loi thi khong luu, lan sau goi lai
    throw err;
  }
}
