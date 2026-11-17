// Run: node --test tests/checking-catalog-detail.test.cjs
// Dependency-free DOM lifecycle regression tests; not a visual browser test.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const html=fs.readFileSync(process.env.CHECKING_FILE||path.join(__dirname,'../Checking.html'),'utf8');
const start=html.search(/    let catalogDetail(?:Session|OriginalParent)/);
assert(start>=0);
const lifecycle=html.slice(start,html.indexOf('\n</script>',start));
class Element {
 constructor(name){this.name=name;this.children=[];this.parentNode=null;this.dataset={};this.events={};this.open=false;this.classList={toggle(){}};}
 get nextSibling(){return this.parentNode?.children[this.parentNode.children.indexOf(this)+1]||null;}
 appendChild(node){node.remove();this.children.push(node);node.parentNode=this;return node;}
 insertBefore(node,before){if(node===before)return;node.remove();const i=this.children.indexOf(before);assert(i>=0);this.children.splice(i,0,node);node.parentNode=this;return node;}
 remove(){if(this.parentNode){const p=this.parentNode;p.children.splice(p.children.indexOf(this),1);this.parentNode=null;}}
 replaceChildren(...nodes){for(const n of [...this.children])n.remove();for(const n of nodes)this.appendChild(n);}
 set innerHTML(text){this.replaceChildren();this.html=text;}
 querySelector(selector){return this.children.find(n=>n.name==='detail')||null;}
 setAttribute(key,value){if(key==='open')this.open=true;}
 removeAttribute(key){if(key==='open')this.open=false;}
 addEventListener(name,fn){(this.events[name]??=[]).push(fn);}
 dispatch(name,target=this){const e={target,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;}};for(const fn of this.events[name]||[])fn(e);return e;}
 showModal(){this.open=true;}
 close(){this.open=false;/* native close event is queued, dispatched explicitly in tests */}
}
function fixture(){
 const home=new Element('home'),table=new Element('table'),detail=new Element('detail'),after=new Element('after');
 const image=new Element('image');image.src='Material/1001.jpg';detail.appendChild(image);
 home.appendChild(table);home.appendChild(detail);home.appendChild(after);
 const host=new Element('host'),dialog=new Element('dialog'),title=new Element('title');dialog.appendChild(host);
 let parsed=false;const ready=[];const auxiliary=new Element('auxiliary');
 const doc={readyState:'loading',body:new Element('body'),
  getElementById(id){if(id==='catalog-detail-dialog')return parsed?dialog:null;if(id==='catalog-detail-host')return parsed?host:null;if(id==='catalog-detail-title')return parsed?title:null;if(id==='stock-row-menu')return null;return auxiliary;},
  querySelector(sel){if(sel==='.breadcrumbs .active')return auxiliary;if(sel==='#view-stock .main-container')return home;if(sel.includes('.detail-section'))return home.querySelector('.detail-section')||host.querySelector('.detail-section');return null;},
  createComment:()=>new Element('marker'),createElement:()=>new Element('message'),
  addEventListener(name,fn){if(name==='DOMContentLoaded')ready.push(fn);}
 };
 const context=vm.createContext({document:doc,ngonNguHienTai:'vi',chuanHoaMaSap:s=>String(s).trim(),
  chiMucSap:new Map([['1001',[{chiSo:1,dong:['1001','Bearing']}]],['1002',[{chiSo:2,dong:['1002','Motor']}]]]),chonDong:()=>{},CAC_TAB:['stock','catalog'],tuDien:k=>k});
 vm.runInContext(lifecycle,context);
 parsed=true;for(const fn of ready)fn();
 const assertHome=()=>{assert.equal(detail.parentNode,home);assert.deepEqual(home.children,[table,detail,after]);assert.equal(detail.children[0],image);assert.equal(image.src,'Material/1001.jpg');};
 return {context,home,host,dialog,detail,image,assertHome};
}
test('inline scripts compile',()=>{for(const m of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi))new vm.Script(m[1]);});
test('bind listeners after dialog markup exists; Escape returns the original panel',()=>{
 const f=fixture();assert.equal(f.dialog.events.cancel?.length,1);f.context.moChiTietDanhMuc('1001');assert.equal(f.detail.parentNode,f.host);
 const e=f.dialog.dispatch('cancel');assert(e.defaultPrevented);f.assertHome();assert.equal(f.dialog.open,false);
});
test('close button and repeated open/close preserve image, listeners and original position',()=>{
 const f=fixture();const click=()=>{};f.image.addEventListener('click',click);
 for(let i=0;i<5;i++){f.context.moChiTietDanhMuc('1001');f.context.dongChiTietDanhMuc();f.dialog.dispatch('close');f.assertHome();}
 assert.equal(f.image.events.click[0],click);
});
test('opening another material while modal is open does not overwrite return position',()=>{
 const f=fixture();f.context.moChiTietDanhMuc('1001');f.context.moChiTietDanhMuc('1002');f.context.dongChiTietDanhMuc();f.assertHome();
});
test('missing material cannot delete shared details; valid material can reopen afterwards',()=>{
 const f=fixture();f.context.moChiTietDanhMuc('1001');f.context.moChiTietDanhMuc('missing');f.assertHome();assert.equal(f.host.children[0].name,'message');
 f.context.moChiTietDanhMuc('1002');assert.equal(f.detail.parentNode,f.host);f.context.dongChiTietDanhMuc();f.assertHome();
});
test('backdrop closes, but clicks inside the panel do not close',()=>{
 const f=fixture();f.context.moChiTietDanhMuc('1001');f.dialog.dispatch('click',f.image);assert.equal(f.dialog.open,true);
 f.dialog.dispatch('click');f.assertHome();assert.equal(f.dialog.open,false);
});
test('native close restores panel; stale close event must not detach a reopened panel',()=>{
 const f=fixture();f.context.moChiTietDanhMuc('1001');f.dialog.close();f.dialog.dispatch('close');f.assertHome();
 f.context.moChiTietDanhMuc('1001');f.context.dongChiTietDanhMuc();f.context.moChiTietDanhMuc('1002');f.dialog.dispatch('close');assert.equal(f.detail.parentNode,f.host);
 f.context.dongChiTietDanhMuc();f.assertHome();
});
test('tab switch restores panel before displaying Stock',()=>{
 const f=fixture();const start=html.indexOf('    function chuyenTab('),end=html.indexOf('\n    }',start);vm.runInContext(html.slice(start,end+6),f.context);
 f.context.moChiTietDanhMuc('1001');f.context.chuyenTab('stock',{persist:false});f.assertHome();assert.equal(f.dialog.open,false);
});
test('dialog API fallback and render failure never strand the panel',()=>{
 const f=fixture();f.dialog.showModal=null;f.dialog.close=null;f.context.moChiTietDanhMuc('1001');f.context.dongChiTietDanhMuc();f.assertHome();assert.equal(f.dialog.open,false);
 f.context.chonDong=()=>{throw Error('render failed')};assert.throws(()=>f.context.moChiTietDanhMuc('1002'),/render failed/);f.assertHome();
});
