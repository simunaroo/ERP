import crypto from 'node:crypto';
import { Router } from 'express';
import { xacThuc, phanQuyen } from '../../middlewares/auth.js';
import { AppError } from '../../utils/AppError.js';
import * as s from './nhap_so.service.js';

const router = Router();

// API cho he thong ngoai (form website, Facebook Lead Ads qua Make/Zapier, Google Sheet...) day so tu dong.
// Xac thuc bang header X-Api-Key = NHAP_SO_API_KEY (khong can dang nhap). So vao duoc chia nhu Admin nhap.
function khoaApi(req, res, next) {
  const khoa = process.env.NHAP_SO_API_KEY;
  if (!khoa) throw new AppError(503, 'Chưa cấu hình NHAP_SO_API_KEY trên máy chủ');
  const gui = Buffer.from(String(req.get('x-api-key') || ''));
  const dung = Buffer.from(khoa);
  if (gui.length !== dung.length || !crypto.timingSafeEqual(gui, dung)) throw new AppError(401, 'API key không hợp lệ');
  next();
}
router.post('/tu-dong', khoaApi, async (req, res) => res.status(201).json(await s.nhap(null, req.body, 'api')));

router.use(xacThuc);
router.post('/', phanQuyen('sale', 'admin'), async (req, res) => res.status(201).json(await s.nhap(req.user, req.body, 'form')));
router.get('/gan-day', phanQuyen('sale', 'admin'), async (req, res) => res.json(await s.ganDay(req.user, req.query)));
router.get('/ty-le', phanQuyen('admin'), async (req, res) => res.json(await s.tyLe()));
router.put('/ty-le', phanQuyen('admin'), async (req, res) => res.json(await s.luuTyLe(req.user, req.body || {})));
router.put('/khach/:id/chuyen-sale', phanQuyen('admin'), async (req, res) => res.json(await s.chuyenSale(req.user, Number(req.params.id), req.body || {})));

export default router;
