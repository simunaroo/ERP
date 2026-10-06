import * as service from './tro_ly.service.js';

export async function trichXuatDon(req, res) {
  const { noi_dung, anh, khach_hang_id } = req.body;
  res.json(await service.trichXuatDonHang(req.user, { noi_dung, anh, khach_hang_id }));
}
