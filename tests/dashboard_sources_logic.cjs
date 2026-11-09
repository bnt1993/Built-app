// Offline Node tests for sources, period drilldown, abnormal SAP warnings and worker.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(path.join(__dirname,'../Checking'),'utf8');
const funcs=['ngayHistoryHopLe','congNgayKho','layGiaTriKhoTuAmount',
  'phanTramBienDongKho','tinhBienDongAmount','khoangKyDuocChon',
  'vatTuXuatDotBienTrongKy','kiemTraPhienBanNguon'];
let code='let cacheCanhBaoVatTu=null;\n';
for(const name of funcs){
  const m=html.match(new RegExp('^    (?:async )?function '+name+'\\([^]*?^    }','m'));
  assert(m,'missing function '+name);code+=m[0]+'\n';
}
let hall='all',etag='"v1"',downloads=0,checking=0;
const historyAll=[
  {type:'out',date:'2026-10-09',cells:['SAP1','100']},
  {type:'out',date:'2026-11-09',cells:['SAP1','250']},
  {type:'out',date:'2026-10-10',cells:['SAP2','70']},
  {type:'out',date:'2026-11-10',cells:['SAP2','100']},
  {type:'in',date:'2026-11-10',cells:['SAP1','500']}
];
const ctx={
  console,Date,Array,Map,Set,Number,
  location:{protocol:'https:'},document:{hidden:false},window:{amountData:[
    ['01/11/2026',100,'100 VND'],['09/11/2026',125,'125 VND']
  ]},
  historyLoaded:true,historyAll,phienBanNguon:{stock:'',history:''},
  phienBanChoNap:{stock:'',history:''},
  hallDangLoc:()=>hall,
  lichSuTheoHall:()=>historyAll,cotGiaTriLichSuKho:()=>1,
  cotMaSapLichSuKho:()=>0,chuanHoaMaSap:x=>String(x),
  chuyenThanhSo:Number,
  layKyPhanTichKho:()=>({from:'2026-11-01',to:'2026-11-30',
    prevFrom:'2026-10-01',prevTo:'2026-10-31'}),
  ghiNhanNguon:()=>{checking++},
  fetch:async()=>({ok:true,headers:{get:key=>{
    if(key==='etag')return etag;return null;
  }}})
};
vm.createContext(ctx);vm.runInContext(code,ctx);
assert.equal(ctx.tinhBienDongAmount().percent,25);
ctx.window.amountData=[['09/11/2026',100,'']];
assert.equal(ctx.tinhBienDongAmount().percent,null);
ctx.window.amountData=[['08/11/2026',0,''],['09/11/2026',100,'']];
assert.equal(ctx.tinhBienDongAmount().percent,null);
assert.equal(ctx.phanTramBienDongKho(80,100),-20);
const week=ctx.khoangKyDuocChon('2026-11-09','week');
assert.equal(week.from,'2026-11-09');
assert.equal(week.to,'2026-11-15');
const month=ctx.khoangKyDuocChon('2026-11','month');
assert.equal(month.from,'2026-11-01');
assert.equal(month.to,'2026-11-30');
assert.equal(ctx.khoangKyDuocChon('2026-10','month'),null);
const abnormal=ctx.vatTuXuatDotBienTrongKy(ctx.layKyPhanTichKho());
assert.deepEqual(Array.from(abnormal.map(x=>x.sap)),['SAP1']);
ctx.vatTuXuatDotBienTrongKy(ctx.layKyPhanTichKho());
assert.equal(ctx.phanTramBienDongKho(150,50),200);
(async()=>{
  const download=()=>{downloads++;ctx.phienBanNguon.stock=ctx.phienBanChoNap.stock};
  await ctx.kiemTraPhienBanNguon('stock','data.js',download);
  await ctx.kiemTraPhienBanNguon('stock','data.js',download);
  assert.equal(downloads,1,'matching ETag must prevent a re-download');
  etag='"v2"';
  await ctx.kiemTraPhienBanNguon('stock','data.js',download);
  assert.equal(downloads,2,'changed ETag must cause a refresh');
  const worker=fs.readFileSync(path.join(__dirname,'../HistoryWorker.js'),'utf8');
  const messages=[],self={postMessage:value=>messages.push(value)};
  vm.runInNewContext(worker,{self,JSON,String,Error});
  assert.equal(messages[0].ready,true);
  self.onmessage({data:{source:'window.materialHistory=[["Material","Posting Date"],["SAP1","09/11/2026"]];window.lastUpdate="09/11/2026";'}});
  assert.equal(messages[1].data[1][0],'SAP1');
  assert.equal(messages[1].updated,'09/11/2026');
  console.log('PASS value delta, date boundaries, per-SAP alerts, ETag probe, Worker JSON parsing.');
})().catch(e=>{console.error(e);process.exitCode=1});
