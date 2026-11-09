const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(path.join(__dirname,'../Checking'),'utf8');
const nodes={'dashboard-hall':{value:'hall1'},'dashboard-hall-status':{textContent:''}};
const ctx={console,setTimeout,clearTimeout,window:{},historyHallCache:null,stockHallCache:null,
  historyLoaded:true,analyticsReady:false,ngonNguHienTai:'vi',DUONG_DAN_HISTORY:'History.js',
  materialHistoryFromDormant:false,
  document:{getElementById:id=>nodes[id]||null,createElement:()=>({remove(){}}),body:{}},
  tuDien:(key,params={})=>key+JSON.stringify(params)};
vm.createContext(ctx);
for(const name of ['thoatHTML','chuyenThanhSo','chuanHoaMaSap','tenHistoryChuan','cotHistoryTheoTen',
  'docHistoryTuVanBan','timNguonHistory','taiHistoryBangScript','ngayHistoryISO','loaiHistory',
  'cotStorageLocation','hallTuStorageLocation','hallDangLoc','coCotHistoryHall','coCotStockHall',
  'lichSuTheoHall','tonKhoTheoHall','tonKhoHall1TonLau','loiCotHall','capNhatTrangThaiHall','dinhDangLuongHistory',
  'dongStockLichSuVatTu','cotSoLuongHistoryDungCot','tongSoLuongHistory','thongKeConsumptionVatTu',
  'hienThiSoLuongVatTu','capNhatLocCostCenter','locLichSuVatTu','moLichSuDashboardTheoSap','moLichSuVatTu']){
  const match=html.match(new RegExp('^    function '+name+'\\([^]*?^    }','m'));
  assert(match,name);vm.runInContext(match[0],ctx);
}

const actual=fs.readFileSync(path.join(__dirname,'../History.js'),'utf8');
const parsed=ctx.docHistoryTuVanBan(actual);
assert.equal(parsed.updated,'2026-11-06T13:40:35');
assert.equal(parsed.data.length-1,62801);
const headers=parsed.data[0];
for(const [name,index] of [['Storage Location',0],['Posting Date',1],['Movement Type',2],
  ['Qty in unit of entry',6],['Unit of Entry',7],['Amt.in loc.cur.',8]]){
  assert.equal(ctx.cotHistoryTheoTen(headers,[name]),index);
}
assert(parsed.data.slice(1).every(row=>row.length===headers.length));
ctx.window.materialHistory=parsed.data;
assert.equal(ctx.timNguonHistory(),parsed.data);
for(const alias of ['duLieuCongTy','duLieuLichSu','duLieuHistory','lichSuNhapXuat','inventoryTransactions','historyData']){
  assert.equal(ctx.docHistoryTuVanBan('window.thoiGianCapNhat="legacy";window.'+alias+'=[["Material"]];').updated,'legacy');
}
assert.throws(()=>ctx.docHistoryTuVanBan('window.somethingElse=[];'),/HISTORY_BAD_FORMAT/);
ctx.docHistoryTuVanBan('window.materialHistory=[["Material"]];window.shouldNotExecute=true;');
assert.equal(ctx.window.shouldNotExecute,undefined);

ctx.historyColumns=headers;
ctx.historyAll=parsed.data.slice(1).map(cells=>({cells,date:ctx.ngayHistoryISO(cells[1]),type:ctx.loaiHistory(cells[2])}));
assert.equal(ctx.lichSuTheoHall('hall1').length,33287);
assert.equal(ctx.lichSuTheoHall('hall2').length,17513);
assert.equal(ctx.historyHallCache.unknownCount,12001);
assert.equal(ctx.lichSuTheoHall('all'),ctx.historyAll);
ctx.capNhatTrangThaiHall();
assert.match(nodes['dashboard-hall-status'].textContent,/dashboardHallPartialHistory/);
assert.match(nodes['dashboard-hall-status'].textContent,/12\.001/);
ctx.historyColumns=['Material','Storage Location'];
ctx.historyAll=[{cells:['A','Hall 1']}];
assert.equal(ctx.lichSuTheoHall('hall2').length,0);
ctx.historyAll=[{cells:['A','8001']}];
assert.equal(ctx.lichSuTheoHall('hall1'),null);
ctx.historyColumns=['Material'];
assert.equal(ctx.lichSuTheoHall('hall1'),null);
ctx.historyLoaded=false;ctx.analyticsReady=true;
ctx.tieuDeCot=['SAP','Storage Location'];
ctx.duLieuTimKiem=[{dong:['A','Hall 1']},{dong:['A','Hall 2']},{dong:['B','8000']}];
ctx.capNhatTrangThaiHall();
assert.match(nodes['dashboard-hall-status'].textContent,/dashboardHallPartialStock/);
nodes['dashboard-hall'].value='all';ctx.capNhatTrangThaiHall();
assert.equal(nodes['dashboard-hall-status'].textContent,'');
ctx.tatCaDuLieu=ctx.duLieuTimKiem.map(rec=>rec.dong);
ctx.materialHistorySap='A';ctx.materialHistoryStockIndex=0;ctx.materialHistoryHall='hall2';
assert.equal(ctx.dongStockLichSuVatTu()[1],'Hall 2');
ctx.tieuDeCot=['SAP','Description'];
assert.equal(ctx.dongStockLichSuVatTu(),undefined);
ctx.materialHistoryHall='all';
assert.equal(ctx.dongStockLichSuVatTu(),ctx.tatCaDuLieu[0]);

