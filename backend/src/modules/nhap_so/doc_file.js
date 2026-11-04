import ExcelJS from 'exceljs';
import { AppError } from '../../utils/AppError.js';
import { NGUON } from './nhap_so.service.js';

// Doc file danh sach so (Excel .xlsx / CSV / TXT) -> cac dong { sdt, ten, dia_chi, nhu_cau, nguon }.
// Co dong tieu de (SDT, Ten, Dia chi, Nhu cau, Nguon) thi lay cot theo tieu de; khong co thi theo thu tu cot.
// Chi DOC, khong luu: frontend hien lai cho nguoi dung xem truoc roi moi goi API nhap.
const TOI_DA_BYTE = 2 * 1024 * 1024;
const TOI_DA_DONG = 1000;

const boDau = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().trim();
const TIEU_DE = [
  ['sdt', /^(sdt|so dien thoai|dien thoai|so dt|phone|mobile|sđt)$/],
  ['ten', /^(ten|ho ten|ten khach|ho va ten|khach hang|name)$/],
  ['dia_chi', /^(dia chi|khu vuc|dia chi \/ khu vuc|address)$/],
  ['nhu_cau', /^(nhu cau|ghi chu|noi dung|note)$/],
  ['nguon', /^(nguon|kenh|source)$/],
];
const THU_TU = ['sdt', 'ten', 'dia_chi', 'nhu_cau', 'nguon'];
const TEN_NGUON = { facebook: 'facebook', fb: 'facebook', zalo: 'zalo', google: 'google', website: 'website', web: 'website', tiktok: 'tiktok', 'gioi thieu': 'gioi_thieu', khac: 'khac' };

// Excel hay luu SDT dang so -> mat so 0 dau (912345678). 9-10 chu so khong co 0 dau thi them lai.
function sdtTuO(v) {
  const s = String(v ?? '').trim();
  return /^\d{9,10}$/.test(s) && !s.startsWith('0') && !s.startsWith('84') ? `0${s}` : s;
}

// CSV: tu nhan dau phan cach (phay / cham phay / tab), ho tro "o co dau phay" trong ngoac kep.
function docCsv(text) {
  const dau = [',', ';', '\t'].map((d) => [d, (text.split('\n')[0].match(new RegExp(d === '\t' ? '\t' : `\\${d}`, 'g')) || []).length])
    .sort((a, b) => b[1] - a[1])[0][0];
  const dong = []; let o = ''; let hang = []; let trongNgoac = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (trongNgoac) {
      if (c === '"' && text[i + 1] === '"') { o += '"'; i++; } else if (c === '"') trongNgoac = false; else o += c;
    } else if (c === '"') trongNgoac = true;
    else if (c === dau) { hang.push(o); o = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      hang.push(o); dong.push(hang); hang = []; o = '';
    } else o += c;
  }
  if (o || hang.length) { hang.push(o); dong.push(hang); }
  return dong;
}

// TXT: moi dong "SDT | Ten | Dia chi | Nhu cau" (phan cach | ; hoac tab) — giong o "Dan nhieu so".
const docTxt = (text) => text.split(/\r?\n/).map((d) => d.split(/\t|\||;/));

async function docXlsx(buf) {
  const wb = new ExcelJS.Workbook();
  try { await wb.xlsx.load(buf); } catch { throw new AppError(400, 'Không đọc được file Excel (chỉ hỗ trợ .xlsx)'); }
  const ws = wb.worksheets[0];
  if (!ws) return [];
  const dong = [];
  ws.eachRow({ includeEmpty: false }, (row) => {
    const o = [];
    for (let c = 1; c <= Math.min(row.cellCount, 10); c++) {
      const v = row.getCell(c).value;
      o.push(v && typeof v === 'object' ? (v.text ?? v.result ?? v.richText?.map((r) => r.text).join('') ?? '') : (v ?? ''));
    }
    dong.push(o);
  });
  return dong;
}

export async function docFile({ ten, data }) {
  const tenFile = String(ten || '').toLowerCase();
  const buf = Buffer.from(String(data || '').replace(/^data:[^,]*,/, ''), 'base64');
  if (!buf.length) throw new AppError(400, 'File rỗng');
  if (buf.length > TOI_DA_BYTE) throw new AppError(400, 'File quá 2 MB');
  let bang;
  if (tenFile.endsWith('.xlsx')) bang = await docXlsx(buf);
  else if (tenFile.endsWith('.xls')) throw new AppError(400, 'File .xls (Excel cũ) chưa hỗ trợ — hãy "Lưu thành" .xlsx hoặc .csv');
  else {
    const text = buf.toString('utf8').replace(/^﻿/, '');
    bang = tenFile.endsWith('.csv') ? docCsv(text) : docTxt(text);
  }
  bang = bang.map((h) => h.map((x) => String(x ?? '').trim())).filter((h) => h.some(Boolean));
  if (!bang.length) throw new AppError(400, 'File không có dữ liệu');

  // Tim dong tieu de (co cot SDT) trong 5 dong dau — file mau co dong tieu de chung + mo ta phia tren; bo cac dong truoc no.
  let cot = THU_TU;
  for (let i = 0; i < Math.min(5, bang.length); i++) {
    const theoTieuDe = bang[i].map((t) => TIEU_DE.find(([, re]) => re.test(boDau(t)))?.[0] ?? null);
    if (theoTieuDe.includes('sdt')) { cot = theoTieuDe; bang = bang.slice(i + 1); break; }
  }
  if (bang.length > TOI_DA_DONG) throw new AppError(400, `File có ${bang.length} dòng, tối đa ${TOI_DA_DONG} dòng mỗi lần`);

  const dong = bang.map((h) => {
    const x = {};
    cot.forEach((k, i) => { if (k && h[i] && !x[k]) x[k] = h[i]; });
    if (x.sdt) x.sdt = sdtTuO(x.sdt);
    if (x.nguon) x.nguon = TEN_NGUON[boDau(x.nguon)] || (NGUON.includes(x.nguon) ? x.nguon : undefined);
    return x;
  }).filter((x) => x.sdt);
  return { ten_file: ten, so_dong: dong.length, bo_qua: bang.length - dong.length, theo_tieu_de: cot !== THU_TU, dong };
}

// File Excel mau de marketing dien.
export const fileMau = () => ({
  tenFile: 'mau-nhap-so.xlsx', tieuDe: 'DANH SÁCH SỐ KHÁCH TIỀM NĂNG', moTa: 'Giữ dòng tiêu đề ở dòng 4; chỉ cột SĐT bắt buộc. Nguồn: Facebook, Zalo, Google, Website, TikTok, Giới thiệu, Khác.',
  cot: [{ key: 'sdt', nhan: 'SĐT', rong: 15 }, { key: 'ten', nhan: 'Tên', rong: 22 }, { key: 'dia_chi', nhan: 'Địa chỉ', rong: 28 }, { key: 'nhu_cau', nhan: 'Nhu cầu', rong: 36 }, { key: 'nguon', nhan: 'Nguồn', rong: 12 }],
  dong: [
    { sdt: '0912345678', ten: 'Anh Nam', dia_chi: 'Cầu Giấy, Hà Nội', nhu_cau: 'Lát sàn gỗ phòng khách 40m2', nguon: 'Facebook' },
    { sdt: '0987654321', ten: 'Chị Lan', dia_chi: 'Quận 7, TP.HCM', nhu_cau: 'Ốp tường nano phòng ngủ', nguon: 'Zalo' },
  ],
});
