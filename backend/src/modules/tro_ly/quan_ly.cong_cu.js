import { query } from '../../config/db.js';
import { tongHop } from '../cham_soc/cham_soc.service.js';
import { thayKhongDau, anDanhTienTrongCau } from '../../utils/an_danh.js';

// "Cong cu" cua tro ly AI quan ly (function calling). Moi cong cu la mot truy van CHI DOC tren CSDL:
// Gemini chi chon cong cu + tham so, con so lieu do SQL tinh -> AI khong the bia con so.
// Bao mat thong tin khach: khach chi duoc gui duoi dang ma "KH-<id>" kem nhom, nguon, nhu cau, san pham quan tam;
// KHONG gui ten, so dien thoai, dia chi; van ban tu do cua Sale duoc che SDT, ten khach, so tien truoc khi gui (cheThongTin).
// Bi mat kinh doanh: so tien (doanh thu, gia tri don) gui duoi dang ma [[Tn]] (BiDanh) kem ty trong %.

const NGAY = /^\d{4}-\d{2}-\d{2}$/;
const TT = ['moi', 'khong_nghe_may', 'thue_bao', 'hen_goi_lai', 'quan_tam', 'chot', 'khong_quan_tam', 'sai_so'];
const TON_DONG = {
  qua_1_ngay_chua_goi: `k.trang_thai_cham_soc = 'moi' AND k.chia_luc < now() - interval '1 day'`,
  quan_tam_qua_3_ngay: `k.trang_thai_cham_soc = 'quan_tam' AND (SELECT max(c.created_at) FROM khach_hang_cham_soc c WHERE c.khach_hang_id = k.id) < now() - interval '3 days'`,
  hen_qua_gio: `k.trang_thai_cham_soc = 'hen_goi_lai' AND k.hen_goi_lai_luc < now()`,
};

const homNay = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
const truoc = (ngay) => new Date(Date.now() - ngay * 86400e3).toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
function ky(tu, den, macDinh = 30) {
  const t = NGAY.test(tu || '') ? tu : truoc(macDinh - 1);
  const d = NGAY.test(den || '') ? den : homNay();
  return t <= d ? { tu: t, den: d } : { tu: d, den: t };
}
const gioiHan = (n, md, max) => Math.min(Math.max(Number(n) || md, 1), max);
const boDau = (s) => String(s || '').normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();
const maKhach = (id) => `KH-${id}`;
const pt = (a, tong) => (Number(tong) > 0 ? Math.round((Number(a) / Number(tong)) * 1000) / 10 : null);
const idKhach = (ma) => { const m = String(ma ?? '').match(/(\d+)/); return m ? Number(m[1]) : null; };

// Che SDT, ten khach va so tien trong van ban tu do cua Sale (ghi chu, nhu cau, cau hoi tro ly) truoc khi gui AI:
// Sale doi khi go ca ten / so cua khach / gia chot vao ghi chu.
//   SDT: 0901000001, 0901 000 001, 0901.000.001, +84 901 000 001, (+84) 901000001, 84901000001 (khong che ma "DH-0001…").
//   Ten: ten day du (co dau / khong dau, hoa thuong) va cach goi "danh xung + ten" ("anh Hùng", "chị Thu Hà").
//   So tien: doi thanh ma [[Tn]] (BiDanh) nhu moi so tien khac gui AI.
const SDT = /(?<!\p{N})(?<![\p{L}\p{N}]-)(?:\(\s*\+?\s*84\s*\)|\+\s*84|84|0)[\s.-]*\d(?:[\s.-]*\d){7,9}(?!\p{N})/gu;
const DANH_XUNG = ['anh', 'chị', 'em', 'cô', 'chú', 'bác', 'ông', 'bà', 'a', 'c', 'e'];
export function cheThongTin(text, tenKhach, bd) {
  let s = String(text || '').normalize('NFC').replace(SDT, '[SĐT]');
  const ten = String(tenKhach || '').normalize('NFC').trim();
  if (ten.length >= 3) {
    s = thayKhongDau(s, ten, '[khách]');
    const tu = ten.split(/\s+/);
    const goi = new Set([tu.slice(-2).join(' '), tu.at(-1)].filter((x) => x && x !== ten));
    for (const g of goi) for (const dx of DANH_XUNG) s = thayKhongDau(s, `${dx} ${g}`, `${dx} [khách]`);
  }
  return bd ? anDanhTienTrongCau(s, bd) : s;
}

