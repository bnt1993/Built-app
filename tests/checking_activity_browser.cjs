const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../Checking'),'utf8');
const day=Date.parse('2026-11-12T00:00:00+07:00');
const requests=Array.from({length:63},(_,i)=>({time:day+i*60000,sap:'SAP'+i,
  name:'Động cơ '+i,stock:String(i+1),qty:i+1,unit:i%2?'PC':'EA',bin:i===0?'':i%2?'A-2':'B-10'}));
const searches=Array.from({length:63},(_,i)=>({time:day+i*60000,query:'Động cơ '+i,scope:i%2?'desc':'sap'}));
const stock=[['Material','Material Description','Part No','Stock','Price','BUn','Stor. Bin','Reorder Point'],
  ...requests.map(r=>[r.sap,r.name,'P-'+r.sap,r.stock,100,r.unit,r.sap==='SAP0'?'LEGACY-2':r.bin,2])];
async function routes(page){
  await page.route('http://activity.test/**',route=>{
    const url=new URL(route.request().url());
    if(url.pathname==='/')return route.fulfill({contentType:'text/html',body:html});
    const data={
      '/data.js':'window.duLieuCongTy='+JSON.stringify(stock)+';window.thoiGianCapNhat="12/11/2026";',
      '/Amount.js':'window.amountData=[];',
      '/History.js':'window.materialHistory=[["Posting Date","Movement Type","Material","Qty in unit of entry","Unit of Entry"],["12/11/2026","OUTPUT","SAP0",1,"EA"]];',
      '/Material/manifest.js':'window.MaterialImageManifest={version:2,complete:true,materials:{}};',
      '/Database':'const DATABASE_HEADERS=["Material","Material Description"];const DATABASE_DATA=[["SAP0","Động cơ"]];'
    };
    if(url.pathname in data)return route.fulfill({contentType:'text/javascript',body:data[url.pathname]});
    return route.fulfill({status:404,body:''});
  });
}
async function geometry(page){
  return page.evaluate(()=>{
    const data={};
    for(const selector of ['.app-header','.brand','.brand-icon','.brand-wordmark','.brand-wordmark small','.header-actions','.workspace','.view-tabs','.view-tab']){
      const el=document.querySelector(selector),r=el.getBoundingClientRect(),s=getComputedStyle(el);
      data[selector]={x:r.x,y:r.y,width:selector==='.workspace'?r.width:undefined,height:selector==='.workspace'?undefined:r.height,
        padding:s.padding,fontSize:s.fontSize,gap:s.gap};
    }
    return data;
  });
}
(async()=>{
  const browser=await chromium.launch({headless:true});
  try{
    const context=await browser.newContext({viewport:{width:1440,height:900},timezoneId:'Asia/Ho_Chi_Minh',acceptDownloads:true});
    await context.addInitScript(({requests,searches})=>{
      if(localStorage.getItem('seeded'))return;
      localStorage.setItem('seeded','yes');
      localStorage.setItem('checking-material-requests-v1',JSON.stringify([null,...requests,{time:'bad'}]));
      localStorage.setItem('checking-search-history-v1',JSON.stringify([null,...searches]));
      localStorage.setItem('checking-active-tab','search-history');
    },{requests,searches});
    const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
    await routes(page);await page.goto('http://activity.test/');
    await page.waitForFunction(()=>chiMucSanSang);
    assert.equal(await page.locator('#view-search-history').isVisible(),true,'restore saved tab');
    assert.equal(await page.locator('#search-history-rows tr').count(),25);
    assert.match(await page.locator('#search-history-count').innerText(),/63 \/ 63/);
    await page.locator('#search-history-scope').selectOption('desc');
    await page.locator('#search-history-filter').fill(' dong co 1');
    assert.equal(await page.locator('#search-history-rows tr').count(),6);
    await page.locator('#search-history-from').fill('2026-11-12');
    await page.locator('#search-history-to').fill('2026-11-12');
    assert.equal(await page.locator('#search-history-rows tr').count(),6);
    await page.locator('#view-search-history button[data-i18n="requestClear"]').click();
    await page.locator('#search-history-next').click();
    assert.match(await page.locator('#search-history-page-label').innerText(),/2\/3/);
    await page.locator('#search-history-table th[data-activity-sort="query"] button').click();
    assert.match(await page.locator('#search-history-page-label').innerText(),/1\/3/);
    assert.equal(await page.locator('#search-history-rows tr td:nth-child(2)').first().innerText(),'Động cơ 0');
    await page.locator('#search-history-page-size').selectOption('100');
    assert.equal(await page.locator('#search-history-rows tr').count(),63);
    await page.locator('#search-history-rows button').first().click();
    assert.equal(await page.locator('#view-stock').isVisible(),true);
    assert.equal(await page.locator('#o-tim-kiem').inputValue(),'Động cơ 0');
    assert.equal(await page.locator('input[name="truongTim"]:checked').inputValue(),'sap');

    // Identical header, brand and navigation geometry across all five panes.
    for(const language of ['vi','en']){
      await page.locator('#lang-'+language).click();
      await page.locator('#tab-stock').click();const reference=await geometry(page);
      for(const view of ['dashboard','catalog','search-history','requests']){
        await page.locator('#tab-'+view).click();assert.deepEqual(await geometry(page),reference,view+' header '+language);
      }
    }
    await page.locator('#lang-vi').click();
    assert.equal(await page.locator('#request-rows tr').count(),25);
    await page.locator('#request-table th[data-activity-sort="qty"] button').click();
    assert.equal(await page.locator('#request-rows tr td:last-child').first().innerText(),'1');
    await page.locator('#request-table th[data-activity-sort="qty"] button').click();
    assert.equal(await page.locator('#request-rows tr td:last-child').first().innerText(),'63');
    await page.locator('#request-unit-filter').selectOption('PC');
    await page.locator('#request-bin-filter').selectOption('A-2');
    await page.locator('#request-from').fill('2026-11-12');await page.locator('#request-to').fill('2026-11-12');
    assert.match(await page.locator('#request-count').innerText(),/31 \/ 63/);
    const downloadPromise=page.waitForEvent('download');await page.locator('#request-export').click();
    const download=await downloadPromise,file=await download.path(),exportText=fs.readFileSync(file).toString('utf8');
    assert.match(exportText,/autoFilter ref="A1:G32"/,'export all 31 filtered rows, not the page');
    assert(exportText.indexOf('SAP61')<exportText.indexOf('SAP1<'),'export follows descending quantity');
    await page.locator('#request-from').fill('2026-11-13');
    assert.equal(await page.locator('#request-filter-message').isVisible(),true);
    assert.equal(await page.locator('#request-export').isEnabled(),false);
    await page.locator('#view-requests button[data-i18n="requestClear"]').click();
    await page.locator('#request-bin-filter').selectOption('LEGACY-2');
    assert.equal(await page.locator('#request-rows tr td:nth-child(5)').innerText(),'LEGACY-2');
    await page.locator('#view-requests button[data-i18n="requestClear"]').click();

    // Native wheel events move only the visible table, in either direction.
    await page.locator('#request-first').click();
    const box=await page.locator('#view-requests .activity-scroll').boundingBox();
    await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
    await page.locator('#view-requests .activity-scroll').evaluate(el=>{el.scrollTop=el.scrollHeight});
    await page.mouse.wheel(0,600);await page.waitForFunction(()=>trangThaiHoatDong.requests.page===2);
    await page.waitForTimeout(800);
    await page.locator('#view-requests .activity-scroll').evaluate(el=>{el.scrollTop=0});
    await page.mouse.wheel(0,-600);await page.waitForFunction(()=>trangThaiHoatDong.requests.page===1);
    assert.equal(await page.evaluate(()=>trangHienTai),1,'activity wheel must not page the stock table');

    // New request reads BUn and the exact storage bin.
    await page.locator('#tab-stock').click();await page.locator('button[onclick="lamMoi()\"]').click();
    await page.evaluate(()=>moYeuCauVatTu(1));
    assert.equal(await page.locator('#request-unit').innerText(),'EA');
    await page.locator('#request-qty').fill('2');await page.locator('[data-i18n="requestSubmit"]').click();
    await page.locator('#tab-requests').click();
    assert.match(await page.locator('#request-count').innerText(),/64 \/ 64/);
    await page.locator('#lang-en').click();await page.locator('#tab-search-history').click();
    assert.equal(await page.locator('#search-history-rows button').first().innerText(),'Search again');
    await page.locator('#theme-toggle').click();
    for(const size of [{width:1440,height:640},{width:1024,height:768},{width:390,height:844}]){
      await page.setViewportSize(size);
      let common;
      for(const view of ['stock','catalog','search-history','requests']){
        await page.locator('#tab-'+view).click();
        const header=await page.locator('.app-header').evaluate(el=>({height:el.getBoundingClientRect().height,padding:getComputedStyle(el).padding}));
        if(common)assert.deepEqual(header,common);else common=header;
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,view+' horizontal overflow');
      }
    }
    await page.reload();await page.waitForFunction(()=>chiMucSanSang);
    assert.equal(await page.locator('#view-requests').isVisible(),true);
    assert.deepEqual(errors,[]);
    console.log('PASS activity browser: all-tab header geometry, filters, sorting, pagination/wheel isolation, replay, BUn requests, XLSX, persisted tab, VI/EN, themes and mobile.');
  }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
