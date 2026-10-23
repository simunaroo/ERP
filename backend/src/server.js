import 'dotenv/config';
import { app } from './app.js';
import { pool } from './config/db.js';
import { batDauPolling } from './integrations/telegram.polling.js';
import { batLichTuDong } from './modules/sao_luu/sao_luu.service.js';

const port = Number(process.env.PORT) || 4000;

await pool.query('SELECT 1');
app.listen(port, () => console.log(`Backend đang chạy tại http://localhost:${port}`));
batDauPolling(); // chi chay khi TELEGRAM_CHE_DO=polling
batLichTuDong(); // sao luu CSDL + anh hang ngay (SAO_LUU_TU_DONG=false de tat)
