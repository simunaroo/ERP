import { query } from '../../config/db.js';
import { AppError } from '../../utils/AppError.js';
import { sinhJson } from '../../integrations/gemini.client.js';
import { dinhDangSo } from '../phan_tich/phan_tich.service.js';
import { chuyenSale } from '../nhap_so/nhap_so.service.js';

const NGAY = /^\d{4}-\d{2}-\d{2}$/;
const so = (v) => (v === null || v === undefined ? null : Number(v));

// Ky bao cao theo ngay so duoc giao cho Sale (chia_luc). Mac dinh 30 ngay gan nhat.
function ky({ tu, den }) {
  const homNay = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
  const t = tu || new Date(Date.now() - 29 * 86400e3).toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
  const d = den || homNay;
  if (!NGAY.test(t) || !NGAY.test(d) || t > d) throw new AppError(400, 'Khoảng ngày không hợp lệ');
  return { tu: t, den: d };
}

// Hieu qua cham soc theo Sale.
// - Theo KY (so duoc chia trong ky, tinh cho Sale DANG giu so): so duoc chia, da lien he lan dau, thoi gian phan hoi,
//   ket qua hien tai (quan tam / chot / khong lien lac duoc / khong quan tam / sai so), don + doanh thu tu cac khach do.
// - TON DONG (hien tai, khong theo ky): qua 1 ngay chua goi, quan tam qua 3 ngay chua goi lai, hen goi lai qua gio.
export async function tongHop(q) {
  const k = ky(q);
  const { rows } = await query(
    `WITH kh AS (
       SELECT k.id, k.sale_phu_trach_id AS sale_id, k.trang_thai_cham_soc AS tt, k.chia_luc,
              (SELECT min(c.created_at) FROM khach_hang_cham_soc c WHERE c.khach_hang_id = k.id) AS lan_dau,
              (SELECT count(*) FROM khach_hang_cham_soc c WHERE c.khach_hang_id = k.id) AS so_lan
         FROM khach_hang k
        WHERE k.chia_luc >= ($1::date)::timestamptz AND k.chia_luc < ($2::date + 1)::timestamptz
     ), don AS (
       SELECT kh.sale_id, count(DISTINCT dh.id) AS so_don, COALESCE(sum(t.tong_don), 0) AS doanh_thu
         FROM kh JOIN don_hang dh ON dh.khach_hang_id = kh.id AND dh.trang_thai NOT IN ('nhap', 'huy')
         JOIN v_don_hang_tien t ON t.don_hang_id = dh.id GROUP BY kh.sale_id
     ), ton AS (
       SELECT k.sale_phu_trach_id AS sale_id,
              count(*) FILTER (WHERE k.trang_thai_cham_soc = 'moi' AND k.chia_luc < now() - interval '1 day') AS qua_1_ngay_chua_goi,
              count(*) FILTER (WHERE k.trang_thai_cham_soc = 'quan_tam' AND
                (SELECT max(c.created_at) FROM khach_hang_cham_soc c WHERE c.khach_hang_id = k.id) < now() - interval '3 days') AS quan_tam_qua_3_ngay,
              count(*) FILTER (WHERE k.trang_thai_cham_soc = 'hen_goi_lai' AND k.hen_goi_lai_luc < now()) AS hen_qua_gio
         FROM khach_hang k GROUP BY 1
     )
     SELECT u.id AS sale_id, u.ho_ten AS sale,
            count(kh.id) AS so_duoc_chia,
            count(kh.lan_dau) AS da_lien_he,
            round(avg(EXTRACT(EPOCH FROM (kh.lan_dau - kh.chia_luc)) / 3600)::numeric, 1) AS phan_hoi_tb_gio,
            count(*) FILTER (WHERE kh.lan_dau <= kh.chia_luc + interval '2 hours') AS lien_he_trong_2_gio,
            round(avg(kh.so_lan) FILTER (WHERE kh.so_lan > 0)::numeric, 1) AS so_lan_cs_tb,
            count(*) FILTER (WHERE kh.tt IN ('khong_nghe_may', 'thue_bao')) AS chua_lien_lac_duoc,
            count(*) FILTER (WHERE kh.tt IN ('quan_tam', 'hen_goi_lai')) AS dang_quan_tam,
            count(*) FILTER (WHERE kh.tt = 'chot') AS chot,
            count(*) FILTER (WHERE kh.tt = 'khong_quan_tam') AS khong_quan_tam,
            count(*) FILTER (WHERE kh.tt = 'sai_so') AS sai_so,
            COALESCE(max(don.so_don), 0) AS so_don, COALESCE(max(don.doanh_thu), 0) AS doanh_thu,
            COALESCE(max(ton.qua_1_ngay_chua_goi), 0) AS qua_1_ngay_chua_goi,
            COALESCE(max(ton.quan_tam_qua_3_ngay), 0) AS quan_tam_qua_3_ngay,
            COALESCE(max(ton.hen_qua_gio), 0) AS hen_qua_gio
       FROM users u
       LEFT JOIN kh ON kh.sale_id = u.id LEFT JOIN don ON don.sale_id = u.id LEFT JOIN ton ON ton.sale_id = u.id
      WHERE u.vai_tro = 'sale' AND u.trang_thai = 'active'
      GROUP BY u.id, u.ho_ten ORDER BY count(kh.id) DESC, u.id`,
    [k.tu, k.den],
  );
  const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : null);
  const sale = rows.map((r) => {
    const x = Object.fromEntries(Object.entries(r).map(([key, v]) => [key, key === 'sale' ? v : so(v)]));
    x.ty_le_lien_he_pct = pct(x.da_lien_he, x.so_duoc_chia);
    x.ty_le_lien_he_2_gio_pct = pct(x.lien_he_trong_2_gio, x.so_duoc_chia);
    x.ty_le_chot_pct = pct(x.chot, x.so_duoc_chia);
    return x;
  });
  const cong = (key) => sale.reduce((a, x) => a + (x[key] || 0), 0);
  const tong = Object.fromEntries(['so_duoc_chia', 'da_lien_he', 'lien_he_trong_2_gio', 'chua_lien_lac_duoc', 'dang_quan_tam', 'chot', 'khong_quan_tam',
    'sai_so', 'so_don', 'doanh_thu', 'qua_1_ngay_chua_goi', 'quan_tam_qua_3_ngay', 'hen_qua_gio'].map((key) => [key, cong(key)]));
  tong.ty_le_lien_he_pct = pct(tong.da_lien_he, tong.so_duoc_chia);
  tong.ty_le_chot_pct = pct(tong.chot, tong.so_duoc_chia);
  return { ky: k, sale, tong };
}

