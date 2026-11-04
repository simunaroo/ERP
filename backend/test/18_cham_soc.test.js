import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { batDau } from './helpers/moi_truong.js';

let ctx; let sale; let khId;
before(async () => {
  ctx = await batDau();
  sale = await ctx.login('thilan');
  khId = (await ctx.api(sale, 'POST', '/nhap-so', { sdt: '0912777001', ten: 'Khách Chăm Sóc' })).d.ket_qua[0].khach_hang_id;
});
after(async () => { await ctx.ketThuc(); });

const ghi = (body) => ctx.api(sale, 'POST', `/khach-hang/${khId}/cham-soc`, body);
const kh = async () => (await ctx.api(sale, 'GET', `/khach-hang/${khId}`)).d;
const viec = async (nhan) => (await ctx.api(sale, 'GET', '/tong-quan')).d.viec.find((v) => v.nhan === nhan)?.so;

describe('Chăm sóc khách theo quy trình gọi số', () => {
  it('TC-CS-01: Không chuyển về "Mới"; trạng thái lạ bị từ chối; "Không nghe máy" → "Thuê bao" ghi được', async () => {
    assert.equal((await ghi({ trang_thai: 'moi' })).s, 400);
    assert.equal((await ghi({ trang_thai: 'dang_tu_van' })).s, 400); // trang thai cu da bo
    assert.equal((await ghi({ trang_thai: 'khong_nghe_may', noi_dung: 'Gọi 2 lần' })).s, 201);
    assert.equal((await ghi({ trang_thai: 'thue_bao' })).s, 201);
    assert.equal((await kh()).trang_thai_cham_soc, 'thue_bao');
  });

  it('TC-CS-02: "Hẹn gọi lại" bắt buộc có thời điểm ở tương lai; đến giờ thì hiện việc gấp; chuyển trạng thái khác thì xoá lịch hẹn', async () => {
    assert.equal((await ghi({ trang_thai: 'hen_goi_lai' })).s, 400);
    assert.equal((await ghi({ trang_thai: 'hen_goi_lai', hen_goi_lai_luc: '2020-01-01T08:00:00Z' })).s, 400);
    const hen = new Date(Date.now() + 2 * 3600e3).toISOString();
    assert.equal((await ghi({ trang_thai: 'hen_goi_lai', hen_goi_lai_luc: hen, noi_dung: 'Khách bận, gọi lại chiều' })).s, 201);
    assert.equal(new Date((await kh()).hen_goi_lai_luc).toISOString(), hen);
    assert.equal(await viec('Khách hẹn gọi lại đã đến giờ'), 0);
    await ctx.sql(`UPDATE khach_hang SET hen_goi_lai_luc = now() - interval '5 minutes' WHERE id = $1`, [khId]); // gia lap da den gio
    assert.equal(await viec('Khách hẹn gọi lại đã đến giờ'), 1);
    assert.equal((await ghi({ trang_thai: 'quan_tam', noi_dung: 'Đã gọi lại, khách quan tâm sàn SPC' })).s, 201);
    assert.equal((await kh()).hen_goi_lai_luc, null);
    assert.equal(await viec('Khách hẹn gọi lại đã đến giờ'), 0);
  });

  it('TC-CS-03: "Không quan tâm" / "Sai số" bắt buộc ghi lý do', async () => {
    assert.equal((await ghi({ trang_thai: 'khong_quan_tam' })).s, 400);
    assert.equal((await ghi({ trang_thai: 'sai_so', noi_dung: '' })).s, 400);
  });

  it('TC-CS-04: "Chốt đơn" → khách sang Chốt, lịch sử đủ các lần liên hệ theo thứ tự', async () => {
    assert.equal((await ghi({ trang_thai: 'quan_tam', noi_dung: 'Gửi báo giá' })).s, 201);
    assert.equal((await ghi({ trang_thai: 'chot', noi_dung: 'Khách đồng ý' })).s, 201);
    const k = await kh();
    assert.equal(k.trang_thai_cham_soc, 'chot');
    assert.deepEqual(k.lich_su.map((l) => l.trang_thai).reverse(), ['khong_nghe_may', 'thue_bao', 'hen_goi_lai', 'quan_tam', 'quan_tam', 'chot']);
  });
});
