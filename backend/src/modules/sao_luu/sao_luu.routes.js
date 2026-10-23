import { Router } from 'express';
import { xacThuc, coQuyen } from '../../middlewares/auth.js';
import * as s from './sao_luu.service.js';

const router = Router();
router.use(xacThuc, coQuyen('he_thong.quan_tri'));
router.get('/', async (req, res) => res.json(await s.trangThai()));
router.post('/ngay', async (req, res) => res.status(201).json(await s.saoLuu('thu_cong')));
router.get('/tai/:ten', async (req, res) => res.download(await s.duongDanFile(req.params.ten)));

export default router;
