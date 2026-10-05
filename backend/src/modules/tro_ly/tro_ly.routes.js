import { Router } from 'express';
import { xacThuc, phanQuyen } from '../../middlewares/auth.js';
import * as c from './tro_ly.controller.js';

const router = Router();
router.use(xacThuc);
router.post('/trich-xuat-don', phanQuyen('sale'), c.trichXuatDon);

export default router;
