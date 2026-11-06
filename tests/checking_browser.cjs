const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const stock=[["SAP","Description","Part No","Stock","Price","Group","Reorder Point"],
["00123","Motor","P1",10,1000,"Mechanical",5],["00456","Valve","P2",2,1500,"Hydraulic",3],["00789","Seal","P3",0,100,"Mechanical",2]];
const history=[["Posting Date","Movement Type","Material","Qty in unit of entry","Unit of Entry"],
["01/11/2026","OUTPUT","00123",-4,"PC"],["02/11/2026","SCRAP","00123",2,"PC"],
["02/11/2026","202","00123",1,"PC"],["03/11/2026","OUTPUT","00123",-1.5,"M"],
["03/11/2026","OUTPUT","00456",-9,"EA"],["03/11/2026","OUTPUT","00123","bad","PC"]];
const manifest={version:2,complete:true,materials:{"00123":[{original:"00123.jpg",preview:"_optimized/00123-preview.webp",thumb:"_optimized/00123-thumb.webp"}]}};
(async()=>{
 let options={headless:true};
 if(process.env.CHROMIUM_HELPER){const {default:h}=await import(process.env.CHROMIUM_HELPER);options={...options,executablePath:await h.executablePath(),args:h.args};}
 const browser=await chromium.launch(options);
 try {
 const page=await browser.newPage();const errors=[],requests=[];let version=1;
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('http://checking.test/**',async route=>{
 const url=new URL(route.request().url());requests.push({path:url.pathname,method:route.request().method()});
 if(url.pathname==='/')return route.fulfill({contentType:'text/html',body:fs.readFileSync(path.join(root,'Checking'),'utf8')});
 if(url.pathname==='/data.js')return route.fulfill({contentType:'text/javascript',body:'window.duLieuCongTy='+JSON.stringify(version===1?stock:version===2?[stock[0],stock[2],stock[1],stock[3]]:[stock[0],stock[2],stock[3]])+';window.thoiGianCapNhat="'+version+'";'});
 if(url.pathname==='/History.js')return route.fulfill({contentType:'text/javascript',body:'window.duLieuCongTy='+JSON.stringify(history)+';'});
 if(url.pathname==='/Material/manifest.js')return route.fulfill({contentType:'text/javascript',body:'window.MaterialImageManifest='+JSON.stringify(manifest)+';'});
 if(/\.(webp|jpg)$/.test(url.pathname))return route.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64')});
 return route.fulfill({status:404,body:''});
 });
 await page.goto('http://checking.test/');
 await page.locator('#than-bang tr[data-row-index="1"]').click();
 assert.equal(await page.locator('#detail-issued').count(),0);
 await page.waitForFunction(()=>historyLoaded);
 assert.equal(requests.filter(x=>x.path==='/History.js').length,1);
 assert.match(await page.locator('#anh-chinh').getAttribute('src'),/preview.webp/);
 assert.equal(requests.filter(x=>x.method==='HEAD').length,0);
 await page.locator('#than-bang tr[data-row-index="1"]').dblclick();
 await page.waitForFunction(()=>document.querySelector('#material-history-count').textContent.includes('5'));
 assert(await page.locator('#material-history-dialog').evaluate(el=>el.open));
 assert.equal(await page.locator('#view-stock').evaluate(el=>el.hidden),false);

 await page.locator('#material-history-kind').selectOption('out');
 assert.equal(await page.locator('#material-history-body tr').count(),3);
 await page.keyboard.press('Escape');
 assert.equal(await page.locator('#material-history-dialog').evaluate(el=>el.open),false);
 assert.equal(await page.evaluate(()=>document.activeElement.dataset.rowIndex),'1');
 await page.locator('#than-bang tr[data-row-index="2"]').dblclick();
 await page.waitForFunction(()=>document.querySelector('#material-history-count').textContent.includes('1'));
 assert.match(await page.locator('#material-history-sap').innerText(),/00456/);
 await page.keyboard.press('Escape');
 await page.locator('#lang-en').click();
 await page.locator('#than-bang tr[data-row-index="3"]').focus();
 await page.keyboard.press('Shift+Enter');
 assert.equal(await page.locator('#material-history-title').innerText(),'Material usage history');
 assert.equal(requests.filter(x=>x.path==='/History.js').length,1);
 await page.keyboard.press('Escape');
 await page.locator('#than-bang tr[data-row-index="1"]').click();
 version=2;await page.evaluate(()=>taiDuLieu());await page.waitForFunction(()=>chiMucSanSang&&tatCaDuLieu[1][0]==='00456');
 assert.equal(await page.evaluate(()=>dongDangChonIndex),2);assert((await page.locator('#nhan-sap').innerText()).includes('00123'));
 assert((await page.locator('#luoi-chi-tiet').innerText()).includes('Motor'));
 const heights=await page.locator('#luoi-chi-tiet .detail-item').evaluateAll(items=>items.map(el=>el.getBoundingClientRect().height));
 assert(Math.max(...heights)-Math.min(...heights)<1);
 // Same parser and indexing against the real repository source.
 const actual=fs.readFileSync(path.join(root,'History.js'),'utf8');
 const totals=await page.evaluate(async text=>{
 const source=docHistoryTuVanBan(text);
 await apDungNguonHistory(source.data);
 return {rows:historyAll.length,
 stock:window.duLieuCongTy[1][0]};
 },actual);
 assert.equal(totals.rows,62801);assert.equal(totals.stock,'00456');
 version=3;await page.evaluate(()=>taiDuLieu());await page.waitForFunction(()=>chiMucSanSang&&tatCaDuLieu.length===3);
 assert.equal(await page.evaluate(()=>dongDangChonIndex),-1);assert(!(await page.locator('#luoi-chi-tiet').innerText()).includes('Motor'));
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:'/tmp/checking-mobile.png',fullPage:true});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.deepEqual(errors,[]);
 console.log('PASS HTTP: modal, exact SAP, movement filters, close/focus, Shift+Enter, removed card, equal card heights, real history, mobile overflow.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});

