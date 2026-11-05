const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(path.join(__dirname,'../Checking'),'utf8');
const ctx={console};vm.createContext(ctx);
for(const name of ['chuyenThanhSo','chuanHoaMaSap','tinhPhanTichDashboard']){
 const start=html.indexOf('    function '+name+'('),end=html.indexOf('\n    function ',start+1);
 assert(start>=0);vm.runInContext(html.slice(start,end),ctx);
}
const headers=['SAP','Description','Price'];
const rec=(sap,qty,rop,price,status)=>({dong:[sap,'Material',price],soLuong:qty,reorderPoint:rop,trangThaiTon:status});
const rows=[rec('A',0,10,2,'zero'),rec('A',2,10,2,'below'),rec('B',5,10,4,'below'),
rec('C',10,10,5,'at'),rec('D',20,10,3,'healthy'),rec('E',2,0,0,'healthy'),
rec('F',-1,5,2,'below'),rec('G',1,5,'bad','below'),rec('H',1,NaN,3,'unknown')];
const stats=ctx.tinhPhanTichDashboard(rows,headers);
assert.equal(stats.count,9);assert.equal(stats.inStock,7);assert.equal(stats.attention,6);
assert.equal(stats.total,137);assert.equal(stats.missingPrice,1);
assert.deepEqual(Array.from(stats.coverage),[1,2,1,1,1,3]);
assert.equal(stats.needTotal,68);assert.equal(stats.needUnknown,2);
assert.equal(stats.needs.find(x=>x.name==='A').value,36);
assert.equal(stats.values[0].name,'D');
assert.equal(ctx.tinhPhanTichDashboard([],headers).total,0);
assert.equal(ctx.tinhPhanTichDashboard(rows,['SAP','Description']).total,null);
const nodes={};const element=id=>nodes[id]??={value:'',textContent:''};
Object.assign(ctx,{analyticsReady:true,duLieuTimKiem:rows,tieuDeCot:headers,
document:{getElementById:element},dinhDangSoLuong:new Intl.NumberFormat('en'),dinhDangGiaTriKho:x=>String(x),
tuDien:(k,args)=>k+JSON.stringify(args??{}),vePhanBoTrangThai:r=>ctx.chartRows=r,
veBieuDoMucTon:(counts,total)=>ctx.chartCount=total,hienThiThanhGiaTri:(r,id,total)=>{ctx[id]={r,total}},
veLichSuKho(){},kiemTraNhacBaoCao(){}});
for(const name of ['chuanHoaTimKiem','capNhatThongKeNangCao']){
 const start=html.indexOf('    function '+name+'('),end=html.indexOf('\n    function ',start+1);
 vm.runInContext(html.slice(start,end),ctx);
}
element('dashboard-status').value='below';element('dashboard-limit').value='5';
ctx.capNhatThongKeNangCao();assert.equal(element('metric-total').textContent,'4');assert.equal(ctx.chartCount,4);
element('dashboard-search').value='no match';ctx.capNhatThongKeNangCao();assert.equal(element('metric-total').textContent,'0');assert.equal(ctx['insight-top'].r.length,0);
element('dashboard-status').value='all';element('dashboard-search').value='';ctx.capNhatThongKeNangCao();assert.equal(element('metric-inventory-value').textContent,'137');
assert(!html.includes('insight-abc'));assert(!html.includes('insight-groups'));
for(const m of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))new Function(m[1]);
console.log('PASS dashboard: scoped KPIs/charts, ROP boundaries, missing/zero prices, negative stock, duplicate SAP, no matches, removed ABC/groups.');
