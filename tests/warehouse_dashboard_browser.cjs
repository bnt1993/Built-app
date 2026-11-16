const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert');
(async()=>{
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1600,height:1180},timezoneId:'Asia/Ho_Chi_Minh'});
    await page.clock.install({time:new Date('2026-11-16T03:00:00Z')});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    const stock=[['SAP','Description','Stock','Price','Unit','Reorder Point'],
      ...Array.from({length:60},(_,i)=>['SAP'+i,'Vật tư '+i,i+1,10000*(i+1),'PC',10])];
    const history=[['Storage Location','Posting Date','Movement Type','Material','Qty in unit of entry','Unit of Entry','Amt.In']];
    const amounts=[];
    for(let month=1;month<=10;month++){
      const mm=String(month).padStart(2,'0');
      history.push(['Hall 1','15/'+mm+'/2026','INPUT','SAP0',10,'PC',month*1000000],
        ['Hall 1','20/'+mm+'/2026','OUTPUT','SAP1',-5,'PC',-month*600000]);
      if(month!==2)amounts.push(['25/'+mm+'/2026',100000000+month*1000000]);
    }
    history.push(['Hall 1','16/11/2026','INPUT','SAP0',2,'PC',400000],
      ['Hall 1','16/11/2026','OUTPUT','SAP1',-1,'PC',-100000],
      ['Hall 2','16/11/2026','OUTPUT','SAP2',-3,'PC',-300000]);
    amounts.push(['09/11/2026',112000000]);
    await page.route('http://warehouse-split.test/**',route=>{
      const u=new URL(route.request().url());let body='',contentType='text/javascript';
      if(u.pathname==='/'){body=fs.readFileSync(path.join(__dirname,'../Checking'),'utf8');contentType='text/html';}
      else if(u.pathname==='/data.js')body='window.duLieuCongTy='+JSON.stringify(stock)+';window.thoiGianCapNhat="test";';
      else if(u.pathname==='/History.js')body='window.materialHistory='+JSON.stringify(history)+';';
      else if(u.pathname==='/Amount.js')body='window.amountData='+JSON.stringify(amounts)+';';
      else if(u.pathname==='/HistoryWorker.js')body=fs.readFileSync(path.join(__dirname,'../HistoryWorker.js'),'utf8');
      else if(u.pathname==='/Material/manifest.js')body='window.MaterialImageManifest={version:2,complete:true,materials:{}};';
      return route.fulfill({contentType,body});
    });
    await page.goto('http://warehouse-split.test/');
    await page.locator('#tab-stock').focus();await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('#tab-analytics').getAttribute('aria-selected'),'true');
    await page.waitForFunction(()=>historyLoaded&&analyticsReady);
    assert.equal(await page.locator('#view-analytics .dashboard-time-chart,#view-analytics .metric-grid').count(),0);
    assert.equal(await page.locator('#view-analytics .analytics-tables > .dashboard-chart').count(),3);
    assert.equal(await page.locator('#view-analytics #warehouse-filters').count(),1);
    await page.locator('#dashboard-limit').selectOption('20');
    assert.equal(await page.locator('#insight-top tbody tr').count(),20);
    await page.locator('#dashboard-range-mode').selectOption('year');
    await page.locator('#dashboard-hall').selectOption('hall1');
    await page.locator('#tab-dashboard').click();
    assert.equal(await page.locator('#view-dashboard #warehouse-filters').count(),1);
    assert.equal(await page.locator('#warehouse-filters').count(),1);
    assert.equal(await page.locator('#dashboard-hall').inputValue(),'hall1');
    assert.equal(await page.locator('#view-dashboard .warehouse-charts > .dashboard-time-chart').count(),4);
    assert.equal(await page.locator('#view-dashboard table').count(),0);
    assert.equal(await page.locator('.warehouse-kpi').count(),8);
    assert.equal((await page.locator('#warehouse-period-inventory').getAttribute('title')).replace(/\s/g,' '),'112.000.000 ₫');
    assert.equal(await page.locator('#warehouse-week-inventory').innerText(),'—','no snapshot in the final calendar week');
    assert.match(await page.locator('#warehouse-week-net').innerText(),/300k/);
    assert.match(await page.locator('#warehouse-week-label').innerText(),/2026-11-16/);
    const inTotal=await page.locator('#dashboard-compare-in-current').innerText();
    const outTotal=await page.locator('#dashboard-compare-out-current').innerText();
    for(const mode of ['week','month','year']){
      for(const id of ['dashboard-usage-period','dashboard-usage-detail-period']){
        await page.locator('#'+id).selectOption(mode);
        const target=id==='dashboard-usage-period'?'#insight-usage':'#insight-usage-detail';
        assert((await page.locator(target+' .movement-in').count())>0);
      }
      await page.locator('#dashboard-value-period').selectOption(mode);
      await page.locator('#dashboard-value-detail-period').selectOption(mode);
      assert((await page.locator('#insight-value-detail circle').count())>0);
      assert.equal(await page.locator('#dashboard-compare-in-current').innerText(),inTotal);
      assert.equal(await page.locator('#dashboard-compare-out-current').innerText(),outTotal);
    }
    // Monthly missing valuations form separate paths rather than a fabricated February value.
    await page.locator('#dashboard-value-detail-period').selectOption('month');
    assert.equal(await page.locator('#insight-value-detail polyline').count(),2);
    await page.locator('#dashboard-usage-detail-period').selectOption('week');
    await page.locator('#insight-usage-detail .trend-column').last().click();
    assert.equal(await page.locator('#dashboard-period-dialog').evaluate(el=>el.open),true);
    assert.equal(await page.locator('#dashboard-period-rows tr').count(),2);
    await page.keyboard.press('Escape');
    await page.locator('#dashboard-value-period').selectOption('month');
    await page.locator('#dashboard-value-detail-period').selectOption('week');
    await page.locator('#dashboard-usage-period').selectOption('month');
    await page.locator('#dashboard-hall').selectOption('hall2');
    assert.equal(await page.locator('#warehouse-period-inventory').innerText(),'—');
    assert.equal(await page.locator('#warehouse-week-inventory').innerText(),'—');
    assert.match(await page.locator('#insight-value-detail').innerText(),/Hall 2/);
    assert.match(await page.locator('#dashboard-compare-out-current').innerText(),/300.000/);
    await page.locator('#dashboard-hall').selectOption('hall1');
    await page.locator('#lang-en').click();
    assert.equal(await page.locator('#view-dashboard h1').innerText(),'Warehouse dashboard');
    await page.locator('#lang-vi').click();
    await page.screenshot({path:'/tmp/warehouse-dashboard-desktop.png',fullPage:true});
    // Selecting an invalid interval clears all financial values, including comparisons.
    await page.locator('#dashboard-range-mode').selectOption('custom');
    await page.locator('#dashboard-range-from').fill('2026-11-17');
    await page.locator('#dashboard-range-from').dispatchEvent('change');
    for(const id of ['warehouse-period-inventory','warehouse-period-net','warehouse-week-in',
      'dashboard-compare-in-current','dashboard-compare-out-current'])assert.equal(await page.locator('#'+id).innerText(),'—');
    await page.locator('#dashboard-range-mode').selectOption('year');
    await page.locator('#tab-analytics').click();
    assert.equal(await page.locator('#dashboard-limit').inputValue(),'20');
    const download=page.waitForEvent('download');
    await page.locator('#dashboard-export-kind').selectOption('value');
    await page.locator('#dashboard-export-button').click();
    assert.match((await download).suggestedFilename(),/\.xlsx$/);
    await page.screenshot({path:'/tmp/warehouse-analytics-desktop.png',fullPage:true});
    for(const tab of ['dashboard','analytics']){
      await page.locator('#tab-'+tab).click();
      await page.setViewportSize({width:390,height:844});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,tab+' mobile page overflow');
      await page.screenshot({path:'/tmp/warehouse-'+tab+'-mobile.png',fullPage:true});
    }
    await page.reload();
    assert.equal(await page.locator('#tab-analytics').getAttribute('aria-selected'),'true');
    assert.deepEqual(errors,[]);
    console.log('PASS separate tables and four charts, shared filters, eight KPIs, weekly/monthly/yearly data, valuation gaps, Hall 2, drilldown, XLSX, keyboard, VI/EN, persistence and mobile.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
