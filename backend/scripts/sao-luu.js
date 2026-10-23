// Sao luu ngay tu dong lenh (CSDL theo PG_DATABASE + anh bill). Dung cho cron / Task Scheduler neu khong de backend tu chay lich.
// Chay: npm run db:sao-luu
import 'dotenv/config';
import { saoLuu, thuMuc } from '../src/modules/sao_luu/sao_luu.service.js';

const kq = await saoLuu('lenh');
console.log(`Đã sao lưu ${kq.ten}${kq.co_anh ? ' (kèm ảnh)' : ''} vào ${thuMuc()}`);
