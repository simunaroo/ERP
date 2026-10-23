import { Router } from 'express';
import { xacThuc } from '../../middlewares/auth.js';
import * as c from './auth.controller.js';
import * as authService from './auth.service.js';

const router = Router();
router.post('/login', c.login);
// Xac thuc 2 lop: khong qua xacThuc (chua co token) — dung "ma tam" ky rieng tu buoc mat khau.
router.post('/2fa/khoi-tao', async (req, res) => res.json(await authService.khoiTao2fa(req.body || {})));
router.post('/2fa/kich-hoat', async (req, res) => res.json(await authService.kichHoat2fa(req.body || {})));
router.post('/2fa/xac-minh', async (req, res) => res.json(await authService.xacMinh2fa(req.body || {})));
router.get('/me', xacThuc, c.me);
router.post('/doi-mat-khau', xacThuc, c.doiMatKhau);

export default router;
