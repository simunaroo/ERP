import * as service from './don_hang.service.js';

export async function list(req, res) {
  res.json(await service.danhSach(req.user, req.query));
}

export async function detail(req, res) {
  res.json(await service.chiTiet(req.user, Number(req.params.id)));
}

export async function create(req, res) {
  res.status(201).json(await service.taoDonHang(req.user, req.body));
}

export async function updatePhuongAn(req, res) {
  res.json(await service.capNhatPhuongAn(req.user, Number(req.params.id), req.body));
}

export async function xuLyYeuCauSua(req, res) {
  res.json(await service.xuLyYeuCauSua(Number(req.params.id), Number(req.params.ycId)));
}

export async function createYeuCauSua(req, res) {
  res.status(201).json(await service.guiYeuCauSua(req.user, Number(req.params.id), req.body.noi_dung));
}
