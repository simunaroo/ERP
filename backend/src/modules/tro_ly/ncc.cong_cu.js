import { query } from '../../config/db.js';
import { tongHop as phanTichNcc } from '../phan_tich/phan_tich.service.js';
import { congNoNcc, congNoNccTheoDon } from '../cong_no/cong_no.service.js';
import { maNcc } from '../../utils/an_danh.js';

// "Cong cu" cua tro ly AI nha cung cap (function calling). Moi cong cu la truy van CHI DOC.
// Bi mat kinh doanh KHONG gui ra AI:
//   - Nha cung cap -> ma "NCC-<id>" (khong gui ten, dia chi, MST, so tai khoan).
//   - Moi so tien (gia nhap, tien mua, cong no, doanh thu) -> ma "[[Tn]]" qua BiDanh; AI chi chep lai ma.
//   - De AI van so sanh, xep hang duoc: kem so tuong doi do CODE tinh (chenh %, ty trong %, chi so gia, xep hang).
// Vat tu duoc gui ten that (khong bi mat) kem ma "VT-<id>".

const NGAY = /^\d{4}-\d{2}-\d{2}$/;
const homNay = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
const truoc = (ngay) => new Date(Date.now() - ngay * 86400e3).toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
function ky(tu, den, macDinh = 30) {
  const t = NGAY.test(tu || '') ? tu : truoc(macDinh - 1);
  const d = NGAY.test(den || '') ? den : homNay();
  return t <= d ? { tu: t, den: d } : { tu: d, den: t };
}
const gioiHan = (n, md, max) => Math.min(Math.max(Number(n) || md, 1), max);
const boDau = (s) => String(s || '').normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/\s+/g, ' ').trim();
const so = (v) => (v === null || v === undefined ? null : Number(v));
const pt = (a, tong) => (Number(tong) > 0 ? Math.round((Number(a) / Number(tong)) * 1000) / 10 : null);
const chenh = (gia, goc) => (Number(goc) > 0 ? Math.round(((Number(gia) - Number(goc)) / Number(goc)) * 1000) / 10 : null);
const maVt = (id) => `VT-${id}`;
const soTrongMa = (x, tienTo) => {
  const m = String(x ?? '').trim().match(new RegExp(`^(?:${tienTo}-?)?(\\d+)$`, 'i'));
  return m ? Number(m[1]) : null;
};

// "VT-3", "3", "sàn vân gỗ", "spc 4mm" -> dung 1 vat tu; nhieu vat tu khop -> tra danh sach de AI hoi lai.
async function timVatTu(x) {
  if (x === undefined || x === null || String(x).trim() === '') return { loi: 'Cần cho biết vật tư nào (mã VT-… hoặc tên)' };
  const { rows } = await query(
    `SELECT vt.id, vt.ten, vt.don_vi_tinh, vt.quy_cach, vt.trang_thai, l.ten AS loai, l.nguon_goc
       FROM vat_tu vt JOIN loai_vat_tu l ON l.id = vt.loai_vat_tu_id ORDER BY vt.id`,
  );
  const id = soTrongMa(x, 'VT');
  if (id) {
    const r = rows.find((v) => v.id === id);
    return r ? { vat_tu: r } : { loi: `Không có vật tư mã ${maVt(id)}` };
  }
  const q = boDau(x);
  const dung = rows.filter((v) => boDau(v.ten) === q);
  const tu = q.split(' ').filter(Boolean);
  const khop = dung.length ? dung : rows.filter((v) => tu.every((t) => boDau(`${v.ten} ${v.quy_cach || ''} ${v.loai}`).includes(t)));
  if (khop.length === 1) return { vat_tu: khop[0] };
  const ds = (khop.length ? khop : rows).slice(0, 20).map((v) => ({ ma: maVt(v.id), ten: v.ten, loai: v.loai }));
  return khop.length
    ? { loi: `Có ${khop.length} vật tư khớp "${x}", cần hỏi lại người dùng muốn xem vật tư nào`, ung_vien: ds }
    : { loi: `Không tìm thấy vật tư "${x}"`, mot_so_vat_tu: ds };
}

