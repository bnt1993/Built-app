const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../Checking'),'utf8');
function fn(name){
  const first=html.match(new RegExp('^    (?:async )?function '+name+'\\([^\\n]*','m'));
  assert(first,name);
  if(first[0].endsWith('}'))return first[0];
  const match=html.slice(first.index).match(/^[\s\S]*?^    }/m);assert(match,name);return match[0];
}
const controls={};
for(const prefix of ['request','search-history'])for(const key of ['from','to','filter-message'])
  controls[prefix+'-'+key]={value:'',setAttribute(name,value){this[name]=value}};
for(const id of ['request-search','request-unit-filter','request-bin-filter','search-history-filter','search-history-scope'])controls[id]={value:''};
const ctx=vm.createContext({console,Date,Intl,JSON,Number,Object,Map,Set,
  ngonNguHienTai:'vi',document:{getElementById:id=>controls[id]},
  tuDien:key=>({searchSap:'Mã SAP',searchDesc:'Mô tả',searchAll:'Tất cả'})[key]||key,
  PHAM_VI_LICH_SU:{all:'searchAll',sap:'searchSap',desc:'searchDesc'},
  trangThaiHoatDong:{requests:{sort:'time',direction:-1,page:1,pageSize:25},'search-history':{sort:'time',direction:-1,page:1,pageSize:25}},
  chiMucSap:new Map([['000100',[{dong:['000100','Motor','PC','LEGACY-2']}]]]),
  tieuDeCot:['SAP','Description','BUn','Stor. Bin'],
  // Resolving legacy bins must not scan the entire stock source.
  tatCaDuLieu:new Proxy([],{get(){throw Error('Full stock scan')}}),
  materialRequests:[],lichSuTimKiem:[],docTuyChon:()=>''
});
for(const name of ['chuanHoaTimKiem','chuanHoaMaSap','cotTheoTenTimKiem','chuyenThanhSo','ngayDiaPhuongISO',
  'docBanGhiHoatDong','cotYeuCau','cotDonViYeuCau','viTriYeuCau','viTriTheoMaSap','tienToHoatDong',
  'sapXepHoatDong','khoangNgayHoatDong','ngayYeuCau','yeuCauCoViTri','yeuCauDangLoc','lichSuTimKiemDangLoc'])vm.runInContext(fn(name),ctx);
const time=(day,hour=12)=>new Date(2026,10,day,hour).getTime();
const data=[
  {sap:'000100',name:'Động cơ 2',time:time(12,0),stock:'10',unit:'PC',qty:2},
  {sap:'000200',name:'Động cơ 10',time:time(12,23),stock:'2',unit:'EA',bin:'B-10',qty:10},
  {sap:'000300',name:'Bơm 3',time:time(11),stock:'',unit:'PC',bin:'',qty:1.5}
];
ctx.materialRequests=data;
assert.equal(ctx.cotDonViYeuCau(),2,'BUn unit header');
assert.equal(ctx.viTriTheoMaSap('000100'),'LEGACY-2');
assert.deepEqual(Array.from(ctx.yeuCauDangLoc(),r=>r.sap),['000200','000100','000300']);
assert.equal(data[0].bin,undefined,'bin fallback does not rewrite stored requests');
controls['request-search'].value=' dong co ';
assert.equal(ctx.yeuCauDangLoc().length,2,'Vietnamese accent-insensitive search and trimmed query');
controls['request-from'].value='2026-11-12';controls['request-to'].value='2026-11-12';
assert.equal(ctx.yeuCauDangLoc().length,2,'both local-day endpoints are inclusive');
controls['request-unit-filter'].value='PC';controls['request-bin-filter'].value='LEGACY-2';
assert.deepEqual(Array.from(ctx.yeuCauDangLoc(),r=>r.sap),['000100'],'filters intersect');
controls['request-search'].value='';controls['request-unit-filter'].value='';controls['request-bin-filter'].value='__missing__';
controls['request-from'].value='';controls['request-to'].value='';
assert.deepEqual(Array.from(ctx.yeuCauDangLoc(),r=>r.sap),['000300'],'explicit missing-bin filter');
controls['request-bin-filter'].value='';
ctx.trangThaiHoatDong.requests.sort='stock';ctx.trangThaiHoatDong.requests.direction=1;
assert.deepEqual(Array.from(ctx.yeuCauDangLoc(),r=>r.sap),['000200','000100','000300'],'numeric stock, missing last');
ctx.trangThaiHoatDong.requests.direction=-1;
assert.deepEqual(Array.from(ctx.yeuCauDangLoc(),r=>r.sap),['000100','000200','000300'],'missing remains last descending');
ctx.trangThaiHoatDong.requests.sort='qty';ctx.trangThaiHoatDong.requests.direction=1;
assert.deepEqual(Array.from(ctx.yeuCauDangLoc(),r=>r.qty),[1.5,2,10]);
assert.deepEqual(data.map(r=>r.sap),['000100','000200','000300'],'sorting leaves creation order intact');
controls['request-from'].value='2026-11-13';controls['request-to'].value='2026-11-12';
assert.equal(ctx.yeuCauDangLoc().length,0);assert.equal(controls['request-from']['aria-invalid'],'true');
assert.equal(controls['request-filter-message'].hidden,false);

