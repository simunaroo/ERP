import * as service from './mua_hang.service.js';

const id = (req) => Number(req.params.id);
export const dsDon = async (req, res) => res.json(await service.dsDon(req.user, req.query));
export const chiTietDon = async (req, res) => res.json(await service.chiTietDon(req.user, id(req)));
export const capNhatDong = async (req, res) => res.json(await service.capNhatDong(req.user, id(req), req.body || {}));
export const datHang = async (req, res) => res.status(201).json(await service.datHang(req.user, id(req), Number(req.body?.ncc_id)));
export const luiSanHang = async (req, res) => res.json(await service.luiSanHang(req.user, id(req), Number(req.body?.ncc_id)));
export const phanHoiNcc = async (req, res) => res.json(await service.phanHoiNccWeb(req.user, id(req), req.body || {}));
export const huyDatHang = async (req, res) => res.json(await service.huyDatHang(req.user, id(req)));
export const layHang = async (req, res) => res.json(await service.layHang(req.user, id(req), Number(req.body?.ncc_id)));
export const dsMuaBoSung = async (req, res) => res.json(await service.dsMuaBoSung(req.user, req.query));
export const taoMuaBoSung = async (req, res) => res.status(201).json({ id: await service.taoMuaBoSung(req.user, req.body || {}) });
export const daMuaBoSung = async (req, res) => res.json(await service.daMuaBoSung(req.user, id(req), req.body || {}));
export async function huyMuaBoSung(req, res) {
  await service.huyMuaBoSung(id(req));
  res.status(204).end();
}