// "NCC-2" hoac so id. Ten NCC trong cau hoi da duoc doi sang ma truoc khi toi AI, nen AI truyen ma.
// Neu AI van truyen ten -> so khop o day nhung chi tra MA (khong bao gio tra ten that ra AI).
async function timNcc(x) {
  if (x === undefined || x === null || String(x).trim() === '') return { ncc: null };
  const { rows } = await query('SELECT id, ten, trang_thai FROM nha_cung_cap ORDER BY id');
  const id = soTrongMa(x, 'NCC');
  if (id) {
    const r = rows.find((n) => n.id === id);
    return r ? { ncc: r } : { loi: `Không có nhà cung cấp ${maNcc(id)}` };
  }
  const q = boDau(x);
  const khop = rows.filter((n) => boDau(n.ten).includes(q));
  if (khop.length === 1) return { ncc: khop[0] };
  return { loi: `Không xác định được nhà cung cấp "${x}"`, cac_ncc: (khop.length ? khop : rows).map((n) => maNcc(n.id)) };
}

// Thong ke dat hang voi NCC (toan bo lich su): so lan dat, thoi gian phan hoi TB, ty le huy, ty le yeu cau coc.
async function dichVuNcc(nccIds) {
  if (!nccIds.length) return new Map();
  const { rows } = await query(
    `SELECT ncc_id, count(*)::int AS so_lan_dat_hang,
            round((avg(EXTRACT(EPOCH FROM (phan_hoi_luc - created_at))) FILTER (WHERE phan_hoi_luc IS NOT NULL) / 3600)::numeric, 1) AS phan_hoi_tb_gio,
            round(100.0 * count(*) FILTER (WHERE trang_thai = 'huy') / count(*), 1) AS ty_le_huy_pct,
            round(100.0 * count(*) FILTER (WHERE so_tien_coc IS NOT NULL) / count(*), 1) AS ty_le_yeu_cau_coc_pct
       FROM dat_hang_ncc WHERE ncc_id = ANY($1) GROUP BY ncc_id`,
    [nccIds],
  );
  return new Map(rows.map((r) => [r.ncc_id, { ...r, phan_hoi_tb_gio: so(r.phan_hoi_tb_gio), ty_le_huy_pct: so(r.ty_le_huy_pct), ty_le_yeu_cau_coc_pct: so(r.ty_le_yeu_cau_coc_pct) }]));
}

// ---------------------------------------------------------------- khai bao cho Gemini
const S = (description, extra = {}) => ({ type: 'STRING', description, ...extra });
const I = (description) => ({ type: 'INTEGER', description });
const P_VT = S('Mã vật tư dạng VT-3 hoặc tên vật tư người dùng nói (ví dụ "sàn SPC vân gỗ").');
const P_NCC = S('Mã nhà cung cấp dạng NCC-2.');
const P_TU = S('Ngày bắt đầu YYYY-MM-DD. Bỏ trống = 30 ngày gần nhất.');
const P_DEN = S('Ngày kết thúc YYYY-MM-DD. Bỏ trống = hôm nay.');

