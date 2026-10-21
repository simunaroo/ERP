import { query, withTransaction } from '../../config/db.js';
import { AppError } from '../../utils/AppError.js';

const VAI_TRO = ['sale', 'van_hanh', 'ke_toan', 'admin'];

// Bo nho dem quyen theo vai tro: moi request deu kiem tra quyen, tranh truy van lai; xoa khi Admin luu thay doi.
let boNho = null;
async function napBoNho() {
  if (!boNho) {
    const { rows } = await query('SELECT vai_tro::text, ma_quyen FROM vai_tro_quyen');
    boNho = Object.fromEntries(VAI_TRO.map((v) => [v, new Set()]));
    for (const r of rows) boNho[r.vai_tro].add(r.ma_quyen);
    boNho.admin.add('he_thong.quan_tri'); // Admin khong bao gio mat quyen quan tri (tranh tu khoa minh)
  }
  return boNho;
}

export async function quyenCua(vaiTro) {
  return [...((await napBoNho())[vaiTro] || [])];
}

export async function coQuyen(vaiTro, maQuyen) {
  const ds = (await napBoNho())[vaiTro];
  return Boolean(ds && maQuyen.some((m) => ds.has(m)));
}

export async function maTran() {
  const [{ rows: quyen }, bn] = await Promise.all([
    query('SELECT ma, ten, nhom, chi_admin FROM quyen ORDER BY thu_tu'),
    napBoNho(),
  ]);
  return { quyen, gan: Object.fromEntries(VAI_TRO.map((v) => [v, [...bn[v]]])) };
}

// Thay toan bo quyen cua 1 vai tro. Quyen quan tri luon giu cho Admin, khong gan duoc cho vai tro khac.
export async function luu(vaiTro, { quyen }) {
  if (!VAI_TRO.includes(vaiTro)) throw new AppError(400, 'Vai trò không hợp lệ');
  if (!Array.isArray(quyen)) throw new AppError(400, 'Danh sách quyền không hợp lệ');
  const { rows: tatCa } = await query('SELECT ma, chi_admin FROM quyen');
  const theoMa = new Map(tatCa.map((q) => [q.ma, q]));
  const ds = [...new Set(quyen)];
  const sai = ds.filter((m) => !theoMa.has(m));
  if (sai.length) throw new AppError(400, `Quyền không tồn tại: ${sai.join(', ')}`);
  if (vaiTro !== 'admin' && ds.some((m) => theoMa.get(m).chi_admin)) throw new AppError(400, 'Quyền quản trị hệ thống chỉ dành cho Admin');
  if (vaiTro === 'admin') for (const q of tatCa) if (q.chi_admin && !ds.includes(q.ma)) ds.push(q.ma);
  await withTransaction(async (client) => {
    await client.query('DELETE FROM vai_tro_quyen WHERE vai_tro = $1 AND NOT (ma_quyen = ANY($2::text[]))', [vaiTro, ds]);
    for (const m of ds) {
      await client.query('INSERT INTO vai_tro_quyen (vai_tro, ma_quyen) VALUES ($1, $2) ON CONFLICT DO NOTHING', [vaiTro, m]);
    }
  });
  boNho = null;
  return maTran();
}
