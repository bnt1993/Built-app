const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(path.join(__dirname,'../Checking.html'),'utf8');
function load(names,ctx){
  vm.createContext(ctx);
  for(const name of names){
    const match=html.match(new RegExp('^    function '+name+'\\([^]*?^    }','m'));
    assert(match,'missing canonical function '+name);vm.runInContext(match[0],ctx);
  }
  return ctx;
}
const numberCtx=load(['chuyenThanhSo','tenHistoryChuan','cotHistoryTheoTen',
  'ngayHistoryHopLe','khoaNhomKho','tinhGiaTriNhapXuat'],{});
const interval={from:'2026-11-01',to:'2026-11-17'};
const transactions=[
  {type:'in',date:'2026-11-05',cells:[100]},
  {type:'in',date:'2026-11-20',cells:[900]},
  {type:'out',date:'2026-10-31',cells:[-800]},
  {type:'out',date:'2026-11-07',cells:[-50]},
  {type:'out',date:'2026-11-18',cells:[-950]},
  {type:'other',date:'2026-11-06',cells:[99999]}
];
for(const mode of ['day','week','month','year']){
  const buckets=[...new Set(transactions.map(r=>numberCtx.khoaNhomKho(r.date,mode)))].map(key=>({key}));
  const figures=numberCtx.tinhGiaTriNhapXuat(transactions,['Amt.In'],mode,buckets,interval);
  assert.equal(figures.incoming,100,mode+' must exclude dates after the interval');
  assert.equal(figures.outgoing,50,mode+' must exclude both boundary sides');
}
const elements={};
const node=id=>elements[id]??=( {textContent:'old',innerHTML:'',title:'old',value:'90',disabled:false,hidden:false,dataset:{}} );
const domCtx=load(['xoaChiSoBaoCaoKho','veVatTuTonLau','veTopVatTuXuatKho',
  'vePhanBoTrangThai','veBangConsumption123'],{
  document:{getElementById:node},hallDangLoc:()=> 'hall2',
  analyticsReady:true,historyLoaded:false,historyLoading:true,
  dashboardDormantCache:{},capNhatSoMaBaoCaoKho:()=>{},
  capNhatPhanTrangBangKho:()=>({start:0,end:0,total:0}),
  tuDien:key=>key,thoatHTML:String,dinhDangSoLuong:new Intl.NumberFormat('vi-VN'),
  consTableState:{filteredRows:[{sap:'old'}]},duLieuTimKiem:[]
});
domCtx.veVatTuTonLau();
assert.equal(node('analytics-kpi-dormant-value').textContent,'—');
assert.equal(node('analytics-kpi-slow-rate').textContent,'—');
assert.equal(node('dashboard-dormant-pager').hidden,true);
domCtx.veTopVatTuXuatKho();
assert.equal(node('analytics-kpi-out-value').textContent,'—');
assert.equal(node('analytics-kpi-out-note').textContent,'');
domCtx.veBangConsumption123();
assert.equal(domCtx.consTableState.filteredRows.length,0);
assert.equal(node('analytics-cons-pager').hidden,true);
domCtx.vePhanBoTrangThai([
  {trangThaiTon:'healthy',soLuong:1},
  {trangThaiTon:'zero',soLuong:0},
  {trangThaiTon:'unknown',soLuong:NaN}
]);
assert.match(node('metric-instock-rate').textContent,/33\.3%/,'unknown rows must not count as positive stock');
const controls={'dashboard-limit':{value:'20'},'dashboard-out-min':{value:'500'},
  'dashboard-dormant-days':{value:'90'},'analytics-cons-horizon':{value:'12'},
  'analytics-cons-status':{value:'all'}};
const source=[
  {sap:'A',name:'A',description:'Motor',value:900,quantity:3,unit:'PC',quantityValid:true},
  {sap:'B',name:'B',description:'Valve',value:700,quantity:2,unit:'PC',quantityValid:true}
];
const expCtx=load(['locVatTuBaoCaoKho','layDongTieuThuDaLoc','taoDuLieuXuatThongKe'],{
  document:{getElementById:id=>controls[id]},analyticsSearchQuery:'motor',ngonNguHienTai:'vi',
  chuanHoaTimKiem:value=>String(value).toLowerCase(),
  hallDangLoc:()=> 'all',layKyPhanTichKho:()=>interval,tuDien:key=>key,
  analyticsReady:true,historyLoaded:true,historyLoading:false,
  dashboardSortState:{value:{column:'value',direction:-1},out:{column:'value',direction:-1},dormant:{column:'price',direction:-1}},
  sapXepBangPhanTich:rows=>rows,dashboardTopValueCache:source,
  dashboardOutCache:null,dashboardDormantCache:null,duLieuTimKiem:[],historyAll:[],
  phamViTopXuatKho:()=>interval,lichSuTheoHall:()=>[],
  thongKeTopVatTuXuatKho:()=>source,thongKeVatTuTonLau:()=>source,
  ngayDiaPhuongISO:()=> '2026-11-17',
  tinhDuLieuConsumption123:()=>[
    {sap:'A',description:'Motor',m12:{tier:'safe'}},
    {sap:'B',description:'Valve',m12:{tier:'zero'}}
  ],
  sapXepDongTieuThu:rows=>rows
});
for(const kind of ['value','out','dormant']){
  const result=expCtx.taoDuLieuXuatThongKe(kind);
  assert.deepEqual(Array.from(result.rows,r=>r[0]),['A'],kind+' export must use the search');
}
expCtx.analyticsSearchQuery='missing';
assert.equal(expCtx.taoDuLieuXuatThongKe('consumption').rows.length,0,'an empty filtered report must never export all materials');
expCtx.analyticsSearchQuery='';
controls['analytics-cons-status'].value='zero';
assert.deepEqual(Array.from(expCtx.layDongTieuThuDaLoc(),row=>row.sap),['B']);
const markup=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'');
const ids=Array.from(markup.matchAll(/\bid="([^"]+)"/g),match=>match[1]);
assert.equal(new Set(ids).size,ids.length,'duplicate HTML ids');
const primary=markup.match(/<section class="warehouse-primary-kpis"[^]*?<\/section>/)[0];
assert.equal((primary.match(/class="warehouse-kpi"/g)||[]).length,4);
assert.equal((markup.match(/data-warehouse-report="/g)||[]).length,4);
for(const name of ['veBieuDoGiaTriKho','veBieuDoSuDungKho','veBangTopGiaTriVatTu','vePhanBoTrangThai','veTopVatTuXuatKho','veVatTuTonLau']){
  assert.equal((html.match(new RegExp('function '+name+'\\(','g'))||[]).length,1,name+' must have one implementation');
  assert(!html.includes(name+' = function'),name+' must not be overwritten');
}
for(const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g))new Function(match[1]);
console.log('PASS warehouse readability: bounded day/week/month/year movements, Hall 2 and loading resets, positive-stock ratio, filtered/empty exports, four primary KPIs, unique IDs and canonical scripts.');
