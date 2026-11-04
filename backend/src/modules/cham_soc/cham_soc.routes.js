import { Router } from 'express';
import { xacThuc, coQuyen } from '../../middlewares/auth.js';
import * as s from './cham_soc.service.js';

// Bao cao cham soc khach (Admin / nguoi quan ly chia so): hieu qua tung Sale, danh sach ton dong, chuyen so hang loat, AI nhan xet.
const router = Router();
router.use(xacThuc, coQuyen('nhap_so.quan_ly'));
router.get('/bao-cao', async (req, res) => res.json(await s.tongHop(req.query)));
router.get('/ton-dong', async (req, res) => res.json(await s.tonDong(req.query)));
router.post('/chuyen-nhieu', async (req, res) => res.json(await s.chuyenNhieu(req.user, req.body || {})));
router.post('/ai-nhan-xet', async (req, res) => res.json(await s.nhanXetAi(req.user, req.body || {})));
router.get('/ai-lich-su', async (req, res) => res.json(await s.lichSuAi(req.query)));
router.get('/ai-lich-su/:id', async (req, res) => res.json(await s.xemAi(req.params.id)));

export default router;
