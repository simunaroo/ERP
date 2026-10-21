import { Router } from 'express';
import { xacThuc, coQuyen } from '../../middlewares/auth.js';
import { xuatExcel } from '../../utils/xuatExcel.js';
import * as s from './bao_cao.service.js';

// Bao cao quan tri: chi Admin va Ke toan (so lieu lai/lo toan cong ty).
const router = Router();
router.use(xacThuc, coQuyen('bao_cao.xem'));
router.get('/lai-lo', async (req, res) => res.json(await s.laiLo(req.query)));
router.get('/lai-lo/excel', async (req, res) => xuatExcel(res, await s.laiLoExcel(req.query)));

export default router;
