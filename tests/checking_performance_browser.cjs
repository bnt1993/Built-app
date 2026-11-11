const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'Checking'),'utf8');
const stock=[['SAP','Description','Part No','Stock','Price','Unit','Reorder Point'],
  ...Array.from({length:10000},(_,i)=>[String(500000000+i),'Motor '+i,'MPN-'+i,i===1?'0,125':10,'81,078','PC',1])];
const history=[['Storage Location','Posting Date','Movement Type','Material','Qty in unit of entry','Unit of Entry','Amt.In'],
  ['Hall 1','46024','OUTPUT','500000001','0,125','PC','81,078']];
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
const catHeaders=['Material','Material Description','Name 1','MPN','Size/dimensions','Typ','Reorder Point','Min. Lot Sze','BUn','Stor. Bin'];
const catSource=description=>'const DATABASE_HEADERS='+JSON.stringify(catHeaders)+';const DATABASE_DATA='+
  JSON.stringify([['500000001',description,'Supplier','P1','10mm','F','1','1','PC','B1']])+';';
(async()=>{
  const browser=await chromium.launch({headless:true});let folder;
  try{
    const page=await browser.newPage({viewport:{width:1440,height:950}}),errors=[];
    let version=1,imageVersion=1,broken=false;
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('http://checking-integrity.test/**',route=>{
      const request=route.request(),url=new URL(request.url()),name=url.pathname;
      if(request.method()==='HEAD')return route.fulfill({status:200,headers:{etag:'"v'+version+'"'}});
      if(name==='/')return route.fulfill({contentType:'text/html',body:html});
      if(name==='/data.js'){
        const data=stock.map(row=>row.slice());if(version===2)data[1][3]=77;
        return route.fulfill({contentType:'text/javascript',body:broken?'/* missing assignments */':
          'window.duLieuCongTy='+JSON.stringify(data)+';window.thoiGianCapNhat="same timestamp";'});
      }
      if(name==='/History.js')return route.fulfill({contentType:'text/javascript',body:'window.materialHistory='+JSON.stringify(history)+';'});
      if(name==='/HistoryWorker.js')return route.fulfill({contentType:'text/javascript',body:fs.readFileSync(path.join(root,'HistoryWorker.js'),'utf8')});
      if(name==='/Amount.js')return route.fulfill({contentType:'text/javascript',body:'window.amountData=[];'});
      if(name==='/Database.js')return route.fulfill({contentType:'text/javascript',body:catSource('Catalog motor')});
      if(name==='/Material/manifest.json')return route.fulfill({contentType:'application/json',body:JSON.stringify({
        version:2,complete:true,materials:{'500000001':[{original:'500000001.jpg',
          preview:'_optimized/'+imageVersion+'-preview.webp',previewSmall:'_optimized/'+imageVersion+'-small.webp',
          thumb:'_optimized/'+imageVersion+'-thumb.webp'}]}})});
      if(name.startsWith('/Material/_optimized/')||name==='/Material/500000001.jpg')
        return route.fulfill({contentType:'image/png',body:png});
      return route.fulfill({status:404,body:''});
    });
    await page.goto('http://checking-integrity.test/');
    await page.waitForFunction(()=>chiMucSanSang&&!dangTaiScript);
    assert.equal(await page.evaluate(()=>duLieuTimKiem[1].soLuong),.125);
    assert.equal(await page.evaluate(()=>duLieuTimKiem[1].giaTriDong),.125*81.078);
    const codes=stock.slice(1,101).map(row=>row[0]);
    await page.locator('#o-tim-kiem').fill([...codes,'999999999'].join(','));
    await page.waitForFunction(()=>!dangLocDuLieu&&ketQuaLoc.length===100);
    assert.match(await page.locator('#batch-sap-summary').innerText(),/100\/101/);
    assert.equal(await page.locator('#batch-sap-summary').getAttribute('title'),'999999999');
    await page.locator('#lang-en').click();
    assert.match(await page.locator('#batch-sap-summary').innerText(),/Present in source/);
    await page.locator('#lang-vi').click();
    await page.locator('#o-tim-kiem').fill('500000001');
    await page.waitForFunction(()=>!dangLocDuLieu&&ketQuaLoc.length===1);
    await page.locator('#than-bang tr[data-row-index]').click();
    await page.waitForFunction(()=>historyLoaded);
    assert.equal(await page.evaluate(()=>historyAll[0].date),'2026-01-02');
    assert.match(await page.locator('#anh-chinh').getAttribute('srcset'),/1-small.webp 480w/);
    imageVersion=2;await page.evaluate(()=>lamMoiAnh());
    assert.match(await page.locator('#anh-chinh').getAttribute('src'),/2-preview.webp/);
    assert.match(await page.locator('#anh-chinh').getAttribute('srcset'),/2-small.webp/);

    await page.evaluate(()=>kiemTraPhienBanStock());
    await page.waitForFunction(()=>phienBanNguon.stock==='etag:"v1"'&&!dangTaiScript);
    version=2;await page.evaluate(()=>kiemTraPhienBanStock());
    await page.waitForFunction(()=>phienBanNguon.stock==='etag:"v2"'&&!dangTaiScript);
    assert.equal(await page.evaluate(()=>tatCaDuLieu[1][3]),77,'new ETag must override equal timestamps');
    broken=true;await page.evaluate(()=>taiDuLieu(true));
    assert.equal(await page.evaluate(()=>trangThaiNguon.stock.status),'stale');
    assert.equal(await page.evaluate(()=>tatCaDuLieu[1][3]),77);
    broken=false;await page.evaluate(()=>taiDuLieu(true));
    assert.equal(await page.evaluate(()=>trangThaiNguon.stock.status),'ready');
    await page.locator('#tab-catalog').click();
    await page.waitForFunction(()=>danhMucTrangThai.loaded);
    await page.locator('.catalog-sap-link').click();
    await page.waitForFunction(()=>tabHienTai==='stock'&&!dangLocDuLieu);
    assert.match(await page.locator('#nhan-sap').innerText(),/500000001/);
    assert.equal(await page.locator('#o-tim-kiem').inputValue(),'500000001');
    assert.deepEqual(errors,[]);

    // Read generated const arrays in a fresh realm on every offline reload.
    folder=fs.mkdtempSync(path.join(os.tmpdir(),'checking-offline-'));
    fs.writeFileSync(path.join(folder,'Checking.html'),html);
    fs.writeFileSync(path.join(folder,'data.js'),'window.duLieuCongTy='+JSON.stringify(stock.slice(0,4))+';window.thoiGianCapNhat="offline";');
    fs.writeFileSync(path.join(folder,'Amount.js'),'window.amountData=[];');
    fs.writeFileSync(path.join(folder,'Database.js'),catSource('First version'));
    fs.mkdirSync(path.join(folder,'Material'));
    fs.writeFileSync(path.join(folder,'Material','manifest.js'),'window.MaterialImageManifest={version:2,complete:true,materials:{}};');
    const offline=await browser.newPage(),offlineErrors=[];
    offline.on('pageerror',error=>offlineErrors.push(error.message));
    await offline.goto(require('node:url').pathToFileURL(path.join(folder,'Checking.html')).href);
    await offline.locator('#tab-catalog').click();
    await offline.waitForFunction(()=>danhMucTrangThai.loaded);
    assert.equal(await offline.locator('#catalog-rows tr td').nth(1).innerText(),'First version');
    fs.writeFileSync(path.join(folder,'Database.js'),catSource('Second version'));
    await offline.locator('#catalog-reload').click();
    await offline.waitForFunction(()=>danhMucTrangThai.rows[0]?.description==='Second version');
    assert.equal(await offline.evaluate(()=>typeof DATABASE_HEADERS),'undefined','catalog const globals stay isolated');
    assert.equal(await offline.evaluate(()=>window.duLieuCongTy[1][0]),'500000000');
    assert.deepEqual(offlineErrors,[]);
    console.log('PASS browser: indexed SAP batch, missing codes, decimals, Worker, unchanged timestamp/new ETag, stale protection, responsive image refresh, catalog links and repeated file:// const reload.');
  }finally{await browser.close();if(folder)fs.rmSync(folder,{recursive:true,force:true})}
})().catch(error=>{console.error(error);process.exitCode=1});
