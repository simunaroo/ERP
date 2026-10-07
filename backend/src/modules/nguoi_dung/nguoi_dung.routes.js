import { Router } from 'express';
import { xacThuc, phanQuyen } from '../../middlewares/auth.js';
import * as service from './nguoi_dung.service.js';

// Chi Admin quan tri tai khoan. Khong co "xoa" nguoi dung: lich su (don, duyet chi...) tham chieu -> chi khoa.
const router = Router();
router.use(xacThuc, phanQuyen('admin'));
router.get('/', async (req, res) => res.json(await service.danhSach()));
router.post('/', async (req, res) => res.status(201).json(await service.tao(req.body || {})));
router.put('/:id', async (req, res) => res.json(await service.capNhat(req.user, Number(req.params.id), req.body || {})));

export default router;
