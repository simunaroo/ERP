import { Router } from 'express';
import { xacThuc, coQuyen } from '../../middlewares/auth.js';
import * as c from './cong_no.controller.js';
import { excelDeXuatChi } from './cong_no.service.js';
import { xuatExcel } from '../../utils/xuatExcel.js';

const router = Router();
router.use(xacThuc, coQuyen('chi.xem'));

// De xuat chi: Ke toan (mua hang) lap / sua gui lai / xac nhan da chi; Admin (giam doc) duyet / tu choi / thu hoi.
router.get('/de-xuat-chi', c.dsDeXuatChi);
router.get('/de-xuat-chi/excel', async (req, res) => xuatExcel(res, await excelDeXuatChi(req.query)));
router.get('/de-xuat-chi/:id', c.chiTiet);
router.get('/de-xuat-chi/:id/bill', c.bill);
router.post('/de-xuat-chi', coQuyen('chi.lap'), c.tao);
router.post('/de-xuat-chi/:id/gui-lai', coQuyen('chi.lap'), c.guiLai);
router.post('/de-xuat-chi/:id/duyet', coQuyen('chi.duyet'), c.duyet);
router.post('/de-xuat-chi/:id/thu-hoi', coQuyen('chi.duyet'), c.thuHoi);
router.post('/de-xuat-chi/:id/da-chi', coQuyen('chi.da_chi'), c.daChi);
router.delete('/de-xuat-chi/:id', coQuyen('chi.lap'), c.xoa);

router.get('/ncc', c.congNoNcc);
router.get('/ncc/:id', c.congNoNccTheoDon);
router.get('/tho', c.congNoTho);
router.get('/tho/:id', c.soTho);

export const telegramRouter = Router();
telegramRouter.post('/webhook', c.webhook);

export default router;
