import * as service from './tro_ly.service.js';

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
