const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert');
(async()=>{
 let options={headless:true};if(process.env.CHROMIUM_HELPER){const {default:h}=await import(process.env.CHROMIUM_HELPER);options={...options,executablePath:await h.executablePath(),args:h.args};}
 const browser=await chromium.launch(options);try{
 const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const stock=[['SAP','Description','Part No','Stock','Price','Unit','Reorder Point']];for(let i=0;i<24;i++)stock.push(['SAP'+i,'Vật tư kiểm tra '+i,'P'+i,i+1,10000*(i+1),'PC',10]);
 const today=new Date(),date=[today.getDate(),today.getMonth()+1,today.getFullYear()].join('/');
 const history=[['Posting Date','Movement Type','Material','Qty in unit of entry','Unit of Entry','Amt.in loc.cur.'],[date,'INPUT','SAP0',3,'PC',300000],[date,'OUTPUT','SAP0',-2,'PC',-200000],[date,'SCRAP','SAP0',1,'PC',999999]];
 await page.route('http://dashboard.test/**',r=>{const u=new URL(r.request().url());let body='',contentType='text/javascript';if(u.pathname==='/'){body=fs.readFileSync(path.join(__dirname,'../Checking'),'utf8');contentType='text/html'}else if(u.pathname==='/data.js')body='window.duLieuCongTy='+JSON.stringify(stock)+';window.thoiGianCapNhat="test";';else if(u.pathname==='/History.js')body='window.duLieuCongTy='+JSON.stringify(history)+';';else if(u.pathname==='/Amount.js')body='window.amountData='+JSON.stringify([[date,1000000,'1.000.000 VND']])+';';else if(u.pathname==='/Material/manifest.js')body='window.MaterialImageManifest={version:2,complete:true,materials:{}}';return r.fulfill({contentType,body});});
 await page.goto('http://dashboard.test/');await page.locator('#tab-dashboard').click();await page.waitForFunction(()=>historyLoaded);
 assert.equal(await page.locator('#dashboard-usage-unit,#insight-replenishment,.dashboard-replenishment-card').count(),0);
 for(const mode of ['week','month','year']){
  await page.locator('#dashboard-usage-period').selectOption(mode);
  if(mode==='week')assert.match(await page.locator('#insight-usage .trend-period').last().innerText(),/^Tuần \d+$/);
  const text=await page.locator('#dashboard-usage-summary').innerText();assert(text.includes('300.000'));assert(text.includes('200.000'));assert(!text.includes('999.999'));
  assert.equal(await page.locator('#insight-usage .movement-in').count(),mode==='year'?6:12);
  const bar=await page.locator('#insight-usage .movement-in').last().boundingBox();assert(bar.height>0,'positive amount must render visible bar');
 }
 for(const mode of ['day','week','month','year']){await page.locator('#dashboard-value-period').selectOption(mode);if(mode==='week')assert.match(await page.locator('#insight-value-trend .trend-period').last().innerText(),/^Tuần \d+$/);assert.equal(await page.locator('#insight-value-trend .trend-column').count(),mode==='day'?30:mode==='year'?6:12);}
 await page.locator('#dashboard-limit').selectOption('20');assert.equal(await page.locator('#insight-top tbody tr').count(),20);
 await page.locator('#lang-en').click();assert.equal(await page.locator('[data-i18n="dashUsageTitle"]').innerText(),'Inbound / outbound value');
 await page.locator('#dashboard-usage-period').selectOption('month');await page.locator('#dashboard-value-period').selectOption('week');
 await page.screenshot({path:'/tmp/inventory-dashboard-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.locator('#lang-vi').click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.screenshot({path:'/tmp/inventory-dashboard-mobile.png',fullPage:true});
 await page.evaluate(()=>{historyStatusKey='historyNoSource';veBieuDoSuDungKho()});assert((await page.locator('#dashboard-usage-summary').innerText()).includes('lần tải trước'));
 assert.deepEqual(errors,[]);console.log('PASS browser: paired value bars, week/month/year, Amount.js valuation history, Top 20, VI/EN, mobile overflow and stale-history status.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
