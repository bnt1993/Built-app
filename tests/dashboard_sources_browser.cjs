const {chromium}=require('playwright'),assert=require('assert');
const fs=require('fs'),path=require('path');
(async()=>{
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1440,height:1000},timezoneId:'Asia/Ho_Chi_Minh'});
    await page.clock.install({time:new Date('2026-11-09T03:00:00Z')});
    const errors=[];page.on('pageerror',err=>errors.push(err.message));
    const stock=[
      ['SAP','Description','Part No','Stock','Price','Unit','Reorder Point'],
      ['A','Motor','P-A',5,100,'PC',10],
      ['B','Valve','P-B',0,250,'PC',5]
    ];
    const movements=[
      ['Storage Location','Posting Date','Movement Type','Material',
        'Qty in unit of entry','Unit of Entry','Amt.In'],
      ['Hall 1','02/10/2026','OUTPUT','A',-1,'PC',-200],
      ['Hall 1','08/11/2026','INPUT','A',2,'PC',500],
      ['Hall 1','09/11/2026','OUTPUT','A',-2,'PC',-450],
      ['Hall 2','09/11/2026','OUTPUT','B',-1,'PC',-300]
    ];
    let loads=0;
    await page.route('http://checking-perf.test/**',r=>{
      const request=r.request(),url=new URL(request.url());
      let body='',type='text/javascript';
      if(request.method()==='HEAD')return r.fulfill({status:200,
        headers:{etag:'"fixture-v1"','last-modified':'Mon, 09 Nov 2026 03:00:00 GMT'}});
      if(url.pathname==='/'){
        body=fs.readFileSync(path.join(__dirname,'../Checking'),'utf8');
        type='text/html';
      }else if(url.pathname==='/data.js'){
        loads++;
        body='window.duLieuCongTy='+JSON.stringify(stock)+';window.thoiGianCapNhat="2026-11-09";';
      }else if(url.pathname==='/History.js'){
        body='window.materialHistory='+JSON.stringify(movements)+';';
      }else if(url.pathname==='/Amount.js'){
        body='window.amountData='+JSON.stringify([
          ['08/11/2026',1000,'1.000 VND'],['09/11/2026',1100,'1.100 VND']
        ])+';';
      }else if(url.pathname==='/HistoryWorker.js'){
        body=fs.readFileSync(path.join(__dirname,'../HistoryWorker.js'),'utf8');
      }else if(url.pathname==='/Material/manifest.js'){
        body='window.MaterialImageManifest={version:2,complete:true,materials:{}};';
      }
      return r.fulfill({status:200,body,contentType:type});
    });
    await page.goto('http://checking-perf.test/');
    await page.locator('#tab-dashboard').click();
    await page.waitForFunction(()=>historyLoaded&&analyticsReady);
    await page.locator('#dashboard-range-mode').selectOption('month');
    await page.locator('#dashboard-usage-period').selectOption('month');
    assert.match(await page.locator('#metric-value-change').innerText(),/10/);
    assert.match(await page.locator('#dashboard-alert-list').innerText(),/dưới|đặt hàng/i);
    assert.match(await page.locator('#dashboard-source-stock').innerText(),/data.js/);
    await page.locator('#dashboard-hall').selectOption('hall1');
    const target=page.locator('#insight-usage .trend-column[data-period-key="2026-11"]');
    await target.click();
    assert.equal(await page.locator('#dashboard-period-dialog').evaluate(node=>node.open),true);
    assert.match(await page.locator('#dashboard-period-summary').innerText(),/2026-11-01/);
    assert.equal(await page.locator('#dashboard-period-rows tr').count(),2);
    await page.locator('#dashboard-period-dialog button').first().click();
    assert.match(await page.locator('#metric-value-change').innerText(),/10/);
    await page.locator('#dashboard-hall').selectOption('hall2');
    assert.equal(await page.locator('#metric-inventory-value').innerText(),'—');
    assert.match(await page.locator('#metric-value-change').innerText(),/Hall 2/);
    // Explicit preflight twice: unchanged ETag avoids downloading/reprocessing Stock.
    await page.evaluate(async()=>{await kiemTraPhienBanStock();await kiemTraPhienBanStock()});
    assert(loads>=1);
    assert.deepEqual(errors,[]);
    console.log('PASS browser: Amount delta, reorder alert, source status, chart drilldown, Hall scope.');
  }finally{await browser.close()}
})().catch(err=>{console.error(err);process.exit(1)});
