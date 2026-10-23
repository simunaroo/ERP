import crypto from 'node:crypto';

// Ma hoa doi xung AES-256-GCM cho du lieu bi mat luu trong CSDL (khoa TOTP): lo file dump CSDL van khong doc duoc khoa.
// Khoa lay tu MA_HOA_KEY (khuyen nghi) hoac suy ra tu JWT_SECRET. Dinh dang luu: iv.tag.du_lieu (base64url).
const khoa = () => crypto.createHash('sha256').update(process.env.MA_HOA_KEY || `erp-nst:${process.env.JWT_SECRET}`).digest();

export function maHoa(chuoi) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', khoa(), iv);
  const du = Buffer.concat([c.update(String(chuoi), 'utf8'), c.final()]);
  return [iv, c.getAuthTag(), du].map((b) => b.toString('base64url')).join('.');
}

export function giaiMa(chuoi) {
  const [iv, tag, du] = String(chuoi).split('.').map((s) => Buffer.from(s, 'base64url'));
  const d = crypto.createDecipheriv('aes-256-gcm', khoa(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(du), d.final()]).toString('utf8');
}
