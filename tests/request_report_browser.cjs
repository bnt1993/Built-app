const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../PO_GR_Report.html'),'utf8');
const real={po:fs.readFileSync(path.join(__dirname,'../PO.js'),'utf8'),
  gr:fs.readFileSync(path.join(__dirname,'../GR.js'),'utf8'),
  request:fs.readFileSync(path.join(__dirname,'../Request.js'),'utf8')};
const poHead=["Pur. Doc.","Item","Created By","Doc. Date","Plnt","Supplier","Material",
  "Short Text","PO Quantity","OUn","Net Price","Gross value","Crcy"];
const grHead=["Plant","Storage Location","Material Document","Material Doc.Item",
  "Posting Date","Entry Date","Time of Entry","Movement Type","Special Stock",
  "Material","Material Description","Purchase order","Item","Qty in unit of entry",
  "Unit of Entry","Amt.in loc.cur.","Document Date","Cost Center","Order","Asset",
  "Reference","WBS Element","Movement Type Text","Trans./Event Type","Reservation","Bill of Lading"];
const reqHead=["File Name","No","Purchasing Group ","SAP No","Requested date",
  "Description","Stock","Reorder Point","Lot size of reorder","Qty need to order",
  "Unit","Price(EUR)","Amount(EUR)","OrderType","Note","Supplier","Hall",
  "Status","PO No.","Ordered date"];
const script=(name,stamp,rows)=>'window.'+stamp+'="10/11/2026 19:00:49";window.'+name+'='+JSON.stringify(rows)+';';
const po=[poHead,
  ["4811770001","10","BUYER","46024","5244","502000","500111","Motor",5,"PC","10","50","EUR"],
  ["4811770001","20","BUYER","46024","5244","502000","500222","Valve",2,"PC","20","40","EUR"]];
function movement(doc,item,material,type,qty){
 const r=new Array(grHead.length).fill("");
 r[2]=doc;r[3]="1";r[4]="10/11/2026";r[7]=type;r[9]=material;
 r[11]="4811770001";r[12]=item;r[13]=String(qty);r[14]="PC";return r;
}
const gr=[grHead,movement("70001","10","500111","101",3),
  movement("70002","10","500111","102",1),
  movement("70003","20","500222","101",2)];
function requestRow(index,sap,status,poNumber,hall){
  return ["WK45.xlsx",String(index),"784",sap,"46330","Item "+index,
    "0","2","1","3","PC","1,50","4,50","Z1","Reorder",
    "Lisa",hall,status,poNumber,poNumber?"46334":""];
}
const requests=[reqHead,
  requestRow(1,"500111","Done","4811770001","1"),
  requestRow(2,"500222","Done","4811770001","2"),
  requestRow(3,"500111","Done","","1"),
  requestRow(4,"500111","Waiting for IR","4811770099","1"),
  requestRow(5,"999999","Done","4811770001","2")];
