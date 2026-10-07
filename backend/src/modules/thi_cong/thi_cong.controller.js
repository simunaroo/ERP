import * as service from './thi_cong.service.js';

const id = (req) => Number(req.params.id);
const donId = (req) => Number(req.params.donHangId);
export const dsDoiTho = async (req, res) => res.json(await service.dsDoiTho(req.query));
export const taoDoiTho = async (req, res) => res.status(201).json(await service.taoDoiTho(req.body || {}));
export const suaDoiTho = async (req, res) => res.json(await service.suaDoiTho(id(req), req.body || {}));
export const lich = async (req, res) => res.json(await service.lich(req.user, req.query));
export const theoDon = async (req, res) => res.json(await service.theoDon(req.user, donId(req)));
export const lapGiaiDoan = async (req, res) => res.status(201).json(await service.lapGiaiDoan(req.user, req.body || {}));
export const suaGiaiDoan = async (req, res) => res.json(await service.suaGiaiDoan(req.user, id(req), req.body || {}));
export const batDau = async (req, res) => res.json(await service.batDau(req.user, id(req)));
export const baoXong = async (req, res) => res.json(await service.baoXong(req.user, id(req)));
export const xemNghiemThu = async (req, res) => res.json(await service.xemNghiemThu(req.user, donId(req)));
export const luuNghiemThu = async (req, res) => res.json(await service.luuNghiemThu(req.user, donId(req), req.body || {}));
export const xacNhanNghiemThu = async (req, res) => res.json(await service.xacNhanNghiemThu(req.user, donId(req)));
export const themPhatSinh = async (req, res) => res.status(201).json(await service.themPhatSinh(req.user, req.body || {}));
export async function xoaPhatSinh(req, res) {
  await service.xoaPhatSinh(req.user, id(req));
  res.status(204).end();
}
export const dsChoQuyetToan = async (req, res) => res.json(await service.dsChoQuyetToan(req.user));
export const xemQuyetToan = async (req, res) => res.json(await service.xemQuyetToan(req.user, donId(req)));
export const chotQuyetToan = async (req, res) => res.json(await service.chotQuyetToan(req.user, donId(req)));
