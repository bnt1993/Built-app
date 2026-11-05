const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert');
(async()=>{
 let options={headless:true};
 if(process.env.CHROMIUM_HELPER){const {default:helper}=await import(process.env.CHROMIUM_HELPER);options={...options,executablePath:await helper.executablePath(),args:helper.args};}
 const browser=await chromium.launch(options);
 try {
 const page=await browser.newPage({viewport:{width:1440,height:1100}});
 const errors=[];page.on('pageerror',err=>errors.push(err.message));
 const stock=[['SAP','Description','Part No','Stock','Price','Group','Reorder Point']];
 for(let i=0;i<24;i++)stock.push(['SAP'+i,'Vật tư kiểm tra '+i,'P'+i,i%5===0?0:i+1,10000*(i+1),'G',10]);
 await page.route('http://dashboard.test/**',async route=>{
 const url=new URL(route.request().url());
 if(url.pathname==='/')return route.fulfill({contentType:'text/html',body:fs.readFileSync(path.join(__dirname,'../Checking'),'utf8')});
 if(url.pathname==='/data.js')return route.fulfill({contentType:'text/javascript',body:'window.duLieuCongTy='+JSON.stringify(stock)+';window.thoiGianCapNhat="test";'});
 if(url.pathname==='/Material/manifest.js')return route.fulfill({contentType:'text/javascript',body:'window.MaterialImageManifest={version:2,complete:true,materials:{}};'});
 return route.fulfill({status:404,body:''});
 });
 await page.goto('http://dashboard.test/');
 await page.waitForFunction(()=>document.querySelector('#metric-total').textContent==='24');
 await page.locator('#tab-dashboard').click();
 assert.equal(await page.locator('#view-dashboard .dashboard-chart').count(),4);
 assert.equal(await page.locator('#insight-abc,#insight-groups').count(),0);
 const heights=await page.locator('.dashboard-chart').evaluateAll(xs=>xs.map(x=>x.getBoundingClientRect().height));
 assert(Math.max(...heights)-Math.min(...heights)<1);
 await page.locator('#dashboard-limit').selectOption('5');
 assert.equal(await page.locator('#insight-top .value-row').count(),5);
 await page.locator('#dashboard-status').selectOption('zero');
 assert.equal(await page.locator('#metric-total').innerText(),'5');
 assert.equal(await page.locator('#metric-instock').innerText(),'0');
 assert.equal(await page.locator('#insight-top .value-row').count(),0);
 await page.locator('#dashboard-search').fill('no match');
 await page.waitForFunction(()=>document.querySelector('#metric-total').textContent==='0');
 assert.equal(await page.locator('#o-tim-kiem').inputValue(),'');
 await page.locator('#dashboard-search').fill('');
 await page.locator('#dashboard-status').selectOption('all');
 await page.locator('#dashboard-limit').selectOption('10');
 await page.waitForFunction(()=>document.querySelector('#metric-total').textContent==='24');
 await page.screenshot({path:'/tmp/dashboard-desktop.png',fullPage:true});
 await page.locator('#lang-en').click();
 assert.equal(await page.locator('[data-i18n="dashCoverage"]').innerText(),'Stock coverage against Reorder Point');
 await page.evaluate(()=>{document.documentElement.dataset.theme='dark'});
 await page.screenshot({path:'/tmp/dashboard-dark.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});
 await page.locator('#lang-vi').click();
 await page.evaluate(()=>{document.documentElement.dataset.theme='light'});
 await page.screenshot({path:'/tmp/dashboard-mobile.png',fullPage:true});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.deepEqual(errors,[]);
 console.log('PASS browser: four equal cards, live filters, Top N, empty results, Stock independence, VI/EN, desktop/mobile overflow, no runtime errors.');
 } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