// Nhan "Lan", "thi lan", "Nguyễn Thị Lan" hoac id -> dung 1 Sale. Nhieu nguoi trung -> tra danh sach de AI hoi lai.
async function timSale(sale) {
  const { rows } = await query(`SELECT id, ho_ten, trang_thai FROM users WHERE vai_tro = 'sale' ORDER BY id`);
  if (sale === undefined || sale === null || sale === '') return { sale: null };
  if (/^\d+$/.test(String(sale))) {
    const r = rows.find((x) => x.id === Number(sale));
    return r ? { sale: r } : { loi: `Không có Sale mã ${sale}` };
  }
  const q = boDau(sale);
  const dung = rows.filter((x) => boDau(x.ho_ten) === q);
  const khop = dung.length ? dung : rows.filter((x) => boDau(x.ho_ten).endsWith(` ${q}`) || boDau(x.ho_ten).includes(q));
  if (khop.length === 1) return { sale: khop[0] };
  if (!khop.length) return { loi: `Không tìm thấy Sale tên "${sale}"`, cac_sale: rows.map((x) => x.ho_ten) };
  return { loi: `Có nhiều Sale khớp "${sale}", cần hỏi lại người dùng muốn xem ai`, ung_vien: khop.map((x) => x.ho_ten) };
}

// ---------------------------------------------------------------- khai bao cho Gemini
const S = (description, extra = {}) => ({ type: 'STRING', description, ...extra });
const I = (description) => ({ type: 'INTEGER', description });
const P_SALE = S('Tên Sale (đầy đủ hoặc tên gọi, ví dụ "Lan", "Nguyễn Thị Lan") hoặc mã Sale. Bỏ trống = tất cả Sale.');
const P_TU = S('Ngày bắt đầu, dạng YYYY-MM-DD. Bỏ trống = 30 ngày gần nhất.');
const P_DEN = S('Ngày kết thúc, dạng YYYY-MM-DD. Bỏ trống = hôm nay.');

export const CONG_CU = [
  {
    name: 'danh_sach_sale',
    description: 'Danh sách nhân viên Sale hiện có: tên, đang làm hay đã nghỉ, số khách đang giữ theo từng trạng thái chăm sóc và số khách tồn đọng. Dùng để biết có những Sale nào hoặc xem nhanh khối lượng khách của từng người.',
    parameters: { type: 'OBJECT', properties: {} },
  },
  {
    name: 'bao_cao_cham_soc',
    description: 'Chỉ số hiệu quả chăm sóc theo từng Sale trong một kỳ (tính trên khách được chia trong kỳ): số được chia, tỷ lệ đã liên hệ, thời gian gọi lần đầu trung bình (giờ), tỷ lệ gọi trong 2 giờ, số lần chăm sóc trung bình, số khách quan tâm/chốt/không quan tâm/sai số, số đơn và doanh thu TỪ CÁC KHÁCH ĐƯỢC CHIA TRONG KỲ; kèm số tồn đọng hiện tại. Dùng để so sánh, đánh giá chất lượng chăm sóc các Sale. Không dùng để xếp hạng doanh số bán hàng (dùng don_hang_cua_sale).',
    parameters: { type: 'OBJECT', properties: { tu_ngay: P_TU, den_ngay: P_DEN } },
  },
  {
    name: 'khach_hang_cua_sale',
    description: 'Danh sách khách một Sale đang giữ (mã khách, nhóm, nguồn, nhu cầu, sản phẩm quan tâm, trạng thái, ngày nhận số, lần chăm sóc cuối, số lần chăm sóc, lịch hẹn, số đơn). Có thể lọc theo trạng thái hoặc loại tồn đọng.',
    parameters: {
      type: 'OBJECT',
      properties: {
        sale: S('Tên hoặc mã Sale.'),
        trang_thai: S('Lọc theo trạng thái chăm sóc.', { enum: TT }),
        ton_dong: S('Chỉ lấy khách tồn đọng loại này.', { enum: Object.keys(TON_DONG) }),
        gioi_han: I('Số khách tối đa (mặc định 30, tối đa 60).'),
      },
      required: ['sale'],
    },
  },
  {
    name: 'nhat_ky_cham_soc',
    description: 'Các lần chăm sóc gần nhất kèm GHI CHÚ Sale đã viết (đã che số điện thoại, tên khách): thời điểm, Sale, mã khách, trạng thái ghi nhận, nội dung. Dùng để đánh giá Sale tư vấn, trao đổi với khách như thế nào, hoặc xem lịch sử chăm sóc của một khách.',
    parameters: {
      type: 'OBJECT',
      properties: {
        sale: P_SALE, ma_khach: S('Mã khách dạng KH-123 để xem lịch sử một khách.'),
        tu_ngay: P_TU, den_ngay: P_DEN, trang_thai: S('Chỉ lấy các lần ghi nhận trạng thái này.', { enum: TT }),
        gioi_han: I('Số dòng tối đa (mặc định 40, tối đa 80).'),
      },
    },
  },
  {
    name: 'don_hang_cua_sale',
    description: 'Doanh số bán hàng: đơn hàng đã chốt trong kỳ (theo ngày chốt, mọi khách): tổng số đơn, tổng giá trị và tỷ trọng % theo từng Sale và danh sách đơn (mã đơn, mã khách, sản phẩm, hình thức, giá trị, bước tiến độ hiện tại).',
    parameters: { type: 'OBJECT', properties: { sale: P_SALE, tu_ngay: P_TU, den_ngay: P_DEN } },
  },
  {
    name: 'cau_hoi_tro_ly_san_pham',
    description: 'Các câu Sale đã hỏi trợ lý AI sản phẩm (Cửa, Sàn, Tấm ốp) khi tư vấn: thời điểm, Sale, sản phẩm, mã khách (nếu có), câu hỏi. Dùng để biết Sale đang tư vấn sản phẩm gì, hay vướng ở đâu.',
    parameters: { type: 'OBJECT', properties: { sale: P_SALE, tu_ngay: P_TU, den_ngay: P_DEN, gioi_han: I('Số câu tối đa (mặc định 30, tối đa 60).') } },
  },
];

