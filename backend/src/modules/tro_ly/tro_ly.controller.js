import * as service from './tro_ly.service.js';

export async function trichXuatDon(req, res) {
  res.json(await service.trichXuatDonHang(req.user, req.body.noi_dung));
}
