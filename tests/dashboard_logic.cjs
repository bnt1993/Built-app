const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(path.join(__dirname,'../Checking'),'utf8'),ctx={console};vm.createContext(ctx);
for(const name of ['chuyenThanhSo','chuanHoaMaSap','tenHistoryChuan','cotHistoryTheoTen','tinhPhanTichDashboard','ngayHistoryHopLe','nhomKyKho','khoaNhomKho','tinhGiaTriNhapXuat']){
 const start=html.indexOf('    function '+name+'(');assert(start>=0,name);vm.runInContext(html.slice(start,html.indexOf('\n    function ',start+1)),ctx);
}
const headers=['SAP','Description','Price','Unit'];const rec=(qty,price,unit='PC')=>({dong:['A','Motor',price,unit],soLuong:qty,reorderPoint:5,trangThaiTon:'healthy'});
const stats=ctx.tinhPhanTichDashboard([rec(10,100),rec(20,0),rec(3,'bad')],headers);
assert.equal(stats.total,1000);assert.equal(stats.values[0].quantity,33);assert.equal(stats.missingPrice,1);
assert(ctx.tinhPhanTichDashboard([rec(10,100),rec(20,0,'M')],headers).values[0].inconsistent);
assert.equal(ctx.tinhPhanTichDashboard([],headers).total,0);
assert.equal(ctx.khoaNhomKho('2026-01-01','week'),'2025-12-29');assert.equal(ctx.khoaNhomKho('2026-01-04','week'),'2025-12-29');assert.equal(ctx.khoaNhomKho('2026-01-05','week'),'2026-01-05');assert.equal(ctx.khoaNhomKho('2026-02-30','week'),'');
const buckets=ctx.nhomKyKho('week',2,new Date(2026,0,5));assert.equal(buckets.length,2);assert.equal(buckets[0].key,'2025-12-29');
const rows=[{type:'in',date:'2026-01-01',cells:[100]},{type:'out',date:'2026-01-04',cells:[-50]},{type:'out',date:'2026-01-05',cells:[0.125]},{type:'unknown',date:'2026-01-01',cells:[999]},{type:'out',date:'2026-01-02',cells:['bad']},{type:'in',date:'bad',cells:[5]},{type:'in',date:'2020-01-01',cells:[777]}];
const a=ctx.tinhGiaTriNhapXuat(rows,['Amt.in loc.cur.'],'week',buckets);assert.equal(a.incoming,100);assert.equal(a.outgoing,50.125);assert.equal(a.count,3);assert.equal(a.invalid,2);assert.equal(a.values.get('2025-12-29').out,50);
for(const mode of ['month','year']){const x=ctx.tinhGiaTriNhapXuat(rows,['Amt.In'],mode,ctx.nhomKyKho(mode,1,new Date(2026,0,5)));assert.equal(x.incoming,100);assert.equal(x.outgoing,50.125);}
assert(ctx.tinhGiaTriNhapXuat(rows,['Quantity'],'week',buckets).missing);
for(const m of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))new Function(m[1]);
console.log('PASS Top quantity with zero/missing prices, mixed units, paired VND movement totals, invalid data, Monday/year boundaries and week/month/year grouping.');
