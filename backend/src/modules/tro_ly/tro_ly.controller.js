import * as service from './tro_ly.service.js';
import * as quanLy from './quan_ly.service.js';
import * as ncc from './ncc.service.js';

export async function dsTroLy(req, res) {
  res.json(await service.dsTroLy());
}

export async function layKienThuc(req, res) {
  res.json(await service.layKienThuc(req.params.id));
}

export async function luuKienThuc(req, res) {
  res.json(await service.luuKienThuc(req.user, req.params.id, req.body));
}

export async function docTaiLieu(req, res) {
  res.json(await service.docTaiLieu(req.user, req.params.id, req.body));
}

export async function dsHoiThoai(req, res) {
  res.json(await service.dsHoiThoai(req.user, req.query));
}

export async function chiTietHoiThoai(req, res) {
  res.json(await service.chiTietHoiThoai(req.user, req.params.id));
}

export async function xoaHoiThoai(req, res) {
  await service.xoaHoiThoai(req.user, req.params.id);
  res.status(204).end();
}

export async function hoi(req, res) {
  res.json(await service.hoi(req.user, req.body));
}

// ---- Tro ly quan ly (cham soc khach cua Sale)
export async function dsHoiThoaiQuanLy(req, res) {
  res.json(await quanLy.dsHoiThoai(req.user));
}

export async function hoiQuanLy(req, res) {
  res.json(await quanLy.hoi(req.user, req.body || {}));
}

// ---- Tro ly nha cung cap (gia nhap, chon NCC, cong no NCC)
export async function dsHoiThoaiNcc(req, res) {
  res.json(await ncc.dsHoiThoai(req.user));
}

export async function hoiNcc(req, res) {
  res.json(await ncc.hoi(req.user, req.body || {}));
}
