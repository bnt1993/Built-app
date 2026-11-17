// Run with: node --test tests/checking-audit.test.cjs (no dependencies).
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../Checking.html'),'utf8');
function source(name){
 const start=html.indexOf('    function '+name+'(');
 assert(start>=0,name+' exists');
 const end=html.indexOf('\n    }',start);
 return html.slice(start,end+6);
}
function context(){
 const c=vm.createContext({console,Date,Map,WeakMap,Intl,Number,Math,Set,
  ngonNguHienTai:'vi',historyLoaded:true,historyAll:[],historyColumns:['Amt.In'],
  duLieuTimKiem:[],tieuDeCot:[],
  cotHistoryTheoTen:(cols,names)=>cols.findIndex(x=>names.includes(x)),
  ngayHistoryHopLe:d=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&!Number.isNaN(Date.parse(d+'T00:00:00Z')),
  chuanHoaMaSap:x=>String(x??'').trim(),
  tonKhoTheoHall:()=>c.duLieuTimKiem,lichSuTheoHall:()=>c.historyAll,
  cotMaSapLichSuKho:()=>0,cotSoLuongHistoryDungCot:()=>1,
 });
 for(const name of ['chuyenThanhSo','congNgayKho','khoangNgayKho','khoaNhomKho','nhomKyTrongKhoangKho','tongHopGiaoDichTheoNgay','tinhGiaTriNhapXuat','tongNhapXuatTrongKhoang','duLieuDieuHanhTheoKy','congNamKho','ngayDiaPhuongISO','tinhDuLieuConsumption123'])vm.runInContext(source(name),c);
 return c;
}
const row=(date,type,value)=>({date,type,cells:[value]});
test('all inline scripts compile',()=>{
 for(const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi))new vm.Script(match[1]);
});
test('exclude other movements and clip partial months to exact dates',()=>{
 const c=context(),rows=[row('2026-11-01','in',100),row('2026-11-10','out',-20),row('2026-11-11','unknown',9000),row('2026-11-20','in',500)];
 const range={from:'2026-11-05',to:'2026-11-17'};
 const s=c.tinhGiaTriNhapXuat(rows,['Amt.In'],'month',c.nhomKyTrongKhoangKho('month',range),range);
 assert.equal(s.incoming,0);assert.equal(s.outgoing,20);assert.equal(s.count,1);
 c.historyAll=rows;const t=c.tongNhapXuatTrongKhoang(range,0);assert.equal(t.out,20);assert.equal(t.in,0);
});
test('include empty calendar periods and compare exactly the selected prior range',()=>{
 const c=context(),rows=[row('2026-08-10','out',60),row('2026-09-10','out',90),row('2026-11-10','out',30)];
 const range={from:'2026-09-01',to:'2026-11-30',prevFrom:'2026-06-02',prevTo:'2026-08-31'};
 const d=c.duLieuDieuHanhTheoKy(rows,['Amt.In'],'month',range);
 assert.equal(d.series.length,3);assert.equal(d.series[1].out,0);assert.equal(d.current.out,120);assert.equal(d.previous.out,60);
 assert.equal(d.averageDays,91);assert.equal(d.previousDays,91);
});
test('week boundaries across New Year do not include outside-range movements',()=>{
 const c=context(),rows=[row('2025-12-28','out',1000),row('2025-12-31','out',10),row('2026-01-01','in',20),row('2026-01-04','out',2000)];
 const range={from:'2025-12-31',to:'2026-01-01'};
 const s=c.tinhGiaTriNhapXuat(rows,['Amt.In'],'week',c.nhomKyTrongKhoangKho('week',range),range);
 assert.equal(s.outgoing,10);assert.equal(s.incoming,20);
});
test('daily cache reused; new data or changed amount column invalidates it',()=>{
 const c=context(),rows=[row('2026-11-01','in',100)];
 const a=c.tongHopGiaoDichTheoNgay(rows,['Amt.In']);assert.equal(c.tongHopGiaoDichTheoNgay(rows,['Amt.In']),a);
 assert.notEqual(c.tongHopGiaoDichTheoNgay(rows.slice(),['Amt.In']),a);
 assert.equal(c.tongHopGiaoDichTheoNgay(rows,['Material']).amountCol,-1);
});
test('missing amount column is unavailable rather than zero',()=>{
 const c=context();const s=c.tinhGiaTriNhapXuat([],['Material'],'month',[]);assert.equal(s.missing,true);
});
test('consumption cache reuses SAP lookup and refreshes on new history, stock or day',()=>{
 const c=context();let day='2026-11-17';c.ngayDiaPhuongISO=()=>day;
 c.tieuDeCot=['Material','Description','Unit'];c.historyColumns=['Material','Qty in unit of entry','Unit of Entry'];
 c.duLieuTimKiem=[{dong:['1001','Bearing','PC'],soLuong:20}];
 c.historyAll=[{date:'2026-11-10',type:'out',cells:['1001',12,'PC']}];
 const a=c.tinhDuLieuConsumption123();assert.equal(a[0].m12.avgMonth,1);assert.equal(c.tinhDuLieuConsumption123(),a);
 assert.equal(c.tinhDuLieuConsumption123.cache.bySap.get('1001'),a[0]);
 c.historyAll=[...c.historyAll,{date:'2026-11-11',type:'out',cells:['1001',12,'PC']}];
 const b=c.tinhDuLieuConsumption123();assert.notEqual(a,b);assert.equal(b[0].m12.avgMonth,2);
 c.duLieuTimKiem=[{dong:['1001','Bearing','PC'],soLuong:40}];assert.equal(c.tinhDuLieuConsumption123()[0].stock,40);
 const before=c.tinhDuLieuConsumption123();day='2026-11-18';assert.notEqual(c.tinhDuLieuConsumption123(),before);
});
test('unit mismatch does not produce misleading coverage',()=>{
 const c=context();c.tieuDeCot=['Material','Description','Unit'];c.historyColumns=['Material','Qty in unit of entry','Unit of Entry'];
 c.duLieuTimKiem=[{dong:['1001','Bearing','PC'],soLuong:20}];c.historyAll=[{date:c.ngayDiaPhuongISO(),type:'out',cells:['1001',12,'KG']}];
 assert.equal(c.tinhDuLieuConsumption123()[0].m12.coverDays,null);
});
test('executive renderer handles invalid ranges, missing history and hidden tab',()=>{
 const c=context(),nodes={'insight-usage-detail':{textContent:'old',innerHTML:''},'dashboard-usage-detail-summary':{textContent:'old'},'dashboard-usage-detail-period':{value:'month'}};
 Object.assign(c,{tabHienTai:'dashboard',document:{getElementById:id=>nodes[id]},tuDien:key=>key,layKyPhanTichKho:()=>null});
 vm.runInContext(source('veTongQuanDieuHanhCoChuThich'),c);
 c.veTongQuanDieuHanhCoChuThich();assert.equal(nodes['insight-usage-detail'].textContent,'dashboardTimeInvalid');assert.equal(nodes['dashboard-usage-detail-summary'].textContent,'');
 c.historyLoaded=false;c.historyLoading=true;c.veTongQuanDieuHanhCoChuThich();assert.equal(nodes['insight-usage-detail'].textContent,'dashUsageLoading');
 c.tabHienTai='stock';nodes['insight-usage-detail'].textContent='unchanged';c.veTongQuanDieuHanhCoChuThich();assert.equal(nodes['insight-usage-detail'].textContent,'unchanged');
});
test('executive rendered averages and percentages use matching windows',()=>{
 const c=context(),nodes={'insight-usage-detail':{textContent:'',innerHTML:''},'dashboard-usage-detail-summary':{textContent:''},'dashboard-usage-detail-period':{value:'month'}};
 const range={from:'2026-11-01',to:'2026-11-10',prevFrom:'2026-10-22',prevTo:'2026-10-31'};
 c.historyAll=[row('2026-11-05','out',100),row('2026-10-25','out',50)];
 Object.assign(c,{tabHienTai:'dashboard',document:{getElementById:id=>nodes[id]},tuDien:key=>key,layKyPhanTichKho:()=>range,thoatHTML:String,dinhDangRutGonKho:x=>String(x)});
 vm.runInContext(source('veTongQuanDieuHanhCoChuThich'),c);c.veTongQuanDieuHanhCoChuThich();
 assert(nodes['insight-usage-detail'].innerHTML.includes('304.375 ₫'));assert(nodes['insight-usage-detail'].innerHTML.includes('100%'));
 assert(!nodes['insight-usage-detail'].innerHTML.includes('Infinity'));assert(!nodes['insight-usage-detail'].innerHTML.includes('NaN'));
});
test('first successful History load stores the fetched version for the next poll',async()=>{
 const c=context();Object.assign(c,{historyLoaded:false,historyLoading:false,historySeq:0,historyStatusKey:'historyLoading',phienBanChoNap:{},phienBanNguon:{},DUONG_DAN_HISTORY:'History.js',location:{protocol:'https:'},
  phienBanHistoryHienTai:async()=> 'etag:fixture-v1',layCacheHistory:async()=>null,
  fetch:async()=>({ok:true,text:async()=> 'fixture'}),docHistoryBangWorker:async()=>({data:[['Amt.In']],updated:'fixture'}),
  apDungNguonHistory:async()=>{c.historyLoaded=true;return true},luuCacheHistory:()=>{},
 });
 for(const name of ['ghiNhanNguon','veSoSanhNhapXuatKho','veTopVatTuXuatKho','veVatTuTonLau','capNhatTrangThaiHistory','veBieuDoSuDungKho','locLichSuVatTu','capNhatCardNgayXuat','capNhatCanhBaoKho'])c[name]=()=>{};
 const start=html.indexOf('    async function taiHistory('),end=html.indexOf('\n    }',start);vm.runInContext(html.slice(start,end+6),c);
 await c.taiHistory();assert.equal(c.phienBanNguon.history,'etag:fixture-v1');assert.equal(c.historyLoading,false);
});
