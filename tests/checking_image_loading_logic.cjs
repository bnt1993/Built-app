const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../Checking'),'utf8');
const fn=name=>{const m=html.match(new RegExp('^    (?:async )?function '+name+'\\([^]*?^    }','m'));assert(m,name);return m[0]};
const tick=()=>new Promise(setImmediate);
function gallery(manifest,known){
  const probes=[],renders=[],timers=[];
  const ctx=vm.createContext({AbortController,console,Date,
    setTimeout(callback,ms){const timer={callback,ms};timers.push(timer);return timer},clearTimeout(timer){if(timer)timer.cleared=true},
    lanTaiAnh:0,boDieuKhienAnh:null,maSapDangXem:'',danhSachAnhDangXem:[],viTriAnhDangXem:0,dangQuetAnh:false,
    boNhoBoSuuTap:new Map(),THU_MUC_HINH:'Material/',SO_ANH_TOI_DA:10,chuanHoaMaSap:value=>value,
    taiManifestAnh:()=>manifest,hinhAnhTuManifest:known,
    capNhatGiaoDienAnh(){renders.push({sap:ctx.maSapDangXem,urls:Array.from(ctx.danhSachAnhDangXem),loading:ctx.dangQuetAnh})},
    kiemTraAnh(url,signal,direct){
      probes.push({url,signal,direct});
      if(/\/[^/_]+\.jpg$/.test(url))return Promise.resolve(true);
      return new Promise(resolve=>signal.addEventListener('abort',()=>resolve(false),{once:true}));
    }
  });
  vm.runInContext(fn('taiBoSuuTapAnh'),ctx);
  return {ctx,probes,renders,startScan(){const t=timers.find(t=>!t.cleared&&t.ms===120);assert(t);t.callback()}};
}
(async()=>{
  // Manifest never answers initially: discovery must start without waiting for it.
  let release;
  const pending=new Promise(resolve=>{release=resolve});
  const first=gallery(pending,(manifest,sap)=>manifest?.[sap]??null);
  const loading=first.ctx.taiBoSuuTapAnh('00123');await tick();
  assert.equal(first.probes.length,0,'fast manifest gets a short head start');
  first.startScan();await tick();
  assert.deepEqual(first.probes.slice(0,4).map(x=>x.url),[
    'Material/00123_01.jpg','Material/00123.jpg','Material/00123_01.png','Material/00123.png']);
  assert(first.probes.slice(0,4).every(x=>x.direct),'first candidates load directly, without HEAD');
  assert(first.renders.some(x=>x.urls.includes('Material/00123.jpg')),'base-name image appears before manifest');
  assert.equal(first.ctx.dangQuetAnh,true);
  release({'00123':['Material/00123.jpg','Material/00123_02.jpg']});await loading;
  assert(first.probes.every(x=>x.signal.aborted),'late manifest cancels remaining guesses');
  assert.deepEqual(Array.from(first.ctx.danhSachAnhDangXem),['Material/00123.jpg','Material/00123_02.jpg']);
  assert.equal(first.ctx.dangQuetAnh,false);

  const empty=gallery(Promise.resolve({}),()=>[]);
  await empty.ctx.taiBoSuuTapAnh('NOIMAGE');
  assert.equal(empty.probes.length,0,'complete manifest with no image never guesses');
  assert.equal(empty.ctx.dangQuetAnh,false);

  // A late old SAP must not overwrite the new SAP, including its collection cache.
  let finish;
  const changing=gallery(new Promise(resolve=>{finish=resolve}),(manifest,sap)=>manifest?.[sap]??null);
  const old=changing.ctx.taiBoSuuTapAnh('OLD');await tick();changing.startScan();await tick();
  const next=changing.ctx.taiBoSuuTapAnh('NEW');await tick();changing.startScan();await tick();
  finish({OLD:['Material/OLD.jpg'],NEW:['Material/NEW.jpg']});await Promise.all([old,next]);
  assert.deepEqual(Array.from(changing.ctx.danhSachAnhDangXem),['Material/NEW.jpg']);
  assert.equal(changing.ctx.boNhoBoSuuTap.has('OLD'),false);
  assert.equal(changing.renders.at(-1).sap,'NEW');

  // Missing/partial manifest still discovers every supported numbered image.
  const fallback=gallery(Promise.resolve(null),()=>null);
  fallback.ctx.kiemTraAnh=async(url,signal,direct)=>{fallback.probes.push({url,signal,direct});return url.endsWith('_10.png')};
  await fallback.ctx.taiBoSuuTapAnh('00123');
  assert.equal(new Set(fallback.probes.map(x=>x.url)).size,22);
  assert.deepEqual(Array.from(fallback.ctx.danhSachAnhDangXem),['Material/00123_10.png']);
  const before=fallback.probes.length;await fallback.ctx.taiBoSuuTapAnh('00123');
  assert.equal(fallback.probes.length,before,'revisiting SAP uses the collection cache');

  let heads=0;
  class ImageProbe{set src(value){if(value)queueMicrotask(()=>this.onload?.())}}
  const direct=vm.createContext({Date,AbortController,setTimeout,clearTimeout,Image:ImageProbe,
    location:{protocol:'https:'},boNhoAnh:new Map(),dangKiemTraAnh:new Map(),
    fetch:()=>{heads++;throw Error('Direct image must skip HEAD')}});
  vm.runInContext(fn('kiemTraAnh'),direct);
  assert.equal(await direct.kiemTraAnh('Material/00123.jpg',new AbortController().signal,true),true);
  assert.equal(heads,0);assert.equal(direct.boNhoAnh.get('Material/00123.jpg').coAnh,true);
  direct.Image=class{set src(value){}};
  const cancel=new AbortController(),cancelled=direct.kiemTraAnh('Material/old.jpg',cancel.signal,true);
  cancel.abort();assert.equal(await cancelled,false);
  assert.equal(direct.boNhoAnh.has('Material/old.jpg'),false,'aborted direct GET is not a missing-image cache entry');
  console.log('PASS image loading: bounded manifest wait, direct first images, base-name priority, late manifest cancellation, SAP switch isolation, full fallback and cached revisit.');
})().catch(error=>{console.error(error);process.exitCode=1});