ctx.lichSuTimKiem=[{query:'Động cơ 2',scope:'desc',time:time(12)},{query:'000100',scope:'sap',time:time(11)},
  {query:'Động cơ 10',scope:'desc',time:time(10)}];
controls['search-history-filter'].value='dong co';controls['search-history-scope'].value='desc';
controls['search-history-from'].value='2026-11-11';
assert.deepEqual(Array.from(ctx.lichSuTimKiemDangLoc(),r=>r.query),['Động cơ 2']);
controls['search-history-from'].value='';ctx.trangThaiHoatDong['search-history'].sort='query';ctx.trangThaiHoatDong['search-history'].direction=1;
assert.deepEqual(Array.from(ctx.lichSuTimKiemDangLoc(),r=>r.query),['Động cơ 2','Động cơ 10'],'natural ordering');
controls['search-history-from'].value='2026-11-13';controls['search-history-to'].value='2026-11-12';
assert.equal(ctx.lichSuTimKiemDangLoc().length,0);

ctx.docTuyChon=()=>JSON.stringify([null,[],{},'bad',{time:'bad'},{time:time(12),value:'ok'},{time:Infinity}]);
assert.equal(ctx.docBanGhiHoatDong('key',100,row=>row).length,1,'malformed local records are ignored');
ctx.docTuyChon=()=>'{';assert.equal(ctx.docBanGhiHoatDong('key',100,row=>row).length,0);

// Stable IDs protect duplicate requests from accidental grouped deletion.
const saved=new Map();let allowDelete=true,failWrites=false;
Object.assign(ctx,{demDinhDanhHoatDong:0,REQUESTS_KEY:'requests',SEARCH_HISTORY_KEY:'searches',
  ghiTuyChon:(key,text)=>saved.set(key,text),confirm:()=>allowDelete,veBangHoatDong(){},
  localStorage:{setItem(key,text){if(failWrites)throw Error('quota');saved.set(key,text)}}
});
for(const name of ['taoMaBanGhiHoatDong','ganDinhDanhHoatDong','banGhiHoatDong','luuBanGhiHoatDong',
  'xoaBanGhiHoatDong','xoaDongDaChonHoatDong','hoanTacHoatDong','ghiLichSuTimKiem'])vm.runInContext(fn(name),ctx);
