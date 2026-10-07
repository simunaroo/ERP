import { Router } from 'express';
import { xacThuc } from '../../middlewares/auth.js';
import * as s from './thong_bao.service.js';

// Moi nguoi chi thay thong bao cua chinh minh (lay tu req.user, khong nhan id nguoi dung tu client).
const router = Router();
router.use(xacThuc);
router.get('/', async (req, res) => res.json(await s.cuaToi(req.user, { chuaDoc: req.query.chua_doc === '1' })));
router.get('/dem', async (req, res) => res.json(await s.demChuaDoc(req.user)));
router.post('/doc-het', async (req, res) => res.json(await s.docHet(req.user)));
router.post('/:id/doc', async (req, res) => { await s.danhDauDaDoc(req.user, Number(req.params.id)); res.status(204).end(); });

export default router;
