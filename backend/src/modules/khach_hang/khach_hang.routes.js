import { Router } from 'express';
import { xacThuc, coQuyen } from '../../middlewares/auth.js';
import * as c from './khach_hang.controller.js';

const router = Router();
router.use(xacThuc);

router.get('/', coQuyen('khach_hang.xem'), c.list);
router.get('/:id', coQuyen('khach_hang.xem'), c.detail);
router.post('/', coQuyen('khach_hang.sua'), c.create);
router.post('/:id/cham-soc', coQuyen('khach_hang.sua'), c.chamSoc);

export default router;
