const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'../Checking'),'utf8');
const ctx={console,window:{},THU_MUC_HINH:'Material/',bienTheAnh:new Map()};vm.createContext(ctx);
for(const name of ['chuyenThanhSo','chuanHoaMaSap','tenHistoryChuan','cotHistoryTheoTen','cotSoLuongHistoryDungCot','docHistoryTuVanBan','loaiHistory','tongSoLuongHistory','hinhAnhTuManifest']){
 const start=html.indexOf('    function '+name+'(');assert(start>=0,name);
 vm.runInContext(html.slice(start,html.indexOf('\n    function ',start+1)),ctx);
}
for(const n of [1.234,0.125,-1.234,1234,0])assert.equal(ctx.chuyenThanhSo(n),n);
for(const [raw,n] of [['1.234',1.234],['0.125',0.125],['1.234.567',1234567],['1.234,56',1234.56],['1,234.56',1234.56],['1,234',1234]])assert.equal(ctx.chuyenThanhSo(raw),n);
for(const raw of ['',null,'bad',NaN,Infinity])assert(Number.isNaN(ctx.chuyenThanhSo(raw)));
const source=ctx.docHistoryTuVanBan(fs.readFileSync(path.join(__dirname,'../History.js'),'utf8'));
assert.equal(source.data.length-1,62801);ctx.historyColumns=source.data[0];
const movement=source.data[0].indexOf('Movement Type'),quantity=source.data[0].indexOf('Qty in unit of entry'),unit=source.data[0].indexOf('Unit of Entry');
assert(movement>=0&&quantity>=0&&unit>=0);
const groups=new Map();for(const cells of source.data.slice(1)){const type=ctx.loaiHistory(cells[movement]);assert.equal(type,cells[movement]==='INPUT'?'in':cells[movement]==='OUTPUT'?'out':'unknown');const key=type+'|'+cells[unit];if(!groups.has(key))groups.set(key,[]);groups.get(key).push({cells,type});}
for(const rows of groups.values()){const expected=rows.reduce((s,r)=>s+Math.abs(Number(r.cells[quantity])),0);assert(Math.abs(ctx.tongSoLuongHistory(rows).value-expected)<1e-6);}
ctx.historyColumns=['Material','Qty in unit of entry','Unit of Entry'];
assert.equal(ctx.tongSoLuongHistory([{cells:['A',-0.125,'PC']},{cells:['A',1.234,'PC']}]).value,1.359);
assert(Number.isNaN(ctx.tongSoLuongHistory([{cells:['A',1,'PC']},{cells:['A',1,'M']}]).value));
assert(Number.isNaN(ctx.tongSoLuongHistory([{cells:['A','bad','PC']}]).value));
assert.equal(ctx.hinhAnhTuManifest({'001':['001.jpg']},'001')[0],'Material/001.jpg');
const manifest={version:2,complete:true,materials:{'001':[{original:'001.jpg',preview:'_optimized/001.webp',thumb:'../bad.jpg'}]}};
assert.equal(ctx.hinhAnhTuManifest(manifest,'001')[0],'Material/001.jpg');assert.equal(ctx.bienTheAnh.get('Material/001.jpg').thumb,'Material/001.jpg');
assert.equal(ctx.hinhAnhTuManifest(manifest,'missing').length,0);
console.log('PASS decimal parsing, 62,801 real transactions, strict movement classification, per-unit totals and image paths.');
