import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { AppError } from '../../utils/AppError.js';
import { THU_MUC_UPLOAD } from '../../utils/luuAnh.js';

// Sao luu: pg_dump (dinh dang custom, nen san) + nen thu muc anh bill (uploads). Moi lan sao luu = 1 bo file cung ten goc.
// Thu muc, so ban giu, gio chay doc tu .env luc goi (doi .env khong can sua code).
const chay = promisify(execFile);
const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
export const thuMuc = () => process.env.SAO_LUU_THU_MUC || path.join(GOC, 'sao-luu');
const soBanGiu = () => Math.max(1, Number(process.env.SAO_LUU_GIU) || 7);
const gioChay = () => Math.min(23, Math.max(0, Number(process.env.SAO_LUU_GIO ?? 2)));
const lenhPg = (ten) => (process.env.PG_BIN ? path.join(process.env.PG_BIN, ten) : ten);
// Windows: dung tar.exe co san cua he dieu hanh (bsdtar); tar cua Git Bash (GNU) hieu "C:" la ten may chu tu xa.
const lenhTar = () => (process.platform === 'win32' ? path.join(process.env.SystemRoot || 'C:/Windows', 'System32', 'tar.exe') : 'tar');
const TEN_HOP_LE = /^erp_[a-z0-9_]+_\d{8}-\d{6}(\.dump|_uploads\.tar\.gz)$/;

let dangChay = null;
let lanCuoi = null; // { luc, thanh_cong, loi?, ten? }

const dauThoiGian = (d = new Date()) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
};

async function thucHien(lyDo) {
  const db = process.env.PG_DATABASE;
  const ten = `erp_${db}_${dauThoiGian()}`;
  await fs.mkdir(thuMuc(), { recursive: true });
  const fileDb = path.join(thuMuc(), `${ten}.dump`);
  try {
    await chay(lenhPg('pg_dump'), ['-h', process.env.PG_HOST, '-p', String(process.env.PG_PORT || 5432), '-U', process.env.PG_USER, '-Fc', '-f', fileDb, db], {
      env: { ...process.env, PGPASSWORD: process.env.PG_PASSWORD }, timeout: 10 * 60 * 1000,
    });
    const coAnh = await fs.stat(THU_MUC_UPLOAD).then((s) => s.isDirectory()).catch(() => false);
    if (coAnh) await chay(lenhTar(), ['-czf', path.join(thuMuc(), `${ten}_uploads.tar.gz`), '-C', THU_MUC_UPLOAD, '.'], { timeout: 10 * 60 * 1000 });
    await donBanCu();
    lanCuoi = { luc: new Date(), thanh_cong: true, ten, ly_do: lyDo };
    return { ten, co_anh: coAnh };
  } catch (e) {
    await fs.unlink(fileDb).catch(() => {});
    lanCuoi = { luc: new Date(), thanh_cong: false, loi: e.stderr?.toString().trim() || e.message, ly_do: lyDo };
    throw new AppError(500, `Sao lưu thất bại: ${lanCuoi.loi}`);
  }
}

// Chi cho 1 lan sao luu chay cung luc (bam "Sao luu ngay" trung lich tu dong).
export async function saoLuu(lyDo = 'thu_cong') {
  if (dangChay) throw new AppError(409, 'Đang có một bản sao lưu chạy, vui lòng đợi');
  dangChay = thucHien(lyDo);
  try { return await dangChay; } finally { dangChay = null; }
}

async function danhSachFile() {
  const ds = await fs.readdir(thuMuc()).catch(() => []);
  const bo = {};
  for (const f of ds.filter((x) => TEN_HOP_LE.test(x))) {
    const goc = f.replace(/(\.dump|_uploads\.tar\.gz)$/, '');
    const st = await fs.stat(path.join(thuMuc(), f));
    (bo[goc] ||= { ten: goc, luc: st.mtime, file: [] }).file.push({ ten: f, kich_thuoc: st.size, loai: f.endsWith('.dump') ? 'csdl' : 'anh' });
  }
  return Object.values(bo).sort((a, b) => b.ten.localeCompare(a.ten));
}

async function donBanCu() {
  for (const b of (await danhSachFile()).slice(soBanGiu())) {
    for (const f of b.file) await fs.unlink(path.join(thuMuc(), f.ten)).catch(() => {});
  }
}

export async function trangThai() {
  return {
    thu_muc: thuMuc(), giu: soBanGiu(), gio: gioChay(), tu_dong: process.env.SAO_LUU_TU_DONG !== 'false',
    dang_chay: Boolean(dangChay), lan_cuoi: lanCuoi, ban_sao_luu: await danhSachFile(),
  };
}

// Duong dan file de tai ve: chi chap nhan ten dung mau (chong ../ doc file ngoai thu muc).
export async function duongDanFile(ten) {
  if (!TEN_HOP_LE.test(String(ten))) throw new AppError(400, 'Tên file không hợp lệ');
  const f = path.join(thuMuc(), ten);
  await fs.access(f).catch(() => { throw new AppError(404, 'Không tìm thấy bản sao lưu'); });
  return f;
}

// Lich tu dong: 10 phut kiem tra 1 lan, qua gio hen ma hom nay chua co ban sao luu thi chay.
export function batLichTuDong() {
  if (process.env.SAO_LUU_TU_DONG === 'false') return;
  const kiemTra = async () => {
    const now = new Date();
    if (now.getHours() < gioChay() || dangChay) return;
    const homNay = dauThoiGian(now).slice(0, 8);
    if ((await danhSachFile()).some((b) => b.ten.includes(`_${homNay}-`))) return;
    saoLuu('tu_dong').then((kq) => console.log(`Sao lưu tự động: ${kq.ten}`)).catch((e) => console.error(e.message));
  };
  setInterval(kiemTra, 10 * 60 * 1000).unref();
  setTimeout(kiemTra, 30 * 1000).unref();
  console.log(`Sao lưu tự động: hằng ngày sau ${gioChay()}:00, giữ ${soBanGiu()} bản tại ${thuMuc()}`);
}
