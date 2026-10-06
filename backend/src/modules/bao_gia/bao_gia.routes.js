import { Router } from 'express';
import { xemBaoGia } from './bao_gia.service.js';

// Route CONG KHAI (khong xacThuc): ai co link moi xem duoc, nen link phai la ma ngau nhien.
const router = Router();
router.get('/:token', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(await xemBaoGia(req.params.token));
});
export default router;
