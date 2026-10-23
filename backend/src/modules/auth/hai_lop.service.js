import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import QRCode from 'qrcode';
import { query } from '../../config/db.js';
import { AppError } from '../../utils/AppError.js';
import * as totp from '../../utils/totp.js';
import { maHoa, giaiMa } from '../../utils/maHoa.js';

// Xac thuc 2 lop (TOTP). Buoc 1 (mat khau dung) chi cap "ma tam" 10 phut, ky bang khoa RIENG -> khong dung lam token dang nhap duoc.
// Buoc 2: nhap ma 6 so tu ung dung Authenticator (hoac 1 ma du phong) moi cap token that.
export const VAI_TRO_BAT_BUOC = ['admin', 'ke_toan'];
const khoaTam = () => `${process.env.JWT_SECRET}:2fa`;
export const batBuoc = (user) => process.env.BAT_BUOC_2FA !== 'false' && VAI_TRO_BAT_BUOC.includes(user.vai_tro);

export const kyMaTam = (user, muc, them = {}) =>
  jwt.sign({ id: user.id, muc, pv: user.phien_ban_token ?? 0, ...them }, khoaTam(), { expiresIn: '10m' });

function docMaTam(maTam, muc) {
  let p;
  try { p = jwt.verify(String(maTam || ''), khoaTam()); } catch { throw new AppError(401, 'Phiên xác thực đã hết hạn, vui lòng đăng nhập lại'); }
  if (p.muc !== muc) throw new AppError(401, 'Phiên xác thực không hợp lệ');
  return p;
}

async function layUser(id, pv) {
  const { rows } = await query(
    `SELECT id, ho_ten, username, vai_tro, trang_thai, phien_ban_token, totp_khoa, totp_buoc_cuoi, totp_ma_du_phong FROM users WHERE id = $1`, [id]);
  const u = rows[0];
  if (!u || u.trang_thai !== 'active' || u.phien_ban_token !== pv) throw new AppError(401, 'Phiên xác thực không hợp lệ, vui lòng đăng nhập lại');
  return u;
}

// Chong do ma: sai 5 lan / 15 phut theo tai khoan.
const lanSai = new Map();
function chanDo(id) {
  const x = lanSai.get(id);
  if (x && x.den > Date.now() && x.so >= 5) throw new AppError(429, `Nhập sai mã quá nhiều lần, thử lại sau ${Math.ceil((x.den - Date.now()) / 60000)} phút`);
}
function ghiSai(id) {
  const x = lanSai.get(id);
  lanSai.set(id, x && x.den > Date.now() ? { so: x.so + 1, den: x.den } : { so: 1, den: Date.now() + 15 * 60000 });
}

// Lan dau: tao khoa, tra QR de quet. Khoa nam trong "ma tam" da ky (khong luu DB cho toi khi kich hoat thanh cong).
export async function khoiTao({ ma_tam }) {
  const p = docMaTam(ma_tam, 'cai_dat');
  const u = await layUser(p.id, p.pv);
  if (u.totp_khoa) throw new AppError(409, 'Tài khoản đã bật xác thực 2 lớp');
  const khoa = totp.taoKhoa();
  const link = totp.linkOtpauth(khoa, u.username);
  return { ma_tam: kyMaTam(u, 'kich_hoat', { khoa }), qr: await QRCode.toDataURL(link, { margin: 1, width: 220 }), khoa, tai_khoan: u.username };
}

const taoMaDuPhong = () => Array.from({ length: 8 }, () => {
  const s = crypto.randomBytes(5).toString('hex').toUpperCase(); // 10 ky tu
  return `${s.slice(0, 5)}-${s.slice(5)}`;
});

// Nhap dung ma dau tien -> luu khoa (ma hoa), sinh 8 ma du phong (chi hien 1 lan), cap token dang nhap.
export async function kichHoat({ ma_tam, ma }, kyToken) {
  const p = docMaTam(ma_tam, 'kich_hoat');
  const u = await layUser(p.id, p.pv);
  chanDo(u.id);
  const buoc = totp.kiemTra(p.khoa, ma);
  if (buoc === null) { ghiSai(u.id); throw new AppError(400, 'Mã không đúng — kiểm tra lại giờ trên điện thoại và nhập mã mới'); }
  const maDuPhong = taoMaDuPhong();
  const hash = await Promise.all(maDuPhong.map((m) => bcrypt.hash(m, 8)));
  const { rowCount } = await query(
    `UPDATE users SET totp_khoa = $2, totp_bat_luc = now(), totp_buoc_cuoi = $3, totp_ma_du_phong = $4 WHERE id = $1 AND totp_khoa IS NULL`,
    [u.id, maHoa(p.khoa), buoc, hash]);
  if (!rowCount) throw new AppError(409, 'Tài khoản đã bật xác thực 2 lớp');
  lanSai.delete(u.id);
  return { ...(await kyToken(u)), ma_du_phong: maDuPhong };
}

// Dang nhap buoc 2: ma 6 so (khong dung lai ma cu) hoac ma du phong (dung xong bi xoa).
export async function xacMinh({ ma_tam, ma }, kyToken) {
  const p = docMaTam(ma_tam, 'xac_minh');
  const u = await layUser(p.id, p.pv);
  chanDo(u.id);
  const nhap = String(ma || '').trim().toUpperCase();
  if (/^\d{6}$/.test(nhap.replace(/\s/g, ''))) {
    const buoc = totp.kiemTra(giaiMa(u.totp_khoa), nhap, Number(u.totp_buoc_cuoi ?? -1));
    // Cap nhat co dieu kien: 2 request cung ma gui dong thoi chi 1 cai thanh cong.
    const ok = buoc !== null && (await query(
      'UPDATE users SET totp_buoc_cuoi = $2 WHERE id = $1 AND (totp_buoc_cuoi IS NULL OR totp_buoc_cuoi < $2)', [u.id, buoc])).rowCount === 1;
    if (!ok) { ghiSai(u.id); throw new AppError(400, 'Mã xác thực không đúng hoặc đã dùng'); }
  } else {
    const ds = u.totp_ma_du_phong || [];
    let viTri = -1;
    for (let i = 0; i < ds.length && viTri < 0; i++) if (await bcrypt.compare(nhap, ds[i])) viTri = i;
    if (viTri < 0) { ghiSai(u.id); throw new AppError(400, 'Mã xác thực không đúng hoặc đã dùng'); }
    await query('UPDATE users SET totp_ma_du_phong = $2 WHERE id = $1', [u.id, ds.filter((_, i) => i !== viTri)]);
  }
  lanSai.delete(u.id);
  return kyToken(u);
}

// Admin dat lai (nhan vien mat dien thoai): xoa khoa, dang xuat moi phien; lan dang nhap sau phai cai lai.
export async function datLai(id) {
  const { rowCount } = await query(
    `UPDATE users SET totp_khoa = NULL, totp_bat_luc = NULL, totp_buoc_cuoi = NULL, totp_ma_du_phong = NULL, phien_ban_token = phien_ban_token + 1
      WHERE id = $1 AND totp_khoa IS NOT NULL`, [id]);
  if (!rowCount) throw new AppError(409, 'Tài khoản chưa bật xác thực 2 lớp');
  return { id, da_dat_lai: true };
}
