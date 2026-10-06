import * as service from './nha_cung_cap.service.js';

export const list = async (req, res) => res.json(await service.danhSach(req.query));
export const soSanhGia = async (req, res) => res.json(await service.soSanhGia(req.query));
export const detail = async (req, res) => res.json(await service.chiTiet(req.user, Number(req.params.id)));
export const create = async (req, res) => res.status(201).json(await service.tao(req.body));
export const update = async (req, res) => res.json(await service.sua(Number(req.params.id), req.body));
export const trangThai = async (req, res) => res.json(await service.doiTrangThai(Number(req.params.id), req.body?.trang_thai));
export const themStk = async (req, res) => res.status(201).json(await service.themStk(Number(req.params.id), req.body));
export async function xoaStk(req, res) {
  await service.xoaStk(Number(req.params.id), Number(req.params.stkId));
  res.status(204).end();
}
export const capNhatGia = async (req, res) => res.status(201).json(await service.capNhatGia(Number(req.params.id), req.body));
export async function ngungCungCap(req, res) {
  await service.ngungCungCap(Number(req.params.id), Number(req.params.vatTuId), req.body || {});
  res.status(204).end();
}
