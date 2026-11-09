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
    const stock=[['SAP','Description','Stock','Price','Unit','Reorder Point'],
      ['A','Motor',10,100,'PC',5],['A','Motor duplicate',5,100,'PC',5],
      ['B','Valve',20,200,'PC',25],['C','Seal',0,300,'PC',3],
      ['D','Sensor',2,400,'PC',2],['E','Switch',8,50,'PC',4],
      ['F','Old motor',4,500,'PC',3],['G','Older valve',3,600,'PC',5]];
    const history=[['Storage Location','Posting Date','Movement Type','Material',
      'Qty in unit of entry','Unit of Entry','Amt.in loc.cur.'],
      ['Hall 1','02/10/2026','OUTPUT','A',-10,'PC',-1000],
      ['Hall 1','03/10/2026','OUTPUT','A',-2,'PC',-200],
      ['Hall 1','04/10/2026','OUTPUT','B',-4,'PC',-800],
      ['Hall 1','05/10/2026','OUTPUT','E',-1,'PC',-50],
      ['Hall 1','08/11/2026','OUTPUT','D',-1,'PC',-400],
      ['Hall 1','01/01/2025','OUTPUT','F',-1,'PC',-500],
      ['Hall 1','01/01/2024','OUTPUT','G',-1,'PC',-600],
      ['Hall 2','06/10/2026','OUTPUT','A',-90,'PC',-9000],
      ['Hall 2','08/11/2026','OUTPUT','F',-9,'PC',-4500]];
    await page.route('http://report-summary.test/**',r=>{
      const u=new URL(r.request().url());let body='',contentType='text/javascript';
      if(u.pathname==='/'){
        body=fs.readFileSync(path.join(__dirname,'../Checking'),'utf8');contentType='text/html';
      }else if(u.pathname==='/data.js')body='window.duLieuCongTy='+JSON.stringify(stock)+';window.thoiGianCapNhat="test";';
      else if(u.pathname==='/History.js')body='window.materialHistory='+JSON.stringify(history)+';'
       else if(u.pathname==='/Amount.js')body='window.amountData='+JSON.stringify([['01/10/2026',1000,'1.000 VND'],['31/10/2026',2000,'2.000 VND'],['05/11/2026',3000,'3.000 VND']])+';';
      else if(u.pathname==='/Material/manifest.js')body='window.MaterialImageManifest={version:2,complete:true,materials:{}};';
      return r.fulfill({contentType,body});
    });
    await page.goto('http://report-summary.test/');await page.locator('#tab-dashboard').click();
    await page.waitForFunction(()=>historyLoaded&&analyticsReady);
    await page.locator('#dashboard-range-mode').selectOption('selected-month');
    await page.locator('#dashboard-range-month').fill('2026-10');
    await page.locator('#dashboard-range-month').dispatchEvent('change');
    const out=page.locator('#dashboard-out-matches'),dormant=page.locator('#dashboard-dormant-matches');
    assert.equal(await out.innerText(),'Tìm thấy 3 mã vật tư');
    assert.equal(await dormant.innerText(),'Tìm thấy 2 mã vật tư');
    const topAll=await page.locator('#insight-top').innerText();
    const distAll=await page.locator('#insight-stock-distribution').innerText();
    await page.locator('#dashboard-hall').selectOption('hall1');
    assert.equal(await page.locator('#insight-top').innerText(),topAll);
    assert.equal(await page.locator('#insight-stock-distribution').innerText(),distAll);
    assert.equal(await out.innerText(),'Tìm thấy 3 mã vật tư');
    assert.equal(await dormant.innerText(),'Tìm thấy 2 mã vật tư');
    // Counts refer to distinct SAPs over the entire filtered report, across pages.
    await page.locator('#dashboard-out-custom').fill('1');
    await page.locator('#dashboard-out-custom').dispatchEvent('change');
    await page.locator('#dashboard-out-next').click();
    assert.equal(await page.locator('#dashboard-top-out tbody tr').count(),1);
    assert.equal(await out.innerText(),'Tìm thấy 3 mã vật tư');
    await page.locator('#dashboard-dormant-custom').fill('1');
    await page.locator('#dashboard-dormant-custom').dispatchEvent('change');
    await page.locator('#dashboard-dormant-next').click();
    assert.equal(await dormant.innerText(),'Tìm thấy 2 mã vật tư');
    await page.locator('#dashboard-top-out th button').first().click();
    assert.equal(await out.innerText(),'Tìm thấy 3 mã vật tư');
    await page.locator('#dashboard-out-min').fill('900');
    assert.equal(await out.innerText(),'Tìm thấy 1 mã vật tư');
    await page.locator('#dashboard-dormant-days').selectOption('730');
    assert.equal(await dormant.innerText(),'Tìm thấy 1 mã vật tư');
    await page.locator('#dashboard-dormant-days').selectOption('1095');
    assert.equal(await dormant.innerText(),'Tìm thấy 0 mã vật tư');
    // Valuations come from Amount.js, not local browser snapshots.
    assert.match(await page.locator('#metric-inventory-value').innerText(),/^3\.000/);
    assert.match(await page.locator('#metric-value-note').innerText(),/2026-11-05/);
    assert(!/Tổng \(Số lượng|10\.500/.test(await page.locator('#metric-value-note').innerText()));
    for(const mode of ['day','week','month','year']){
      await page.locator('#dashboard-value-period').selectOption(mode);
      const allValues=await page.locator('#insight-value-trend').innerText();
      assert(!allValues.includes('3k'));
      assert.match(allValues,/2k/);
      await page.locator('#dashboard-hall').selectOption('all');
      assert.equal(await page.locator('#insight-value-trend').innerText(),allValues);
      await page.locator('#dashboard-hall').selectOption('hall1');
      assert.equal(await page.locator('#insight-value-trend').innerText(),allValues);
    }
    const amountText=await page.evaluate(()=>JSON.stringify(window.amountData));
    // Hall 2 has outbound history but no stock report or local snapshots.
    await page.locator('#dashboard-hall').selectOption('hall2');
    assert.equal(await out.innerText(),'Tìm thấy 1 mã vật tư');
    assert.equal(await dormant.innerText(),'Số mã phù hợp: —');
    for(const id of ['insight-top','insight-stock-distribution']){
      assert.match(await page.locator('#'+id).innerText(),/Hall 2 không có thông tin tồn kho/);
      assert.equal(await page.locator('#'+id+' table,#'+id+' .stock-donut').count(),0);
    }
    assert.equal(await page.locator('#metric-inventory-value').innerText(),'—');
    assert.match(await page.locator('#insight-value-trend').innerText(),/Hall 2 không có dữ liệu giá trị kho/);
    assert.equal(await page.evaluate(()=>JSON.stringify(window.amountData)),amountText);
    await page.locator('#lang-en').click();
    assert.equal(await out.innerText(),'Matching material codes: 1');
    assert.equal(await dormant.innerText(),'Matching material codes: —');
    assert.match(await page.locator('#insight-top').innerText(),/No inventory information.*Hall 2/);
    await page.locator('#lang-vi').click();
    await page.locator('#dashboard-hall').selectOption('all');
    assert.equal(await page.locator('#insight-top').innerText(),topAll);
    assert.equal(await page.locator('#insight-stock-distribution').innerText(),distAll);
    assert.match(await page.locator('#metric-inventory-value').innerText(),/^3\.000/);
    await page.locator('#dashboard-dormant-days').selectOption('90');
    await page.locator('#dashboard-out-size').selectOption('25');
    await page.locator('#dashboard-dormant-size').selectOption('25');
    await page.screenshot({path:'/tmp/dashboard-report-summary-desktop.png',fullPage:true});
    await page.setViewportSize({width:390,height:844});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    assert((await page.locator('#dashboard-top-out').boundingBox()).height>=140);
    await page.screenshot({path:'/tmp/dashboard-report-summary-mobile.png',fullPage:true});
    // Valid empty reports show zero, unavailable/loading reports show a dash.
    await page.locator('#dashboard-range-month').fill('2023-01');
    await page.locator('#dashboard-range-month').dispatchEvent('change');
    assert.equal(await out.innerText(),'Tìm thấy 0 mã vật tư');
    await page.evaluate(()=>{historyLoaded=false;historyLoading=true;veTopVatTuXuatKho();veVatTuTonLau();});
    assert.equal(await out.innerText(),'Số mã phù hợp: —');
    assert.equal(await dormant.innerText(),'Số mã phù hợp: —');
    await page.evaluate(()=>{window.amountData=[];veBieuDoGiaTriKho();});
    assert.equal(await page.locator('#metric-inventory-value').innerText(),'—');
    assert.match(await page.locator('#metric-value-note').innerText(),/Amount.js/);
    await page.evaluate(()=>{
      window.amountData=[['09/11/2026',0,'0 VND']];
      veBieuDoGiaTriKho();
    });
    assert.match(await page.locator('#metric-inventory-value').innerText(),/^0/);
    assert.deepEqual(errors,[]);
    console.log('PASS matching SAP counts across filters/pages/sorts, shared All/Hall 1 stock reports, Hall 2 unavailable, Amount.js value/charts, gaps, empty/zero values, VI/EN and mobile.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
