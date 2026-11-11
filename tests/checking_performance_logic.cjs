const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../Checking'),'utf8');
const fn=name=>{const m=html.match(new RegExp('^    (?:async )?function '+name+'\\([^]*?^    }','m'));assert(m,name);return m[0]+'\n'};
function load(names,globals={}){const ctx=vm.createContext({console,Date,setTimeout,clearTimeout,...globals});
  vm.runInContext(names.map(fn).join('\n'),ctx);return ctx;}
for(const script of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(script[1]);

(async()=>{
  const numeric=load(['chuyenThanhSo','ngayHistoryISO']);
  for(const [raw,value]of [['0,125',.125],['1,234',1.234],['81,078',81.078],['16,2156',16.2156],['1.234,56',1234.56]])
    assert.equal(numeric.chuyenThanhSo(raw),value,raw);
  assert.ok(Number.isNaN(numeric.chuyenThanhSo('Infinity')));
  assert.equal(numeric.ngayHistoryISO('46024'),'2026-01-02');
  assert.equal(numeric.ngayHistoryISO(46024),'2026-01-02');
  assert.equal(numeric.ngayHistoryISO('31/02/2026'),'');

  // A missing code must not route a SAP batch through full-table substring search.
  const a={chiSo:1,dong:['00123','Motor'],sap:'00123',coTonKho:true,trangThaiTon:'healthy'};
  const b={chiSo:2,dong:['00123','Second bin'],sap:'00123',coTonKho:false,trangThaiTon:'zero'};
  const unrelated={get dong(){throw Error('Unrelated row was scanned')}};
  const nodes={'o-tim-kiem':{value:'00123, SAP999'},'chk-ton-kho':{checked:false},
    'loc-canh-bao':{value:'all'},'tim-gan-dung':{checked:false},'trang-thai-ban-ghi':{},'batch-sap-summary':{}};
  const search=load(['chuanHoaMaSap','chuanHoaTimKiem','phanTichTimKiem','locDuLieu',
    'capNhatTomTatDanhSachSap','sapXepKetQua','chuyenThanhSo'],{
    document:{getElementById:id=>nodes[id],querySelector:selector=>selector.includes('input')?{value:'all'}:{scrollTop:99}},
    maSapDaLapChiMuc:new Set(['00123']),chiMucSap:new Map([['00123',[a,b]]]),
    duLieuTimKiem:[a,b,...Array(10000).fill(unrelated)],chiMucSanSang:true,
    boTriHoanTimKiem:null,soLanLocDuLieu:0,dangLocDuLieu:false,ketQuaLoc:[],
    cotSapXep:-1,huongSapXep:1,ngonNguHienTai:'vi',dinhDangSoLuong:new Intl.NumberFormat('vi'),
    hienThiTrangHienTai(){},tuDien:(key,p)=>key+JSON.stringify(p)
  });
  assert.equal(search.phanTichTimKiem(nodes['o-tim-kiem'].value,'all').exactSap.size,2);
  assert.equal(search.phanTichTimKiem('MPN-50,MPN-70','all').exactSap,null);
  search.locDuLieu();assert.equal(search.ketQuaLoc.length,2);
  assert.equal(search.ketQuaLoc[0],a);assert.equal(search.ketQuaLoc[1],b);
  assert.match(nodes['batch-sap-summary'].textContent,/sap999/);
  search.ketQuaLoc=[{chiSo:2,dong:['Motor 20']},{chiSo:1,dong:['Motor 3']},{chiSo:3,dong:['']}];
  search.cotSapXep=0;search.sapXepKetQua();assert.deepEqual(Array.from(search.ketQuaLoc,x=>x.chiSo),[1,2,3]);

  // Version acceptance waits for indexing, even when source timestamps match.
  const old=[['SAP','Stock'],['00123','1']],fresh=[['SAP','Stock'],['00123','50']];
  let indexDone,action='fresh';const statuses=[];
  let stock;
  stock=load(['thucThiScriptSap','taiDuLieu','chuanHoaMaSap'],{
    window:{duLieuCongTy:old,thoiGianCapNhat:'same stamp'},
    document:{hidden:false,getElementById:()=>null,createElement:()=>({remove(){}}),body:{appendChild(script){
      queueMicrotask(()=>{if(action==='fresh'){stock.window.duLieuCongTy=fresh;stock.window.thoiGianCapNhat='same stamp'}script.onload()});
    }}},
    phienBanNguon:{stock:'v1'},phienBanChoNap:{stock:'v2'},duongDanOMang:'data.js',
    tatCaDuLieu:old,mocCapNhatCu:'same stamp',dongDangChonIndex:-1,
    dangTaiScript:false,lanTaiDuLieu:0,soLanLocDuLieu:0,ngonNguHienTai:'vi',
    ghiNhanNguon:(kind,status)=>statuses.push(status),datTrangThaiDuLieu(){},datThongBaoCapNhat(){},veTieuDe(){},
    taoChiMucTimKiem:()=>new Promise(resolve=>{indexDone=resolve})
  });
  const pending=stock.taiDuLieu();await new Promise(setImmediate);
  assert.equal(stock.phienBanNguon.stock,'v1');indexDone(true);await pending;
  assert.equal(stock.phienBanNguon.stock,'v2');assert.equal(stock.tatCaDuLieu[1][1],'50');
  action='empty';await stock.taiDuLieu(true);
  assert.equal(stock.window.duLieuCongTy,fresh);assert.equal(statuses.at(-1),'stale');

  // Every generated date/type/last-output index must match the main-thread fallback.
  const data=[['Storage Location','Posting Date','Movement Type','Material'],
    ['Hall 1','46024','OUTPUT','00123'],['Hall 2','03/01/2026','INPUT','00123'],
    ['Hall 1','02/01/2026','101','00123'],['Hall 1','31/02/2026','OUTPUT','00999']];
  const messages=[],self={postMessage:value=>messages.push(value)};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../HistoryWorker.js'),'utf8'),{self});
  self.onmessage({data:{source:'window.materialHistory='+JSON.stringify(data)+';',index:true}});
  const prepared=messages[1].indexed;
  assert.equal(prepared.schema,'checking-history-index-v3');
  assert.equal(prepared.records[0].date,'2026-01-03');assert.equal(prepared.records[2].type,'unknown');
  assert.deepEqual(JSON.parse(JSON.stringify(prepared.output)),[['00123','2026-01-02']]);
  const noop=()=>{};
  const history=load(['tenHistoryChuan','cotHistoryTheoTen','bienDoiHistory','ngayHistoryISO',
    'ngayHistoryHopLe','loaiHistory','chuanHoaMaSap','apDungNguonHistory'],{
    historySeq:0,ngayXuatCuoiTheoSap:new Map(),lichSuTheoSap:noop,
    capNhatTrangThaiHistory:noop,capNhatTrangThaiHall:noop,capNhatCardNgayXuat:noop,
    veSoSanhNhapXuatKho:noop,veTopVatTuXuatKho:noop,veVatTuTonLau:noop,veBieuDoSuDungKho:noop,locLichSuVatTu:noop
  });
  assert.equal(await history.apDungNguonHistory(data),true);
  const fallback=JSON.stringify(history.historyAll);
  assert.equal(await history.apDungNguonHistory(prepared),true);
  assert.equal(JSON.stringify(history.historyAll),fallback);

  let canLoad=true,loads=0;
  const images=load(['taiManifestAnh'],{AbortController,
    window:{MaterialImageManifest:{version:2,complete:true,materials:{OLD:['OLD.jpg']}}},
    location:{protocol:'https:'},promiseManifestAnh:null,hanManifestAnh:0,lanManifestAnh:0,
    bienTheAnh:new Map(),boNhoBoSuuTap:new Map(),THU_MUC_HINH:'Material/',ghiNhanNguon(){},
    fetch:async()=>{loads++;return {ok:canLoad,json:async()=>({version:2,complete:true,materials:{NEW:['NEW.jpg']}})}},
    document:{createElement:()=>({remove(){}}),head:{appendChild:s=>queueMicrotask(()=>s.onerror())}}
  });
  assert.ok((await images.taiManifestAnh()).materials.OLD);assert.equal(loads,0);
  assert.ok((await images.taiManifestAnh(true)).materials.NEW);assert.equal(loads,1);
  canLoad=false;assert.equal(await images.taiManifestAnh(true),null);
  canLoad=true;assert.ok((await images.taiManifestAnh(true)).materials.NEW);
  const probes=load(['kiemTraAnh'],{AbortController,location:{protocol:'https:'},
    boNhoAnh:new Map(),dangKiemTraAnh:new Map(),
    fetch:(url,{signal})=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(Error('aborted')),{once:true}))
  });
  const controller=new AbortController(),probe=probes.kiemTraAnh('Material/old.jpg',controller.signal);
  controller.abort();assert.equal(await probe,false);assert.equal(probes.boNhoAnh.size,0);
  console.log('PASS performance regressions: decimal/date parsing, direct SAP lookup, stable sort, fresh-source validation, Worker parity, manifest refresh and cancelled probes.');
})().catch(error=>{console.error(error);process.exitCode=1});