// Danh sach ton dong de xu ly / chuyen Sale.
const LOAI = {
  qua_1_ngay: `k.trang_thai_cham_soc = 'moi' AND k.chia_luc < now() - interval '1 day'`,
  quan_tam_3_ngay: `k.trang_thai_cham_soc = 'quan_tam' AND (SELECT max(c.created_at) FROM khach_hang_cham_soc c WHERE c.khach_hang_id = k.id) < now() - interval '3 days'`,
  hen_qua_gio: `k.trang_thai_cham_soc = 'hen_goi_lai' AND k.hen_goi_lai_luc < now()`,
};
export async function tonDong({ loai, sale_id }) {
  if (!LOAI[loai]) throw new AppError(400, 'Loại danh sách không hợp lệ');
  const { rows } = await query(
    `SELECT k.id, k.ten, k.sdt, k.nhu_cau, k.nguon, k.trang_thai_cham_soc, k.chia_luc, k.hen_goi_lai_luc, s.ho_ten AS sale, k.sale_phu_trach_id AS sale_id,
            (SELECT max(c.created_at) FROM khach_hang_cham_soc c WHERE c.khach_hang_id = k.id) AS lan_cs_cuoi,
            (SELECT count(*)::int FROM khach_hang_cham_soc c WHERE c.khach_hang_id = k.id) AS so_lan_cs
       FROM khach_hang k JOIN users s ON s.id = k.sale_phu_trach_id
      WHERE ${LOAI[loai]} AND ($1::int IS NULL OR k.sale_phu_trach_id = $1)
      ORDER BY COALESCE(k.hen_goi_lai_luc, (SELECT max(c.created_at) FROM khach_hang_cham_soc c WHERE c.khach_hang_id = k.id), k.chia_luc) NULLS FIRST
      LIMIT 300`,
    [sale_id ? Number(sale_id) : null],
  );
  return rows;
}

