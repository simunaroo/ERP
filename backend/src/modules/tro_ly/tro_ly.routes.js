import { Router } from 'express';
import { xacThuc, coQuyen } from '../../middlewares/auth.js';
import * as c from './tro_ly.controller.js';

const router = Router();
router.use(xacThuc);
router.post('/trich-xuat-don', coQuyen('tro_ly.ai'), c.trichXuatDon);

export default router;
