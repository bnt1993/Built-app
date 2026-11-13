// Exercise the shipped page's public API and input handlers without a browser.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const html=read('PO_GR_Report.html');
assert.equal(read('PO_GR_Report'),html,'both distributed reports must remain identical');
assert.equal((html.match(/<!doctype html>/gi)||[]).length,1);
assert.equal((html.match(/<script>/g)||[]).length,1);
const staticIds=[...html.split('<script>')[0].matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
assert.equal(new Set(staticIds).size,staticIds.length);
const files={po:read('PO.js'),gr:read('GR.js'),request:read('Request.js')};
const parse=(text,names)=>{const window={};vm.runInNewContext(text,{window});return names.map(n=>window[n]).find(Boolean)};
const realPO=parse(files.po,['duLieuPO','duLieuCongTy']);
const realGR=parse(files.gr,['duLieuGR']);
const realRequest=parse(files.request,['duLieuRequest']);
const [ph,gh,rh]=[realPO[0],realGR[0],realRequest[0]];
const change=(head,row,fields)=>{const copy=row.slice();for(const [key,value]of Object.entries(fields))copy[head.indexOf(key)]=value;return copy};
const po=(qty='10',unit='PC',item='10')=>change(ph,realPO[1],{'PO Quantity':qty,OUn:unit,Item:item});
const gr=(qty='3',unit='PC',type='101',doc='90001',item='10')=>change(gh,realGR[1],{
  'Purchase order':realPO[1][ph.indexOf('Pur. Doc.')],Item:item,Material:realPO[1][ph.indexOf('Material')],
  'Qty in unit of entry':qty,'Unit of Entry':unit,'Movement Type':type,'Material Document':doc});
const request=change(rh,realRequest[1],{'PO No.':realPO[1][ph.indexOf('Pur. Doc.')],'SAP No':realPO[1][ph.indexOf('Material')]});
const js=(name,rows)=>'window.'+name+'='+JSON.stringify(rows)+';';

class Element {
  constructor(){this.value='';this.checked=false;this.disabled=false;this.textContent='';this.options=[];
    this.children=[];this.style={};this.dataset={};this.attributes={};this.events=new Map();this.classList={toggle(){}};}
  addEventListener(name,fn){if(!this.events.has(name))this.events.set(name,[]);this.events.get(name).push(fn)}
  async fire(name,event={}){for(const fn of this.events.get(name)||[])await fn({target:this,...event})}
  setAttribute(k,v){this.attributes[k]=v} querySelector(){return new Element()}
  appendChild(n){this.children.push(n);return n} append(...nodes){this.children.push(...nodes)}
  replaceChildren(...nodes){this.children=nodes;this.options=nodes.filter(x=>x.option)}
  add(n){this.options.push(n)} remove(){} scrollIntoView(){}
}
function boot(){
  const nodes=new Map(),node=id=>nodes.get(id)||nodes.set(id,new Element()).get(id);
  node('status-filter').value='all';
  const sources=new Map([['PO.js',files.po],['GR.js',files.gr],['Request.js',js('duLieuRequest',[rh,request])]]);
  let context;
  const document={hidden:false,getElementById:node,querySelector:()=>new Element(),querySelectorAll:()=>[],
    createElement:()=>new Element(),createDocumentFragment:()=>new Element(),head:{appendChild(script){
      const source=sources.get(script.src.split('?')[0]);
      queueMicrotask(()=>{if(source==null){script.onerror();return}
        try{vm.runInContext(source,context)}catch{script.onerror();return}script.onload()});
    }}};
  context=vm.createContext({window:{addEventListener(){}},document,Intl,Date,TextEncoder,Blob,URL,
    setTimeout,clearTimeout,queueMicrotask,Option:function(text,value){return {text,value,option:true}}});
  const script=html.split('<script>')[1].split('</script>')[0];
  new vm.Script(script); // Parse the complete shipped JavaScript.
  vm.runInContext(script.replace(/\nloadAll\(\);/,'\n'),context);
  return {api:context.window.POGR,node,sources};
}
const {api,node,sources}=boot();
const report=(p,g)=>api.buildReport([ph,...p],[gh,...g]);
const linked=rows=>api.buildRequestReport([rh,request],rows,{poReady:true,grReady:true})[0];

(async()=>{
  for(const [text,expected]of [['0,125',.125],['1,250',1.25],['204,974',204.974],['1.234,567',1234.567],['1,234.567',1234.567],['16,2156',16.2156],['1.25',1.25]])
    assert.equal(api.number(text),expected,text);
  assert.ok(Number.isNaN(api.number('bad')));assert.ok(Number.isNaN(api.number('')));
  const actual=api.buildReport(realPO,realGR);
  assert.equal(actual.rows.length,5);assert.equal(api.excelDate('46024'),'2026-01-02');
  const actualRequests=api.buildRequestReport(realRequest,actual.rows,{poReady:true,grReady:true});
  assert.equal(actualRequests.length,334);assert.equal(api.filterRequestRows(actualRequests,{week:'WK31'}).length,18);
  const priceCase=actualRequests.find(r=>r.sap==='900064272'&&r.week==='WK41');
  assert.equal(priceCase.amount,81.078);assert.ok(Math.abs(priceCase.amount-priceCase.price*priceCase.qty)<1e-10);
  const exported=Buffer.from(await api.requestXlsx([priceCase]).arrayBuffer()).toString('utf8');
  assert.ok(exported.includes('<v>81.078</v>'));assert.ok(!exported.includes('<v>81078</v>'));

  const decimal=report([po('1,250')],[gr('1,25')]).rows[0];
  assert.equal(decimal.status,'done');assert.equal(decimal.percent,100);
  const receipt=gr('8');
  const reversal=report([po()],[receipt,gr('1','PC','102','90002'),receipt]);
  assert.equal(reversal.rows[0].grQty,7);assert.equal(reversal.duplicates,1);
  const styled=Buffer.from(await api.makeXlsx(reversal.rows).arrayBuffer()).toString('utf8');
  assert.ok(styled.includes('xl/styles.xml'));assert.ok(styled.includes('formatCode="dd/mm/yyyy"'));
  assert.ok(styled.includes('<c r="L2" s="5"><v>0.7</v>'),'70% stored as an Excel fraction');
  assert.ok(styled.includes('autoFilter ref="A1:T2"'));assert.ok(styled.includes('Tuần PO'));
  const with105=[gh,gr('8'),gr('1','PC','102','90002'),gr('2','PC','105','90003')];
  assert.equal(api.buildReport([ph,po()],with105,true).rows[0].grQty,9);
  assert.equal(report([po()],[gr('3','pc')]).rows[0].status,'partial');
  const differentUnits=report([po('1','BOX')],[gr('10','PC')]);
  assert.equal(differentUnits.unitMismatches,1);assert.equal(differentUnits.rows[0].status,'invalid');
  assert.ok(Number.isNaN(differentUnits.rows[0].grQty));assert.ok(Number.isNaN(differentUnits.rows[0].percent));
  assert.equal(linked(differentUnits.rows).link,'unit-mismatch');
  assert.equal(report([po()],[gr('3','')]).rows[0].status,'invalid');
  const mixedItems=report([po('1','BOX'),po('5','PC','20')],[]);
  assert.equal(linked(mixedItems.rows).link,'unit-mismatch');
  assert.ok(Number.isNaN(linked(mixedItems.rows).poQty));
  for(const qty of ['bad','0','-1']){
    const invalid=report([po(qty)],[gr('3')]);
    assert.equal(invalid.rows[0].status,'invalid');assert.equal(linked(invalid.rows).link,'data-invalid');
  }
  const invalidGR=report([po()],[gr('bad')]);
  assert.equal(invalidGR.invalidQty,1);assert.equal(invalidGR.rows[0].receipts.length,1);
  assert.equal(invalidGR.rows[0].status,'invalid');assert.equal(linked(invalidGR.rows).link,'data-invalid');
  const negative=report([po()],[gr('2','PC','102')]);
  assert.equal(linked(negative.rows).link,'negative');
  const invalidExport=Buffer.from(await api.makeXlsx(differentUnits.rows).arrayBuffer()).toString('utf8');
  assert.ok(!invalidExport.includes('NaN'));assert.ok(!invalidExport.includes('1000'));

  // Drive the real input handlers: failures must invalidate dependent results.
  await node('reload-btn').fire('click');
  assert.equal(node('stat-total').textContent,'5');assert.match(node('source-status').textContent,/Đã kết nối/);
  await node('tab-request').fire('click');
  for(let i=0;i<8;i++)await new Promise(setImmediate);
  assert.equal(api.getRequestState().rows[0].matches.length,1);
  sources.set('PO.js',null);await node('reload-btn').fire('click');
  assert.equal(node('stat-total').textContent,'0');assert.match(node('load-state').textContent,/Không tải được PO/);
  assert.equal(node('status-dot').className,'status-dot error');
  assert.equal(api.getRequestState().rows[0].link,'unverified');assert.equal(api.getRequestState().rows[0].matches.length,0);
  sources.set('PO.js',files.po);sources.set('GR.js',null);await node('reload-btn').fire('click');
  assert.equal(node('stat-total').textContent,'5');assert.equal(api.getRequestState().rows[0].link,'gr-unavailable');
  assert.ok(Number.isNaN(api.getRequestState().rows[0].grQty));
  sources.set('GR.js',files.gr);await node('reload-btn').fire('click');
  assert.equal(api.getRequestState().rows[0].matches.length,1);assert.equal(node('status-dot').className,'status-dot ready');
  const upload=async(id,text)=>node(id).fire('change',{target:{files:[{text:async()=>text}]}});
  await upload('file-po','window.duLieuPO=[["Wrong header"],["bad"]];');
  assert.equal(node('stat-total').textContent,'0');assert.equal(api.getRequestState().rows[0].matches.length,0);
  assert.equal(api.getRequestState().rows[0].link,'unverified');assert.match(node('po-source-note').textContent,/thiếu cột/);
  await upload('file-po',files.po);assert.equal(api.getRequestState().rows[0].matches.length,1);
  await upload('request-file','window.duLieuRequest=[["Wrong header"],["bad"]];');
  assert.equal(api.getRequestState().rows.length,0);assert.equal(api.getRequestState().filtered.length,0);
  assert.equal(node('request-stat-total').textContent,'0');assert.match(node('request-source-status').textContent,/Lỗi cấu trúc/);
  await upload('request-file',js('duLieuRequest',[rh,request]));
  assert.equal(api.getRequestState().rows.length,1);
  sources.set('Request.js',null);await node('request-reload').fire('click');
  assert.equal(api.getRequestState().rows.length,0);assert.equal(api.getRequestState().loaded,false);
  assert.equal(api.poWeek('2021-01-01'),'2020-W53');
  assert.equal(api.poWeek('2024-12-30'),'2025-W01');
  const retained=report([po('2'),po('3','PC','20')],[
    change(gh,gr('2'),{'Material Doc.Item':''}),change(gh,gr('3','PC','101','90001','20'),{'Material Doc.Item':''})]);
  assert.deepEqual(Array.from(retained.rows,r=>r.grQty),[2,3]);
  assert.equal(retained.duplicates,0);assert.equal(retained.missingReceiptItem,2);
  assert.equal(linked(report([po()],[]).rows).status,'Waiting for GR');
  assert.equal(linked(report([po()],[gr('2')]).rows).status,'Done');
  assert.equal(linked(report([po()],[gr('10')]).rows).status,'Done');
  assert.equal(linked(report([po()],[gr('3'),gr('3','PC','102','90002')]).rows).status,'Waiting for GR');
  assert.equal(linked(differentUnits.rows).status,'Cần kiểm tra');
  const all=api.buildReport([ph,change(ph,po(),{'Pur. Doc.':'4711110001'})],[gh],false,false);
  assert.equal(all.rows.length,1);
  const req47=change(rh,request,{'PO No.':'4711110001'});
  assert.equal(api.buildRequestReport([rh,req47],all.rows,{poReady:true,grReady:true})[0].link,'no-gr');
  const rows=[...report([po()],[gr('2')]).rows,...report([po('10','PC','20')],[]).rows];
  assert.equal(api.filteredRows(rows,{status:['partial','none'],supplier:[],week:[]}).length,2);
  assert.equal(api.filteredRows(rows,{status:['done','none'],supplier:[]}).length,1);
  const requests=api.buildRequestReport([rh,request],rows,{poReady:true,grReady:true});
  assert.equal(api.filterRequestRows(requests,{status:['Done','Waiting for GR'],hall:[]}).length,1);
  let finish;
  const older=node('file-po').fire('change',{target:{files:[{text:()=>new Promise(resolve=>finish=resolve)}]}});
  await upload('file-po','window.thoiGianCapNhatPO="LATEST";'+js('duLieuPO',[ph,po('20')]));
  finish('window.thoiGianCapNhatPO="OLD";'+js('duLieuPO',[ph,po('1')]));await older;
  assert.equal(node('po-update').textContent,'PO: LATEST');
  console.log('PASS PO/GR integrity: SAP decimals and XLSX, units, invalid quantities, source failures, dependent state and recovery.');
})().catch(error=>{console.error(error);process.exitCode=1});
