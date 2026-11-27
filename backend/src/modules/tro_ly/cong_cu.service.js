import { query, withTransaction } from '../../config/db.js';
import { AppError } from '../../utils/AppError.js';
import * as repo from './tro_ly.repository.js';
import { traLoiCoCongCu } from '../../integrations/gemini.client.js';
import { BiDanh, anDanhNccTrongCau, anDanhTienTrongCau } from '../../utils/an_danh.js';

// Bo chay dung chung cho cac tro ly "co cong cu" (quan ly, nha cung cap):
//   cau hoi -> an danh ten NCC + so tien nguoi dung go -> Gemini chon cong cu -> backend chay SQL (so tien doi thanh ma [[Tn]], NCC thanh NCC-<id>)
//   -> Gemini viet cau tra loi bang ma -> code doi ma ve ten / so tien that -> luu ca 2 ban (that cho nguoi xem, an danh cho AI).

const CAU_HOI_TOI_DA = 1000;
const SO_LUOT_NHO = 6;

async function layHoiThoai(user, id, loai) {
  const ht = await repo.hoiThoai(Number(id));
  if (!ht || ht.nguoi_id !== user.id) throw new AppError(404, 'Không tìm thấy cuộc trò chuyện');
  if (ht.loai !== loai) throw new AppError(400, 'Cuộc trò chuyện thuộc trợ lý khác');
  return ht;
}

export async function hoiCoCongCu(user, { loai, hoi_thoai_id, noi_dung }, { taoPrompt, congCu, thucThi, tenCongCu }) {
  const cauHoi = typeof noi_dung === 'string' ? noi_dung.trim() : '';
  if (!cauHoi) throw new AppError(400, 'Vui lòng nhập câu hỏi');
  if (cauHoi.length > CAU_HOI_TOI_DA) throw new AppError(400, `Câu hỏi quá dài (tối đa ${CAU_HOI_TOI_DA} ký tự)`);
  const ht = hoi_thoai_id ? await layHoiThoai(user, hoi_thoai_id, loai) : null;
  const lichSu = ht ? await repo.tinNhan(ht.id, SO_LUOT_NHO * 2) : [];

  const { rows: dsNcc } = await query('SELECT id, ten FROM nha_cung_cap');
  // Nap ma tien cac luot truoc: AI co the nhac lai "[[T2]]" o cau tra loi cu; ma moi danh so tiep, khong trung.
  const bd = new BiDanh();
  lichSu.forEach((m) => bd.napLai(m.ma_tien));
  dsNcc.forEach((n) => bd.nhaCungCap(n.id, n.ten));
  // Nguoi dung tu go ten NCC (ca ten goi tat) hoac so tien ("giá 185.000") -> cung doi thanh ma truoc khi gui AI.
  const anDanh = (t) => anDanhTienTrongCau(anDanhNccTrongCau(t, dsNcc), bd);
  const cauHoiAi = anDanh(cauHoi);

  const { text, daGoi } = await traLoiCoCongCu({
    systemPrompt: taoPrompt(),
    // Lich su gui AI = ban an danh (tin cu truoc khi co cot noi_dung_ai: an danh lai ca ten NCC lan so tien da giai ma).
    lichSu: lichSu.map((m) => ({ vai_tro: m.vai_tro, noi_dung: m.noi_dung_ai ?? anDanh(m.noi_dung) })),
    cauHoi: cauHoiAi, congCu,
    thucThi: (ten, thamSo) => thucThi(ten, thamSo, bd),
    // Moi cau hoi can 2-3 luot goi: model chinh treo thi chuyen som sang model du phong.
    timeoutMs: 20000,
  });
  const hienThi = bd.giaiMa(text);

  const hoiThoaiId = await withTransaction(async (client) => {
    const id = ht ? ht.id : await repo.taoHoiThoai(client, { nguoiId: user.id, sanPhamId: null, khachHangId: null, tieuDe: cauHoi.slice(0, 80), loai });
    await repo.ghiLuot(client, id, { cauHoi, soAnh: 0, traLoi: hienThi, cauHoiAi, traLoiAi: text, maTienHoi: bd.maTrong(cauHoiAi), maTien: bd.maTrong(text) });
    return id;
  });
  // "Nguon du lieu" de nguoi dung biet AI da tra cuu gi (khong luu, chi hien ngay sau cau tra loi).
  const nguon = [...new Set(daGoi.map((g) => tenCongCu[g.ten] || g.ten))];
  return { hoi_thoai_id: hoiThoaiId, tra_loi: hienThi, nguon };
}

export const dsHoiThoai = (user, loai) => repo.dsHoiThoaiTheoLoai(user.id, loai);
