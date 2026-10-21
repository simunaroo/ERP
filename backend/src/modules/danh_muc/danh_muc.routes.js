import { Router } from 'express';
import { xacThuc, coQuyen } from '../../middlewares/auth.js';
import * as c from './danh_muc.controller.js';

const router = Router();
router.use(xacThuc);
// Danh sach khach (co SDT, dia chi) chi cho form tao don cua Sale; Admin xem tat ca. Van hanh/Ke toan khong co quyen module Khach hang.
router.get('/khach-hang', coQuyen('khach_hang.xem'), c.khachHang);
router.get('/vat-tu', c.vatTu);
router.get('/sale', c.sale);
router.get('/van-hanh', c.vanHanh);
// Quan ly danh muc vat tu: Ke toan (mua hang) va Admin.
router.get('/loai-vat-tu', c.loaiVatTu);
router.post('/loai-vat-tu', coQuyen('vat_tu.sua'), c.taoLoaiVatTu);
router.post('/vat-tu', coQuyen('vat_tu.sua'), c.taoVatTu);
router.put('/vat-tu/:id', coQuyen('vat_tu.sua'), c.suaVatTu);

export default router;
