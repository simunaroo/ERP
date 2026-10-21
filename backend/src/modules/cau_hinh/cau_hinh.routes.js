import { Router } from 'express';
import { xacThuc, coQuyen } from '../../middlewares/auth.js';
import * as s from './cau_hinh.service.js';

// Tham so nghiep vu: Admin sua, Ke toan xem.
const router = Router();
router.use(xacThuc);
router.get('/', coQuyen('bao_cao.xem', 'he_thong.quan_tri'), async (req, res) => res.json(await s.danhSach()));
router.put('/:khoa', coQuyen('he_thong.quan_tri'), async (req, res) => res.json(await s.capNhat(req.user, req.params.khoa, req.body || {})));

export default router;
