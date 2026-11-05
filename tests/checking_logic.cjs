const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'../Checking'),'utf8');
function fn(name){const start=html.indexOf('    function '+name+'(');assert(start>=0);let end=html.indexOf('\n    function ',start+1);return html.slice(start,end);}
const ctx={console,window:{},THU_MUC_HINH:'Material/',bienTheAnh:new Map()};
vm.createContext(ctx);
for(const name of ['chuyenThanhSo','chuanHoaMaSap','tenHistoryChuan','cotHistoryTheoTen','docHistoryTuVanBan','taoThongKeXuat','loaiHistory','hinhAnhTuManifest'])vm.runInContext(fn(name),ctx);
const source=ctx.docHistoryTuVanBan(fs.readFileSync(path.join(__dirname,'../History.js'),'utf8'));
const headers=source.data[0];
ctx.historyInColumn=-1;ctx.historyOutColumn=-1;ctx.historyQuantityColumn=5;
const rows=source.data.slice(1).map(cells=>({cells,type:ctx.loaiHistory(cells[1],cells)}));
const stats=ctx.taoThongKeXuat(rows,headers);
assert(stats.ready);assert.equal(rows.length,62801);assert(stats.map.size>0);
const expected=new Map();
for(const {cells,type} of rows){if(type!=='out'||!String(cells[2]).trim())continue;const k=String(cells[2]).trim().toLowerCase()+'|'+cells[6].trim().toUpperCase();const q=Math.abs(Number(cells[5]));if(Number.isFinite(q))expected.set(k,(expected.get(k)||0)+q);}
for(const [key,qty] of expected){const [sap,unit]=key.split('|');assert(Math.abs(stats.map.get(sap).units.get(unit)-qty)<1e-8);}
const old=ctx.hinhAnhTuManifest({'001':['001.jpg']},'001');assert.equal(old[0],'Material/001.jpg');
const modern={version:2,complete:true,materials:{'001':[{original:'001.jpg',preview:'_optimized/001.webp',thumb:'../bad.jpg'}]}};
assert.equal(ctx.hinhAnhTuManifest(modern,'001')[0],'Material/001.jpg');
assert.equal(ctx.bienTheAnh.get('Material/001.jpg').thumb,'Material/001.jpg');
assert.equal(ctx.hinhAnhTuManifest(modern,'missing').length,0);
assert.equal(ctx.hinhAnhTuManifest({},'missing'),null);
console.log('PASS real history aggregation per SAP/unit, '+stats.map.size+' SAPs; legacy/v2 manifests and path validation.');

const h=["Material","Quantity","Unit"];
const sample=[{cells:["001", -4, "PC"],type:"out"},{cells:["001",2,"PC"],type:"out"},
{cells:["001",1,"PC"],type:"in"},{cells:["001",-1.5,"M"],type:"out"},
{cells:["001","bad","PC"],type:"out"},{cells:["002",9,"EA"],type:"out"}];
const check=ctx.taoThongKeXuat(sample,h);
assert.equal(check.map.get("001").units.get("PC"),6);
assert.equal(check.map.get("001").units.get("M"),1.5);
assert.equal(check.map.get("001").invalid,1);
assert.equal(check.map.get("002").units.get("EA"),9);
assert.equal(ctx.taoThongKeXuat([],["Description"]).ready,false);
console.log("PASS signed quantities, unit separation, excluded returns, invalid quantities, missing schema.");
