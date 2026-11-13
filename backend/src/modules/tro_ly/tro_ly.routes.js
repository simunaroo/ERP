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
router.get('/hoi-thoai/:id', coQuyen('tro_ly.ai'), c.chiTietHoiThoai);
router.delete('/hoi-thoai/:id', coQuyen('tro_ly.ai'), c.xoaHoiThoai);
router.post('/hoi', coQuyen('tro_ly.ai'), c.hoi);

export default router;
