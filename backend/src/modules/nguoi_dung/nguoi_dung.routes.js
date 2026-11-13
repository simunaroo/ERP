import { Router } from 'express';
import { xacThuc, coQuyen } from '../../middlewares/auth.js';
import * as service from './nguoi_dung.service.js';
import { datLai, dsCauHinh, datCauHinh } from '../auth/hai_lop.service.js';

// Chi Admin quan tri tai khoan. Khong co "xoa" nguoi dung: lich su (don, duyet chi...) tham chieu -> chi khoa.
const router = Router();
router.use(xacThuc, coQuyen('he_thong.quan_tri'));
router.get('/', async (req, res) => res.json(await service.danhSach()));
// Bat/tat xac thuc 2 lop theo vai tro
router.get('/xac-thuc', async (req, res) => res.json(await dsCauHinh()));
router.put('/xac-thuc/:vai_tro', async (req, res) => res.json(await datCauHinh(req.user, req.params.vai_tro, req.body || {})));
router.post('/', async (req, res) => res.status(201).json(await service.tao(req.body || {})));
router.put('/:id', async (req, res) => res.json(await service.capNhat(req.user, Number(req.params.id), req.body || {})));
router.post('/:id/dat-lai-2fa', async (req, res) => res.json(await datLai(Number(req.params.id))));

export default router;
