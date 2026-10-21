import crypto from 'node:crypto';
import { Router } from 'express';
import { voiNguoiDung } from '../../config/db.js';
import { xacThuc, coQuyen } from '../../middlewares/auth.js';
import { AppError } from '../../utils/AppError.js';
import * as s from './ngan_hang.service.js';

const router = Router();
const id = (req) => Number(req.params.id);

// Webhook SePay: header "Authorization: Apikey <NGAN_HANG_WEBHOOK_KEY>". Tra { success: true } de SePay khong gui lai.
function khoaWebhook(req, res, next) {
  const khoa = process.env.NGAN_HANG_WEBHOOK_KEY;
  if (!khoa) throw new AppError(503, 'Chưa cấu hình NGAN_HANG_WEBHOOK_KEY trên máy chủ');
  const gui = Buffer.from(String(req.get('authorization') || '').replace(/^Apikey\s+/i, ''));
  const dung = Buffer.from(khoa);
  if (gui.length !== dung.length || !crypto.timingSafeEqual(gui, dung)) throw new AppError(401, 'API key không hợp lệ');
  next();
}
router.post('/webhook', khoaWebhook, async (req, res) => {
  const kq = await voiNguoiDung({ kenh: 'ngan_hang' }, () => s.xuLyGiaoDich(req.body || {}, 'sepay'));
  res.json({ success: true, ...kq });
});

router.use(xacThuc);
router.get('/giao-dich', coQuyen('thu.xac_nhan', 'chi.da_chi'), async (req, res) => res.json(await s.danhSach(req.query)));
router.post('/gia-lap', coQuyen('thu.xac_nhan', 'chi.da_chi'), async (req, res) => res.status(201).json(await s.giaLap(req.body || {})));
router.post('/giao-dich/:id/khop', coQuyen('thu.xac_nhan'), async (req, res) => res.json(await s.khopTay(req.user, id(req), req.body || {})));
router.post('/giao-dich/:id/bo-qua', coQuyen('thu.xac_nhan', 'chi.da_chi'), async (req, res) => res.json(await s.boQua(req.user, id(req), req.body || {})));

export default router;
