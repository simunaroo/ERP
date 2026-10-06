import * as service from './khach_hang.service.js';

export async function list(req, res) {
  res.json(await service.danhSach(req.user, req.query));
}

export async function detail(req, res) {
  res.json(await service.chiTiet(req.user, Number(req.params.id)));
}

export async function create(req, res) {
  res.status(201).json(await service.taoKhach(req.user, req.body));
}

export async function chamSoc(req, res) {
  res.status(201).json(await service.ghiChamSoc(req.user, Number(req.params.id), req.body));
}
