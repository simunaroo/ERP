import { Router } from 'express';
import { xacThuc, coQuyen } from '../../middlewares/auth.js';
import * as s from './thu_tien.service.js';
import { xuatExcel } from '../../utils/xuatExcel.js';

// Thu tien khach: Sale/Van hanh ghi nhan, Ke toan xac nhan. Quyen theo don kiem tra trong service.
const router = Router();
router.use(xacThuc);
const id = (req) => Number(req.params.id);

router.get('/don/:id', async (req, res) => res.json(await s.theoDon(req.user, id(req))));
router.post('/', coQuyen('thu.ghi_nhan'), async (req, res) => res.status(201).json(await s.tao(req.user, req.body || {})));
router.get('/cho-xac-nhan', coQuyen('thu.xac_nhan'), async (req, res) => res.json(await s.choXacNhan()));
router.get('/cong-no', coQuyen('thu.xac_nhan'), async (req, res) => res.json(await s.congNo(req.query)));
router.get('/cong-no/excel', coQuyen('thu.xac_nhan'), async (req, res) => xuatExcel(res, await s.excelCongNo(req.query)));
router.post('/:id/xac-nhan', coQuyen('thu.xac_nhan'), async (req, res) => res.json(await s.xacNhan(req.user, id(req))));
router.post('/:id/tu-choi', coQuyen('thu.xac_nhan'), async (req, res) => res.json(await s.tuChoi(req.user, id(req), req.body || {})));
router.get('/:id/bill', async (req, res) => {
  const f = await s.anhBill(req.user, id(req));
  res.type(f.mime).set('Cache-Control', 'private, max-age=3600').sendFile(f.file);
});

export default router;
