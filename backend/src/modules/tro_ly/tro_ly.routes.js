import { Router } from 'express';
import { xacThuc, coQuyen } from '../../middlewares/auth.js';
import * as c from './tro_ly.controller.js';

const router = Router();
router.use(xacThuc);

// Danh sach tro ly (moi san pham mot tro ly): ca nguoi hoi lan nguoi soan kien thuc deu can.
router.get('/san-pham', coQuyen('tro_ly.ai', 'tro_ly.kien_thuc'), c.dsTroLy);
// Soan kien thuc cho tung tro ly
router.get('/san-pham/:id/kien-thuc', coQuyen('tro_ly.kien_thuc'), c.layKienThuc);
router.put('/san-pham/:id/kien-thuc', coQuyen('tro_ly.kien_thuc'), c.luuKienThuc);
router.post('/san-pham/:id/doc-tai-lieu', coQuyen('tro_ly.kien_thuc'), c.docTaiLieu);
// Hoi dap
router.get('/hoi-thoai', coQuyen('tro_ly.ai'), c.dsHoiThoai);
// Xem / xoa cuoc tro chuyen cua chinh minh: dung chung cho tro ly san pham, quan ly va NCC.
router.get('/hoi-thoai/:id', coQuyen('tro_ly.ai', 'tro_ly.quan_ly', 'tro_ly.ncc'), c.chiTietHoiThoai);
router.delete('/hoi-thoai/:id', coQuyen('tro_ly.ai', 'tro_ly.quan_ly', 'tro_ly.ncc'), c.xoaHoiThoai);
router.post('/hoi', coQuyen('tro_ly.ai'), c.hoi);
// Tro ly quan ly: hoi tinh hinh cham soc khach cua cac Sale (function calling tren du lieu that).
router.get('/quan-ly/hoi-thoai', coQuyen('tro_ly.quan_ly'), c.dsHoiThoaiQuanLy);
router.post('/quan-ly/hoi', coQuyen('tro_ly.quan_ly'), c.hoiQuanLy);
// Tro ly NCC: chon NCC cho vat tu, gia nhap, lich su gia, cong no NCC (ten NCC + so tien duoc ma hoa truoc khi gui AI).
router.get('/ncc/hoi-thoai', coQuyen('tro_ly.ncc'), c.dsHoiThoaiNcc);
router.post('/ncc/hoi', coQuyen('tro_ly.ncc'), c.hoiNcc);

export default router;
