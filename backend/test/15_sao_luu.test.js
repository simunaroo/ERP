import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { batDau } from './helpers/moi_truong.js';

const THU_MUC = fs.mkdtempSync(path.join(os.tmpdir(), 'datn-test-sao-luu-'));
process.env.SAO_LUU_THU_MUC = THU_MUC;
process.env.SAO_LUU_GIU = '2';
if (!process.env.PG_BIN && fs.existsSync('C:/Program Files/PostgreSQL/16/bin/pg_dump.exe')) process.env.PG_BIN = 'C:/Program Files/PostgreSQL/16/bin';

let ctx; const tk = {};
before(async () => {
  ctx = await batDau();
  for (const u of ['ngocson', 'thihong']) tk[u] = await ctx.login(u);
  fs.mkdirSync(path.join(process.env.THU_MUC_UPLOAD, 'bill'), { recursive: true });
  fs.writeFileSync(path.join(process.env.THU_MUC_UPLOAD, 'bill', 'thu.png'), 'anh');
});
after(async () => { await ctx.ketThuc(); fs.rmSync(THU_MUC, { recursive: true, force: true }); });

describe('Sao lưu dữ liệu', () => {
  it('TC-SL-01: Admin bấm "Sao lưu ngay" → có file CSDL (.dump) và file ảnh (.tar.gz)', async () => {
    const r = await ctx.api(tk.ngocson, 'POST', '/sao-luu/ngay');
    assert.equal(r.s, 201, r.d?.message);
    const ds = fs.readdirSync(THU_MUC);
    assert.ok(ds.some((f) => f === `${r.d.ten}.dump` && fs.statSync(path.join(THU_MUC, f)).size > 1000));
    assert.ok(ds.includes(`${r.d.ten}_uploads.tar.gz`));
  });

  it('TC-SL-02: Chỉ giữ số bản theo cấu hình (2 bản), bản cũ nhất bị xoá', async () => {
    for (let i = 0; i < 2; i++) {
      await new Promise((r) => setTimeout(r, 1100)); // ten file theo giay
      assert.equal((await ctx.api(tk.ngocson, 'POST', '/sao-luu/ngay')).s, 201);
    }
    const tt = (await ctx.api(tk.ngocson, 'GET', '/sao-luu')).d;
    assert.equal(tt.ban_sao_luu.length, 2);
    assert.equal(tt.lan_cuoi.thanh_cong, true);
  });

  it('TC-SL-03: Tải bản sao lưu; tên file lạ (../) bị chặn; Kế toán không có quyền', async () => {
    const tt = (await ctx.api(tk.ngocson, 'GET', '/sao-luu')).d;
    const ten = tt.ban_sao_luu[0].file.find((f) => f.loai === 'csdl').ten;
    const r = await fetch(`${ctx.goc}/sao-luu/tai/${ten}`, { headers: { Authorization: `Bearer ${tk.ngocson}` } });
    assert.equal(r.status, 200);
    assert.ok((await r.arrayBuffer()).byteLength > 1000);
    assert.equal((await ctx.api(tk.ngocson, 'GET', `/sao-luu/tai/${encodeURIComponent('../.env')}`)).s, 400);
    assert.equal((await ctx.api(tk.thihong, 'GET', '/sao-luu')).s, 403);
  });
});
