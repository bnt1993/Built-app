const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../PO_GR_Report.html'),'utf8');
const po=[['Pur. Doc.','Item','Material','PO Quantity','OUn','Doc. Date','Supplier','Short Text']];
const gr=[['Purchase order','Item','Material','Movement Type','Qty in unit of entry','Unit of Entry','Material Document','Material Doc.Item','Posting Date']];
const req=[['File Name','SAP No','Requested date','Qty need to order','Status','PO No.','Hall','Description','Unit','Price(EUR)','Amount(EUR)','Supplier','OrderType']];
for(let i=0;i<121;i++){
  const code=String(4810000000+i),sap='SAP'+i,year=i<100?'2026':'2025',week=i%2?'02':'01',date=year+'-01-'+(i%2?'09':'02');
  po.push([code,'10',sap,4,'PC',date,'Supplier A','Vật tư '+i]);
  req.push(['Source_'+year+'_WK'+week+'.xlsx',sap,date,4,'Waiting for IR',i%4?code:'',i%2?'2':'1','Vật tư '+i,'PC',i===0?'bad':'2,5',i===0||i===1?'':i===2?'0':'10',i%3?'Lisa':'<img src=x onerror=alert(1)>','Z1']);
  if(i%4>=2)gr.push([code,'10',sap,'101',i%4===2?2:4,'PC','DOC'+i,'1',date]);
}
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true}),errors=[],loads=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('http://request-dashboard.test/**',route=>{
    const name=new URL(route.request().url()).pathname;loads.push(name);
    if(name==='/')return route.fulfill({contentType:'text/html',body:html});
    const data={'/PO.js':['duLieuPO',po],'/GR.js':['duLieuGR',gr],'/Request.js':['duLieuRequest',req]},entry=data[name];
    return route.fulfill({status:entry?200:404,contentType:'text/javascript',body:entry?'window.'+entry[0]+'='+JSON.stringify(entry[1])+';':''});
  });
  await page.goto('http://request-dashboard.test/');
  await page.waitForFunction(()=>document.getElementById('stat-total').textContent==='121');
  await page.locator('#tab-request-dashboard').click();
  await page.waitForFunction(()=>window.POGR.getDashboardState().summary?.metrics.count===121);
  assert.equal(loads.filter(x=>x==='/Request.js').length,1,'dashboard lazily reuses Request source');
  assert.equal(await page.locator('#dash-kpis .dash-metric').count(),8);
  const metric=await page.evaluate(()=>window.POGR.getDashboardState().summary.metrics);
  assert.equal(metric.value,1190);assert.equal(metric.missingValue,1);assert.equal(metric.derived,1);
  assert.equal(metric.waitingIR,31);assert.equal(metric.waitingGR,30);assert.equal(metric.partial,30);assert.equal(metric.complete,30);
  assert.equal(await page.locator('#dash-trend-chart svg rect').count(),4);
  assert.equal(await page.locator('#dash-supplier-chart img').count(),0,'source labels must remain text, never HTML');
  assert.equal(await page.locator('#dash-detail-body tr').count(),50,'dashboard detail DOM is bounded');
  await page.locator('#dash-next').click();assert.match(await page.locator('#dash-page-info').innerText(),/51–100/);
  await page.locator('#dash-prev').click();assert.match(await page.locator('#dash-page-info').innerText(),/1–50/);
  await page.locator('#dash-year').locator('..').locator('summary').click();
  await page.locator('#dash-year').locator('..').getByRole('checkbox',{name:'2025',exact:true}).check();
  await page.locator('#dash-search').click();await page.waitForFunction(()=>window.POGR.getDashboardState().summary.metrics.count===21);
  assert.deepEqual(await page.locator('#dash-week option').evaluateAll(ns=>ns.map(n=>n.value).filter(Boolean)),['2025-W01','2025-W02']);
  await page.locator('#dash-year').selectOption(['2025','2026'],{force:true});await page.waitForFunction(()=>window.POGR.getDashboardState().summary.metrics.count===121);
  await page.locator('#dash-week').selectOption(['2026-W01','2026-W02'],{force:true});await page.waitForFunction(()=>window.POGR.getDashboardState().summary.metrics.count===100);
  await page.locator('#dash-status').selectOption(['Waiting for IR','Waiting for GR'],{force:true});await page.waitForFunction(()=>window.POGR.getDashboardState().summary.metrics.count===50);
  await page.locator('#dash-reset').click();await page.waitForFunction(()=>window.POGR.getDashboardState().summary.metrics.count===121);
  await page.locator('#dash-status-chart .dash-status-button').filter({hasText:'Waiting for GR'}).click();
  await page.waitForFunction(()=>window.POGR.getDashboardState().summary.metrics.count===30);
  assert.equal(await page.locator('#dash-status').evaluate(el=>el.selectedOptions[0].value),'Waiting for GR');
  await page.locator('#dash-reset').click();await page.waitForFunction(()=>window.POGR.getDashboardState().summary.metrics.count===121);
  await page.locator('#dash-period').selectOption('year');await page.waitForFunction(()=>document.querySelectorAll('#dash-trend-chart svg rect').length===2);
  await page.locator('#dash-measure').selectOption('count');assert.match(await page.locator('#dash-trend-chart svg').getAttribute('aria-label'),/Số dòng/);
  await page.locator('#dash-search').fill('Vật tư 120');await page.waitForFunction(()=>window.POGR.getDashboardState().summary.metrics.count===1);
  await page.locator('#dash-detail-body tr').first().dblclick();assert.equal(await page.locator('#request-dialog').evaluate(e=>e.open),true);
  await page.locator('#request-dialog-close').click();await page.locator('#dash-reset').click();await page.waitForFunction(()=>window.POGR.getDashboardState().summary.metrics.count===121);
  const pending=page.waitForEvent('download');await page.locator('#dash-export').click();const file=await pending;
  assert.match(file.suggestedFilename(),/^Dashboard_Yeu_cau_.*\.xlsx$/);
  const xlsx=fs.readFileSync(await file.path()).toString('utf8');assert.equal((xlsx.match(/<row r="/g)||[]).length,122);
  assert(xlsx.includes('Cách tính giá trị EUR'));assert(xlsx.includes('Đơn giá × SL yêu cầu'));
  assert(xlsx.includes('numFmtId="168" formatCode="#,##0"'));assert(!xlsx.includes('formatCode="#,##0.####"'));
  await page.locator('#dash-from').fill('2027-01-01');await page.locator('#dash-to').fill('2026-01-01');
  await page.waitForFunction(()=>!document.getElementById('dash-filter-error').hidden);
  assert.equal(await page.locator('#dash-export').isDisabled(),true);assert.equal(await page.locator('#dash-trend-chart svg').count(),0);
  await page.locator('#dash-reset').click();await page.waitForFunction(()=>window.POGR.getDashboardState().summary.metrics.count===121);
  for(const width of [1100,768,390]){
    await page.setViewportSize({width,height:900});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'no page overflow at '+width);
    const boxes=await page.locator('#dash-kpis .dash-metric').evaluateAll(ns=>ns.map(n=>({w:n.clientWidth,h:n.clientHeight,sw:n.scrollWidth,sh:n.scrollHeight})));
    assert(boxes.every(b=>b.sw<=b.w&&b.sh<=b.h),'metric contents fit at '+width);
  }
  await page.setViewportSize({width:1440,height:1000});
  await page.locator('#tab-request').click();await page.waitForFunction(()=>document.getElementById('request-stat-total').textContent==='121');
  assert.equal(loads.filter(x=>x==='/Request.js').length,1,'switching tabs must reuse loaded data');
  await page.locator('#request-file').setInputFiles({name:'Request.js',mimeType:'application/javascript',buffer:Buffer.from('window.duLieuRequest=[["bad"],["bad"]];')});
  await page.waitForFunction(()=>document.getElementById('request-stat-total').textContent==='0');
  await page.locator('#tab-request-dashboard').click();
  // The tab retries the sibling source after a failed upload; prevent stale results during the load.
  await page.waitForFunction(()=>window.POGR.getDashboardState().summary.metrics.count===121);
  assert.deepEqual(errors,[]);
  console.log('PASS Request dashboard: budget and missing values, multi-year/week checkbox filters, statuses and receipt progress, chart drill-down, 50-row paging, detail popup, complete XLSX, source reuse/recovery and responsive layouts.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
