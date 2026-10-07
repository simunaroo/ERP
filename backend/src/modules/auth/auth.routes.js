import { Router } from 'express';
import { xacThuc } from '../../middlewares/auth.js';
import * as c from './auth.controller.js';

const router = Router();
router.post('/login', c.login);
router.get('/me', xacThuc, c.me);
router.post('/doi-mat-khau', xacThuc, c.doiMatKhau);

export default router;
