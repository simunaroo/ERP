import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { AppError } from './AppError.js';

// Thu muc luu file nguoi dung tai len (khong nam trong git, xem .gitignore).
export const THU_MUC_UPLOAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../uploads');
const TOI_DA = 4 * 1024 * 1024;
// Nhan dang dinh dang bang "magic bytes" dau file, KHONG tin mime client gui len.
const DINH_DANG = [
  { ext: 'jpg', mime: 'image/jpeg', khop: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: 'png', mime: 'image/png', khop: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { ext: 'webp', mime: 'image/webp', khop: (b) => b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP' },
];

// anh: { data: base64 } -> luu vao uploads/<thuMuc>/<ten ngau nhien>.<ext>, tra ve duong dan tuong doi.
export async function luuAnhBase64(anh, thuMuc) {
  if (!anh || typeof anh.data !== 'string' || !/^[A-Za-z0-9+/]+=*$/.test(anh.data)) throw new AppError(400, 'Ảnh không hợp lệ');
  const buf = Buffer.from(anh.data, 'base64');
  if (buf.length === 0 || buf.length > TOI_DA) throw new AppError(400, 'Ảnh phải nhỏ hơn 4MB');
  const dd = DINH_DANG.find((d) => d.khop(buf));
  if (!dd) throw new AppError(400, 'Chỉ nhận ảnh JPG, PNG hoặc WEBP');
  // Ten file do server sinh ngau nhien -> khong the chen "../" de ghi ra ngoai thu muc (path traversal).
  const ten = `${thuMuc}/${crypto.randomUUID()}.${dd.ext}`;
  await fs.mkdir(path.join(THU_MUC_UPLOAD, thuMuc), { recursive: true });
  await fs.writeFile(path.join(THU_MUC_UPLOAD, ten), buf);
  return ten;
}

export function duongDanAnh(ten) {
  if (!ten || !/^[a-z_]+\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(ten)) return null; // chi file do server tao
  return { file: path.join(THU_MUC_UPLOAD, ten), mime: DINH_DANG.find((d) => ten.endsWith(d.ext)).mime };
}
