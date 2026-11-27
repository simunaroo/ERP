// Nap kien thuc tro ly AI tu sql/kien_thuc_tro_ly/*.md vao bang tro_ly_san_pham (theo ten loai san pham).
// Mac dinh CHI dien ho so dang trong (khong ghi de noi dung Admin da soan). Ghi de: them --ghi-de.
// Chay: npm run db:nap-kien-thuc            (DB theo PG_DATABASE trong .env)
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const THU_MUC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../sql/kien_thuc_tro_ly');
const FILE_THEO_SAN_PHAM = { 'cua.md': 'Cửa', 'san.md': 'Sàn', 'tam_op.md': 'Tấm ốp' };
const ghiDe = process.argv.includes('--ghi-de');

const db = new pg.Client({ host: process.env.PG_HOST, port: Number(process.env.PG_PORT), user: process.env.PG_USER, password: process.env.PG_PASSWORD, database: process.env.PG_DATABASE });
await db.connect();
console.log(`Nạp kiến thức trợ lý vào DB "${process.env.PG_DATABASE}"${ghiDe ? ' (GHI ĐÈ)' : ' (chỉ hồ sơ trống)'}...`);
try {
  for (const [file, tenSp] of Object.entries(FILE_THEO_SAN_PHAM)) {
    const sp = (await db.query('SELECT id FROM loai_vat_tu WHERE ten = $1', [tenSp])).rows[0];
    if (!sp) { console.log(`- ${tenSp}: không có trong danh mục, bỏ qua`); continue; }
    const noiDung = fs.readFileSync(path.join(THU_MUC, file), 'utf8').trim();
    const { rowCount } = await db.query(
      `INSERT INTO tro_ly_san_pham (loai_vat_tu_id, kien_thuc) VALUES ($1, $2)
       ON CONFLICT (loai_vat_tu_id) DO UPDATE SET kien_thuc = EXCLUDED.kien_thuc, cap_nhat_luc = now(), nguoi_cap_nhat_id = NULL
       WHERE $3 OR tro_ly_san_pham.kien_thuc = ''`,
      [sp.id, noiDung, ghiDe],
    );
    console.log(`- ${tenSp}: ${rowCount ? `đã nạp ${noiDung.length.toLocaleString('vi-VN')} ký tự` : 'đã có nội dung, giữ nguyên'}`);
  }
} finally {
  await db.end();
}
