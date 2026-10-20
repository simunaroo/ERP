import { query, withTransaction } from '../../config/db.js';
import { AppError } from '../../utils/AppError.js';
import * as thongBao from '../thong_bao/thong_bao.service.js';

export const NGUON = ['facebook', 'zalo', 'google', 'website', 'tiktok', 'gioi_thieu', 'sale_tu_tim', 'khac'];
const TOI_DA_MOT_LAN = 200;

const chu = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);

// 0912 345 678 / +84912345678 / 84912345678 -> 0912345678. Tra null neu khong phai so di dong/co dinh VN.
export function chuanHoaSdt(v) {
  let s = String(v ?? '').replace(/\D/g, '');
  if (s.startsWith('84') && s.length >= 11) s = `0${s.slice(2)}`;
  return /^0\d{9,10}$/.test(s) ? s : null;
}

// Chon Sale nhan so: Sale dang hoat dong co ty le > 0, uu tien nguoi "thieu" nhieu nhat so voi ty le trong thang
// (min (da_chia + 1) / ty_le — cach chia ty le kieu D'Hondt), hoa thi ty le cao hon, roi id nho hon.
// Chua cau hinh ty le -> moi Sale ty le bang nhau (chia deu). Goi trong transaction da giu advisory lock 'chia_so'.
async function chonSale(client) {
  const { rows } = await client.query(
    `WITH cfg AS (
       SELECT u.id, CASE WHEN EXISTS (SELECT 1 FROM ty_le_chia_so) THEN COALESCE(t.ty_le, 0) ELSE 1 END AS ty_le
         FROM users u LEFT JOIN ty_le_chia_so t ON t.sale_id = u.id
        WHERE u.vai_tro = 'sale' AND u.trang_thai = 'active')
     SELECT c.id FROM cfg c
      WHERE c.ty_le > 0
      ORDER BY (SELECT count(*) + 1 FROM chia_so_log l
                 WHERE l.sale_id = c.id AND l.kieu = 'tu_dong' AND l.created_at >= date_trunc('month', now()))::numeric / c.ty_le,
               c.ty_le DESC, c.id
      LIMIT 1`,
  );
  return rows[0]?.id ?? null;
}

// Sale dang hoat dong -> ho ten; khong phai -> loi 400 (dung khi Admin chon / chuyen Sale).
async function saleHopLe(client, id) {
  const u = (await client.query(`SELECT ho_ten FROM users WHERE id = $1 AND vai_tro = 'sale' AND trang_thai = 'active'`, [Number(id)])).rows[0];
  if (!u) throw new AppError(400, 'Sale nhận phải là Sale đang hoạt động');
  return u.ho_ten;
}

