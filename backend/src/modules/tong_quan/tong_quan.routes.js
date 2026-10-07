import { Router } from 'express';
import { xacThuc } from '../../middlewares/auth.js';
import { tongQuan } from './tong_quan.service.js';

// Moi vai tro deu co trang tong quan; noi dung (pham vi so lieu, viec can lam) loc theo vai tro o service.
const router = Router();
router.get('/', xacThuc, async (req, res) => res.json(await tongQuan(req.user)));
export default router;
