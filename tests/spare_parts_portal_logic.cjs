const assert = require("node:assert/strict");
const {readFileSync} = require("node:fs");
const path = require("node:path");
const {test} = require("node:test");
const vm = require("node:vm");

const html = readFileSync(path.join(__dirname,"../Spare_Parts_Portal.html"),"utf8");
const match = html.match(/<script>\s*([\s\S]+?)<\/script>/);
const script = new vm.Script(match[1],{filename:"Spare_Parts_Portal.html"});
const stock = {id:"stock",name:"Tra cứu tồn kho",path:"Checking.html"};
const existingApp = {id:"existing",name:"Công cụ nội bộ",path:"Tools/Offline.html"};

function fixture({catalog,hidden,stored={},blocked=false,storageUnavailable=false,openFile, fetchResult}={}) {
  const cache = new Map(Object.entries(stored));
  const nodes = new Map(),downloads = new Map(),tabs=[];
  let blobId = 0;
  class Element {
    constructor(id="") {
      this.id=id;
      this.value="";
      this.dataset={};
      this.listeners={};
      this.innerHTML="";
      this.textContent="";
      this.attributes={};
      this.options=[];
      this.style={setProperty(){}};
      const classes=new Set();
      this.classList={
        toggle(name,force){if(force??!classes.has(name)){classes.add(name);return true;}classes.delete(name);return false;},
        contains(name){return classes.has(name);}
      };
    }
    setAttribute(key,value){this.attributes[key]=value;}
    removeAttribute(key){delete this[key];}
    addEventListener(name,fn){this.listeners[name]=fn;}
    querySelectorAll(){return [];}
    replaceChildren(...children){this.options=children;}
    replaceWith(element){nodes.set(element.id,element);}
    showModal(){this.open=true;}
    close(){this.open=false;}
    focus(){}
    click(){if(this.download)downloads.get(this.href).name=this.download;}
  }
  for (const [,id] of html.matchAll(/\sid="([^"]+)"/g)) nodes.set(id,new Element(id));
  const get=id=>{assert.ok(nodes.has(id),"missing element "+id);return nodes.get(id);};
  const origin = openFile ? "file:///C:/Warehouse/" : "http://example.test/warehouse/";
  const NativeUrl = class extends URL {};
  NativeUrl.createObjectURL=blob=>{const id="blob:"+ ++blobId;downloads.set(id,{blob});return id;};
  NativeUrl.revokeObjectURL=()=>{};
  const context=vm.createContext({
    document:{baseURI:origin+"Spare_Parts_Portal.html",body:new Element(),documentElement:new Element(),
      createElement:()=>new Element(),getElementById:get,querySelector:()=>new Element(),addEventListener(){}},
    location:new URL(origin),
    window:{PORTAL_APPS:catalog,PORTAL_HIDDEN_APPS:hidden,open:(address)=>{
      if(blocked)return null;
      const tab={initial:address,opener:{},location:{replace(href){tab.target=href;}},close(){}};
      tabs.push(tab);
      return tab;
    }},
    localStorage:{getItem(key){if(storageUnavailable)throw Error("disabled");return cache.get(key)??null;},
      setItem(key,value){if(storageUnavailable)throw Error("disabled");cache.set(key,value);}},
    URL:NativeUrl,Blob,AbortController,Option:function(name,value){this.name=name;this.value=value;},
    fetch:fetchResult?async()=>fetchResult:undefined,setTimeout(){},clearTimeout(){},confirm:()=>true
  });
  script.runInContext(context);
  const click=(id,action,grid="grid")=>{
    const tile={dataset:{id}};
    const button={dataset:{action},closest:()=>tile};
    get(grid).listeners.click({currentTarget:get(grid),target:{closest:()=>button}});
  };
  return {get,cache,click,tabs,downloads};
}

test("first load lists repository applications with accent-insensitive search",()=>{
  const {get}=fixture();
  assert.equal(get("napps").textContent,5);
  assert.match(get("grid").innerHTML,/Dashboard &amp; Phân tích kho/);
  assert.match(get("configStatus").textContent,/danh mục mặc định/);
  assert.match(get("grid").innerHTML,/details class="tile-menu"/);
  get("q").value="tra cuu ton";
  get("q").oninput();
  assert.match(get("grid").innerHTML,/Tra cứu tồn kho/);
  assert.doesNotMatch(get("grid").innerHTML,/Sơ đồ kho/);
});

test("legacy draft keeps custom entries and receives new configured apps",()=>{
  const added={id:"added",name:"Ứng dụng cập nhật",path:"New.html",tags:123};
  const {get}=fixture({catalog:[stock,added],stored:{
    portalAppsDraft:JSON.stringify([stock,existingApp]),portalRecent:"{}",
    portalCustomApps:JSON.stringify([{...stock,name:"Tra cứu cá nhân"}])
  }});
  assert.match(get("grid").innerHTML,/Tra cứu cá nhân/);
  assert.match(get("grid").innerHTML,/Công cụ nội bộ/);
  assert.match(get("grid").innerHTML,/Ứng dụng cập nhật/);
  assert.equal(get("napps").textContent,7);
});

