// Kiem thu don vi (unit) cac ham thuan, khong can CSDL.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import './helpers/moi_truong.js'; // dat bien moi truong (khong goi batDau -> khong tao lai DB)

const { docSoTien } = await import('../src/modules/mua_hang/mua_hang.service.js');
const { dieuKhoanThanhToan } = await import('../src/modules/don_hang/don_hang.service.js');
const { linkVietQr } = await import('../src/modules/cong_no/cong_no.service.js');

describe('Hàm tiện ích', () => {
  it('TC-UT-01: Đọc số tiền NCC gõ trong Telegram', () => {
    const ca = [['2000000', 2e6], ['2.000.000', 2e6], ['2tr', 2e6], ['2,5tr', 2.5e6], ['1.5 triệu', 1.5e6], ['500k', 5e5], ['2000000đ', 2e6], ['abc', null], ['-5', null], ['', null]];
    for (const [vao, ra] of ca) assert.equal(docSoTien(vao), ra, `"${vao}"`);
  });

  it('TC-UT-02: Điều khoản thanh toán theo tỷ lệ tạm ứng và hình thức đơn', () => {
    assert.match(dieuKhoanThanhToan(100, 'vat_tu'), /100%.*khi nhận hàng/);
    assert.match(dieuKhoanThanhToan(80, 'hoan_thien'), /tạm ứng 80%.*20% còn lại.*nghiệm thu/);
    assert.match(dieuKhoanThanhToan(0, 'vat_tu'), /100%.*sau khi giao đủ hàng/);
  });

  it('TC-UT-03: Link VietQR đúng mã ngân hàng, STK, số tiền, nội dung; ngân hàng lạ → null', () => {
    const u = linkVietQr({ ten_ngan_hang: 'MB Bank', so_tk: '0123', chu_tk: 'CTY A' }, 1500000.4, 'DH-1 TT');
    assert.match(u, /^https:\/\/img\.vietqr\.io\/image\/MB-0123-compact2\.png\?/);
    const q = new URL(u).searchParams;
    assert.equal(q.get('amount'), '1500000');
    assert.equal(q.get('addInfo'), 'DH-1 TT');
    assert.equal(linkVietQr({ ten_ngan_hang: 'Ngân hàng ABC', so_tk: '1', chu_tk: 'x' }, 1, 'x'), null);
  });
});
