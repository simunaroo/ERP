// Reporter cho node:test: xuat bang ket qua kiem thu dang Markdown (dua vao chuong Kiem thu cua bao cao).
// Dung: npm run test:bao-cao  ->  backend/test/KET_QUA_KIEM_THU.md
import path from 'node:path';

export default async function* baoCaoMarkdown(nguon) {
  const nhom = new Map(); // ten suite -> [{ ma, mo_ta, ok, ms, loi }]
  let tong = 0; let dat = 0;
  for await (const ev of nguon) {
    if (ev.type !== 'test:pass' && ev.type !== 'test:fail') continue;
    const d = ev.data;
    if (d.details?.type === 'suite' || d.nesting === 0) continue; // chi lay ca kiem thu, bo dong tong cua suite/file
    const ten = d.name;
    const m = /^(TC-[A-Z]+-\d+):\s*(.*)$/.exec(ten);
    const suite = `${path.basename(d.file || '')}`;
    if (!nhom.has(suite)) nhom.set(suite, []);
    const ok = ev.type === 'test:pass';
    const loi = ok ? '' : String(d.details?.error?.cause?.message || d.details?.error?.message || '').split('\n')[0];
    nhom.get(suite).push({ ma: m ? m[1] : '', mo_ta: m ? m[2] : ten, ok, ms: Math.round(d.details?.duration_ms || 0), loi });
    tong++; if (ok) dat++;
  }
  const esc = (s) => String(s).replace(/\|/g, '\\|');
  let out = `# Kết quả kiểm thử tự động\n\nChạy lúc: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })} · Tổng **${tong}** ca · Đạt **${dat}** · Trượt **${tong - dat}**\n\n`;
  out += 'Môi trường: Node.js `node:test`, CSDL PostgreSQL riêng `datn_erp_test` tạo lại từ `schema.sql` + `seed.sql` cho mỗi nhóm, API gọi qua HTTP thật, Telegram giả lập.\n\n';
  for (const [suite, ds] of nhom) {
    out += `## ${suite}\n\n| Mã | Mô tả ca kiểm thử | Kết quả | Thời gian (ms) |\n|---|---|---|---|\n`;
    for (const c of ds) out += `| ${c.ma} | ${esc(c.mo_ta)} | ${c.ok ? '✅ Đạt' : `❌ Trượt: ${esc(c.loi)}`} | ${c.ms} |\n`;
    out += '\n';
  }
  yield out;
}
