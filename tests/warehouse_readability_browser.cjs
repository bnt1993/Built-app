const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert');
(async()=>{
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1440,height:1000},timezoneId:'Asia/Ho_Chi_Minh'});
    await page.clock.install({time:new Date('2026-11-17T03:00:00Z')});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    const stock=[['SAP','Description','Stock','Price','Unit','Reorder Point'],
      ['A','Motor',10,100,'PC',5],['B','Valve',0,50,'PC',5],
      ['C','Unknown stock','bad',50,'PC',5],['D','Old spare',2,250,'PC',4]];
    const history=[['Storage Location','Posting Date','Movement Type','Material','Qty in unit of entry','Unit of Entry','Amt.In'],
      ['Hall 1','05/11/2026','INPUT','A',1,'PC',100],
      ['Hall 1','20/11/2026','INPUT','A',9,'PC',900],
      ['Hall 1','07/11/2026','OUTPUT','A',-2,'PC',-200],
      ['Hall 1','31/10/2026','OUTPUT','A',-1,'PC',-100],
      ['Hall 1','18/11/2026','OUTPUT','A',-90,'PC',-9000],
      ['Hall 2','08/11/2026','OUTPUT','B',-1,'PC',-300],
      ['Hall 1','01/01/2024','OUTPUT','D',-1,'PC',-250]];
    await page.route('http://warehouse-readability.test/**',route=>{
      const url=new URL(route.request().url());let body='',contentType='text/javascript';
      if(url.pathname==='/'){body=fs.readFileSync(path.join(__dirname,'../Checking.html'),'utf8');contentType='text/html';}
      else if(url.pathname==='/data.js')body='window.duLieuCongTy='+JSON.stringify(stock)+';window.thoiGianCapNhat="2026-11-17";';
      else if(url.pathname==='/History.js')body='window.materialHistory='+JSON.stringify(history)+';';
      else if(url.pathname==='/Amount.js')body='window.amountData='+JSON.stringify([['31/10/2026',800],['10/11/2026',1100]])+';';
      else if(url.pathname==='/HistoryWorker.js')body=fs.readFileSync(path.join(__dirname,'../HistoryWorker.js'),'utf8');
      else if(url.pathname==='/Material/manifest.js')body='window.MaterialImageManifest={version:2,complete:true,materials:{}};';
      return route.fulfill({contentType,body});
    });
    await page.goto('http://warehouse-readability.test/');
    await page.locator('#tab-dashboard').click();
    await page.waitForFunction(()=>historyLoaded&&analyticsReady);
    assert.equal(await page.locator('#view-dashboard .warehouse-primary-kpis .warehouse-kpi:visible').count(),4);
    assert.equal(await page.locator('#view-dashboard .warehouse-charts .dashboard-chart:visible').count(),2);
    assert.equal(await page.locator('#warehouse-additional-details').getAttribute('open'),null);
    await page.locator('#dashboard-hall').selectOption('hall1');
    const exactText=await page.locator('#dashboard-compare-in-current').getAttribute('title');
    assert.match(exactText,/100/);
    assert.match(await page.locator('#warehouse-period-inventory').getAttribute('title'),/1.100/);
    for(const mode of ['day','week','month','year']){
      await page.locator('#warehouse-group-period').selectOption(mode);
      assert.equal(await page.locator('#dashboard-value-period').inputValue(),mode);
      assert.equal(await page.locator('#dashboard-usage-period').inputValue(),mode);
      const summary=await page.locator('#dashboard-usage-summary').innerText();
      assert.match(summary,/100/);assert.match(summary,/200/);
      assert(!summary.includes('9.000'));assert(!summary.includes('900 '));
      assert.equal(await page.locator('#dashboard-compare-in-current').getAttribute('title'),exactText);
    }
    await page.locator('#warehouse-additional-details summary').first().click();
    assert.match(await page.locator('#metric-instock-rate').innerText(),/50\.0%/);
    await page.locator('#warehouse-additional-details summary').first().click();
    await page.locator('#tab-analytics').click();
    const visibleReports=()=>page.locator('#view-analytics [data-warehouse-report]:visible');
    assert.equal(await visibleReports().count(),1);
    assert.equal(await visibleReports().getAttribute('data-warehouse-report'),'value');
    assert.equal(await page.locator('#dashboard-range-mode').isVisible(),false);
    await page.locator('#analytics-report-kind').selectOption('out');
    assert.equal(await visibleReports().getAttribute('data-warehouse-report'),'out');
    assert.equal(await page.locator('#dashboard-range-mode').isVisible(),true);
    await page.locator('#dashboard-top-out button[data-history-sap="A"]').click();
    assert.equal(await page.locator('#material-history-dialog').evaluate(node=>node.open),true);
    assert.equal(await page.locator('#material-history-from').inputValue(),'2026-11-01');
    assert.equal(await page.locator('#material-history-to').inputValue(),'2026-11-17');
    assert.equal(await page.locator('#material-history-kind').inputValue(),'out');
    assert.equal(await page.evaluate(()=>materialHistoryHall),'hall1');
    await page.keyboard.press('Escape');
    await page.locator('#analytics-search').fill('missing-code');
    assert.equal(await page.evaluate(()=>taoDuLieuXuatThongKe('out').rows.length),0);
    assert.equal(await page.locator('#analytics-kpi-out-value').getAttribute('title'),'0 ₫');
    await page.locator('#analytics-search').fill('Motor');
    assert.deepEqual(await page.evaluate(()=>taoDuLieuXuatThongKe('out').rows.map(r=>r[0])),['A']);
    const download=page.waitForEvent('download');
    await page.locator('button[data-i18n="warehouseExportCurrent"]').click();
    assert.match((await download).suggestedFilename(),/\.xlsx$/);
    await page.locator('#analytics-search').fill('');
    await page.locator('#analytics-report-kind').selectOption('dormant');
    assert.equal(await visibleReports().count(),1);
    assert.notEqual(await page.locator('#analytics-kpi-dormant-value').innerText(),'—');
    await page.locator('#dashboard-hall').selectOption('hall2');
    assert.equal(await page.locator('#analytics-kpi-dormant-value').innerText(),'—');
    assert.equal(await page.locator('#analytics-kpi-slow-rate').innerText(),'—');
    assert.match(await page.locator('#dashboard-dormant').innerText(),/Hall 2/);
    await page.locator('#analytics-report-kind').selectOption('consumption');
    assert.equal(await page.locator('#analytics-cons-pager').isVisible(),false);
    await page.locator('#dashboard-hall').selectOption('hall1');
    await page.locator('#analytics-search').fill('missing-code');
    assert.equal(await page.evaluate(()=>taoDuLieuXuatThongKe('consumption').rows.length),0);
    await page.locator('#analytics-search').fill('');
    await page.locator('#lang-en').click();
    assert.equal(await page.locator('#view-analytics h1').innerText(),'Inventory analysis');
    await page.locator('#lang-vi').click();
    const viText=await page.locator('#view-analytics').innerText();
    assert(!/Consumption|Cover|Dead.stock|Pareto|Nhóm A/.test(viText));
    await page.locator('#theme-toggle').click();
    assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
    await page.locator('#theme-toggle').click();
    for(const kind of ['value','out','dormant','consumption']){
      await page.locator('#analytics-report-kind').selectOption(kind);
      assert.equal(await visibleReports().count(),1);
      assert.equal(await visibleReports().getAttribute('data-warehouse-report'),kind);
    }
    // Enter and a visible action both open the same report-aware history.
    await page.locator('#analytics-report-kind').selectOption('value');
    await page.locator('#insight-top tbody tr').first().focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('#material-history-dialog').evaluate(node=>node.open),true);
    await page.keyboard.press('Escape');
    // Invalid intervals clear monetary cards and charts.
    await page.locator('#tab-dashboard').click();
    await page.locator('#dashboard-range-mode').selectOption('custom');
    await page.locator('#dashboard-range-from').fill('2026-11-18');
    await page.locator('#dashboard-range-from').dispatchEvent('change');
    await page.locator('#dashboard-range-to').fill('2026-11-17');
    await page.locator('#dashboard-range-to').dispatchEvent('change');
    for(const id of ['warehouse-period-inventory','warehouse-period-net','dashboard-compare-in-current','dashboard-compare-out-current'])
      assert.equal(await page.locator('#'+id).innerText(),'—',id+' invalid interval');
    assert.equal(await page.locator('#insight-value-trend svg').count(),0);
    assert.equal(await page.locator('#insight-usage svg').count(),0);
    await page.locator('#dashboard-range-mode').selectOption('month');
    await page.locator('#warehouse-group-period').selectOption('week');
    for(const tab of ['dashboard','analytics']){
      await page.locator('#tab-'+tab).click();
      for(const width of [390,768,1440]){
        await page.setViewportSize({width,height:900});
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,tab+' overflow at '+width);
      }
    }
    await page.screenshot({path:'/tmp/warehouse-readability-desktop.png',fullPage:true});
    await page.setViewportSize({width:390,height:844});
    await page.screenshot({path:'/tmp/warehouse-readability-mobile.png',fullPage:true});
    await page.reload();
    await page.locator('#tab-analytics').click();
    await page.waitForFunction(()=>historyLoaded&&analyticsReady);
    assert.equal(await page.locator('#analytics-report-kind').inputValue(),'value');
    assert.deepEqual(errors,[]);
    console.log('PASS browser: four KPI/two chart overview, one full-width report, shared interval/grouping, boundary totals, Hall 2 resets, filtered Excel, history actions/keyboard, VI/EN, theme, persistence and responsive layout.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