// Chuyen nhieu khach sang 1 Sale (moi khach 1 giao dich rieng: khach loi khong lam hong ca lo).
export async function chuyenNhieu(user, { khach_ids, sale_id, ly_do }) {
  if (!Array.isArray(khach_ids) || !khach_ids.length) throw new AppError(400, 'Chưa chọn khách nào');
  if (khach_ids.length > 300) throw new AppError(400, 'Tối đa 300 khách mỗi lần');
  const kq = { thanh_cong: 0, loi: [] };
  for (const id of [...new Set(khach_ids.map(Number))]) {
    try { await chuyenSale(user, id, { sale_id, ly_do }); kq.thanh_cong++; } catch (e) { kq.loi.push({ khach_hang_id: id, loi: e.message }); }
  }
  if (!kq.thanh_cong && kq.loi.length) throw new AppError(400, kq.loi[0].loi);
  return kq;
}

// ---------------- AI nhan xet ----------------
const SCHEMA = {
  type: 'OBJECT',
  properties: {
    tom_tat: { type: 'STRING' },
    sale: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { ten: { type: 'STRING' }, danh_gia: { type: 'STRING', enum: ['tot', 'kha', 'can_cai_thien'] }, nhan_xet: { type: 'STRING' } },
        required: ['ten', 'danh_gia', 'nhan_xet'],
      },
    },
    canh_bao: { type: 'ARRAY', items: { type: 'STRING' } },
    hanh_dong: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['tom_tat', 'sale', 'canh_bao', 'hanh_dong'],
};
const SYSTEM_PROMPT = `Bạn là trưởng phòng kinh doanh của doanh nghiệp vật liệu hoàn thiện (sàn, tấm ốp, cửa), đánh giá cách các nhân viên Sale chăm sóc số khách tiềm năng được giao.
Đọc bảng số liệu JSON hệ thống đã tính sẵn và viết nhận xét ngắn gọn cho Admin bằng tiếng Việt CÓ DẤU đầy đủ (không viết không dấu); giữ nguyên tên Sale như trong dữ liệu. Chỉ số có đuôi _pct là phần trăm: luôn ghi kèm dấu % (ví dụ 86,2%).

Ý nghĩa các chỉ số (theo kỳ, tính trên số được chia trong kỳ):
- so_duoc_chia: số khách được giao; da_lien_he / ty_le_lien_he_pct: đã gọi ít nhất một lần.
- phan_hoi_tb_gio: số giờ trung bình từ lúc nhận số đến lần gọi đầu (càng nhỏ càng tốt; gọi trong 2 giờ là tốt); ty_le_lien_he_2_gio_pct.
- so_lan_cs_tb: số lần chăm sóc trung bình mỗi khách đã liên hệ.
- chot / ty_le_chot_pct: khách đã chốt đơn; so_don, doanh_thu: đơn và doanh thu từ các khách này.
- chua_lien_lac_duoc: không nghe máy hoặc thuê bao; khong_quan_tam; sai_so (sai số nhiều có thể do nguồn số kém, không phải lỗi Sale).
- Tồn đọng hiện tại: qua_1_ngay_chua_goi, quan_tam_qua_3_ngay (khách quan tâm bị bỏ quên), hen_qua_gio (lỡ hẹn gọi lại).

Quy tắc bắt buộc:
- CHỈ dùng con số có trong dữ liệu, không tự tính thêm tổng hay tỷ lệ mới. Viết số đúng như dữ liệu, hệ thống tự định dạng.
- Chép ĐÚNG tên Sale như trong dữ liệu. Mỗi Sale có số được chia > 0 một dòng trong "sale": danh_gia là tot / kha / can_cai_thien, nhan_xet 1–2 câu nêu điểm mạnh hoặc điểm cần sửa cụ thể.
- Sale có ít số (dưới 5) thì nói rõ dữ liệu ít, chưa đủ kết luận.
- Đánh giá công bằng: tốc độ gọi lần đầu và việc không để tồn đọng là trách nhiệm của Sale; tỷ lệ chốt còn phụ thuộc chất lượng nguồn số.
- canh_bao tối đa 3 ý, hanh_dong tối đa 4 ý (việc cụ thể Admin nên làm: nhắc ai, chuyển số của ai, điều chỉnh tỷ lệ chia...), mỗi ý một câu.`;

