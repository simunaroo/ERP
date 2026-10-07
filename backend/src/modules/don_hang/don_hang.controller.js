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

export async function update(req, res) {
  res.json(await service.suaDonNhap(req.user, Number(req.params.id), req.body));
}

export async function giaiDoan(req, res) {
  res.json(await service.chuyenGiaiDoan(req.user, Number(req.params.id), req.body || {}));
}

export async function huy(req, res) {
  res.json(await service.huyDon(req.user, Number(req.params.id), req.body || {}));
}

export async function doiPhuTrach(req, res) {
  res.json(await service.doiPhuTrach(req.user, Number(req.params.id), req.body || {}));
}

export async function baoGia(req, res) {
  res.json(await service.taoLinkBaoGia(req.user, Number(req.params.id), { taoMoi: req.body?.tao_moi === true }));
}

export async function remove(req, res) {
  await service.xoaDonNhap(req.user, Number(req.params.id));
  res.status(204).end();
}

export async function updatePhuongAn(req, res) {
  res.json(await service.capNhatPhuongAn(req.user, Number(req.params.id), req.body));
}

export async function xuLyYeuCauSua(req, res) {
  res.json(await service.xuLyYeuCauSua(req.user, Number(req.params.id), Number(req.params.ycId)));
}

export async function createYeuCauSua(req, res) {
  res.status(201).json(await service.guiYeuCauSua(req.user, Number(req.params.id), req.body.noi_dung));
}
