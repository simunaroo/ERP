import { Router } from 'express';
import { xacThuc, coQuyen } from '../../middlewares/auth.js';
import * as s from './phan_quyen.service.js';

const router = Router();
router.use(xacThuc, coQuyen('he_thong.quan_tri'));
router.get('/', async (req, res) => res.json(await s.maTran()));
router.put('/:vaiTro', async (req, res) => res.json(await s.luu(req.params.vaiTro, req.body || {})));

export default router;
