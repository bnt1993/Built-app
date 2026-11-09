// Node regression: filtered dashboard exports and multi-sheet XLSX generation.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const {Blob}=require('buffer'),{TextEncoder}=require('util');
const html=fs.readFileSync(path.join(__dirname,'../Checking'),'utf8');
let hall='all';
const controls={
  'dashboard-limit':{value:'2'},'dashboard-out-min':{value:'500'},
  'dashboard-dormant-days':{value:'90'},'dashboard-value-period':{value:'month'},
  'dashboard-usage-period':{value:'month'}
};
const ctx={
  console,Blob,TextEncoder,setTimeout,clearTimeout,Uint8Array,DataView,Uint32Array,
  window:{amountData:[['08/11/2026',1000,''],['09/11/2026',3000,'']]},
  document:{getElementById:id=>controls[id]},
  ngonNguHienTai:'vi',tuDien:key=>key,hallDangLoc:()=>hall,
  layKyPhanTichKho:()=>({from:'2026-11-01',to:'2026-11-30',prevFrom:'2026-10-01',prevTo:'2026-10-31'}),
  ngayDiaPhuongISO:()=> '2026-11-09',
  nhomKyTrongKhoangKho:()=>[{key:'2026-11',label:'11/2026'}],
  phamViTopXuatKho:()=>({from:'2026-11-01',to:'2026-11-30'}),
  analyticsReady:true,historyLoaded:true,historyLoading:false,
  dashboardSortState:{
    value:{column:'value',direction:-1},out:{column:'value',direction:-1},
    dormant:{column:'price',direction:-1}
  },
  dashboardTopValueCache:[
    {name:'A',description:'Motor A',quantity:8,unit:'PC',value:5000},
    {name:'B',description:'Motor B',quantity:2,unit:'PC',value:1000},
    {name:'C',description:'Motor C',quantity:1,unit:'PC',value:10}
  ],
  duLieuTimKiem:[{trangThaiTon:'healthy'},{trangThaiTon:'zero'}],
  historyAll:[],historyColumns:[],
  sapXepBangPhanTich:(rows,kind)=>rows.slice().sort((a,b)=>
    ctx.dashboardSortState[kind].direction*(a[ctx.dashboardSortState[kind].column]-
       b[ctx.dashboardSortState[kind].column])),
  lichSuTheoHall:()=>[],
  thongKeTopVatTuXuatKho:()=>null,
  thongKeVatTuTonLau:()=>null,
  cotGiaTriLichSuKho:()=>0,
  tongNhapXuatTrongKhoang:range=>range.from.startsWith('2026-11')?
    {in:200,out:100}:{in:100,out:50},
  tinhGiaTriNhapXuat:()=>({missing:false,values:new Map([
    ['2026-11',{in:200,out:100}]])})
};
ctx.dashboardOutCache={
  key:'2026-11-01|2026-11-30|all',history:ctx.historyAll,stock:ctx.duLieuTimKiem,
  rows:[
    {sap:'A',description:'Motor A',value:900,quantity:3,unit:'PC',quantityValid:true,mixed:false},
    {sap:'B',description:'Motor B',value:400,quantity:1,unit:'PC',quantityValid:true,mixed:false},
    {sap:'C',description:'Motor C',value:700,quantity:2,unit:'PC',quantityValid:true,mixed:false}
  ]
};
ctx.dashboardDormantCache={
  days:90,today:'2026-11-09',hall:'all',history:ctx.historyAll,stock:ctx.duLieuTimKiem,
  rows:[
    {sap:'X',description:'Old X',quantity:7,quantityValid:true,unit:'PC',
      price:999,priceValid:true,priceMixed:false,last:'2025-01-01'},
    {sap:'Y',description:'Old Y',quantity:9,quantityValid:true,unit:'PC',
      price:700,priceValid:true,priceMixed:false,last:''}
  ]
};
vm.createContext(ctx);
for(const name of ['ngayHistoryHopLe','khoaNhomKho','layGiaTriKhoTuAmount',
  'taoDuLieuXuatThongKe','xmlXlsx','tenCotXlsx','oChuXlsx','oSoXlsx',
  'hangXlsx','taoKieuXlsx','dongGoiZipXlsx','taoBaoCaoThongKeXlsx']){
  const match=html.match(new RegExp('^    (?:async )?function '+name+'\\([^]*?^    }','m'));
  assert(match,'missing '+name);vm.runInContext(match[0],ctx);
}
const highest=ctx.taoDuLieuXuatThongKe('value');
assert.deepEqual(Array.from(highest.rows.map(r=>r[0])),['A','B']);
const out=ctx.taoDuLieuXuatThongKe('out');
assert.deepEqual(Array.from(out.rows.map(r=>r[0])),['A','C']);
assert.equal(out.meta.find(x=>x[0]==='dashboardExportThreshold')[1],'500');
const dormant=ctx.taoDuLieuXuatThongKe('dormant');
assert.equal(dormant.rows.length,2);
assert.equal(dormant.rows[0][0],'X');
const distribution=ctx.taoDuLieuXuatThongKe('distribution');
assert.equal(distribution.rows.find(r=>r[0]==='stockAbove')[2],50);
const trend=ctx.taoDuLieuXuatThongKe('valueTrend');
assert.equal(trend.rows[0][2],3000);
const movement=ctx.taoDuLieuXuatThongKe('movement');
assert.equal(movement.rows[0][1],200);
const compare=ctx.taoDuLieuXuatThongKe('compare');
assert.equal(compare.rows[0][3],100);
hall='hall2';
assert.throws(()=>ctx.taoDuLieuXuatThongKe('dormant'),/DASHBOARD_EXPORT_UNAVAILABLE/);
assert.throws(()=>ctx.taoDuLieuXuatThongKe('value'),/DASHBOARD_EXPORT_UNAVAILABLE/);
hall='all';
(async()=>{
  const blob=await ctx.taoBaoCaoThongKeXlsx([highest,out,dormant,trend]);
  const bytes=Buffer.from(await blob.arrayBuffer()).toString('utf8');
  assert(bytes.includes('xl/worksheets/sheet4.xml'));
  assert(bytes.includes('<autoFilter ref="A8:E10"'));
  assert(bytes.includes('Motor A'));
  assert(bytes.includes('<sheet name="Top xuat" sheetId="2" r:id="rId2"/>'));
  assert(bytes.includes('Amount.js'));
  console.log('PASS export scope, Top-N, slider, unpaged rows, Hall 2 restriction, grouped Amount.js and multi-sheet XLSX.');
})().catch(err=>{console.error(err);process.exitCode=1});
