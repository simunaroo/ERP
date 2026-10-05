import express from 'express';
import cors from 'cors';
import authRoutes from './modules/auth/auth.routes.js';
import donHangRoutes from './modules/don_hang/don_hang.routes.js';
import danhMucRoutes from './modules/danh_muc/danh_muc.routes.js';
import troLyRoutes from './modules/tro_ly/tro_ly.routes.js';
import { errorHandler } from './middlewares/errorHandler.js';

export const app = express();
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/don-hang', donHangRoutes);
app.use('/api/danh-muc', danhMucRoutes);
app.use('/api/tro-ly', troLyRoutes);

app.use((req, res) => res.status(404).json({ message: 'Không tìm thấy endpoint' }));
app.use(errorHandler);
