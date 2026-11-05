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
 const browser=await chromium.launch({headless:true});
 try {
 const page=await browser.newPage();const errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('http://checking.test/**',async route=>{
 const url=new URL(route.request().url());requests.push({path:url.pathname,method:route.request().method()});
 if(url.pathname==='/')return route.fulfill({contentType:'text/html',body:fs.readFileSync(path.join(root,'Checking'),'utf8')});
 if(url.pathname==='/data.js')return route.fulfill({contentType:'text/javascript',body:'window.duLieuCongTy='+JSON.stringify(stock)+';window.thoiGianCapNhat="test";'});
 if(url.pathname==='/History.js')return route.fulfill({contentType:'text/javascript',body:'window.duLieuCongTy='+JSON.stringify(history)+';'});
 if(url.pathname==='/Material/manifest.js')return route.fulfill({contentType:'text/javascript',body:'window.MaterialImageManifest='+JSON.stringify(manifest)+';'});
 if(/\.(webp|jpg)$/.test(url.pathname))return route.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64')});
 return route.fulfill({status:404,body:''});
 });
 await page.goto('http://checking.test/');
 await page.locator('#than-bang tr[data-row-index="0"]').click();
 await page.waitForFunction(()=>document.querySelector('#detail-issued span')?.textContent.includes('6 PC'));
 assert.match(await page.locator('#detail-issued span').innerText(),/1,5 M/);
 assert.match(await page.locator('#detail-issued small').innerText(),/thiếu số lượng/);
 assert.equal(await page.locator('.detail-price-stack > .detail-item').count(),2);
 assert.match(await page.locator('#anh-chinh').getAttribute('src'),/preview.webp/);
 assert.equal(requests.filter(x=>x.method==='HEAD').length,0);
 assert(!requests.some(x=>x.path==='/Material/00123.jpg'));
 await page.locator('#anh-chinh').click();
 assert.match(await page.locator('#lightbox-img').getAttribute('src'),/00123.jpg$/);
 await page.keyboard.press('Escape');
 await page.locator('#than-bang tr[data-row-index="1"]').click();
 assert.equal(await page.locator('#detail-issued span').innerText(),'9 EA');
 assert.equal(await page.locator('#anh-chinh').getAttribute('src'),null);
 await page.locator('#lang-en').click();
 assert.equal(await page.locator('#detail-issued label').innerText(),'Issued quantity');
 await page.locator('#than-bang tr[data-row-index="2"]').click();
 assert.equal(await page.locator('#detail-issued span').innerText(),'0');
 assert.equal(requests.filter(x=>x.path==='/History.js').length,1);
 // Same parser and indexing against the real repository source.
 const actual=fs.readFileSync(path.join(root,'History.js'),'utf8');
 const totals=await page.evaluate(async text=>{
 const source=docHistoryTuVanBan(text);
 await apDungNguonHistory(source.data);
 return {rows:historyAll.length,ready:issuedSchemaReady,materials:issuedBySap.size,
 stock:window.duLieuCongTy[1][0]};
 },actual);
 assert.equal(totals.rows,62801);assert(totals.ready);assert(totals.materials>0);assert.equal(totals.stock,'00123');
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:'/tmp/checking-mobile.png',fullPage:true});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.deepEqual(errors,[]);
 console.log('PASS HTTP: variants, full-size lightbox, no HEAD probes, exact SAP, units, returns, missing quantities, language, one history load, 62,801 real records, mobile overflow.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
