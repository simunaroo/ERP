import crypto from 'node:crypto';

// TOTP (RFC 6238) — ma 6 so doi moi 30 giay, tuong thich Google Authenticator / Microsoft Authenticator.
// Ma = HOTP(khoa bi mat, buoc thoi gian = floor(unix / 30)); HOTP (RFC 4226) = HMAC-SHA1 roi "cat dong" lay 6 so.
const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export const BUOC_GIAY = 30;

export function base32(buf) {
  let bits = 0; let val = 0; let out = '';
  for (const b of buf) {
    val = (val << 8) | b; bits += 8;
    while (bits >= 5) { out += BASE32[(val >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += BASE32[(val << (5 - bits)) & 31];
  return out;
}

export function giaiBase32(s) {
  const sach = String(s).toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0; let val = 0; const out = [];
  for (const ch of sach) {
    val = (val << 5) | BASE32.indexOf(ch); bits += 5;
    if (bits >= 8) { out.push((val >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(out);
}

export const taoKhoa = () => base32(crypto.randomBytes(20)); // 160 bit, chuan cua RFC 4226

export const buocHienTai = (ms = Date.now()) => Math.floor(ms / 1000 / BUOC_GIAY);

export function maTai(khoa, buoc) {
  const dem = Buffer.alloc(8);
  dem.writeBigUInt64BE(BigInt(buoc));
  const h = crypto.createHmac('sha1', giaiBase32(khoa)).update(dem).digest();
  const o = h[h.length - 1] & 0xf;
  const so = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(so % 1e6).padStart(6, '0');
}

// Kiem tra ma, chap nhan lech +-1 buoc (dong ho dien thoai lech vai giay). Tra ve buoc khop (de chong dung lai) hoac null.
export function kiemTra(khoa, ma, buocCuoi = -1, ms = Date.now()) {
  const m = String(ma || '').replace(/\s/g, '');
  if (!/^\d{6}$/.test(m)) return null;
  const hienTai = buocHienTai(ms);
  for (const b of [hienTai - 1, hienTai, hienTai + 1]) {
    if (b > buocCuoi && crypto.timingSafeEqual(Buffer.from(maTai(khoa, b)), Buffer.from(m))) return b;
  }
  return null;
}

export const linkOtpauth = (khoa, taiKhoan, noiCap = 'ERP NST') =>
  `otpauth://totp/${encodeURIComponent(`${noiCap}:${taiKhoan}`)}?secret=${khoa}&issuer=${encodeURIComponent(noiCap)}&algorithm=SHA1&digits=6&period=${BUOC_GIAY}`;
