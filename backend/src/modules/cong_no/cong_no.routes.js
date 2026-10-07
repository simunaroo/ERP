import { Router } from 'express';
import { xacThuc, phanQuyen } from '../../middlewares/auth.js';
import * as c from './cong_no.controller.js';

const router = Router();
router.use(xacThuc, phanQuyen('ke_toan', 'admin'));

// De xuat chi: Ke toan (mua hang) lap / sua gui lai / xac nhan da chi; Admin (giam doc) duyet / tu choi / thu hoi.
router.get('/de-xuat-chi', c.dsDeXuatChi);
router.get('/de-xuat-chi/:id', c.chiTiet);
router.get('/de-xuat-chi/:id/bill', c.bill);
router.post('/de-xuat-chi', phanQuyen('ke_toan'), c.tao);
router.post('/de-xuat-chi/:id/gui-lai', phanQuyen('ke_toan'), c.guiLai);
router.post('/de-xuat-chi/:id/duyet', phanQuyen('admin'), c.duyet);
router.post('/de-xuat-chi/:id/thu-hoi', phanQuyen('admin'), c.thuHoi);
router.post('/de-xuat-chi/:id/da-chi', phanQuyen('ke_toan'), c.daChi);
router.delete('/de-xuat-chi/:id', phanQuyen('ke_toan'), c.xoa);

router.get('/ncc', c.congNoNcc);
router.get('/ncc/:id', c.congNoNccTheoDon);
router.get('/tho', c.congNoTho);
router.get('/tho/:id', c.soTho);

export const telegramRouter = Router();
telegramRouter.post('/webhook', c.webhook);

export default router;
