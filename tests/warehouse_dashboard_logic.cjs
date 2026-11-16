const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const html=fs.readFileSync(path.join(__dirname,'../Checking'),'utf8');
let hall='all',range={from:'2026-10-01',to:'2026-10-31'};
const ctx={console,window:{},ngonNguHienTai:'vi',historyLoaded:true,
  historyColumns:['Material','Amt.In'],hallDangLoc:()=>hall,
  lichSuTheoHall:()=>hall==='unknown'?null:ctx.historyAll,
  locGiaoDichKho:r=>ctx.historyAll.filter(x=>x.date>=r.from&&x.date<=r.to&&['in','out'].includes(x.type))};
vm.createContext(ctx);
for(const name of ['chuyenThanhSo','tenHistoryChuan','cotHistoryTheoTen','ngayHistoryHopLe',
  'khoaNhomKho','cotGiaTriLichSuKho','tongNhapXuatTrongKhoang','layGiaTriKhoTuAmount',
  'thongKeTongQuanKho','khoangTuanCuoiDashboard']){
  const match=html.match(new RegExp('^    function '+name+'\\([^]*?^    }','m'));
  assert(match,name);vm.runInContext(match[0],ctx);
}
ctx.historyAll=[
  {type:'in',date:'2026-09-30',cells:['A',9000]},
  {type:'in',date:'2026-10-15',cells:['A',1000]},
  {type:'out',date:'2026-10-31',cells:['A',-600]},
  {type:'out',date:'2026-11-01',cells:['A',-7000]},
  {type:'unknown',date:'2026-10-16',cells:['A',999999]},
  {type:'in',date:'2026-10-28',cells:['A','bad']}
];
ctx.window.amountData=[['30/09/2026',9999],['15/10/2026',1800],
  ['31/10/2026',2000],['31/10/2026',2200],['01/11/2026',8888]];
let stats=ctx.thongKeTongQuanKho(range);
assert.equal(stats.inventory.value,2200);assert.equal(stats.inventory.date,'2026-10-31');
assert.equal(stats.incoming,1000);assert.equal(stats.outgoing,600);assert.equal(stats.net,400);assert.equal(stats.invalid,1);
const last=ctx.khoangTuanCuoiDashboard(range);
assert.deepEqual([last.from,last.to],['2026-10-26','2026-10-31']);
stats=ctx.thongKeTongQuanKho(last);assert.equal(stats.net,-600);
assert.deepEqual(Object.values(ctx.khoangTuanCuoiDashboard({from:'2026-10-30',to:'2026-10-31'})),['2026-10-30','2026-10-31']);
assert.deepEqual(Object.values(ctx.khoangTuanCuoiDashboard({from:'2026-01-01',to:'2026-01-04'})),['2026-01-01','2026-01-04']);
assert.equal(ctx.khoangTuanCuoiDashboard(null),null);
hall='hall1';assert.equal(ctx.thongKeTongQuanKho(range).inventory.value,2200);
hall='hall2';assert.equal(ctx.thongKeTongQuanKho(range).inventory,null);assert.equal(ctx.thongKeTongQuanKho(range).outgoing,600);
hall='unknown';assert.equal(ctx.thongKeTongQuanKho(range).incoming,null);
hall='all';
// Missing history is unavailable; an available empty interval is a genuine zero.
ctx.historyLoaded=false;assert.equal(ctx.thongKeTongQuanKho(range).net,null);
ctx.historyLoaded=true;ctx.historyColumns=['Material','Quantity'];assert.equal(ctx.thongKeTongQuanKho(range).net,null);
ctx.historyColumns=['Material','Amt.In'];
stats=ctx.thongKeTongQuanKho({from:'2025-01-01',to:'2025-12-31'});
assert.equal(stats.inventory,null);assert.equal(stats.net,0);
ctx.window.amountData=[['30/09/2026',1234],['01/11/2026',9999]];
assert.equal(ctx.thongKeTongQuanKho(range).inventory,null,'never carry valuations across the selected boundaries');
ctx.window.amountData=[['31/10/2026',0]];assert.equal(ctx.thongKeTongQuanKho(range).inventory.value,0);
assert.equal(ctx.thongKeTongQuanKho(null),null);
console.log('PASS dashboard values: bounded snapshots, same-day updates, net movement, missing versus zero, ISO weeks, partial weeks, Hall scope and invalid amounts.');
