const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../PO_GR_Report.html'),'utf8');
const po=[['Pur. Doc.','Item','Material','PO Quantity','OUn','Doc. Date','Supplier','Short Text']];
const gr=[['Purchase order','Item','Material','Movement Type','Qty in unit of entry','Unit of Entry','Material Document','Material Doc.Item','Posting Date']];
const req=[['File Name','SAP No','Requested date','Qty need to order','Status','PO No.','Hall','Description','Unit']];
for(let i=0;i<601;i++){
  const code=i===600?'4710000000':String(4810000000+i),sap='SAP'+i,date=i%2?'2026-07-01':'2026-01-02';
  po.push([code,'10',sap,2,'PC',date,i%2?'Supplier B':'Supplier A','Động cơ '+i]);
  req.push(['Source_WK0'+(i%2+1)+'.xlsx',sap,date,2,'Waiting for IR',code,i%2?'2':'1','Động cơ '+i,'PC']);
  if(i%3)gr.push([code,'10',sap,'101',i%3===1?1:2,'PC','DOC'+i,'1',date]);
}
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:950},acceptDownloads:true}),errors=[],loads=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('http://po-upgrades.test/**',route=>{
    const name=new URL(route.request().url()).pathname;loads.push(name);
    if(name==='/')return route.fulfill({contentType:'text/html',body:html});
    const sources={'/PO.js':['duLieuPO',po],'/GR.js':['duLieuGR',gr],'/Request.js':['duLieuRequest',req]},entry=sources[name];
    return route.fulfill({status:entry?200:404,contentType:'text/javascript',body:entry?'window.'+entry[0]+'='+JSON.stringify(entry[1])+';':''});
  });
  await page.goto('http://po-upgrades.test/');await page.waitForFunction(()=>document.getElementById('stat-total').textContent==='600');
  assert.equal(loads.filter(x=>x==='/PO.js').length,1,'load once');
  assert.equal(await page.locator('#report-table thead th').first().innerText().then(t=>t.includes('Tuần PO')),true);
  const statusField=page.locator('#status-filter').locator('..');
  await statusField.locator('summary').click();
  await statusField.getByRole('checkbox',{name:'Chưa nhận',exact:true}).check();
  await statusField.getByRole('checkbox',{name:'Nhận một phần',exact:true}).check();
  await page.locator('#search').click();
  await page.waitForFunction(()=>document.getElementById('stat-total').textContent==='400');
  assert.equal(await page.locator('#status-filter').evaluate(el=>el.selectedOptions.length),2);
  await page.locator('#supplier-filter').selectOption(['Supplier A','Supplier B'],{force:true});
  await page.locator('#search').fill('dong co');await page.waitForTimeout(200);
  assert.equal(await page.locator('#stat-total').innerText(),'400','OR within filters; AND across filters; accent-insensitive search');
  await page.locator('#date-from').fill('2026-12-01');await page.locator('#date-to').fill('2026-01-01');
  await page.waitForFunction(()=>!document.getElementById('po-filter-error').hidden);
  assert.equal(await page.locator('#stat-total').innerText(),'0');
  await page.locator('#reset').click();await page.waitForFunction(()=>document.getElementById('stat-total').textContent==='600');
  assert.equal(await page.locator('#report-body tr').count(),50);
  await page.waitForTimeout(500);assert.equal(await page.locator('#report-body tr').count(),50,'redraws never auto-load');
  await page.evaluate(()=>{for(let i=0;i<8;i++)window.POGR.moveReportWindow('po',1)});
  assert.equal(await page.locator('#report-body tr').count(),200,'bounded DOM');
  const before=await page.locator('#page-summary').innerText();
  await page.evaluate(()=>window.POGR.moveReportWindow('po',-1));
  assert.notEqual(await page.locator('#page-summary').innerText(),before,'shared backward window');
  await page.evaluate(()=>window.scrollTo(0,0));await page.mouse.wheel(0,-300);await page.waitForTimeout(100);
  await page.locator('#tab-request').click();await page.waitForFunction(()=>document.getElementById('request-stat-total').textContent==='601');
  const rows=await page.evaluate(()=>window.POGR.getRequestState().rows.map(r=>({status:r.status,source:r.sourceStatus,link:r.link,po:r.po})));
  assert.equal(rows.filter(r=>r.status==='Waiting for GR').length,201);
  assert.equal(rows.filter(r=>r.status==='Done').length,400);
  assert.equal(rows.find(r=>r.po==='4710000000').link,'no-gr','Request uses all PO numbers');
  assert(rows.every(r=>r.source==='Waiting for IR'));
  await page.locator('#request-status').selectOption(['Waiting for GR','Done'],{force:true});
  await page.locator('#request-week').selectOption(['WK01','WK02'],{force:true});
  await page.locator('#request-hall').selectOption(['1','2'],{force:true});
  await page.waitForTimeout(100);assert.equal(await page.locator('#request-stat-total').innerText(),'601');
  const pending=page.waitForEvent('download');await page.locator('#request-export').click();
  const xlsx=fs.readFileSync(await(await pending).path()).toString('utf8');
  assert.equal((xlsx.match(/<row r="/g)||[]).length,602);assert(xlsx.includes('Waiting for GR'));
  await page.evaluate(()=>{for(let i=0;i<8;i++)window.POGR.moveReportWindow('request',1)});
  assert.equal(await page.locator('#request-body tr').count(),200);
  assert.equal(await page.evaluate(()=>window.POGR.moveReportWindow('po',1)),false,'inactive table never scrolls');
  for(const view of ['po','request']){
    await page.locator(view==='po'?'#tab-po-gr':'#tab-request').click();await page.setViewportSize({width:390,height:844});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.setViewportSize({width:1440,height:950});
  }
  assert.deepEqual(errors,[]);console.log('PASS PO upgrades: single startup, multi-checkbox filters, ISO weeks, net-GR request statuses, full PO scope, range errors, bounded bidirectional shared scrolling, XLSX and mobile.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
