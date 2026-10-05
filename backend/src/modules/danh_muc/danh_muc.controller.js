import * as repo from './danh_muc.repository.js';

export async function khachHang(req, res) {
  const saleId = req.user.vai_tro === 'sale' ? req.user.id : null;
  res.json(await repo.khachHang(saleId));
}

export async function vatTu(req, res) {
  res.json(await repo.vatTu());
}