function soTrongCau(text) {
  return (String(text).replace(/\d{4}-\d{2}-\d{2}/g, ' ').match(/\d+(?:[.,]\d+)?/g) || [])
    .map((x) => Number(x.replace(',', '.'))).filter((n) => Number.isFinite(n) && Math.abs(n) >= 10);
}
function tapSo(obj, tap = new Set()) {
  if (typeof obj === 'number') tap.add(Math.abs(obj));
  else if (obj && typeof obj === 'object') Object.values(obj).forEach((v) => tapSo(v, tap));
  return tap;
}

// Phat hien van ban tieng Viet bi viet khong dau: trong cac tu chu cai, qua it tu co ky tu ngoai ASCII.
export function khongDau(kq) {
  const chu = [kq?.tom_tat, ...(kq?.sale || []).map((x) => x?.nhan_xet), ...(kq?.canh_bao || []), ...(kq?.hanh_dong || [])].join(' ');
  const tu = chu.match(/\p{L}+/gu) || [];
  if (tu.length < 15) return false;
  return tu.filter((w) => /[^\x00-\x7F]/.test(w)).length / tu.length < 0.15;
}

const cache = new Map();
export async function nhanXetAi(user, body = {}) {
  const k = ky(body);
  const khoa = `${k.tu}|${k.den}`;
  const daCo = cache.get(khoa);
  if (daCo && daCo.het > Date.now() && !body.lam_moi) return { ...(await daCo.hua), tu_bo_nho_dem: true };
  const hua = (async () => {
    const th = await tongHop(k);
    const coSo = th.sale.filter((x) => x.so_duoc_chia > 0);
    if (!coSo.length) throw new AppError(400, 'Trong kỳ chưa có số nào được chia để phân tích');
    // Chi gui so lieu tong hop theo Sale (khong co ten/SDT khach).
    const duLieu = { ky: th.ky, tong: th.tong, sale: th.sale.map(({ sale_id: _b, ...x }) => x) };
    const userText = `Số liệu chăm sóc khách kỳ ${k.tu} đến ${k.den}:\n${JSON.stringify(duLieu)}`;
    let kq = await sinhJson({ systemPrompt: SYSTEM_PROMPT, userText, schema: SCHEMA });
    // Model doi khi tra tieng Viet khong dau -> sinh lai 1 lan voi nhac nho manh hon.
    if (khongDau(kq)) kq = await sinhJson({ systemPrompt: SYSTEM_PROMPT, userText: `${userText}\n\nLƯU Ý: lần trước bạn viết KHÔNG DẤU. Bắt buộc viết tiếng Việt có dấu đầy đủ.`, schema: SCHEMA });
    const tenSale = new Set(th.sale.map((x) => x.sale));
    const ds = (a, n) => (Array.isArray(a) ? a.filter((x) => typeof x === 'string' && x.trim()).slice(0, n) : []);
    const saleGoc = Array.isArray(kq.sale) ? kq.sale : [];
    const saleLoc = saleGoc.filter((x) => tenSale.has(x.ten));
    const cau = [kq.tom_tat, ...saleLoc.map((x) => x.nhan_xet), ...ds(kq.canh_bao, 3), ...ds(kq.hanh_dong, 4)];
    const coTrong = [...tapSo(duLieu)];
    const soLa = [...new Set(cau.flatMap(soTrongCau).filter((n) => !coTrong.some((x) => Math.abs(x - n) <= Math.max(0.05, x * 0.0005))))];
    const ketQua = {
      ky: th.ky,
      tom_tat: dinhDangSo(String(kq.tom_tat || '').slice(0, 1200)),
      sale: saleLoc.map((x) => ({ ten: x.ten, danh_gia: ['tot', 'kha', 'can_cai_thien'].includes(x.danh_gia) ? x.danh_gia : 'kha', nhan_xet: dinhDangSo(x.nhan_xet) })),
      canh_bao: ds(kq.canh_bao, 3).map(dinhDangSo),
      hanh_dong: ds(kq.hanh_dong, 4).map(dinhDangSo),
      kiem_chung: { so_ten_sale_khong_co: saleGoc.length - saleLoc.length, so_khong_co_trong_du_lieu: soLa },
    };
    // Luu nhat ky: moi lan phan tich moi (khong tinh lan lay tu bo nho dem) la 1 ban ghi xem lai duoc.
    const { rows: [luu] } = await query(
      `INSERT INTO ai_nhan_xet_cham_soc (tu_ngay, den_ngay, ket_qua, so_lieu, nguoi_tao_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at`,
      [k.tu, k.den, JSON.stringify(ketQua), JSON.stringify(duLieu), user?.id ?? null],
    );
    return { ...ketQua, id: luu.id, tao_luc: luu.created_at, nguoi_tao: user?.ho_ten ?? null };
  })();
  cache.set(khoa, { het: Date.now() + 30 * 60 * 1000, hua });
  if (cache.size > 50) cache.delete(cache.keys().next().value);
  try { return await hua; } catch (e) { cache.delete(khoa); throw e; }
}

