import { Router } from 'express';
import { xacThuc, phanQuyen } from '../../middlewares/auth.js';
import * as c from './phan_tich.controller.js';

const router = Router();
router.use(xacThuc, phanQuyen('ke_toan', 'admin'));
router.get('/tong-hop', c.tongHop);
router.post('/nhan-xet-ai', c.nhanXetAi);

export default router;
