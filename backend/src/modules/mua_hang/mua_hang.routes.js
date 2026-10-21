import { Router } from 'express';
import { xacThuc, coQuyen } from '../../middlewares/auth.js';
import * as c from './mua_hang.controller.js';

const router = Router();
// Nhan vien mua hang (Ke toan) chon NCC/chot gia; Van hanh xem, cap nhat trang thai hang, lap mua bo sung.
router.use(xacThuc, coQuyen('mua_hang.xem'));

router.get('/don', c.dsDon);
router.get('/don/:id', c.chiTietDon);
router.post('/don/:id/lay-hang', coQuyen('mua_hang.lay_hang'), c.layHang);
router.put('/dong/:id', c.capNhatDong);
router.post('/don/:id/dat-hang', c.datHang);          // gui don dat hang cho 1 NCC
router.post('/don/:id/lui-san-hang', c.luiSanHang);   // ghi nham "NCC cho xuat hang" -> lui
router.post('/dat-hang/:id/phan-hoi', c.phanHoiNcc);   // NCC tra loi qua dien thoai/Zalo: cho xuat / yeu cau coc
router.post('/dat-hang/:id/huy', c.huyDatHang);
router.get('/bo-sung', c.dsMuaBoSung);
router.post('/bo-sung', coQuyen('mua_hang.lay_hang'), c.taoMuaBoSung);
router.post('/bo-sung/:id/da-mua', coQuyen('mua_hang.da_mua'), c.daMuaBoSung);
router.post('/bo-sung/:id/huy', c.huyMuaBoSung);

export default router;
