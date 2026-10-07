import * as repo from './danh_muc.repository.js';

export async function khachHang(req, res) {
  const saleId = req.user.vai_tro === 'sale' ? req.user.id : null;
  res.json(await repo.khachHang(saleId));
}

export async function sale(req, res) {
  res.json(await repo.sale());
}

import * as service from './danh_muc.service.js';

export async function vatTu(req, res) {
  res.json(await repo.vatTu({ tatCa: req.query.tat_ca === '1' && ['ke_toan', 'admin', 'van_hanh'].includes(req.user.vai_tro) }));
}
export const vanHanh = async (req, res) => res.json(await repo.vanHanh());
export const loaiVatTu = async (req, res) => res.json(await repo.loaiVatTu());
export const taoLoaiVatTu = async (req, res) => res.status(201).json(await service.taoLoaiVatTu(req.body || {}));
export const taoVatTu = async (req, res) => res.status(201).json(await service.luuVatTu(null, req.body || {}));
export const suaVatTu = async (req, res) => res.json(await service.luuVatTu(Number(req.params.id), req.body || {}));
