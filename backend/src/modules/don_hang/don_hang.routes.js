import { Router } from 'express';
import { xacThuc, phanQuyen } from '../../middlewares/auth.js';
import * as c from './don_hang.controller.js';

const router = Router();
router.use(xacThuc);

router.get('/', c.list);
router.get('/:id', c.detail);
router.post('/', phanQuyen('sale'), c.create);
router.put('/:id', phanQuyen('sale'), c.update);
router.delete('/:id', phanQuyen('sale'), c.remove);
router.post('/:id/bao-gia', phanQuyen('sale'), c.baoGia);
// Quyen chi tiet theo tung buoc (Van hanh / Ke toan) kiem tra o Service.
router.post('/:id/giai-doan', phanQuyen('van_hanh', 'ke_toan', 'admin'), c.giaiDoan);
router.post('/:id/huy', phanQuyen('van_hanh', 'admin'), c.huy);
router.put('/:id/phu-trach', phanQuyen('admin'), c.doiPhuTrach);
router.patch('/:id/phuong-an', phanQuyen('van_hanh'), c.updatePhuongAn);
router.post('/:id/yeu-cau-sua', phanQuyen('sale'), c.createYeuCauSua);
router.patch('/:id/yeu-cau-sua/:ycId/xu-ly', phanQuyen('van_hanh'), c.xuLyYeuCauSua);

export default router;