// Open the actual popup handlers with two Halls sharing one SAP. Rendering is
// stubbed; the source selection, filters, quantity cards and Stock lookup run.
for(const id of ['material-history-dialog','material-history-kind','material-history-from',
  'material-history-to','material-history-cost','material-history-sap','material-history-status',
  'material-history-refresh','material-history-export','material-history-stock','material-history-stock-note',
  'material-history-in-count','material-history-in-note','material-history-out-count','material-history-out-note',
  'material-history-other-count','material-history-unknown-note','material-history-monthly',
  'material-history-monthly-note','material-history-coverage','material-history-coverage-note']){
  nodes[id]={value:'',textContent:'',innerHTML:''};
}
nodes['material-history-dialog'].showModal=function(){this.open=true;};
ctx.document.querySelector=()=>({scrollTop:0});
Object.assign(ctx,{historyLoaded:true,historyLoading:false,historyStatusKey:'historyLoaded',
  materialHistoryExporting:false,materialHistoryRows:[],materialHistorySap:'',
  chiSoSoLuong:2,dinhDangSoLuong:new Intl.NumberFormat('vi-VN'),
  sapXepLichSuVatTu(){},veLichSuVatTu(){},taiHistory(){}});
ctx.historyColumns=['Storage Location','Posting Date','Movement Type','Material',
  'Qty in unit of entry','Unit of Entry','Cost Center'];
ctx.historyAll=[['Hall 1','01/10/2026','INPUT','A',10,'PC','CC1'],
  ['Hall 1','02/10/2026','OUTPUT','A',-4,'PC','CC1'],
  ['Hall 2','03/10/2026','OUTPUT','A',-9,'PC','CC2'],
  ['8001','04/10/2026','OUTPUT','A',-20,'PC','CC2']]
  .map(cells=>({cells,date:ctx.ngayHistoryISO(cells[1]),type:ctx.loaiHistory(cells[2])}));
