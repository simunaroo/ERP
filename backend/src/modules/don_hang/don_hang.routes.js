import { Router } from 'express';
import { xacThuc, coQuyen } from '../../middlewares/auth.js';
import * as c from './don_hang.controller.js';
import { excelDanhSach } from './don_hang.service.js';
import { xuatExcel } from '../../utils/xuatExcel.js';

const router = Router();
router.use(xacThuc);

router.get('/', c.list);
router.get('/excel', async (req, res) => xuatExcel(res, await excelDanhSach(req.user, req.query)));
router.get('/:id', c.detail);
router.post('/', coQuyen('don_hang.lap'), c.create);
router.put('/:id', coQuyen('don_hang.lap'), c.update);
router.delete('/:id', coQuyen('don_hang.lap'), c.remove);
router.post('/:id/bao-gia', coQuyen('don_hang.lap'), c.baoGia);
// Quyen chi tiet theo tung buoc (Van hanh / Ke toan) kiem tra o Service.
router.post('/:id/giai-doan', coQuyen('don_hang.chuyen_buoc'), c.giaiDoan);
router.post('/:id/huy', coQuyen('don_hang.huy'), c.huy);
router.put('/:id/phu-trach', coQuyen('don_hang.phu_trach'), c.doiPhuTrach);
router.patch('/:id/phuong-an', coQuyen('don_hang.dieu_phoi'), c.updatePhuongAn);
router.put('/:id/boc-khoi-luong', coQuyen('don_hang.boc_kl'), c.bocKhoiLuong);
router.post('/:id/yeu-cau-sua', coQuyen('don_hang.lap'), c.createYeuCauSua);
router.patch('/:id/yeu-cau-sua/:ycId/xu-ly', coQuyen('don_hang.dieu_phoi'), c.xuLyYeuCauSua);

export default router;
