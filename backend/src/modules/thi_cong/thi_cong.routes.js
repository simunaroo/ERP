import { Router } from 'express';
import { xacThuc, coQuyen } from '../../middlewares/auth.js';
import * as c from './thi_cong.controller.js';

const router = Router();
router.use(xacThuc);
const noiBo = coQuyen('thi_cong.xem');
const lam = coQuyen('thi_cong.thao_tac'); // Van hanh (dieu phoi) phan tho, nghiem thu, chot quyet toan - giong ERP

router.get('/doi-tho', noiBo, c.dsDoiTho);
router.post('/doi-tho', lam, c.taoDoiTho);
router.put('/doi-tho/:id', lam, c.suaDoiTho);
router.get('/lich', noiBo, c.lich);
router.get('/don/:donHangId', coQuyen('thi_cong.xem', 'don_hang.lap'), c.theoDon);
router.post('/', lam, c.lapGiaiDoan);
router.put('/:id', lam, c.suaGiaiDoan);
router.post('/:id/bat-dau', lam, c.batDau);
router.post('/:id/bao-xong', lam, c.baoXong);
router.get('/nghiem-thu/:donHangId', noiBo, c.xemNghiemThu);
router.put('/nghiem-thu/:donHangId', lam, c.luuNghiemThu);
router.post('/nghiem-thu/:donHangId/xac-nhan', lam, c.xacNhanNghiemThu);
router.post('/phat-sinh', lam, c.themPhatSinh);
router.delete('/phat-sinh/:id', lam, c.xoaPhatSinh);
router.get('/quyet-toan', noiBo, c.dsChoQuyetToan);
router.get('/quyet-toan/:donHangId', noiBo, c.xemQuyetToan);
router.post('/quyet-toan/:donHangId/chot', lam, c.chotQuyetToan);

export default router;
