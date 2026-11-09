// Node regression: Amount.js beside Checking; no dependencies.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(path.join(__dirname,'../Checking'),'utf8');
const nodes={
  'metric-inventory-value':{textContent:'',title:''},
  'metric-value-note':{textContent:''},
  'metric-value-change':{textContent:'',dataset:{}},
  'dashboard-amount-status':{textContent:''},
  'dashboard-value-period':{value:'day'},
  'insight-value-trend':{textContent:''},
  'dashboard-value-trend-summary':{textContent:''}
};
let hall='all',chart=null,scriptAction=()=>{};
const document={hidden:false,getElementById:id=>nodes[id],
  createElement:()=>({remove(){}}),
  head:{appendChild:script=>scriptAction(script)}};
const ctx={console,window:{},document,setTimeout,clearTimeout,Array,Date,Map,Set,
  dangTaiAmount:false,trangThaiAmount:null,ngonNguHienTai:'vi',
  hallDangLoc:()=>hall,layKyPhanTichKho:()=>({from:'2026-11-01',to:'2026-11-30'}),
  nhomKyTrongKhoangKho:(mode)=>{
    if(mode==='month')return [{key:'2026-11',label:'11/2026'}];
    return [...Array(30)].map((_,i)=>{const d='2026-11-'+String(i+1).padStart(2,'0');return {key:d,label:d}});
  },
  veCotTheoThoiGianKho:(id,buckets,values)=>{chart={id,buckets,values}},
  dinhDangGiaTriKho:n=>new Intl.NumberFormat('vi-VN').format(n)+' ₫',
  dinhDangSoLuong:{format:n=>String(n)},tuDien:key=>key,
  veLichSuKho:()=>{},ghiNhanNguon:()=>{},capNhatCanhBaoKho:()=>{}};
vm.createContext(ctx);
for(const name of ['ngayHistoryHopLe','khoaNhomKho','layGiaTriKhoTuAmount',
  'phanTramBienDongKho','tinhBienDongAmount','chuoiPhanTramKho',
  'anhChupGiaTriMoiNhat','hienThiTongGiaTriKho','capNhatTrangThaiAmount',
  'veBieuDoGiaTriKho','taiLaiAmount']){
  const m=html.match(new RegExp('^    function '+name+'\\([^]*?^    }','m'));
  assert(m,'missing '+name);vm.runInContext(m[0],ctx);
}
const file={window:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../Amount.js'),'utf8'),file);
assert.equal(file.window.amountData[0][1],11441184959);
ctx.window.amountData=[
  ['08/11/2026',100,''],['09/11/2026',200,''],['09/11/2026',250,''],
  ['10/11/2026',0,''],['11/11/2026',null,''],['12/11/2026','',''],
  ['13/11/2026',' ',''],['14/11/2026',undefined,''],
  ['15/11/2026','1.200.000',''],['16/11/2026',-1,''],
  ['17/11/2026',Infinity,''],['31/02/2026',90,'']
];
const data=ctx.layGiaTriKhoTuAmount();
assert.deepEqual(Array.from(data.map(x=>x.date)),['2026-11-08','2026-11-09','2026-11-10']);
assert.equal(data[1].value,250);
assert.equal(data[2].value,0);
assert.equal(ctx.tinhBienDongAmount().percent,-100);
for(const scope of ['all','hall1']){
  hall=scope;chart=null;ctx.veBieuDoGiaTriKho();
  assert.equal(nodes['metric-inventory-value'].textContent,'0 ₫');
  assert.match(nodes['metric-value-change'].textContent,/100/);
  assert.equal(chart.values.get('2026-11-09'),250);
  assert.equal(chart.values.get('2026-11-10'),0);
}
hall='hall2';chart=null;ctx.veBieuDoGiaTriKho();
assert.equal(chart,null);assert.equal(nodes['metric-inventory-value'].textContent,'—');
hall='hall1';scriptAction=script=>{
  assert(/^Amount\.js\?t=\d+$/.test(script.src));
  ctx.window.amountData=[['19/11/2026',3300,'3.300 VND']];
  script.onload();
};
ctx.taiLaiAmount();
assert.equal(nodes['metric-inventory-value'].textContent,'3.300 ₫');
assert.equal(nodes['dashboard-amount-status'].textContent,'');
scriptAction=script=>script.onerror();
ctx.taiLaiAmount();
assert.equal(ctx.window.amountData[0][1],3300);
assert.equal(nodes['dashboard-amount-status'].textContent,'dashAmountStale');
scriptAction=script=>{ctx.window.amountData=[['20/11/2026',null,'']];script.onload()};
ctx.taiLaiAmount();
assert.equal(ctx.window.amountData[0][1],3300);
assert.equal(nodes['dashboard-amount-status'].textContent,'dashAmountStale');
scriptAction=script=>{ctx.window.amountData=[];script.onload()};
ctx.taiLaiAmount();
assert.equal(nodes['metric-inventory-value'].textContent,'—');
console.log('PASS Amount.js local schema, missing-vs-zero, grouping, Hall scope, refresh and stale fallback.');
