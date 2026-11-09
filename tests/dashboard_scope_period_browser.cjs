const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert');
(async()=>{
  let options={headless:true};
  if(process.env.CHROMIUM_HELPER){
    const {default:h}=await import(process.env.CHROMIUM_HELPER);
    options={...options,executablePath:await h.executablePath(),args:h.args};
  }
  const browser=await chromium.launch(options);
  try{
    const page=await browser.newPage({viewport:{width:1440,height:1100},timezoneId:'Asia/Ho_Chi_Minh'});
    await page.clock.install({time:new Date('2026-11-09T03:00:00Z')});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    const stock=[['SAP','Description','Stock','Price','Unit','Storage Location','Reorder Point'],
      ['A','Motor Hall 2',900,9999,'PC','Hall 2',5],
      ['A','Motor Hall 1',10,100,'PC','Hall 1',5],
      ['B','Recent Hall 1',20,200,'PC','Hall 1',5],
      ['C','Hall 2 only',30,300,'PC','Hall 2',5]];
    const history=[['Storage Location','Posting Date','Movement Type','Material',
      'Qty in unit of entry','Unit of Entry','Amt.in loc.cur.'],
      ['Hall 1','01/01/2025','OUTPUT','A',-1,'PC',-100],
      ['Hall 2','08/11/2026','OUTPUT','A',-9,'PC',-9000],
      ['Hall 1','08/11/2026','OUTPUT','B',-2,'PC',-400],
      ['Hall 1','15/10/2026','INPUT','A',10,'PC',1000],
      ['Hall 1','31/10/2026','OUTPUT','B',-3,'PC',-600],
      // These share boundary weeks with October and must stay outside its chart.
      ['Hall 1','30/09/2026','OUTPUT','B',-30,'PC',-6000],
      ['Hall 1','01/11/2026','OUTPUT','B',-40,'PC',-8000],
      ['Hall 1','15/02/2024','OUTPUT','B',-1,'PC',-200]];
    await page.route('http://scope-period.test/**',r=>{
      const u=new URL(r.request().url());let body='',contentType='text/javascript';
      if(u.pathname==='/'){
        body=fs.readFileSync(path.join(__dirname,'../Checking'),'utf8');contentType='text/html';
      }else if(u.pathname==='/data.js')body='window.duLieuCongTy='+JSON.stringify(stock)+';window.thoiGianCapNhat="test";';
      else if(u.pathname==='/History.js')body='window.materialHistory='+JSON.stringify(history)+';';
      else if(u.pathname==='/Material/manifest.js')body='window.MaterialImageManifest={version:2,complete:true,materials:{}};';
      return r.fulfill({contentType,body});
    });
    await page.goto('http://scope-period.test/');
    await page.locator('#tab-dashboard').click();await page.waitForFunction(()=>historyLoaded&&analyticsReady);
    const dormant=page.locator('#dashboard-dormant');
    assert.equal(await dormant.locator('tbody tr').count(),1);
    assert.match(await dormant.innerText(),/Motor Hall 1/);
    assert(!/Motor Hall 2|900|9\.999/.test(await dormant.innerText()));
    await dormant.locator('tbody tr').dblclick();
    assert.equal(await page.evaluate(()=>materialHistoryHall),'hall1');
    assert.equal(await page.locator('#material-history-stock').innerText(),'10 PC');
    assert.equal(await page.locator('#material-history-out-count').innerText(),'1 PC');
    await page.keyboard.press('Escape');
    await dormant.locator('tbody tr').focus();await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(()=>materialHistoryHall),'hall1');
    await page.keyboard.press('Escape');
    await page.locator('#dashboard-hall').selectOption('hall2');
    assert.match(await dormant.innerText(),/Hall 2 không có thông tin/);
    assert.equal(await dormant.locator('table').count(),0);
    assert.equal(await page.locator('#dashboard-dormant-pager').isVisible(),false);
    assert.equal(await page.locator('#dashboard-dormant-days').isDisabled(),true);
    // Other Hall 2 reports keep their own data and scope.
    assert.equal(await page.locator('#dashboard-top-out tbody tr').count(),1);
    await page.locator('#dashboard-top-out tbody tr').dblclick();
    assert.equal(await page.evaluate(()=>materialHistoryHall),'hall2');
    await page.keyboard.press('Escape');
    await page.locator('#lang-en').click();
    assert.match(await dormant.innerText(),/No slow-moving material information.*Hall 2/);
    await page.locator('#lang-vi').click();
    await page.locator('#dashboard-hall').selectOption('hall1');
    assert.equal(await dormant.locator('tbody tr').count(),1);
    assert.equal(await page.locator('#dashboard-dormant-days').isDisabled(),false);
    assert.equal(await page.locator('#dashboard-dormant-pager').isVisible(),true);
    await page.locator('#dashboard-hall').selectOption('all');
    await page.locator('#dashboard-range-mode').selectOption('selected-month');
    assert.equal(await page.locator('#dashboard-range-month-field').isVisible(),true);
    await page.locator('#dashboard-range-month').fill('2026-10');
    await page.locator('#dashboard-range-month').dispatchEvent('change');
    assert.equal(await page.locator('#dashboard-range-summary').innerText(),'2026-10-01 – 2026-10-31');
    assert.match(await page.locator('#dashboard-compare-in-current').innerText(),/1\.000/);
    assert.match(await page.locator('#dashboard-compare-out-current').innerText(),/600/);
    assert.match(await page.locator('#dashboard-compare-periods').innerText(),/2026-09-01 – 2026-09-30/);
    assert.equal(await page.locator('#dashboard-top-out tbody tr').count(),1);
    for(const mode of ['week','month','year']){
      await page.locator('#dashboard-usage-period').selectOption(mode);
      const figures=await page.evaluate(()=>{
        const range=layKyPhanTichKho();
        return tinhGiaTriNhapXuat(locGiaoDichKho(range),historyColumns,
          document.getElementById('dashboard-usage-period').value,
          nhomKyTrongKhoangKho(document.getElementById('dashboard-usage-period').value,range));
      });
      assert.equal(figures.incoming,1000);assert.equal(figures.outgoing,600);
      const summary=await page.locator('#dashboard-usage-summary').innerText();
      assert.match(summary,/1\.000/);assert.match(summary,/600/);assert(!summary.includes('6.000'));
    }
    // Snapshots outside the selected month cannot fill a boundary-week bucket.
    await page.evaluate(()=>{
      ghiTuyChon('checking-stock-snapshots',JSON.stringify([
        {date:'2026-10-31',value:100,hasPrice:true},
        {date:'2026-11-01',value:9000,hasPrice:true}
      ]));
    });
    await page.locator('#dashboard-value-period').selectOption('week');
    assert(!/9k|9\.000/.test(await page.locator('#insight-value-trend').innerText()));
    assert.match(await page.locator('#insight-value-trend').innerText(),/100/);
    await page.locator('#dashboard-range-month').fill('2024-02');
    await page.locator('#dashboard-range-month').dispatchEvent('change');
    assert.equal(await page.locator('#dashboard-range-summary').innerText(),'2024-02-01 – 2024-02-29');
    await page.locator('#lang-en').click();
    assert.equal(await page.locator('[data-i18n="dashboardTimeSelectMonth"]').innerText(),'By month');
    await page.setViewportSize({width:390,height:844});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.locator('#lang-vi').click();
    await page.screenshot({path:'/tmp/dashboard-scope-period-mobile.png',fullPage:true});
    await page.setViewportSize({width:1440,height:1100});
    await page.screenshot({path:'/tmp/dashboard-scope-period-desktop.png',fullPage:true});
    await page.locator('#dashboard-range-mode').selectOption('year');
    assert.equal(await page.locator('#dashboard-range-month-field').isVisible(),false);
    assert.equal(await page.locator('#dashboard-range-year-field').isVisible(),true);
    // Hall 2 remains unavailable while the history feed is loading as well.
    await page.evaluate(()=>{historyLoaded=false;historyLoading=true;});
    await page.locator('#dashboard-hall').selectOption('hall2');
    assert.match(await dormant.innerText(),/Hall 2 không có thông tin/);
    assert.deepEqual(errors,[]);
    console.log('PASS browser: Hall 1 dormant report/popup/keyboard scope, Hall 2 unavailable state, calendar-month selection, exact chart boundaries, VI/EN and mobile layout.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
