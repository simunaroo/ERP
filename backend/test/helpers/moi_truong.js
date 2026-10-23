// Moi truong kiem thu dung chung: DB rieng (datn_erp_test), server chay trong tien trinh test, Telegram gia lap.
// Moi file test goi batDau() -> tao lai DB tu schema.sql + seed.sql -> cac file khong phu thuoc nhau.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// Dat bien moi truong TRUOC khi nap dotenv/app (dotenv khong ghi de bien da co).
process.env.PG_DATABASE = process.env.PG_DATABASE_TEST || 'datn_erp_test';
process.env.TELEGRAM_BOT_TOKEN = 'gia-lap';
process.env.TELEGRAM_CHAT_ID_DUYET = '-200';
process.env.TELEGRAM_CHAT_ID_NCC = '-100';
process.env.TELEGRAM_NGUOI_DUYET = 'giamdoc';
process.env.TELEGRAM_CHE_DO = 'webhook'; // khong polling
process.env.CONG_TY_NGAN_HANG = 'Vietcombank';
process.env.CONG_TY_STK = '0123456789';
process.env.CONG_TY_CHU_TK = 'CONG TY NST';
process.env.NHAP_SO_API_KEY = 'khoa-api-test';
process.env.NGAN_HANG_WEBHOOK_KEY = 'khoa-ngan-hang-test';
process.env.THU_MUC_UPLOAD = fs.mkdtempSync(path.join(os.tmpdir(), 'datn-test-uploads-'));
// Bao ve: chi chay tren DB co duoi _test (khong bao gio xoa nham DB phat trien).
if (!/_test$/.test(process.env.PG_DATABASE)) throw new Error(`Từ chối chạy test trên DB "${process.env.PG_DATABASE}" (tên phải kết thúc bằng _test)`);

// ---------- Telegram gia lap: chan moi request toi api.telegram.org, ghi lai de kiem tra ----------
export const telegram = { goi: [], msgId: 1000, loiGuiAnh: false };
const PNG_1x1 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
export const ANH_BILL = { data: PNG_1x1 };
const fetchThat = globalThis.fetch;
globalThis.fetch = async (url, opt = {}) => {
  const u = String(url);
  if (u.startsWith('https://api.telegram.org/file/')) return new Response(Buffer.from(PNG_1x1, 'base64'), { status: 200 });
  if (!u.startsWith('https://api.telegram.org/')) return fetchThat(url, opt);
  const method = u.split('/').pop();
  const body = JSON.parse(opt.body || '{}');
  telegram.goi.push({ method, body });
  const tl = (ok, result, description) => new Response(JSON.stringify({ ok, result, description }), { status: ok ? 200 : 400 });
  if (method === 'sendPhoto' && telegram.loiGuiAnh) return tl(false, null, 'wrong file identifier/HTTP URL specified');
  if (method === 'editMessageText' && telegram.goi.some((x) => x.method === 'sendPhoto' && String(x.body.chat_id) === String(body.chat_id) && x.msgId === body.message_id)) {
    return tl(false, null, 'Bad Request: there is no text in the message to edit');
  }
  if (method === 'sendMessage' || method === 'sendPhoto') {
    telegram.goi[telegram.goi.length - 1].msgId = ++telegram.msgId;
    return tl(true, { message_id: telegram.msgId, chat: { id: Number(body.chat_id) } });
  }
  if (method === 'getFile') return tl(true, { file_path: 'photos/bill.png' });
  return tl(true, true);
};
export const tinCuoi = (method, chat) => [...telegram.goi].reverse().find((x) => x.method === method && (!chat || String(x.body.chat_id) === String(chat)));