test("deletion survives reload and leaves unrelated defaults and new catalog entries",()=>{
  const first=fixture({stored:{portalStartup:"stock",portalFav:'["stock"]',portalPin:'["stock"]',portalOpenMode:"tab"}});
  first.click("stock","delete");
  assert.equal(first.get("napps").textContent,4);
  assert.equal(first.get("startup").value,"");
  const saved=JSON.parse(first.cache.get("portalStateV2"));
  assert.deepEqual(saved.removed,["stock"]);
  assert.deepEqual(saved.activity.favorites,[]);
  assert.deepEqual(saved.activity.pins,[]);
  const next=fixture({catalog:[existingApp],stored:Object.fromEntries(first.cache)});
  assert.equal(next.get("napps").textContent,5);
  assert.doesNotMatch(next.get("grid").innerHTML,/Tra cứu tồn kho/);
  assert.match(next.get("grid").innerHTML,/Công cụ nội bộ/);
});

test("adding accepts Windows relative paths and refreshes the startup selector",()=>{
  const {get,cache}=fixture({openFile:true});
  get("addBtn").onclick();
  get("aName").value="Tra cứu thêm";
  get("aPath").value="Folder\\App.html";
  get("stageApp").onclick();
  assert.equal(get("napps").textContent,6);
  assert.equal(get("startup").options.at(-1).name,"Tra cứu thêm");
  assert.equal(JSON.parse(cache.get("portalStateV2")).overrides[0].path,"Folder/App.html");

  get("addBtn").onclick();
  get("aName").value="Ngoài thư mục";
  get("aPath").value="../Outside.html";
  get("stageApp").onclick();
  assert.match(get("addMsg").textContent,/đường dẫn HTML tương đối/);
  assert.equal(get("napps").textContent,6);
});

test("tab opening does not record a blocked popup and keeps the destination isolated",()=>{
  const entry={id:"external",name:"Trang báo cáo",path:"https://example.org/report"};
  const blocked=fixture({catalog:[entry],blocked:true});
  blocked.click("external","open");
  assert.equal(blocked.get("opens").textContent,0);
  assert.match(blocked.get("portalStatus").textContent,/đã chặn tab mới/);
  const opened=fixture({catalog:[entry]});
  opened.click("external","open");
  assert.equal(opened.tabs[0].initial,"about:blank");
  assert.equal(opened.tabs[0].opener,null);
  assert.equal(opened.tabs[0].target,"https://example.org/report");
  assert.equal(opened.get("opens").textContent,1);
  opened.get("clearHistory").onclick();
  assert.equal(opened.get("opens").textContent,0);
  assert.equal(opened.get("last").textContent,"—");
});

test("missing local HTTP page shows a retry without recording a visit",async()=>{
  const {get,click}=fixture({fetchResult:{ok:false,status:404}});
  click("stock","open");
  await new Promise(resolve=>setImmediate(resolve));
  assert.match(get("viewerStatus").textContent,/Không tìm thấy file/);
  assert.equal(get("viewerRecovery").hidden,false);
  assert.equal(get("opens").textContent,0);
});

test("a redirected route remains outside the embedded viewer",async()=>{
  const {get,click}=fixture({fetchResult:{type:"opaqueredirect",status:0,ok:false}});
  click("stock","open");
  await new Promise(resolve=>setImmediate(resolve));
  assert.match(get("viewerStatus").textContent,/chuyển tiếp/);
  assert.equal(get("frame").src,undefined);
  assert.equal(get("opens").textContent,0);
});

test("a reversible backup includes catalog and preferences and accepts older settings",async()=>{
  const first=fixture({catalog:[existingApp]});
  first.click("stock","delete");
  first.click("existing","favorite");
  first.get("theme").onclick();
  first.get("exportSettings").onclick();
  const file=[...first.downloads.values()][0];
  const data=JSON.parse(await file.blob.text());
  assert.equal(file.name,"portal-settings.json");
  assert.deepEqual(data.removed,["stock"]);
  assert.equal(data.preferences.theme,"dark");
  assert.deepEqual(data.fav,["existing"]);
  const second=fixture();
  await second.get("settingsFile").onchange({target:{files:[file.blob]}});
  assert.equal(second.get("napps").textContent,5);
  assert.doesNotMatch(second.get("grid").innerHTML,/Tra cứu tồn kho/);
  assert.match(second.get("grid").innerHTML,/Công cụ nội bộ/);
  await second.get("settingsFile").onchange({target:{files:[new Blob(['{"columns":"2","showStats":false}'])]}});
  assert.equal(second.get("columns").value,"2");
  assert.equal(second.get("stats").hidden,true);
  await second.get("settingsFile").onchange({target:{files:[new Blob(['{"version":2,"apps":[null]}'])]}});
  assert.equal(second.get("napps").textContent,5);
  assert.match(second.get("settingsMsg").textContent,/không hợp lệ/);
});

test("disabled browser storage still allows use and offers backup",()=>{
  const {get,click}=fixture({storageUnavailable:true});
  click("stock","pin");
  assert.match(get("configStatus").textContent,/chưa lưu được cấu hình/);
  assert.match(get("grid").innerHTML,/aria-pressed="true" aria-label="Ghim Tra cứu tồn kho"/);
});

test("apps.js export does not create a draft or restore hidden defaults on another device",async()=>{
  const clean=fixture({hidden:["layout"]});
  clean.get("exportApps").onclick();
  assert.equal(clean.cache.size,0);
  const output=[...clean.downloads.values()][0];
  assert.equal(output.name,"apps.js");
  const imported={window:{}};
  vm.runInNewContext(await output.blob.text(),imported);
  const next=fixture({catalog:imported.window.PORTAL_APPS,hidden:imported.window.PORTAL_HIDDEN_APPS});
  assert.equal(next.get("napps").textContent,4);
  assert.doesNotMatch(next.get("grid").innerHTML,/Sơ đồ kho/);
});