// Nhap 1 hoac nhieu so. nguoiNhap = user dang nhap (form) hoac null (API tu dong).
// Sale nhap -> so thuoc chinh Sale do; Admin/API nhap -> giao cho Sale duoc chon (sale_id cua dong hoac cua ca lo),
// khong chon thi chia tu dong theo ty le. Chi so chia tu dong moi tinh vao ty le.
// Dong loi/trung bi bo qua, cac dong hop le van luu (tra ket qua tung dong de nguoi nhap biet).
export async function nhap(nguoiNhap, body, kenh = 'form') {
  const ds = Array.isArray(body?.ds) ? body.ds : body && (body.sdt || body.ten) ? [body] : [];
  if (!ds.length) throw new AppError(400, 'Chưa có số nào để nhập');
  if (ds.length > TOI_DA_MOT_LAN) throw new AppError(400, `Mỗi lần nhập tối đa ${TOI_DA_MOT_LAN} số`);
  const saleTuNhap = nguoiNhap?.vai_tro === 'sale';

  return withTransaction(async (client) => {
    // Khoa chung: hai lan nhap dong thoi khong chia lech ty le, khong lot so trung.
    await client.query(`SELECT pg_advisory_xact_lock(hashtext('chia_so'))`);
    const ketQua = [];
    for (const [i, d] of ds.entries()) {
      const dong = i + 1;
      const sdt = chuanHoaSdt(d.sdt);
      if (!sdt) { ketQua.push({ dong, sdt: d.sdt ?? null, loi: 'Số điện thoại không hợp lệ' }); continue; }
      const nguon = saleTuNhap && !d.nguon ? 'sale_tu_tim' : NGUON.includes(d.nguon) ? d.nguon : 'khac';

      const trung = (await client.query(
        `SELECT k.id, k.ten, k.trang_thai_cham_soc, s.ho_ten AS sale FROM khach_hang k JOIN users s ON s.id = k.sale_phu_trach_id
          WHERE k.sdt = $1 ORDER BY k.id LIMIT 1`, [sdt],
      )).rows[0];
      if (trung) { ketQua.push({ dong, sdt, trung: { khach_hang_id: trung.id, ten: trung.ten, sale: trung.sale, trang_thai: trung.trang_thai_cham_soc } }); continue; }

      const chon = saleTuNhap ? null : (d.sale_id || body.sale_id || null);
      if (chon) await saleHopLe(client, chon);
      const kieu = saleTuNhap ? 'sale_tu_nhap' : chon ? 'admin_chon' : 'tu_dong';
      const saleId = saleTuNhap ? nguoiNhap.id : chon ? Number(chon) : await chonSale(client);
      if (!saleId) throw new AppError(409, 'Không có Sale nào đang nhận số — vào "Quản lý chia số" đặt tỷ lệ cho ít nhất một Sale');
      const ten = chu(d.ten) || `Khách ${sdt.slice(-4)}`;
      const kh = (await client.query(
        `INSERT INTO khach_hang (ten, sdt, dia_chi, sale_phu_trach_id, nguon, nhu_cau, nguoi_nhap_id, chia_luc)
         VALUES ($1, $2, $3, $4, $5, $6, $7, now()) RETURNING id`,
        [ten, sdt, chu(d.dia_chi), saleId, nguon, chu(d.nhu_cau), nguoiNhap?.id ?? null],
      )).rows[0];
      await client.query(
        `INSERT INTO chia_so_log (khach_hang_id, sale_id, kieu, kenh, nguoi_nhap_id) VALUES ($1, $2, $3, $4, $5)`,
        [kh.id, saleId, kieu, kenh, nguoiNhap?.id ?? null],
      );
      if (!saleTuNhap) {
        await thongBao.gui(client, {
          nguoiIds: [saleId], nguoiGayId: nguoiNhap?.id ?? null, loai: 'so_moi',
          tieuDe: `Số mới: ${ten} · ${sdt}`, noiDung: [nguon, chu(d.nhu_cau)].filter(Boolean).join(' — '), link: `/khach-hang/${kh.id}`,
        });
      }
      const sale = (await client.query('SELECT ho_ten FROM users WHERE id = $1', [saleId])).rows[0].ho_ten;
      ketQua.push({ dong, sdt, khach_hang_id: kh.id, ten, sale_id: saleId, sale });
    }
    return {
      tao: ketQua.filter((k) => k.khach_hang_id).length,
      trung: ketQua.filter((k) => k.trung).length,
      loi: ketQua.filter((k) => k.loi).length,
      ket_qua: ketQua,
    };
  });
}

// So da nhap gan day: Admin thay tat ca, Sale thay so minh tu nhap.
export async function ganDay(user, { page, limit }) {
  const trang = Math.max(1, parseInt(page, 10) || 1);
  const soDong = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const loc = `WHERE l.kieu <> 'chuyen' AND ($1::int IS NULL OR l.nguoi_nhap_id = $1)`;
  const p = [user.vai_tro === 'sale' ? user.id : null];
  const [{ rows }, { rows: dem }] = await Promise.all([
    query(
      `SELECT l.id, l.created_at, l.kieu, l.kenh, k.id AS khach_hang_id, k.ten, k.sdt, k.nguon, k.nhu_cau, k.trang_thai_cham_soc,
              s.ho_ten AS sale, n.ho_ten AS nguoi_nhap
         FROM chia_so_log l JOIN khach_hang k ON k.id = l.khach_hang_id JOIN users s ON s.id = k.sale_phu_trach_id
         LEFT JOIN users n ON n.id = l.nguoi_nhap_id
         ${loc} ORDER BY l.id DESC LIMIT $2 OFFSET $3`,
      [...p, soDong, (trang - 1) * soDong],
    ),
    query(`SELECT count(*)::int AS tong FROM chia_so_log l ${loc}`, p),
  ]);
  return { items: rows, tong: dem[0].tong, page: trang, soTrang: Math.max(1, Math.ceil(dem[0].tong / soDong)) };
}

// Admin chuyen so/khach sang Sale khac (Sale nghi viec, qua tai, khach xin doi). Don hang cu giu nguyen Sale da tao.
export async function chuyenSale(user, khachId, { sale_id, ly_do }) {
  const lyDo = chu(ly_do);
  if (!lyDo) throw new AppError(400, 'Vui lòng ghi lý do chuyển');
  return withTransaction(async (client) => {
    const kh = (await client.query('SELECT id, ten, sdt, sale_phu_trach_id FROM khach_hang WHERE id = $1 FOR UPDATE', [khachId])).rows[0];
    if (!kh) throw new AppError(404, 'Không tìm thấy khách hàng');
    const den = Number(sale_id);
    const tenMoi = await saleHopLe(client, den);
    if (kh.sale_phu_trach_id === den) throw new AppError(400, 'Khách đang do Sale này phụ trách');
    await client.query('UPDATE khach_hang SET sale_phu_trach_id = $2, chia_luc = now() WHERE id = $1', [kh.id, den]);
    await client.query(
      `INSERT INTO chia_so_log (khach_hang_id, sale_id, kieu, kenh, nguoi_nhap_id, tu_sale_id, ly_do) VALUES ($1, $2, 'chuyen', 'form', $3, $4, $5)`,
      [kh.id, den, user.id, kh.sale_phu_trach_id, lyDo],
    );
    const ten = `${kh.ten}${kh.sdt ? ` · ${kh.sdt}` : ''}`;
    await thongBao.gui(client, { nguoiIds: [den], nguoiGayId: user.id, loai: 'so_moi', tieuDe: `Bạn được chuyển khách: ${ten}`, noiDung: lyDo, link: `/khach-hang/${kh.id}` });
    await thongBao.gui(client, { nguoiIds: [kh.sale_phu_trach_id], nguoiGayId: user.id, loai: 'so_chuyen', tieuDe: `Khách ${ten} đã chuyển cho ${tenMoi}`, noiDung: lyDo });
    return { khach_hang_id: kh.id, sale_id: den, sale: tenMoi };
  });
}