function chay(script) {
  const r = spawnSync(process.execPath, [script], { cwd: GOC, env: process.env, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`${script} lỗi:\n${r.stdout}\n${r.stderr}`);
}

// Tao lai DB, khoi dong server tren cong ngau nhien. Tra ve cong cu goi API + truy van DB.
export async function batDau() {
  chay('scripts/db-reset.js');
  chay('scripts/migrate.js');
  await import('dotenv/config');
  const { app } = await import('../../src/app.js');
  const db = await import('../../src/config/db.js');
  const server = await new Promise((res) => { const s = app.listen(0, () => res(s)); });
  const goc = `http://127.0.0.1:${server.address().port}/api`;

  const api = async (token, method, url, body) => {
    const r = await fetch(goc + url, {
      method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    let d = null;
    try { d = await r.json(); } catch { /* 204 */ }
    return { s: r.status, d };
  };
  const tokens = {};
  // Dang nhap; tai khoan Admin/Ke toan tu di qua xac thuc 2 lop (cai lan dau / nhap ma) bang ung dung Authenticator gia lap.
  const { maTai, buocHienTai } = await import('../../src/utils/totp.js');
  const khoa2fa = {}; const buocDaDung = {};
  const ma2fa = async (username) => {
    for (;;) {
      const b = Math.max(buocHienTai(), (buocDaDung[username] ?? -1) + 1);
      if (b <= buocHienTai() + 1) { buocDaDung[username] = b; return maTai(khoa2fa[username], b); }
      await new Promise((r) => setTimeout(r, 1000)); // da dung het ma trong cua so cho phep -> doi buoc moi
    }
  };
  const login = async (username, password = `${username}123456`) => {
    let r = await api(null, 'POST', '/auth/login', { username, password });
    if (r.s === 200 && r.d.buoc === 'cai_2fa') {
      const k = await api(null, 'POST', '/auth/2fa/khoi-tao', { ma_tam: r.d.ma_tam });
      khoa2fa[username] = k.d.khoa;
      r = await api(null, 'POST', '/auth/2fa/kich-hoat', { ma_tam: k.d.ma_tam, ma: await ma2fa(username) });
    } else if (r.s === 200 && r.d.buoc === 'nhap_ma_2fa') {
      r = await api(null, 'POST', '/auth/2fa/xac-minh', { ma_tam: r.d.ma_tam, ma: await ma2fa(username) });
    }
    if (r.s !== 200 || !r.d.token) throw new Error(`Đăng nhập ${username} lỗi: ${r.s} ${r.d?.message}`);
    tokens[username] = r.d.token;
    return r.d.token;
  };
  const sql = async (text, params) => (await db.query(text, params)).rows;
  const cho = (ms = 200) => new Promise((r) => setTimeout(r, ms));

  return {
    api, login, sql, cho, db, goc, khoa2fa, ma2fa,
    async ketThuc() {
      await new Promise((r) => server.close(r));
      await db.pool?.end?.().catch(() => {});
      fs.rmSync(process.env.THU_MUC_UPLOAD, { recursive: true, force: true });
    },
  };
}

// ---------- Tien ich nghiep vu dung chung ----------
export const homNay = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });

// Sale thilan tao + chot don cho khach 1 (khach cua thilan). Vat tu mac dinh: san SPC van go (2 NCC bao gia) + tam op nano (2 NCC).
export async function taoDonChot(ctx, tokenSale, tuyChon = {}) {
  const body = {
    khach_hang_id: 1, hinh_thuc: tuyChon.hinh_thuc || 'vat_tu', tinh_thanh: 'TP. Hồ Chí Minh', dia_chi_cong_trinh: 'Số 1 Đường Thử',
    dieu_khoan_nghiem_thu: 'theo_hop_dong', ngay_yc_lap_dat: homNay(), tien_coc: tuyChon.tien_coc ?? 0, ty_le_tam_ung: tuyChon.ty_le_tam_ung,
    vat_tu: tuyChon.vat_tu || [{ vat_tu_id: 3, so_luong_can: 10, don_gia: 300000 }, { vat_tu_id: 5, so_luong_can: 5, don_gia: 250000 }],
    chot: true,
  };
  const r = await ctx.api(tokenSale, 'POST', '/don-hang', body);
  if (r.s >= 300) throw new Error(`Tạo đơn lỗi ${r.s}: ${r.d?.message}`);
  return r.d;
}

// Dua don den "100% vat tu san hang": moi dong chon NCC re nhat -> dat hang -> NCC cho xuat hang (ghi nhan tren web).
export async function muaDuHang(ctx, tokenVh, donId) {
  let ct = (await ctx.api(tokenVh, 'GET', `/mua-hang/don/${donId}`)).d;
  for (const d of ct.dong) if (d.trang_thai === 'cho_xu_ly' && d.top_ncc.length) await ctx.api(tokenVh, 'PUT', `/mua-hang/dong/${d.id}`, { ncc_id: d.top_ncc[0].ncc_id });
  ct = (await ctx.api(tokenVh, 'GET', `/mua-hang/don/${donId}`)).d;
  for (const n of ct.ncc) {
    if (n.dong_cho_dat > 0) {
      const dh = await ctx.api(tokenVh, 'POST', `/mua-hang/don/${donId}/dat-hang`, { ncc_id: n.ncc_id });
      await ctx.api(tokenVh, 'POST', `/mua-hang/dat-hang/${dh.d.id}/phan-hoi`, { loai: 'xuat' });
    }
  }
  return (await ctx.api(tokenVh, 'GET', `/mua-hang/don/${donId}`)).d;
}

// Len phuong an -> buoc tiep theo (Mua hang voi don vat tu, Boc khoi luong voi don hoan thien).
export async function quaLenPhuongAn(ctx, tokenVh, donId) {
  await ctx.api(tokenVh, 'PATCH', `/don-hang/${donId}/phuong-an`, { phuong_an_van_chuyen: 'Xe tải 1,5 tấn', phuong_an_thi_cong: 'Thi công 1 ngày' });
  return ctx.api(tokenVh, 'POST', `/don-hang/${donId}/giai-doan`, { huong: 'tiep' });
}
