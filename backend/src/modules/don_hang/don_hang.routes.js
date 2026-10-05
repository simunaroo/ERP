import { Router } from 'express';
import { xacThuc, phanQuyen } from '../../middlewares/auth.js';
import * as c from './don_hang.controller.js';

const router = Router();
router.use(xacThuc);

router.get('/', c.list);
router.get('/:id', c.detail);
router.post('/', phanQuyen('sale'), c.create);
router.patch('/:id/phuong-an', phanQuyen('van_hanh'), c.updatePhuongAn);
router.post('/:id/yeu-cau-sua', phanQuyen('sale'), c.createYeuCauSua);
router.patch('/:id/yeu-cau-sua/:ycId/xu-ly', phanQuyen('van_hanh'), c.xuLyYeuCauSua);

export default router;
