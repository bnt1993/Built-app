const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const pageHTML=fs.readFileSync(path.join(__dirname,'../PO_GR_Report.html'),'utf8');
const poReal=fs.readFileSync(path.join(__dirname,'../PO.js'),'utf8');
const grReal=fs.readFileSync(path.join(__dirname,'../GR.js'),'utf8');
const poNew=poReal.replace(/window\.duLieuCongTy\s*=/,'window.duLieuPO =')
  .replace(/window\.thoiGianCapNhat\s*=/,'window.thoiGianCapNhatPO =')
  .replace('10/11/2026 16:48:43','10/11/2026 17:12:44');
const grNew=grReal.replace(/window\.thoiGianCapNhat\s*=/,'window.thoiGianCapNhatGR =')
  .replace('10/11/2026 16:48:44','10/11/2026 17:12:55');
assert.notEqual(poNew,poReal,'fixture must include the legacy PO assignment');
const poHead=["Pur. Doc.","Item","Created By","Doc. Date","Plnt","Supplier","Material","Short Text","PO Quantity","OUn","Net Price","Gross value","Crcy"];
const poData=[poHead,
 ["4811110001","10","BUYER","46024","5244","502000","500100","Motor A","10","PC","5,50","55,00","EUR"],
 ["4811110001","20","BUYER","46024","5244","502000","500200","Spring B","4","PC","2,50","10,00","EUR"]
];
const grHead=["Plant","Storage Location","Material Document","Material Doc.Item","Posting Date","Entry Date","Time of Entry","Movement Type","Special Stock","Material","Material Description","Purchase order","Item","Qty in unit of entry","Unit of Entry","Amt.in loc.cur.","Document Date","Cost Center","Order","Asset","Reference","WBS Element","Movement Type Text","Trans./Event Type","Reservation","Bill of Lading"];
function gr(doc,docItem,po,item,material,qty,movement="101",bill="BL-1"){
 const x=new Array(grHead.length).fill("");x[2]=doc;x[3]=docItem;x[4]="10/11/2026";x[7]=movement;x[9]=material;x[11]=po;x[12]=item;
 x[13]=String(qty);x[14]="PC";x[15]="100";x[25]=bill;return x;
}
const grData=[grHead,
 gr("50001","1","4811110001","00010","500100",3),
 gr("50002","1","4811110001","10","500100",5),
 gr("50003","1","4811110001","10","500100",1,"102"),
 gr("50004","1","4811110001","10","500100",2,"105"),
 gr("50005","1","4811110001","10","999999",99),
 gr("50001","1","4811110001","10","500100",3)
];
const js=(name,data,stamp='thoiGianCapNhat')=>'window.'+stamp+'="10/11/2026 16:48";window.'+name+'='+JSON.stringify(data)+';';
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1500,height:950},acceptDownloads:true});
  await page.clock.install({time:new Date('2026-11-10T08:00:00Z')});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  let poRouteText=poNew;
  await page.route('http://po-gr-report.test/**',route=>{
    const pathname=new URL(route.request().url()).pathname;
    let content=pathname==='/'?pageHTML:pathname==='/PO.js'?poRouteText:pathname==='/GR.js'?grNew:'';
    return route.fulfill({status:content?200:404,body:content,
      contentType:pathname==='/'?'text/html':'application/javascript'});
  });
  await page.goto('http://po-gr-report.test/');
  await page.waitForFunction(()=>document.getElementById('source-status').textContent.includes('Đã kết nối'));
  assert.match(await page.locator('#po-source-note').textContent(),/duLieuPO/);
  assert.match(await page.locator('#po-update').innerText(),/17:12:44/);
  assert.match(await page.locator('#gr-update').innerText(),/17:12:55/);
  assert.equal(await page.locator('#stat-total').innerText(),'5');
  assert.equal(await page.locator('#stat-pending').innerText(),'5');
  assert.equal(await page.locator('#report-body tr').count(),5);
  assert.equal(await page.locator('#report-body tr td.age.critical').count(),5);
  const sample=await page.evaluate(()=>{
    const po=[
      ["Pur. Doc.","Item","Created By","Doc. Date","Plnt","Supplier","Material","Short Text","PO Quantity","OUn","Net Price","Gross value","Crcy"],
      ["4811110001","10","BUYER","46024","5244","502000","500100","Motor A","10","PC","5,50","55,00","EUR"]
    ];
    const h=["Plant","Storage Location","Material Document","Material Doc.Item","Posting Date","Entry Date","Time of Entry","Movement Type","Special Stock","Material","Material Description","Purchase order","Item","Qty in unit of entry","Unit of Entry","Amt.in loc.cur.","Document Date","Cost Center","Order","Asset","Reference","WBS Element","Movement Type Text","Trans./Event Type","Reservation","Bill of Lading"];
    const rec=(doc,type,qty,material="500100")=>{
      const r=new Array(h.length).fill('');r[2]=doc;r[3]="1";r[4]="10/11/2026";
      r[7]=type;r[9]=material;r[11]="4811110001";r[12]="00010";r[13]=String(qty);r[14]="PC";return r;
    };
    const g=[h,rec("01","101",3),rec("02","101",5),rec("03","102",1),rec("04","105",2),rec("05","101",99,"X"),rec("01","101",3)];
    const a=window.POGR.buildReport(po,g,false),b=window.POGR.buildReport(po,g,true);
    return {date:window.POGR.excelDate("46024"),qty:a.rows[0].grQty,
      qty105:b.rows[0].grQty,percent:a.rows[0].percent,
      remain:a.rows[0].remain,duplicates:a.duplicates,mismatch:a.mismatch};
  });
  assert.equal(sample.date,'2026-01-02');
  assert.equal(sample.qty,7);assert.equal(sample.qty105,9);
  assert.equal(sample.percent,70);assert.equal(sample.remain,3);
  assert.equal(sample.duplicates,1);assert.equal(sample.mismatch,1);
  // Every 48* row remains visible even if incomplete; 47*/49* never enter
  // the report, stats or Excel. This is a scope rule, not a pagination cut.
  const scope=await page.evaluate(({head,grHead})=>{
    const row=(po,item,material)=>[po,item,'BUYER','46024','5244','502000',
      material,'Scope test','1','PC','1,00','1,00','EUR'];
    const result=window.POGR.buildReport([head,row('4810000001','10','500001'),
      row('4710000002','20','500002'),row('4910000003','30','500003'),
      row('4810000004','','')],[grHead]);
    return {po:result.rows.map(r=>r.po),excluded:result.excludedPO,
      invalid:result.rows.filter(r=>r.status==='invalid').length};
  },{head:poHead,grHead});
  assert.deepEqual(scope,{po:['4810000001','4810000004'],excluded:2,invalid:1});

  // The old window.duLieuCongTy syntax remains supported for manual uploads.
  const parserResult=await page.evaluate(({newSource,oldSource})=>({
    newer:(()=>{const r=window.POGR.fromJSText(newSource,['duLieuPO','duLieuCongTy']);
      return {name:r.globalName,time:r.updated}})(),
    legacy:(()=>{const r=window.POGR.fromJSText(oldSource,['duLieuPO','duLieuCongTy']);
      return {name:r.globalName,time:r.updated}})()
  }),{newSource:poNew,oldSource:poReal});
  assert.deepEqual(parserResult,{
    newer:{name:'duLieuPO',time:'10/11/2026 17:12:44'},
    legacy:{name:'duLieuCongTy',time:'10/11/2026 16:48:43'}
  });
  // Full reload must recognize both generated script formats, not just uploads.
  poRouteText=poReal;
  await page.locator('#reload-btn').click();
  await page.waitForFunction(()=>document.getElementById('po-source-note').textContent.includes('duLieuCongTy'));
  assert.equal(await page.locator('#stat-total').innerText(),'5');
  assert.match(await page.locator('#po-update').innerText(),/16:48:43/);
  poRouteText=poNew;
  await page.locator('#reload-btn').click();
  await page.waitForFunction(()=>document.getElementById('po-source-note').textContent.includes('duLieuPO'));
  assert.equal(await page.locator('#stat-total').innerText(),'5');
  // Manual file import for network shares where browser blocks script loading.
  await page.locator('#file-po').setInputFiles({name:'PO.js',mimeType:'application/javascript',
    buffer:Buffer.from(js('duLieuPO',poData,'thoiGianCapNhatPO'))});
  await page.waitForFunction(()=>document.getElementById('po-source-note').textContent.includes('duLieuPO'));
  assert.match(await page.locator('#po-source-note').textContent(),/duLieuPO/);
  await page.locator('#file-gr').setInputFiles({name:'GR.js',mimeType:'application/javascript',
    buffer:Buffer.from(js('duLieuGR',grData,'thoiGianCapNhatGR'))});
  await page.waitForFunction(()=>document.getElementById('stat-total').textContent==='2');
  await page.locator('#file-po').setInputFiles({name:'PO.js',mimeType:'application/javascript',
    buffer:Buffer.from(js('duLieuCongTy',poData))});
  await page.waitForFunction(()=>document.getElementById('po-source-note').textContent.includes('duLieuCongTy'));
  assert.match(await page.locator('#po-source-note').textContent(),/duLieuCongTy/);
  await page.locator('#file-po').setInputFiles({name:'PO.js',mimeType:'application/javascript',
    buffer:Buffer.from(js('duLieuPO',poData,'thoiGianCapNhatPO'))});
  await page.waitForFunction(()=>document.getElementById('po-source-note').textContent.includes('duLieuPO'));
  assert.match(await page.locator('#po-source-note').textContent(),/duLieuPO/);
  assert.match(await page.locator('#join-note').innerText(),/mã vật tư khác PO/);
  const rows=await page.evaluate(()=>window.POGR.buildReport(JSON.parse(JSON.stringify([
    ["Pur. Doc.","Item","Created By","Doc. Date","Plnt","Supplier","Material","Short Text","PO Quantity","OUn","Net Price","Gross value","Crcy"],
    ["4811110001","10","BUYER","46024","5244","502000","500100","Motor A","10","PC","5,50","55,00","EUR"]]
  )),JSON.parse(JSON.stringify([])),false).rows.length).catch(()=>-1);
  // UI should show 70% for the first PO line (GR 101 - 102).
  assert.match(await page.locator('#report-body').innerText(),/70%/);
  await page.locator('#include-105').check();
  assert.match(await page.locator('#report-body').innerText(),/90%/);
  await page.locator('#status-filter').selectOption('all');
  await page.locator('#report-body tr').first().dblclick();
  assert.equal(await page.locator('#details-dialog').evaluate(el=>el.open),true);
  assert.ok((await page.locator('#detail-gr-body tr').count())>=1);
  await page.locator('#close-dialog').click();
  const downloadPromise=page.waitForEvent('download');
  await page.locator('#export-btn').click();
  const download=await downloadPromise;
  assert.match(download.suggestedFilename(),/^PO_GR_Report_.*\.xlsx$/);
  const file=fs.readFileSync(await download.path());
  assert.equal(file.toString('ascii',0,2),'PK');
  assert.ok(file.includes(Buffer.from('xl/worksheets/sheet1.xml')));

  // Bulk PO.js must load every matching 48* row, not only the visible page or
  // pending records. Two 47*/49* rows are explicitly outside the report scope.
  const bigPO=[poHead,...Array.from({length:121},(_,i)=>[
    String(4800200000+i),"10","BUYER","46024","5244","502000",
    String(500000+i),"Material "+i,"4","PC","1,00","4,00","EUR"
  ]),["4711110000","10","BUYER","46024","5244","502000",
       "700001","Other prefix","4","PC","1,00","4,00","EUR"],
    ["4911110000","10","BUYER","46024","5244","502000",
       "700002","Other prefix 49","4","PC","1,00","4,00","EUR"]];
  poRouteText=js('duLieuPO',bigPO,'thoiGianCapNhatPO');
  await page.locator('#reload-btn').click();
  await page.waitForFunction(()=>document.getElementById('dataset-summary').textContent.includes('121'));
  assert.equal(await page.locator('#status-filter').inputValue(),'all');
  assert.match(await page.locator('#dataset-summary').innerText(),/123/);
  assert.equal(await page.locator('#stat-total').innerText(),'121');
  assert.equal(await page.locator('#report-body tr').count(),50);
  assert.equal(await page.locator('#result-summary').innerText().then(x=>x.includes('123')),true);
  assert.equal(await page.locator('#plant-filter').count(),0);
  assert.equal(await page.locator('[data-sort="key"]').count(),0);
  assert.equal(await page.locator('.hero,.scope-banner').count(),0);
  assert.equal(await page.locator('#export-btn').count(),1);
  assert.equal(await page.locator('#report-body tr').evaluateAll(rows=>
    rows.every(row=>row.querySelector('td').textContent.startsWith('48'))),true);
  // At 1100px the PO table is wider than the viewport, so both horizontal
  // alignment and page scrolling can be checked on the same dataset.
  await page.setViewportSize({width:1100,height:950});
  // Vertical scrolling is on the page; a fixed, horizontally-synced table
  // header remains available for identification and sorting.
  const scroller=page.locator('#table-scroller');
  const initialViewport=await scroller.evaluate(node=>({
    height:node.clientHeight,scrollHeight:node.scrollHeight,
    overflowX:getComputedStyle(node).overflowX
  }));
  assert.ok(initialViewport.height>1000,'the page owns vertical scrolling');
  assert.equal(initialViewport.overflowX,'auto');
  assert.equal(await page.locator('#load-sentinel').evaluate(node=>
    node.parentElement.id),'table-scroller');
  await page.evaluate(()=>{
    const table=document.getElementById('report-table');
    window.scrollTo(0,window.scrollY+table.getBoundingClientRect().top+145);
  });
  await page.waitForFunction(()=>{
    const overlay=document.querySelector('.fixed-report-head[data-source-table="report-table"]');
    return overlay&&!overlay.hidden;
  });
  const sticky=page.locator('.fixed-report-head[data-source-table="report-table"]');
  assert.equal(await sticky.locator('thead th').count(),12);
  await scroller.evaluate(el=>el.scrollLeft=130);
  await page.waitForFunction(()=>{
    const pinned=document.querySelector('.fixed-report-head[data-source-table="report-table"] .fixed-head-first');
    return pinned&&!pinned.hidden;
  });
  const actualHorizontalOffset=await scroller.evaluate(el=>el.scrollLeft);
  assert.ok(actualHorizontalOffset>0);
  assert.ok((await sticky.locator('.head-track').getAttribute('style'))
    .includes('translateX(-'+actualHorizontalOffset+'px)'));
  // The mirrored header forwards clicks to the actual sort buttons.
  // After horizontal scrolling, the first column's separate pinned heading
  // stays clickable even though its normal mirrored cell has moved offscreen.
  await sticky.locator('.fixed-head-first button').click();
  assert.equal(await page.locator('#report-body tr').count(),50);
  await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
  await page.waitForFunction(()=>document.querySelectorAll('#report-body tr').length>=100);
  assert.equal(await page.locator('#report-body tr').count(),100);
  await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
  await page.waitForFunction(()=>document.querySelectorAll('#report-body tr').length===121);
  assert.ok(await page.evaluate(()=>window.scrollY)>0);
  assert.equal(await page.locator('#page-indicator').innerText(),'121/121');
  await page.locator('#first').click();
  assert.equal(await page.locator('#report-body tr').count(),50);
  await page.locator('#last').click();
  assert.equal(await page.locator('#report-body tr').count(),50);
  assert.equal(await page.locator('#page-indicator').innerText(),'121/121');
  await page.locator('#first').click();
  await page.locator('#page-size').selectOption('100');
  assert.equal(await page.locator('#report-body tr').count(),100);

  // One fully received PO is still visible under the default All status.
  await page.locator('#file-gr').setInputFiles({name:'GR.js',
    mimeType:'application/javascript',
    buffer:Buffer.from(js('duLieuGR',[grHead,
      gr('990001','1','4800200000','10','500000',4)],
      'thoiGianCapNhatGR'))});
  await page.waitForFunction(()=>document.getElementById('stat-completion').textContent!=='0%' &&
    document.getElementById('stat-completion').textContent!=='—');
  assert.equal(await page.locator('#stat-total').innerText(),'121');
  await page.locator('.quick-tab[data-mode="done"]').click();
  assert.equal(await page.locator('#stat-total').innerText(),'1');
  assert.equal(await page.locator('#report-body tr').count(),1);
  assert.equal(await page.locator('#report-body tr td.age').first().innerText(),'—',
    'completed PO must not display waiting days');
  await page.locator('#report-body tr').first().dblclick();
  const waitDetail=page.locator('#detail-fields .detail-cell').filter({hasText:'Ngày chờ'});
  assert.equal(await waitDetail.locator('strong').innerText(),'—');
  await page.locator('#close-dialog').click();
  const completedExportPromise=page.waitForEvent('download');
  await page.locator('#export-btn').click();
  const completedFile=fs.readFileSync(await (await completedExportPromise).path()).toString('utf8');
  assert.ok(completedFile.includes('<c r="J2" t="inlineStr"><is><t></t></is></c>'),
    'completed PO waiting day should be blank in Excel');
  await page.locator('.quick-tab[data-mode="pending"]').click();
  assert.equal(await page.locator('#stat-total').innerText(),'120');
  await page.locator('.quick-tab[data-mode="all"]').click();
  assert.equal(await page.locator('#stat-total').innerText(),'121');
  assert.equal(await page.locator('#status-filter').inputValue(),'all');
  await page.locator('#reset').click();
  assert.equal(await page.locator('#stat-total').innerText(),'121');

  // The exported file must contain all 121 items, including rows on later pages.
  const bulkDownloadPromise=page.waitForEvent('download');
  await page.locator('#export-btn').click();
  const bulkDownload=await bulkDownloadPromise;
  const bulkFile=fs.readFileSync(await bulkDownload.path()).toString('utf8');
  assert.equal((bulkFile.match(/<row r="/g)||[]).length,122);
  assert.equal(bulkFile.includes('Khóa đối chiếu'),false);
  // Export respects the active filter even if only 1 of 121 rows matches.
  await page.locator('#search').fill('4800200017');
  await page.waitForFunction(()=>document.getElementById('stat-total').textContent==='1');
  const filteredDownload=page.waitForEvent('download');
  await page.locator('#export-btn').click();
  const oneFile=fs.readFileSync(await (await filteredDownload).path()).toString('utf8');
  assert.equal((oneFile.match(/<row r="/g)||[]).length,2);
  await page.locator('#reset').click();

  // A failed refresh must not keep old rows under a green success indicator.
  poRouteText='';
  await page.locator('#reload-btn').click();
  await page.waitForFunction(()=>document.getElementById('stat-total').textContent==='0');
  assert.equal(await page.locator('#status-dot').getAttribute('class'),'status-dot error');
  assert.match(await page.locator('#po-source-note').textContent(),/Không tải được PO/);
  assert.doesNotMatch(await page.locator('#load-state').innerText(),/Đã cập nhật/);
  poRouteText=js('duLieuPO',bigPO,'thoiGianCapNhatPO');
  await page.locator('#reload-btn').click();
  await page.waitForFunction(()=>document.getElementById('stat-total').textContent==='121');
  assert.equal(await page.locator('#status-dot').getAttribute('class'),'status-dot ready');

  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.locator('.quick-tab').count(),4);
  assert.equal(await page.locator('#dataset-summary').isVisible(),true);
  assert.deepEqual(errors,[]);
  console.log('PASS PO_GR browser: load sibling JS, Excel dates, PO+item+material reconciliation, movement reversals, filters, detail and XLSX.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});