const duplicates=[{...data[0],id:'same'},{...data[0],id:'same'},{...data[1],id:'<invalid>'}];
ctx.ganDinhDanhHoatDong(duplicates,'requests');
assert.equal(new Set(duplicates.map(row=>row.id)).size,3);
const ids=duplicates.map(row=>row.id);ctx.ganDinhDanhHoatDong(duplicates,'requests');
assert.deepEqual(duplicates.map(row=>row.id),ids,'IDs stay stable');
ctx.materialRequests=duplicates;
ctx.trangThaiHoatDong.requests={selected:new Set([ids[0]]),undo:null,notice:null};
allowDelete=false;ctx.xoaDongDaChonHoatDong('requests');assert.equal(ctx.materialRequests.length,3);
allowDelete=true;ctx.xoaDongDaChonHoatDong('requests');
assert.equal(ctx.materialRequests.length,2);assert(ctx.materialRequests.some(row=>row.id===ids[1]));
assert.equal(JSON.parse(saved.get('requests')).length,2,'deletions persist');
ctx.materialRequests.unshift({...data[2],id:'new-request'});
ctx.hoanTacHoatDong('requests');
assert.equal(ctx.materialRequests.length,4,'undo preserves requests added since deletion');
assert.equal(ctx.trangThaiHoatDong.requests.undo,null);
failWrites=true;const before=JSON.stringify(ctx.materialRequests);
ctx.xoaBanGhiHoatDong('requests',[ids[1]]);
assert.equal(JSON.stringify(ctx.materialRequests),before,'failed storage write never deletes in memory');
assert.equal(ctx.trangThaiHoatDong.requests.notice.key,'activitySaveFailed');
failWrites=false;ctx.xoaBanGhiHoatDong('requests',[ids[1]]);
const deleted=JSON.stringify(ctx.materialRequests);failWrites=true;ctx.hoanTacHoatDong('requests');
assert.equal(JSON.stringify(ctx.materialRequests),deleted);assert(ctx.trangThaiHoatDong.requests.undo);
failWrites=false;ctx.hoanTacHoatDong('requests');assert.equal(ctx.materialRequests.length,4);
ctx.trangThaiHoatDong.requests.undo=[{...data[0],id:'restore-1'},{...data[0],id:'restore-2'}];
ctx.materialRequests=Array.from({length:499},(_,i)=>({...data[0],id:'existing-'+i}));
ctx.hoanTacHoatDong('requests');assert.equal(ctx.materialRequests.length,499);
assert.equal(ctx.trangThaiHoatDong.requests.notice.key,'activityUndoLimit');

ctx.lichSuTimKiem=[{id:'old-query',query:'Động cơ',scope:'desc',time:time(11)}];
ctx.trangThaiHoatDong['search-history']={selected:new Set(),undo:null,notice:null};
ctx.xoaBanGhiHoatDong('search-history',['old-query']);
ctx.ghiLichSuTimKiem('Động cơ','desc');const currentId=ctx.lichSuTimKiem[0].id;
ctx.ghiLichSuTimKiem('dong co','desc');assert.equal(ctx.lichSuTimKiem[0].id,currentId,'repeated query keeps its ID');
ctx.hoanTacHoatDong('search-history');assert.equal(ctx.lichSuTimKiem.length,1,'undo does not duplicate a repeated query');
assert.equal(ctx.lichSuTimKiem[0].id,currentId);
console.log('PASS activity deletion: stable/duplicate IDs, cancellation, exact deletion, persistence, undo with new records, write failures and capacity.');

// Exercise the actual XLSX writer: the complete sorted filter, not just the first page.
(async()=>{
  let blob;
  const anchors=[];
  const rows=Array.from({length:30},(_,i)=>({...data[0],sap:'SAP'+i,bin:'A-2',qty:i+1}));
  Object.assign(ctx,{Blob,TextEncoder,Uint8Array,Uint32Array,DataView,clearTimeout,setTimeout:()=>0,
    URL:{createObjectURL:value=>{blob=value;return 'blob:test'},revokeObjectURL(){}},
    yeuCauDangLoc:()=>rows,
    document:{createElement:()=>({click(){anchors.push(this)},remove(){}}),body:{appendChild(){} }}
  });
  for(const name of ['xmlXlsx','tenCotXlsx','oChuXlsx','oSoXlsx','hangXlsx','taoKieuXlsx','dongGoiZipXlsx','xuatExcelYeuCau'])vm.runInContext(fn(name),ctx);
  await ctx.xuatExcelYeuCau();
  assert.match(anchors[0].download,/\.xlsx$/);
  const bytes=Buffer.from(await blob.arrayBuffer()),text=bytes.toString('utf8');
  assert.match(text,/autoFilter ref="A1:G31"/);
  assert(text.indexOf('SAP0')<text.indexOf('SAP29'));
  assert.match(text,/LEGACY-2|A-2/);
  console.log('PASS activity: local dates, intersecting filters, natural/numeric sorting, legacy indexed bins, malformed storage and unpaged sorted XLSX.');
})().catch(error=>{console.error(error);process.exitCode=1});
