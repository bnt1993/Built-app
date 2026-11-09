const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(path.join(__dirname,'../Checking'),'utf8');
const nodes={
  'dashboard-hall':{value:'all'},
  'dashboard-range-mode':{value:'selected-month'},
  'dashboard-range-month':{value:'2026-10'},
  'dashboard-range-year-from':{value:'2025'},
  'dashboard-range-year-to':{value:'2026'}
};
const ctx={console,document:{getElementById:id=>nodes[id]},historyLoaded:true,
  historyHallCache:null,stockHallCache:null};
vm.createContext(ctx);
for(const name of ['chuyenThanhSo','chuanHoaMaSap','tenHistoryChuan','cotHistoryTheoTen',
  'ngayHistoryHopLe','ngayDiaPhuongISO','congNgayKho','khoangNgayKho','layKyPhanTichKho',
  'cotStorageLocation','hallTuStorageLocation','hallDangLoc','lichSuTheoHall',
  'tonKhoTheoHall','coCotStockHall','tonKhoHall1TonLau','cotMaSapLichSuKho','thongKeVatTuTonLau']){
  const match=html.match(new RegExp('^    function '+name+'\\([^]*?^    }','m'));
  assert(match,name);vm.runInContext(match[0],ctx);
}
function range(month,now=new Date(2026,10,9)){
  nodes['dashboard-range-month'].value=month;
  const result=ctx.layKyPhanTichKho(now);
  return result&&[result.from,result.to,result.prevFrom,result.prevTo];
}
assert.deepEqual(range('2026-10'),['2026-10-01','2026-10-31','2026-09-01','2026-09-30']);
assert.deepEqual(range('2026-02'),['2026-02-01','2026-02-28','2026-01-01','2026-01-31']);
assert.deepEqual(range('2024-02'),['2024-02-01','2024-02-29','2024-01-01','2024-01-31']);
assert.deepEqual(range('2026-01'),['2026-01-01','2026-01-31','2025-12-01','2025-12-31']);
assert.deepEqual(range('2026-11'),['2026-11-01','2026-11-09','2026-10-01','2026-10-09']);
assert.deepEqual(range('2026-03',new Date(2026,2,31)),
  ['2026-03-01','2026-03-31','2026-02-01','2026-02-28']);
for(const month of ['', '2026-13','2026-00','2026-1','1999-12','2026-12','2030-01'])
  assert.equal(range(month),null,month);
nodes['dashboard-range-mode'].value='month';
assert.deepEqual(range(''),['2026-11-01','2026-11-09','2026-10-01','2026-10-09']);
nodes['dashboard-range-mode'].value='year';
assert.deepEqual(range(''),['2025-01-01','2026-11-09','2023-01-01','2024-11-09']);

ctx.tieuDeCot=['SAP','Description','Storage Location','Unit','Price'];
ctx.duLieuTimKiem=[
  {dong:['A','Hall 2 motor','Hall 2','PC',9999],soLuong:900},
  {dong:['A','Hall 1 motor','Hall 1','PC',100],soLuong:10},
  {dong:['B','Recent Hall 1','Hall 1','PC',200],soLuong:20},
  {dong:['C','Hall 2 only','Hall 2','PC',300],soLuong:30},
  {dong:['D','Hall 1 never issued','Hall 1','PC',400],soLuong:40},
  {dong:['E','Unknown area','8000','PC',500],soLuong:50},
  {dong:['F','No stock','Hall 1','PC',600],soLuong:0}
];
ctx.historyColumns=['Material','Storage Location'];
ctx.historyAll=[
  {cells:['A','Hall 1'],type:'out',date:'2025-01-01'},
  {cells:['A','Hall 2'],type:'out',date:'2026-11-08'},
  {cells:['A','8000'],type:'out',date:'2026-11-09'},
  {cells:['A','Hall 1'],type:'in',date:'2026-11-09'},
  {cells:['A','Hall 1'],type:'out',date:'2027-01-01'},
  {cells:['B','Hall 1'],type:'out',date:'2026-11-08'},
  {cells:['C','Hall 2'],type:'out',date:'2024-01-01'}
];
const report=()=>ctx.thongKeVatTuTonLau(90,new Date(2026,10,9));
const rows=report();
assert.deepEqual(Array.from(rows,r=>r.sap),['D','A']);
const motor=rows.find(r=>r.sap==='A');
assert.equal(motor.quantity,10);assert.equal(motor.price,100);
assert.equal(motor.last,'2025-01-01');
nodes['dashboard-hall'].value='hall1';
assert.deepEqual(Array.from(report(),r=>r.sap),['D','A']);
nodes['dashboard-hall'].value='hall2';
assert.equal(report().length,0);
nodes['dashboard-hall'].value='all';
// A standalone Hall 1 Stock file has no Storage Location column.
const mixedStock=ctx.duLieuTimKiem;
ctx.tieuDeCot=['SAP','Description','No Hall','Unit','Price'];
ctx.duLieuTimKiem=mixedStock.filter(item=>item.dong[2]==='Hall 1');
for(const hall of ['all','hall1']){
  nodes['dashboard-hall'].value=hall;
  const standalone=report();
  assert.deepEqual(Array.from(standalone,r=>r.sap),['D','A']);
  assert.equal(standalone.find(r=>r.sap==='A').quantity,10);
  assert.equal(standalone.find(r=>r.sap==='A').price,100);
  assert.equal(standalone.find(r=>r.sap==='A').last,'2025-01-01');
  // Other analytics retain strict Hall filtering for unlabelled stock.
  assert.equal(ctx.tonKhoTheoHall('hall1'),null);
}
nodes['dashboard-hall'].value='hall2';assert.equal(report().length,0);
nodes['dashboard-hall'].value='all';
// If Stock supplies locations, never fall back over unknown codes.
ctx.tieuDeCot=['SAP','Description','Storage Location','Unit','Price'];
ctx.duLieuTimKiem=[{dong:['A','Unknown','8000','PC',100],soLuong:10}];
assert.equal(report(),null);
ctx.duLieuTimKiem=[{dong:['A','Motor','Hall 1','PC',100],soLuong:10}];
ctx.historyColumns=['Material','No Hall'];
assert.equal(report(),null);
console.log('PASS selected calendar months, leap years, current-month cutoff, year rollover, invalid months, and Hall 1-only dormant quantities/prices/last issues.');