// ---------------------------------------------------------------- thuc thi
const THUC_THI = {
  async danh_sach_sale() {
    const { rows } = await query(
      `SELECT u.id AS sale_id, u.ho_ten AS ten, CASE WHEN u.trang_thai = 'active' THEN 'đang làm' ELSE 'đã nghỉ' END AS tinh_trang,
              count(k.id)::int AS so_khach_dang_giu,
              ${TT.map((t) => `count(*) FILTER (WHERE k.trang_thai_cham_soc = '${t}')::int AS ${t}`).join(', ')},
              ${Object.entries(TON_DONG).map(([ten, dk]) => `count(*) FILTER (WHERE ${dk})::int AS ton_${ten}`).join(', ')}
         FROM users u LEFT JOIN khach_hang k ON k.sale_phu_trach_id = u.id
        WHERE u.vai_tro = 'sale' GROUP BY u.id ORDER BY u.trang_thai, u.ho_ten`,
    );
    return { sale: rows };
  },

  async bao_cao_cham_soc({ tu_ngay, den_ngay }, bd) {
    const k = ky(tu_ngay, den_ngay);
    const r = await tongHop(k);
    // Doanh thu la bi mat kinh doanh: gui ma [[Tn]] + ty trong % (AI van so sanh duoc cac Sale).
    const dt = Number(r.tong.doanh_thu);
    const tien = (x) => ({ ...x, doanh_thu: bd.soTien(x.doanh_thu), ty_trong_doanh_thu_pct: pt(x.doanh_thu, dt) });
    return { ...r, sale: r.sale.map(tien), tong: { ...r.tong, doanh_thu: bd.soTien(dt) } };
  },

  async khach_hang_cua_sale({ sale, trang_thai, ton_dong, gioi_han }, bd) {
    const s = await timSale(sale);
    if (!s.sale) return s.loi ? s : { loi: 'Cần cho biết Sale nào' };
    const dk = ['k.sale_phu_trach_id = $1'];
    const ts = [s.sale.id];
    if (TT.includes(trang_thai)) { ts.push(trang_thai); dk.push(`k.trang_thai_cham_soc = $${ts.length}`); }
    if (TON_DONG[ton_dong]) dk.push(TON_DONG[ton_dong]);
    ts.push(gioiHan(gioi_han, 30, 60));
    const { rows } = await query(
      `SELECT k.id, k.nhom_khach_hang AS nhom, k.nguon, k.nhu_cau, k.ten, k.trang_thai_cham_soc AS trang_thai,
              to_char(k.chia_luc AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD HH24:MI') AS nhan_so_luc,
              to_char(k.hen_goi_lai_luc AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD HH24:MI') AS hen_goi_lai_luc,
              (SELECT to_char(max(c.created_at) AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD HH24:MI') FROM khach_hang_cham_soc c WHERE c.khach_hang_id = k.id) AS cham_soc_cuoi,
              (SELECT count(*)::int FROM khach_hang_cham_soc c WHERE c.khach_hang_id = k.id) AS so_lan_cham_soc,
              (SELECT count(*)::int FROM don_hang d WHERE d.khach_hang_id = k.id AND d.trang_thai NOT IN ('nhap', 'huy')) AS so_don,
              (SELECT string_agg(l.ten, ', ' ORDER BY l.id) FROM khach_hang_san_pham sp JOIN loai_vat_tu l ON l.id = sp.loai_vat_tu_id WHERE sp.khach_hang_id = k.id) AS san_pham_quan_tam,
              count(*) OVER()::int AS tong
         FROM khach_hang k WHERE ${dk.join(' AND ')}
        ORDER BY COALESCE((SELECT max(c.created_at) FROM khach_hang_cham_soc c WHERE c.khach_hang_id = k.id), k.chia_luc, k.created_at) DESC
        LIMIT $${ts.length}`,
      ts,
    );
    return {
      sale: s.sale.ho_ten, tong_so_khach_khop: rows[0]?.tong ?? 0, so_dong_tra_ve: rows.length,
      khach: rows.map(({ id, ten, tong: _t, nhu_cau, ...r }) => ({ ma_khach: maKhach(id), ...r, nhu_cau: cheThongTin(nhu_cau, ten, bd) })),
    };
  },

  async nhat_ky_cham_soc({ sale, ma_khach, tu_ngay, den_ngay, trang_thai, gioi_han }, bd) {
    const s = await timSale(sale);
    if (s.loi) return s;
    const kh = ma_khach ? idKhach(ma_khach) : null;
    // Xem lich su 1 khach: khong gioi han ky (lay ca lich su); con lai mac dinh 30 ngay.
    const k = kh && !tu_ngay && !den_ngay ? { tu: '2000-01-01', den: homNay() } : ky(tu_ngay, den_ngay);
    const ts = [k.tu, k.den];
    const dk = [`c.created_at >= ($1::date)::timestamptz`, `c.created_at < ($2::date + 1)::timestamptz`];
    if (s.sale) { ts.push(s.sale.id); dk.push(`c.sale_id = $${ts.length}`); }
    if (kh) { ts.push(kh); dk.push(`c.khach_hang_id = $${ts.length}`); }
    if (TT.includes(trang_thai)) { ts.push(trang_thai); dk.push(`c.trang_thai = $${ts.length}`); }
    ts.push(gioiHan(gioi_han, 40, 80));
    const { rows } = await query(
      `SELECT to_char(c.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD HH24:MI') AS luc, u.ho_ten AS sale,
              c.khach_hang_id, k.ten, c.trang_thai, c.noi_dung, count(*) OVER()::int AS tong
         FROM khach_hang_cham_soc c JOIN users u ON u.id = c.sale_id JOIN khach_hang k ON k.id = c.khach_hang_id
        WHERE ${dk.join(' AND ')} ORDER BY c.created_at DESC LIMIT $${ts.length}`,
      ts,
    );
    return {
      ky: k, tong_so_lan_cham_soc_khop: rows[0]?.tong ?? 0, so_dong_tra_ve: rows.length,
      cham_soc: rows.map((r) => ({ luc: r.luc, sale: r.sale, ma_khach: maKhach(r.khach_hang_id), trang_thai: r.trang_thai, ghi_chu: cheThongTin(r.noi_dung, r.ten, bd) || '(không ghi chú)' })),
    };
  },

  async don_hang_cua_sale({ sale, tu_ngay, den_ngay }, bd) {
    const s = await timSale(sale);
    if (s.loi) return s;
    const k = ky(tu_ngay, den_ngay);
    const ts = [k.tu, k.den];
    let dk = `dh.ngay_chot BETWEEN $1::date AND $2::date AND dh.trang_thai <> 'nhap'`;
    if (s.sale) { ts.push(s.sale.id); dk += ` AND dh.sale_id = $${ts.length}`; }
    const { rows } = await query(
      `SELECT dh.ma_don, dh.khach_hang_id, u.ho_ten AS sale, l.ten AS san_pham, dh.hinh_thuc, dh.trang_thai,
              CASE WHEN dh.trang_thai = 'huy' THEN 'đã huỷ' ELSE dh.giai_doan::text END AS buoc, t.tong_don,
              to_char(dh.ngay_chot, 'YYYY-MM-DD') AS ngay_chot
         FROM don_hang dh JOIN users u ON u.id = dh.sale_id JOIN v_don_hang_tien t ON t.don_hang_id = dh.id
         LEFT JOIN loai_vat_tu l ON l.id = dh.san_pham_id
        WHERE ${dk} ORDER BY dh.ngay_chot DESC, dh.id DESC`,
      ts,
    );
    const theoSale = {};
    for (const r of rows.filter((x) => x.trang_thai !== 'huy')) {
      const x = (theoSale[r.sale] ||= { so_don: 0, tong_gia_tri: 0 });
      x.so_don++; x.tong_gia_tri += Number(r.tong_don);
    }
    const tong = Object.values(theoSale).reduce((a, x) => a + x.tong_gia_tri, 0);
    return {
      ky: k, so_don_da_chot: rows.filter((x) => x.trang_thai !== 'huy').length, so_don_huy: rows.filter((x) => x.trang_thai === 'huy').length,
      tong_gia_tri: bd.soTien(tong),
      theo_sale: Object.fromEntries(Object.entries(theoSale).map(([ten, x]) => [ten, { so_don: x.so_don, tong_gia_tri: bd.soTien(x.tong_gia_tri), ty_trong_pct: pt(x.tong_gia_tri, tong) }])),
      don: rows.slice(0, 30).map((r) => ({ ma_don: r.ma_don, ma_khach: maKhach(r.khach_hang_id), sale: r.sale, san_pham: r.san_pham, hinh_thuc: r.hinh_thuc, gia_tri: bd.soTien(r.tong_don), buoc: r.buoc, ngay_chot: r.ngay_chot })),
      ghi_chu: rows.length > 30 ? `Chỉ liệt kê 30/${rows.length} đơn mới nhất; số liệu tổng tính trên tất cả.` : undefined,
    };
  },

  async cau_hoi_tro_ly_san_pham({ sale, tu_ngay, den_ngay, gioi_han }, bd) {
    const s = await timSale(sale);
    if (s.loi) return s;
    const k = ky(tu_ngay, den_ngay);
    const ts = [k.tu, k.den];
    let dk = `h.loai = 'san_pham' AND t.vai_tro = 'user' AND t.created_at >= ($1::date)::timestamptz AND t.created_at < ($2::date + 1)::timestamptz AND u.vai_tro = 'sale'`;
    if (s.sale) { ts.push(s.sale.id); dk += ` AND h.nguoi_id = $${ts.length}`; }
    ts.push(gioiHan(gioi_han, 30, 60));
    const { rows } = await query(
      `SELECT to_char(t.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD HH24:MI') AS luc, u.ho_ten AS sale, l.ten AS san_pham,
              h.khach_hang_id, k.ten, t.noi_dung, t.so_anh, count(*) OVER()::int AS tong
         FROM tro_ly_tin_nhan t JOIN tro_ly_hoi_thoai h ON h.id = t.hoi_thoai_id JOIN users u ON u.id = h.nguoi_id
         LEFT JOIN loai_vat_tu l ON l.id = h.loai_vat_tu_id LEFT JOIN khach_hang k ON k.id = h.khach_hang_id
        WHERE ${dk} ORDER BY t.created_at DESC LIMIT $${ts.length}`,
      ts,
    );
    return {
      ky: k, tong_so_cau_hoi: rows[0]?.tong ?? 0,
      cau_hoi: rows.map((r) => ({ luc: r.luc, sale: r.sale, san_pham: r.san_pham, ma_khach: r.khach_hang_id ? maKhach(r.khach_hang_id) : null, cau_hoi: cheThongTin(r.noi_dung, r.ten, bd), so_anh: r.so_anh })),
    };
  },
};

export async function thucThi(ten, thamSo, bd) {
  const f = THUC_THI[ten];
  if (!f) return { loi: `Không có công cụ ${ten}` };
  return f(thamSo || {}, bd);
}