export const CONG_CU = [
  {
    name: 'tim_vat_tu',
    description: 'Tìm vật tư theo từ khoá (tên, loại, quy cách) hoặc liệt kê vật tư: mã VT-…, tên, loại sản phẩm, đơn vị, quy cách, tự sản xuất hay mua ngoài, số NCC đang báo giá. Dùng khi chưa rõ người dùng nói vật tư nào.',
    parameters: { type: 'OBJECT', properties: { tu_khoa: S('Từ khoá; bỏ trống = tất cả vật tư.') } },
  },
  {
    name: 'so_sanh_ncc_cho_vat_tu',
    description: 'So sánh các nhà cung cấp đang báo giá MỘT vật tư: giá nhập hiện hành, chênh lệch % so với NCC rẻ nhất, thứ hạng giá, ngày áp dụng, số lần đổi giá và mức đổi trong 12 tháng, số lần đã mua mặt hàng này, lãi gộp ước tính so với giá bán gần đây, thời gian phản hồi đơn đặt hàng, tỷ lệ huỷ, tỷ lệ đòi cọc. Dùng cho câu "vật tư X nên mua của NCC nào".',
    parameters: { type: 'OBJECT', properties: { vat_tu: P_VT, ngay: S('Xem giá áp dụng tại ngày YYYY-MM-DD; bỏ trống = hôm nay.') }, required: ['vat_tu'] },
  },
  {
    name: 'lich_su_gia',
    description: 'Lịch sử bảng giá nhập của một vật tư (có thể lọc một NCC): từng mức giá, khoảng ngày áp dụng, % thay đổi so với mức trước của cùng NCC. Dùng để xem xu hướng giá, NCC nào hay tăng giá.',
    parameters: { type: 'OBJECT', properties: { vat_tu: P_VT, ncc: P_NCC }, required: ['vat_tu'] },
  },
  {
    name: 'thong_tin_ncc',
    description: 'Hồ sơ một nhà cung cấp: trạng thái hợp tác, các mặt hàng đang báo giá (giá, chênh % so với rẻ nhất, có phải rẻ nhất không), chỉ số giá chung, số lần đã mua, lần mua gần nhất, thống kê đặt hàng (phản hồi, huỷ, cọc), công nợ hiện tại.',
    parameters: { type: 'OBJECT', properties: { ncc: P_NCC }, required: ['ncc'] },
  },
  {
    name: 'xep_hang_ncc',
    description: 'Bảng xếp hạng các NCC đang hợp tác trong một kỳ: chỉ số giá (100 = ngang trung vị thị trường, nhỏ hơn là rẻ hơn), số mặt hàng báo giá, số mặt hàng rẻ nhất, số lần đổi giá và mức đổi TB trong kỳ, tiền đã mua và tỷ trọng %, số lần mua.',
    parameters: { type: 'OBJECT', properties: { tu_ngay: P_TU, den_ngay: P_DEN } },
  },
  {
    name: 'vat_tu_ban_chay',
    description: 'Vật tư bán chạy trong kỳ (theo đơn đã chốt): số lượng, doanh thu và tỷ trọng %, số đơn, tăng trưởng % so với kỳ trước, giá bán TB, giá mua rẻ nhất hiện tại và NCC rẻ nhất, lãi gộp ước tính %. Dùng để biết nên ưu tiên đàm phán / nhập mặt hàng nào.',
    parameters: { type: 'OBJECT', properties: { tu_ngay: P_TU, den_ngay: P_DEN, gioi_han: I('Số vật tư tối đa (mặc định 15, tối đa 40).') } },
  },
  {
    name: 'cong_no_ncc',
    description: 'Công nợ phải trả nhà cung cấp: tổng tiền hàng, đã chi, còn phải trả, chi thừa (đã cọc chưa có hàng), chờ chi, chờ duyệt; theo từng NCC (kèm tỷ trọng % số còn phải trả). Truyền ncc để xem chi tiết theo từng đơn hàng.',
    parameters: { type: 'OBJECT', properties: { ncc: P_NCC } },
  },
];

export const TEN_CONG_CU = {
  tim_vat_tu: 'Danh mục vật tư', so_sanh_ncc_cho_vat_tu: 'So sánh giá NCC', lich_su_gia: 'Lịch sử giá',
  thong_tin_ncc: 'Hồ sơ NCC', xep_hang_ncc: 'Xếp hạng NCC', vat_tu_ban_chay: 'Vật tư bán chạy', cong_no_ncc: 'Công nợ NCC',
};

