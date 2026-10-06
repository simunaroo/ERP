import { Router } from 'express';
import { xacThuc, phanQuyen } from '../../middlewares/auth.js';
import * as c from './nha_cung_cap.controller.js';

const router = Router();
router.use(xacThuc);

// Xem: Ke toan (mua hang, thanh toan), Van hanh (len phuong an), Admin. Sua: Ke toan, Admin.
const xem = phanQuyen('ke_toan', 'van_hanh', 'admin');
const sua = phanQuyen('ke_toan', 'admin');

router.get('/', xem, c.list);
router.get('/so-sanh-gia', xem, c.soSanhGia); // dat TRUOC '/:id' de "so-sanh-gia" khong bi hieu la id
router.get('/:id', xem, c.detail);
router.post('/', sua, c.create);
router.put('/:id', sua, c.update);
router.patch('/:id/trang-thai', sua, c.trangThai);
router.post('/:id/stk', sua, c.themStk);
router.delete('/:id/stk/:stkId', sua, c.xoaStk);
router.post('/:id/bang-gia', sua, c.capNhatGia);
router.post('/:id/bang-gia/:vatTuId/ngung', sua, c.ngungCungCap);

export default router;