ctx.tieuDeCot=['SAP','Description','Stock','Unit','Storage Location'];
ctx.tatCaDuLieu=[ctx.tieuDeCot,['A','Motor H1',10,'PC','Hall 1'],['A','Motor H2',20,'PC','Hall 2']];
ctx.duLieuTimKiem=ctx.tatCaDuLieu.slice(1).map((dong,i)=>({dong,chiSo:i+1}));
nodes['dashboard-hall'].value='hall1';
ctx.moLichSuDashboardTheoSap('A');
assert.equal(ctx.materialHistoryHall,'hall1');assert.equal(ctx.materialHistoryRows.length,2);
assert.equal(nodes['material-history-in-count'].textContent,'10 PC');
assert.equal(nodes['material-history-out-count'].textContent,'4 PC');
assert.equal(nodes['material-history-stock'].textContent,'10 PC');
assert.match(nodes['material-history-status'].textContent,/materialHistoryHallScope/);
nodes['material-history-kind'].value='out';ctx.locLichSuVatTu();
assert.equal(ctx.materialHistoryRows.length,1);
assert.equal(nodes['material-history-in-count'].textContent,'10 PC');
nodes['material-history-from'].value='2026-10-02';ctx.locLichSuVatTu();
assert.equal(nodes['material-history-in-count'].textContent,'0');
nodes['dashboard-hall'].value='hall2';ctx.moLichSuDashboardTheoSap('A');
assert.equal(ctx.materialHistoryRows.length,1);
assert.equal(nodes['material-history-out-count'].textContent,'9 PC');
assert.equal(nodes['material-history-stock'].textContent,'20 PC');
// Dormant rows retain Hall 1 when opened from the All areas dashboard.
nodes['dashboard-hall'].value='all';ctx.moLichSuDashboardTheoSap('A','hall1');
assert.equal(ctx.materialHistoryHall,'hall1');assert.equal(ctx.materialHistoryRows.length,2);
assert.equal(nodes['material-history-out-count'].textContent,'4 PC');
assert.equal(nodes['material-history-stock'].textContent,'10 PC');
assert.equal(nodes['dashboard-hall'].value,'all');
nodes['dashboard-hall'].value='hall2';
// Without a Hall column in Stock, retain scoped history but show no Hall balance.
ctx.tieuDeCot=['SAP','Description','Stock','Unit'];ctx.moLichSuDashboardTheoSap('A');
assert.equal(ctx.materialHistoryRows.length,1);
assert.equal(nodes['material-history-stock'].textContent,'—');
// Dormant report alone can use the standalone Hall 1 stock source.
ctx.tatCaDuLieu=[ctx.tieuDeCot,['A','Standalone Hall 1',10,'PC']];
ctx.duLieuTimKiem=[{dong:ctx.tatCaDuLieu[1],chiSo:1}];
nodes['dashboard-hall'].value='all';ctx.moLichSuDashboardTheoSap('A','hall1',true);
assert.equal(ctx.materialHistoryFromDormant,true);
assert.equal(ctx.materialHistoryRows.length,2);
assert.equal(nodes['material-history-stock'].textContent,'10 PC');
assert.equal(nodes['material-history-out-count'].textContent,'4 PC');
ctx.moLichSuDashboardTheoSap('A','hall1');
assert.equal(ctx.materialHistoryFromDormant,false);
assert.equal(nodes['material-history-stock'].textContent,'—');
ctx.moLichSuDashboardTheoSap('A','hall2');
assert.equal(nodes['material-history-stock'].textContent,'—');
assert.equal(nodes['material-history-out-count'].textContent,'9 PC');
// Direct Stock lookup resets the popup to all Halls, including unmapped rows.
ctx.moLichSuVatTu(1);
assert.equal(ctx.materialHistoryFromDormant,false);
assert.equal(ctx.materialHistoryHall,'all');assert.equal(ctx.materialHistoryRows.length,4);
assert.equal(nodes['material-history-out-count'].textContent,'33 PC');
nodes['material-history-cost'].value='CC1';ctx.locLichSuVatTu();
assert.equal(ctx.materialHistoryRows.length,2);
assert.equal(nodes['material-history-out-count'].textContent,'4 PC');
ctx.materialHistoryHall='hall1';ctx.historyColumns=ctx.historyColumns.slice(1);ctx.locLichSuVatTu();
assert.equal(ctx.materialHistoryRows.length,0);
assert.equal(nodes['material-history-out-count'].textContent,'—');
assert.equal(nodes['material-history-monthly'].textContent,'—');
assert.match(nodes['material-history-status'].textContent,/dashboardHallNoHistoryColumn/);

(async()=>{
  const stock=[['SAP'],['stock']],oldHistory=[['Material'],['old']];
  const initial={duLieuCongTy:stock,thoiGianCapNhat:'stock time',
    materialHistory:oldHistory,lastUpdate:'unrelated time'};
  for(const source of [actual,'window.thoiGianCapNhat="legacy time";window.duLieuCongTy=[["Material"],["legacy"]];',
    'window.materialHistory=[["Material"],["no timestamp"]];']){
    ctx.window={...initial};
    ctx.document.body.appendChild=script=>{vm.runInContext(source,ctx);script.onload();};
    const result=await ctx.taiHistoryBangScript();
    assert.equal(result.updated,source===actual?parsed.updated:source.includes('legacy time')?'legacy time':'');
    assert(result.data.length>1);
    for(const key of Object.keys(initial))assert.equal(ctx.window[key],initial[key],key+' must be restored');
  }
  ctx.window={duLieuCongTy:stock,thoiGianCapNhat:'stock time'};
  ctx.document.body.appendChild=script=>{vm.runInContext(actual,ctx);script.onload();};
  assert.equal((await ctx.taiHistoryBangScript()).data.length-1,62801);
  assert.equal(Object.hasOwn(ctx.window,'materialHistory'),false);
  assert.equal(Object.hasOwn(ctx.window,'lastUpdate'),false);
  ctx.window={...initial};
  ctx.document.body.appendChild=script=>{ctx.window.lastUpdate='partial';script.onerror();};
  await assert.rejects(ctx.taiHistoryBangScript(),/HISTORY_MISSING/);
  assert.equal(ctx.window.lastUpdate,initial.lastUpdate);
  console.log('PASS real History.js, current/legacy loaders and timestamps, global restoration, Hall coverage, popup scope, quantity cards and scoped Stock.');
})().catch(e=>{console.error(e);process.exit(1)});
