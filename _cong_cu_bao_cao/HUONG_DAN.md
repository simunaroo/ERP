# Công cụ sinh Chương 2 (báo cáo DATN)

Sinh lại `Chuong2_ERP.docx` khớp phần mềm (bảng CSDL lấy từ DB thật, ảnh chụp màn hình thật).

1. Làm mới DB test có dữ liệu mẫu lớn: `cd backend && PG_DATABASE=datn_erp_test node scripts/db-reset.js --lon`
2. Chạy backend cổng 3999 (`PORT=3999 PG_DATABASE=datn_erp_test ... node src/server.js`) và frontend `VITE_API_TARGET=http://localhost:3999 npx vite --port 5199`
3. `node chup_ch2.mjs` — chụp 25 màn hình vào `anh/`
4. `node lay_schema.cjs` — đọc cấu trúc CSDL ra `schema.json`
5. `node tao_ch2.cjs ../Chuong2_ERP.docx` — sinh file Word

Nội dung chữ (khảo sát, yêu cầu, đặc tả use case, mô tả biểu đồ) nằm trong `tao_ch2.cjs`. `cap_nhat_v2.py` là bản vá đã áp dụng ngày 23/10/2026 (giữ lại để tra cứu).