// ---------------------------------------------------------------- thuc thi (bd: BiDanh cua luot hoi)
const THUC_THI = {
  async tim_vat_tu({ tu_khoa }) {
    const { rows } = await query(
      `SELECT vt.id, vt.ten, vt.don_vi_tinh, vt.quy_cach, vt.trang_thai, l.ten AS loai, l.nguon_goc,
              (SELECT count(DISTINCT g.ncc_id)::int FROM ncc_bang_gia g JOIN nha_cung_cap n ON n.id = g.ncc_id AND n.trang_thai = 'active'
                WHERE g.vat_tu_id = vt.id AND g.ngay_hieu_luc <= CURRENT_DATE AND (g.ngay_het_hieu_luc IS NULL OR g.ngay_het_hieu_luc >= CURRENT_DATE)) AS so_ncc_dang_bao_gia
         FROM vat_tu vt JOIN loai_vat_tu l ON l.id = vt.loai_vat_tu_id ORDER BY l.id, vt.ten`,
    );
    const tu = boDau(tu_khoa).split(' ').filter(Boolean);
    const khop = rows.filter((v) => tu.every((t) => boDau(`${v.ten} ${v.quy_cach || ''} ${v.loai}`).includes(t)));
    return {
      so_vat_tu: khop.length,
      vat_tu: khop.slice(0, 40).map((v) => ({
        ma: maVt(v.id), ten: v.ten, loai: v.loai, don_vi_tinh: v.don_vi_tinh, quy_cach: v.quy_cach,
        nguon_goc: v.nguon_goc === 'mua_ngoai' ? 'mua ngoài' : 'tự sản xuất', dang_kinh_doanh: v.trang_thai === 'active', so_ncc_dang_bao_gia: v.so_ncc_dang_bao_gia,
      })),
    };
  },

  async so_sanh_ncc_cho_vat_tu({ vat_tu, ngay }, bd) {
    const t = await timVatTu(vat_tu);
    if (!t.vat_tu) return t;
    const v = t.vat_tu;
    const n = NGAY.test(ngay || '') ? ngay : homNay();
    const [{ rows: gia }, { rows: doi }, { rows: mua }, { rows: [ban] }, { rows: cu }] = await Promise.all([
      query(
        `SELECT g.ncc_id, g.don_gia, to_char(g.ngay_hieu_luc, 'YYYY-MM-DD') AS ap_dung_tu, to_char(g.ngay_het_hieu_luc, 'YYYY-MM-DD') AS ap_dung_den
           FROM ncc_bang_gia g JOIN nha_cung_cap nc ON nc.id = g.ncc_id AND nc.trang_thai = 'active'
          WHERE g.vat_tu_id = $1 AND g.ngay_hieu_luc <= $2 AND (g.ngay_het_hieu_luc IS NULL OR g.ngay_het_hieu_luc >= $2)
          ORDER BY g.don_gia, g.ncc_id`, [v.id, n]),
      query(
        `SELECT m.ncc_id, count(*)::int AS so_lan, round(avg((m.don_gia - c.don_gia) / NULLIF(c.don_gia, 0) * 100), 1) AS tb_pct,
                (array_agg(round((m.don_gia - c.don_gia) / NULLIF(c.don_gia, 0) * 100, 1) ORDER BY m.ngay_hieu_luc DESC))[1] AS gan_nhat_pct
           FROM ncc_bang_gia m
           JOIN ncc_bang_gia c ON c.ncc_id = m.ncc_id AND c.vat_tu_id = m.vat_tu_id AND c.ngay_het_hieu_luc = m.ngay_hieu_luc - 1
          WHERE m.vat_tu_id = $1 AND m.ngay_hieu_luc > $2::date - 365 AND m.ngay_hieu_luc <= $2
          GROUP BY m.ncc_id`, [v.id, n]),
      // Lan da mua mat hang nay: dong mua cho don hang (tu "da dat hang" tro di) + mua bo sung da mua.
      query(
        `SELECT ncc_id, count(*)::int AS so_lan, to_char(max(luc), 'YYYY-MM-DD') AS gan_nhat FROM (
           SELECT m.ncc_id, m.cap_nhat_luc AS luc FROM mua_hang_dong m JOIN don_hang_vat_tu d ON d.id = m.don_hang_vat_tu_id
            WHERE d.vat_tu_id = $1 AND m.ncc_id IS NOT NULL AND m.trang_thai NOT IN ('cho_xu_ly', 'dang_hoi', 'huy')
           UNION ALL
           SELECT b.ncc_id, b.ngay_mua::timestamptz FROM mua_bo_sung b JOIN mua_bo_sung_dong bd ON bd.mua_bo_sung_id = b.id
            WHERE bd.vat_tu_id = $1 AND b.trang_thai = 'da_mua') x
         GROUP BY ncc_id`, [v.id]),
      // Gia ban TB 90 ngay gan nhat -> lai gop uoc tinh cho tung muc gia nhap.
      query(
        `SELECT sum(d.so_luong_can * d.don_gia) / NULLIF(sum(d.so_luong_can), 0) AS gia_ban_tb
           FROM don_hang_vat_tu d JOIN don_hang dh ON dh.id = d.don_hang_id
          WHERE d.vat_tu_id = $1 AND dh.trang_thai NOT IN ('nhap', 'huy') AND dh.ngay_chot > $2::date - 90 AND dh.ngay_chot <= $2`, [v.id, n]),
      // NCC tung bao gia nhung nay het hieu luc / ngung hop tac.
      query(
        `SELECT DISTINCT g.ncc_id FROM ncc_bang_gia g JOIN nha_cung_cap nc ON nc.id = g.ncc_id
          WHERE g.vat_tu_id = $1 AND g.ngay_hieu_luc <= $2 AND NOT (nc.trang_thai = 'active' AND (g.ngay_het_hieu_luc IS NULL OR g.ngay_het_hieu_luc >= $2))`, [v.id, n]),
    ]);
    const mDoi = new Map(doi.map((r) => [r.ncc_id, r]));
    const mMua = new Map(mua.map((r) => [r.ncc_id, r]));
    const dv = await dichVuNcc(gia.map((g) => g.ncc_id));
    const reNhat = gia.length ? Number(gia[0].don_gia) : null;
    const giaBan = ban?.gia_ban_tb ? Number(ban.gia_ban_tb) : null;
    const coGia = new Set(gia.map((g) => g.ncc_id));
    return {
      vat_tu: { ma: maVt(v.id), ten: v.ten, loai: v.loai, don_vi_tinh: v.don_vi_tinh, nguon_goc: v.nguon_goc === 'mua_ngoai' ? 'mua ngoài' : 'tự sản xuất' },
      ngay_xem_gia: n,
      so_ncc_dang_bao_gia: gia.length,
      gia_ban_tb_90_ngay: giaBan ? bd.soTien(giaBan) : null,
      ncc: gia.map((g) => {
        const d = mDoi.get(g.ncc_id);
        const m = mMua.get(g.ncc_id);
        const s = dv.get(g.ncc_id);
        return {
          ma: maNcc(g.ncc_id), hang_gia: gia.filter((x) => Number(x.don_gia) < Number(g.don_gia)).length + 1, don_gia: bd.soTien(g.don_gia),
          chenh_so_voi_re_nhat_pct: chenh(g.don_gia, reNhat), ap_dung_tu: g.ap_dung_tu, ap_dung_den: g.ap_dung_den,
          so_lan_doi_gia_12_thang: d?.so_lan ?? 0, doi_gia_tb_pct: so(d?.tb_pct), lan_doi_gan_nhat_pct: so(d?.gan_nhat_pct),
          so_lan_da_mua_mat_hang_nay: m?.so_lan ?? 0, lan_mua_gan_nhat: m?.gan_nhat ?? null,
          lai_gop_uoc_tinh_pct: giaBan ? Math.round(((giaBan - Number(g.don_gia)) / giaBan) * 1000) / 10 : null,
          so_lan_dat_hang: s?.so_lan_dat_hang ?? 0, phan_hoi_tb_gio: s?.phan_hoi_tb_gio ?? null,
          ty_le_huy_pct: s?.ty_le_huy_pct ?? null, ty_le_yeu_cau_coc_pct: s?.ty_le_yeu_cau_coc_pct ?? null,
        };
      }),
      ncc_tung_bao_gia_nay_khong_con: cu.map((r) => r.ncc_id).filter((id) => !coGia.has(id)).map(maNcc),
      ghi_chu: gia.length <= 1 ? 'Chỉ có tối đa 1 NCC báo giá: chưa đủ để so sánh, nên hỏi thêm NCC khác.' : undefined,
    };
  },

  async lich_su_gia({ vat_tu, ncc }, bd) {
    const t = await timVatTu(vat_tu);
    if (!t.vat_tu) return t;
    const nc = await timNcc(ncc);
    if (nc.loi) return nc;
    const ts = [t.vat_tu.id];
    let dk = 'g.vat_tu_id = $1';
    if (nc.ncc) { ts.push(nc.ncc.id); dk += ' AND g.ncc_id = $2'; }
    const { rows } = await query(
      `SELECT g.ncc_id, g.don_gia, to_char(g.ngay_hieu_luc, 'YYYY-MM-DD') AS tu, to_char(g.ngay_het_hieu_luc, 'YYYY-MM-DD') AS den,
              lag(g.don_gia) OVER (PARTITION BY g.ncc_id ORDER BY g.ngay_hieu_luc) AS gia_truoc
         FROM ncc_bang_gia g WHERE ${dk} ORDER BY g.ncc_id, g.ngay_hieu_luc`,
      ts,
    );
    return {
      vat_tu: { ma: maVt(t.vat_tu.id), ten: t.vat_tu.ten, don_vi_tinh: t.vat_tu.don_vi_tinh },
      so_muc_gia: rows.length,
      lich_su: rows.slice(-60).map((r) => ({
        ncc: maNcc(r.ncc_id), ap_dung_tu: r.tu, ap_dung_den: r.den || 'đang áp dụng', don_gia: bd.soTien(r.don_gia),
        doi_so_voi_muc_truoc_pct: r.gia_truoc ? chenh(r.don_gia, r.gia_truoc) : null,
      })),
    };
  },

  async thong_tin_ncc({ ncc }, bd) {
    const nc = await timNcc(ncc);
    if (!nc.ncc) return nc.loi ? nc : { loi: 'Cần cho biết NCC nào (mã NCC-…)' };
    const id = nc.ncc.id;
    const [{ rows: hang }, { rows: [mua] }, dv, cn] = await Promise.all([
      query(
        `WITH gia AS (
           SELECT g.ncc_id, g.vat_tu_id, g.don_gia FROM ncc_bang_gia g JOIN nha_cung_cap n ON n.id = g.ncc_id AND n.trang_thai = 'active'
            WHERE g.ngay_hieu_luc <= CURRENT_DATE AND (g.ngay_het_hieu_luc IS NULL OR g.ngay_het_hieu_luc >= CURRENT_DATE)
         ), tv AS (
           SELECT vat_tu_id, min(don_gia) AS re_nhat, percentile_cont(0.5) WITHIN GROUP (ORDER BY don_gia) AS trung_vi, count(*)::int AS so_ncc
             FROM gia GROUP BY vat_tu_id
         )
         SELECT vt.id, vt.ten, vt.don_vi_tinh, g.don_gia, tv.re_nhat, tv.trung_vi, tv.so_ncc
           FROM ncc_bang_gia g JOIN vat_tu vt ON vt.id = g.vat_tu_id LEFT JOIN tv ON tv.vat_tu_id = g.vat_tu_id
          WHERE g.ncc_id = $1 AND g.ngay_hieu_luc <= CURRENT_DATE AND (g.ngay_het_hieu_luc IS NULL OR g.ngay_het_hieu_luc >= CURRENT_DATE)
          ORDER BY vt.ten`, [id]),
      query(
        `SELECT count(*)::int AS so_lan, to_char(max(luc), 'YYYY-MM-DD') AS gan_nhat FROM (
           SELECT m.cap_nhat_luc AS luc FROM mua_hang_dong m WHERE m.ncc_id = $1 AND m.trang_thai NOT IN ('cho_xu_ly', 'dang_hoi', 'huy')
           UNION ALL SELECT b.ngay_mua::timestamptz FROM mua_bo_sung b WHERE b.ncc_id = $1 AND b.trang_thai = 'da_mua') x`, [id]),
      dichVuNcc([id]),
      congNoNcc(),
    ]);
    const s = dv.get(id);
    const no = cn.ncc.find((r) => r.ncc_id === id);
    const coThiTruong = hang.filter((h) => h.trung_vi);
    return {
      ma: maNcc(id), dang_hop_tac: nc.ncc.trang_thai === 'active',
      so_mat_hang_dang_bao_gia: hang.length,
      chi_so_gia: coThiTruong.length ? Math.round((coThiTruong.reduce((a, h) => a + Number(h.don_gia) / Number(h.trung_vi), 0) / coThiTruong.length) * 100) : null,
      mat_hang: hang.map((h) => ({
        vat_tu: maVt(h.id), ten: h.ten, don_vi_tinh: h.don_vi_tinh, don_gia: bd.soTien(h.don_gia),
        so_ncc_bao_gia: h.so_ncc ?? 1, chenh_so_voi_re_nhat_pct: h.re_nhat ? chenh(h.don_gia, h.re_nhat) : null,
        la_re_nhat: h.re_nhat !== null && Number(h.don_gia) === Number(h.re_nhat) && (h.so_ncc ?? 1) > 1,
      })),
      so_lan_da_mua: mua?.so_lan ?? 0, lan_mua_gan_nhat: mua?.gan_nhat ?? null,
      dat_hang: s ? { so_lan: s.so_lan_dat_hang, phan_hoi_tb_gio: s.phan_hoi_tb_gio, ty_le_huy_pct: s.ty_le_huy_pct, ty_le_yeu_cau_coc_pct: s.ty_le_yeu_cau_coc_pct } : { so_lan: 0 },
      cong_no: no
        ? { tien_hang: bd.soTien(no.tien_hang), da_chi: bd.soTien(no.da_chi), con_phai_tra: bd.soTien(no.con_phai_tra), chi_thua: bd.soTien(no.chi_thua), trang_thai: no.trang_thai }
        : { trang_thai: 'chưa phát sinh' },
    };
  },

  async xep_hang_ncc({ tu_ngay, den_ngay }, bd) {
    const k = ky(tu_ngay, den_ngay);
    const th = await phanTichNcc({ tu: k.tu, den: k.den > homNay() ? homNay() : k.den });
    const tm = th.tong.tien_mua_ncc;
    return {
      ky: { tu: th.ky.tu, den: th.ky.den },
      tong_tien_mua: bd.soTien(tm),
      ncc: th.ncc.map((n) => ({
        ma: maNcc(n.ncc_id), chi_so_gia: n.chi_so_gia, so_mat_hang: n.so_mat_hang, so_mat_hang_re_nhat: n.so_mat_hang_re_nhat,
        so_lan_doi_gia: n.so_lan_doi_gia, doi_gia_tb_pct: n.doi_gia_tb_pct,
        tien_mua: bd.soTien(n.tien_mua), ty_trong_tien_mua_pct: pt(n.tien_mua, tm), so_lan_mua: n.so_lan_mua,
      })),
    };
  },

  async vat_tu_ban_chay({ tu_ngay, den_ngay, gioi_han }, bd) {
    const k = ky(tu_ngay, den_ngay);
    const th = await phanTichNcc({ tu: k.tu, den: k.den > homNay() ? homNay() : k.den });
    const dt = th.tong.doanh_thu;
    return {
      ky: { tu: th.ky.tu, den: th.ky.den }, tong_doanh_thu: bd.soTien(dt), doanh_thu_tang_pct: th.tong.doanh_thu_tang_pct,
      vat_tu: th.vat_tu.slice(0, gioiHan(gioi_han, 15, 40)).map((v) => ({
        ma: maVt(v.vat_tu_id), ten: v.ten, loai: v.loai, nguon_goc: v.nguon_goc === 'mua_ngoai' ? 'mua ngoài' : 'tự sản xuất', don_vi_tinh: v.don_vi_tinh,
        so_luong: v.so_luong, doanh_thu: bd.soTien(v.doanh_thu), ty_trong_doanh_thu_pct: pt(v.doanh_thu, dt), so_don: v.so_don,
        tang_truong_pct: v.tang_truong_pct, gia_ban_tb: v.gia_ban_tb ? bd.soTien(v.gia_ban_tb) : null,
        gia_mua_re_nhat: v.gia_mua_re_nhat ? bd.soTien(v.gia_mua_re_nhat) : null,
        ncc_re_nhat: v.ncc_re_nhat_id ? maNcc(v.ncc_re_nhat_id) : null, lai_gop_uoc_tinh_pct: v.lai_gop_uoc_tinh_pct,
      })),
    };
  },

  async cong_no_ncc({ ncc }, bd) {
    const nc = await timNcc(ncc);
    if (nc.loi) return nc;
    const cn = await congNoNcc();
    const tongCon = cn.tong.con_phai_tra;
    const dong = (r) => ({
      ma: maNcc(r.ncc_id), trang_thai: r.trang_thai, so_don: r.so_don,
      tien_hang: bd.soTien(r.tien_hang), da_chi: bd.soTien(r.da_chi), con_phai_tra: bd.soTien(r.con_phai_tra),
      ty_trong_con_phai_tra_pct: pt(r.con_phai_tra, tongCon), chi_thua: bd.soTien(r.chi_thua),
      cho_chi: bd.soTien(r.cho_chi), cho_duyet: bd.soTien(r.cho_duyet),
    });
    if (nc.ncc) {
      const r = cn.ncc.find((x) => x.ncc_id === nc.ncc.id);
      if (!r) return { ma: maNcc(nc.ncc.id), trang_thai: 'chưa phát sinh công nợ' };
      const don = await congNoNccTheoDon(nc.ncc.id);
      return {
        ...dong(r),
        theo_don: don.slice(0, 30).map((d) => ({ ma_don: d.ma_don, buoc: d.giai_doan, tien_hang: bd.soTien(d.tien_hang), da_chi: bd.soTien(d.da_chi), con: bd.soTien(d.con) })),
      };
    }
    return {
      tong: {
        tien_hang: bd.soTien(cn.tong.tien_hang), da_chi: bd.soTien(cn.tong.da_chi), con_phai_tra: bd.soTien(tongCon),
        chi_thua: bd.soTien(cn.tong.chi_thua), cho_chi: bd.soTien(cn.tong.cho_chi), cho_duyet: bd.soTien(cn.tong.cho_duyet),
      },
      ncc: cn.ncc.map(dong),
    };
  },
};

export async function thucThi(ten, thamSo, bd) {
  const f = THUC_THI[ten];
  if (!f) return { loi: `Không có công cụ ${ten}` };
  return f(thamSo || {}, bd);
}