// Lich su giao so cua 1 khach (nhap, chia, chuyen) - hien o trang chi tiet khach.
export async function lichSuGiao(khachId) {
  const { rows } = await query(
    `SELECT l.id, l.kieu, l.kenh, l.ly_do, l.created_at, s.ho_ten AS sale, t.ho_ten AS tu_sale, n.ho_ten AS nguoi
       FROM chia_so_log l JOIN users s ON s.id = l.sale_id LEFT JOIN users t ON t.id = l.tu_sale_id LEFT JOIN users n ON n.id = l.nguoi_nhap_id
      WHERE l.khach_hang_id = $1 ORDER BY l.id DESC`, [khachId],
  );
  return rows;
}

// Bang quan ly: ty le cau hinh + thuc te thang nay (so chia tu dong, % thuc te, hom nay, da chot).
export async function tyLe() {
  const { rows } = await query(
    `SELECT u.id AS sale_id, u.ho_ten, t.ty_le,
            count(l.id) FILTER (WHERE l.created_at >= date_trunc('month', now()))::int AS thang_nay,
            count(l.id) FILTER (WHERE l.created_at >= date_trunc('day', now()))::int AS hom_nay,
            count(l.id) FILTER (WHERE l.created_at >= date_trunc('month', now()) AND k.trang_thai_cham_soc = 'chot')::int AS da_chot,
            count(l.id) FILTER (WHERE l.created_at >= date_trunc('month', now()) AND k.trang_thai_cham_soc = 'moi')::int AS chua_lien_he
       FROM users u LEFT JOIN ty_le_chia_so t ON t.sale_id = u.id
       LEFT JOIN chia_so_log l ON l.sale_id = u.id AND l.kieu = 'tu_dong'
       LEFT JOIN khach_hang k ON k.id = l.khach_hang_id
      WHERE u.vai_tro = 'sale' AND u.trang_thai = 'active'
      GROUP BY u.id, u.ho_ten, t.ty_le ORDER BY u.id`,
  );
  const daCauHinh = rows.some((r) => r.ty_le !== null);
  return { che_do: daCauHinh ? 'theo_ty_le' : 'chia_deu', api_da_cau_hinh: Boolean(process.env.NHAP_SO_API_KEY), sale: rows };
}

// Luu ty le moi (thay toan bo). Tong phai = 100%.
export async function luuTyLe(user, { ds }) {
  if (!Array.isArray(ds) || !ds.length) throw new AppError(400, 'Danh sách tỷ lệ trống');
  const sach = ds.map((d) => ({ sale_id: Number(d.sale_id), ty_le: Number(d.ty_le) }));
  if (sach.some((d) => !Number.isInteger(d.ty_le) || d.ty_le < 0 || d.ty_le > 100)) throw new AppError(400, 'Tỷ lệ phải là số nguyên từ 0 đến 100');
  if (new Set(sach.map((d) => d.sale_id)).size !== sach.length) throw new AppError(400, 'Một Sale xuất hiện nhiều lần');
  const tong = sach.reduce((a, d) => a + d.ty_le, 0);
  if (tong !== 100) throw new AppError(400, `Tổng tỷ lệ phải bằng 100% (hiện ${tong}%)`);
  await withTransaction(async (client) => {
    await client.query(`SELECT pg_advisory_xact_lock(hashtext('chia_so'))`);
    const hopLe = (await client.query(
      `SELECT id FROM users WHERE id = ANY($1::int[]) AND vai_tro = 'sale' AND trang_thai = 'active'`, [sach.map((d) => d.sale_id)],
    )).rows.length;
    if (hopLe !== sach.length) throw new AppError(400, 'Chỉ đặt tỷ lệ cho Sale đang hoạt động');
    await client.query('DELETE FROM ty_le_chia_so');
    for (const d of sach) {
      await client.query('INSERT INTO ty_le_chia_so (sale_id, ty_le, nguoi_cap_nhat_id) VALUES ($1, $2, $3)', [d.sale_id, d.ty_le, user.id]);
    }
  });
  return tyLe();
}
