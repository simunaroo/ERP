import { Router } from 'express';
import { xacThuc } from '../../middlewares/auth.js';
import * as c from './danh_muc.controller.js';

const router = Router();
router.use(xacThuc);
router.get('/khach-hang', c.khachHang);
router.get('/vat-tu', c.vatTu);
router.get('/sale', c.sale);

export default router;