requests[1][0]="Order sparepart list of ME56_5244_Wk31.xlsx";
requests[2][0]="Order sparepart list of ME56_5244_WK32.xlsx";
requests[3][0]="Order sparepart list of ME56_5244_WK45.xls";
requests[4][0]="Order sparepart list of ME56_5244_WK54.xlsx";
requests[5][0]="Order sparepart list of ME56_5244_unknown.xlsx";
function routeFor(page,sources){
 return page.route('http://request-report.test/**',route=>{
   const name=new URL(route.request().url()).pathname;
   const body=name==='/'?html:
     name==='/PO.js'?sources.po:name==='/GR.js'?sources.gr:
     name==='/Request.js'?sources.request:null;
   return route.fulfill({status:body===null?404:200,body:body||'',
     contentType:name==='/'?'text/html':'text/javascript'});
 });
}
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1500,height:930},acceptDownloads:true});
  await page.clock.install({time:new Date('2026-11-10T12:00:00+07:00')});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await routeFor(page,real);
  await page.goto('http://request-report.test/');
  await page.waitForFunction(()=>document.getElementById('stat-total').textContent==='5');
  assert.equal(await page.locator('#request-panel').isVisible(),false);
  await page.locator('#tab-request').click();
  await page.waitForFunction(()=>document.getElementById('request-stat-total').textContent==='334');
  assert.equal(await page.locator('#request-stat-po').innerText(),'247');
  assert.equal(await page.locator('#request-stat-match').innerText(),'0');
  assert.equal(await page.locator('#request-stat-wait').innerText(),'20');
  assert.match(await page.locator('#request-source-update').innerText(),/19:00:49/);
  assert.equal(await page.locator('#request-body tr').count(),50);
  assert.equal(await page.locator('#request-table thead th').first().innerText().then(t=>t.includes('Tuần (File Name)')),true);
  assert.match(await page.locator('#request-body tr td:first-child').first().innerText(),/^WK\d{2}$/);
  const tops=await page.locator('#request-panel .request-filters .field').evaluateAll(nodes=>
    nodes.map(node=>Math.round(node.getBoundingClientRect().top)));
  assert.equal(tops.length,6,'six Request filters must remain visible');
  assert.equal(new Set(tops).size,1,'desktop Request filters should occupy one row');
  const tabHeight=await page.locator('#tab-request').evaluate(el=>el.getBoundingClientRect().height);
  assert.ok(tabHeight<=45,'compact tab height');
  await page.locator('#request-link').selectOption('missing');
  await page.waitForFunction(()=>document.getElementById('request-stat-total').textContent==='87');
  await page.locator('#request-link').selectOption('unavailable');
  await page.waitForFunction(()=>document.getElementById('request-stat-total').textContent==='247');
  await page.locator('#request-clear').click();
  assert.equal(await page.locator('#request-stat-total').innerText(),'334');
  // Export all 334 rows, not just the 50 rows in the viewport.
  const downloadPromise=page.waitForEvent('download');
  await page.locator('#request-export').click();
  const download=await downloadPromise;
  assert.match(download.suggestedFilename(),/^Request_PO_GR_.*\.xlsx$/);
  const xlsx=fs.readFileSync(await download.path()).toString('utf8');
  assert.equal((xlsx.match(/<row r="/g)||[]).length,335);
  assert.ok(xlsx.includes('Request_PO_GR'));
  assert.ok(xlsx.includes('Tuần (File Name)'));
  assert.ok(xlsx.includes('WK30')||xlsx.includes('WK31'));
  await page.locator('#tab-po-gr').click();
  assert.equal(await page.locator('#report-body tr').count(),5);
  assert.deepEqual(errors,[]);

  // Synthetic PO + GR fixtures prove exact PO/material linkage and reversal.
  const p2=await browser.newPage({viewport:{width:1450,height:930},acceptDownloads:true});
  await p2.clock.install({time:new Date('2026-11-10T12:00:00+07:00')});
  const errors2=[];p2.on('pageerror',e=>errors2.push(e.message));
  await routeFor(p2,{po:script('duLieuPO','thoiGianCapNhatPO',po),
    gr:script('duLieuGR','thoiGianCapNhatGR',gr),
    request:script('duLieuRequest','thoiGianCapNhatRequest',requests)});
  await p2.goto('http://request-report.test/');
  await p2.waitForFunction(()=>document.getElementById('stat-total').textContent==='2');
  await p2.locator('#tab-request').click();
  await p2.waitForFunction(()=>document.getElementById('request-stat-total').textContent==='5');
  assert.equal(await p2.locator('#request-stat-po').innerText(),'4');
  assert.equal(await p2.locator('#request-stat-match').innerText(),'2');
  const weekCases=await p2.evaluate(()=>[
    'Order sparepart list of ME56_5244_WK31.xlsx',
    'Order sparepart list of ME56_5244_Wk32.XLSX',
    'WK9.xlsx','missing_week.xlsx','ME56_5244_WK54.xlsx'
  ].map(x=>window.POGR.requestWeekFromFile(x)));
  assert.deepEqual(weekCases,['WK31','WK32','WK09','','']);
  const computed=await p2.evaluate(()=>window.POGR.getRequestState().rows
    .map(r=>({sap:r.sap,po:r.po,link:r.link,week:r.week,poQty:r.poQty,grQty:r.grQty})));
  assert.deepEqual(computed.map(r=>r.week),['WK31','WK32','WK45','','']);

  assert.deepEqual(computed.map(r=>r.link),
    ['partial','complete','missing','unavailable','mismatch']);
  assert.equal(computed[0].grQty,2);assert.equal(computed[0].poQty,5);
  assert.equal(await p2.locator('#request-body tr td').first().innerText(),'WK31');
  assert.match(await p2.locator('#request-body tr td').first().getAttribute('title'),/Wk31.xlsx/);
  await p2.locator('[data-rsort="week"]').click();
  assert.equal(await p2.locator('#request-body tr td').first().innerText(),'WK31');
  await p2.locator('#request-hall').selectOption('2');
  await p2.waitForFunction(()=>document.getElementById('request-stat-total').textContent==='2');
  await p2.locator('#request-clear').click();
  await p2.locator('#request-link').selectOption('partial');
  await p2.waitForFunction(()=>document.getElementById('request-stat-total').textContent==='1');
  const filteredPromise=p2.waitForEvent('download');
  await p2.locator('#request-export').click();
  const xlsxFiltered=fs.readFileSync(await (await filteredPromise).path()).toString('utf8');
  assert.equal((xlsxFiltered.match(/<row r="/g)||[]).length,2);
  await p2.locator('#request-body tr').first().dblclick();
  assert.equal(await p2.locator('#request-dialog').evaluate(e=>e.open),true);
  assert.equal(await p2.locator('#request-detail-po tr').count(),1);
  await p2.locator('#request-jump-po').click();
  assert.equal(await p2.locator('#po-gr-panel').isVisible(),true);
  assert.equal(await p2.locator('#search').inputValue(),'4811770001');
  assert.equal(await p2.locator('#stat-total').innerText(),'2');
  assert.deepEqual(errors2,[]);
  console.log('PASS Request.js real 334 rows, independent source, PO + material linkage, GR reversal, filters, detail, tab switch, XLSX.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
