import { Router } from 'express';
import { xacThuc, phanQuyen } from '../../middlewares/auth.js';
import * as c from './khach_hang.controller.js';

const router = Router();
router.use(xacThuc);

router.get('/', phanQuyen('sale', 'admin'), c.list);
router.get('/:id', phanQuyen('sale', 'admin'), c.detail);
router.post('/', phanQuyen('sale'), c.create);
router.post('/:id/cham-soc', phanQuyen('sale'), c.chamSoc);

export default router;
