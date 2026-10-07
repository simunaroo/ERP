import express from 'express';
import cors from 'cors';
import authRoutes from './modules/auth/auth.routes.js';
import donHangRoutes from './modules/don_hang/don_hang.routes.js';
import danhMucRoutes from './modules/danh_muc/danh_muc.routes.js';
import khachHangRoutes from './modules/khach_hang/khach_hang.routes.js';
import troLyRoutes from './modules/tro_ly/tro_ly.routes.js';
import baoGiaRoutes from './modules/bao_gia/bao_gia.routes.js';
import nhaCungCapRoutes from './modules/nha_cung_cap/nha_cung_cap.routes.js';
import phanTichRoutes from './modules/phan_tich/phan_tich.routes.js';
import muaHangRoutes from './modules/mua_hang/mua_hang.routes.js';
import thiCongRoutes from './modules/thi_cong/thi_cong.routes.js';
import nguoiDungRoutes from './modules/nguoi_dung/nguoi_dung.routes.js';
import tongQuanRoutes from './modules/tong_quan/tong_quan.routes.js';
import congNoRoutes, { telegramRouter } from './modules/cong_no/cong_no.routes.js';
import thongBaoRoutes from './modules/thong_bao/thong_bao.routes.js';
import { errorHandler } from './middlewares/errorHandler.js';

export const app = express();
app.use(cors({ origin: 'http://localhost:5173' }));
// Chi route tro ly AI nhan body lon (anh base64); phai dat truoc parser chung de duoc dung truoc.
app.use('/api/tro-ly', express.json({ limit: '15mb' }));
app.use('/api/cong-no/de-xuat-chi', express.json({ limit: '8mb' })); // anh bill "da chi"
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/don-hang', donHangRoutes);
app.use('/api/danh-muc', danhMucRoutes);
app.use('/api/khach-hang', khachHangRoutes);
app.use('/api/tro-ly', troLyRoutes);
app.use('/api/nha-cung-cap', nhaCungCapRoutes);
app.use('/api/phan-tich', phanTichRoutes);
app.use('/api/mua-hang', muaHangRoutes);
app.use('/api/thi-cong', thiCongRoutes);
app.use('/api/nguoi-dung', nguoiDungRoutes);
app.use('/api/tong-quan', tongQuanRoutes);
app.use('/api/cong-no', congNoRoutes);
app.use('/api/thong-bao', thongBaoRoutes);
app.use('/api/telegram', telegramRouter); // webhook cong khai, xac thuc bang secret header
app.use('/api/bao-gia', baoGiaRoutes); // cong khai, khong can dang nhap

app.use((req, res) => res.status(404).json({ message: 'Không tìm thấy endpoint' }));
app.use(errorHandler);