// ---------------- Lich su AI nhan xet ----------------
const DEM_DG = (g) => `(SELECT count(*)::int FROM jsonb_array_elements(a.ket_qua->'sale') x WHERE x->>'danh_gia' = '${g}')`;
export async function lichSuAi({ trang = 1, moi_trang = 20 } = {}) {
  const n = Math.min(Math.max(Number(moi_trang) || 20, 1), 100);
  const tr = Math.max(Number(trang) || 1, 1);
  const { rows } = await query(
    `SELECT a.id, to_char(a.tu_ngay, 'YYYY-MM-DD') AS tu, to_char(a.den_ngay, 'YYYY-MM-DD') AS den, a.created_at AS tao_luc,
            u.ho_ten AS nguoi_tao, left(a.ket_qua->>'tom_tat', 220) AS tom_tat,
            ${DEM_DG('tot')} AS so_tot, ${DEM_DG('kha')} AS so_kha, ${DEM_DG('can_cai_thien')} AS so_can_cai_thien,
            count(*) OVER()::int AS tong_so
       FROM ai_nhan_xet_cham_soc a LEFT JOIN users u ON u.id = a.nguoi_tao_id
      ORDER BY a.created_at DESC, a.id DESC LIMIT $1 OFFSET $2`,
    [n, (tr - 1) * n],
  );
  return { ds: rows.map(({ tong_so: _t, ...r }) => r), tong: rows[0]?.tong_so ?? 0, trang: tr, moi_trang: n };
}

export async function xemAi(id) {
  const { rows: [r] } = await query(
    `SELECT a.id, a.ket_qua, a.so_lieu, a.created_at AS tao_luc, u.ho_ten AS nguoi_tao
       FROM ai_nhan_xet_cham_soc a LEFT JOIN users u ON u.id = a.nguoi_tao_id WHERE a.id = $1`,
    [Number(id) || 0],
  );
  if (!r) throw new AppError(404, 'Không tìm thấy bản phân tích');
  return { ...r.ket_qua, id: r.id, tao_luc: r.tao_luc, nguoi_tao: r.nguoi_tao, so_lieu: r.so_lieu, ban_luu: true };
}
