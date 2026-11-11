const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'Checking'),'utf8');
const stock=[['SAP','Description','Part No','Stock','Price','Unit','Reorder Point'],['00123','Motor','P1',5,100,'PC',1]];
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
const stockSource='window.duLieuCongTy='+JSON.stringify(stock)+';window.thoiGianCapNhat="image test";';
(async()=>{
  const browser=await chromium.launch({headless:true});let folder;
  try{
    const page=await browser.newPage(),errors=[],requests=[];
    let releaseManifest,releaseGuesses;
    const manifestGate=new Promise(resolve=>{releaseManifest=resolve});
    const guessesGate=new Promise(resolve=>{releaseGuesses=resolve});
    page.on('pageerror',e=>errors.push(e.message));
    const manifest={version:2,complete:true,materials:{'00123':[
      {original:'00123.jpg',preview:'_optimized/preview.webp',previewSmall:'_optimized/small.webp',thumb:'_optimized/thumb.webp'},
      {original:'00123_02.jpg',preview:'_optimized/second.webp',thumb:'_optimized/second-thumb.webp'}]}};
    await page.route('http://checking-images.test/**',async route=>{
      const request=route.request(),name=new URL(request.url()).pathname,method=request.method();
      requests.push({name,method});
      if(name==='/')return route.fulfill({contentType:'text/html',body:html});
      if(name==='/data.js')return route.fulfill({contentType:'text/javascript',body:stockSource,headers:{etag:'"stock"'}});
      if(name==='/Amount.js')return route.fulfill({contentType:'text/javascript',body:'window.amountData=[];'});
      if(name==='/History.js')return route.fulfill({contentType:'text/javascript',body:'window.materialHistory=[["Posting Date","Movement Type","Material"]];'});
      if(name==='/Material/manifest.json'){
        await manifestGate;
        return route.fulfill({contentType:'application/json',body:JSON.stringify(manifest)}).catch(()=>{});
      }
      if(name==='/Material/00123.jpg'||name.startsWith('/Material/_optimized/'))
        return route.fulfill({contentType:'image/png',body:png,headers:{'cache-control':'max-age=600'}});
      if(name.startsWith('/Material/')&&method==='HEAD'){
        await guessesGate;
        return route.fulfill({status:200,contentType:'image/png'}).catch(()=>{});
      }
      return route.fulfill({status:404,body:''});
    });
    await page.goto('http://checking-images.test/');
    await page.waitForFunction(()=>chiMucSanSang&&!dangTaiScript);
    await page.evaluate(()=>{window.imageLoadingDone=false;void taiBoSuuTapAnh('00123').then(()=>{window.imageLoadingDone=true})});
    // The manifest is deliberately still blocked; the old loader waits for it here.
    await page.waitForFunction(()=>{
      const img=document.getElementById('anh-chinh');
      return img.getAttribute('src')==='Material/00123.jpg'&&img.complete&&img.naturalWidth>0;
    },null,{timeout:1800});
    assert.equal(await page.evaluate(()=>window.imageLoadingDone),false,'secondary guesses still run in the background');
    const first=requests.filter(x=>x.name.startsWith('/Material/')&&!x.name.includes('manifest')).slice(0,4);
    assert(first.some(x=>x.name==='/Material/00123.jpg'));
    assert(first.every(x=>x.method==='GET'),'first candidates skip the separate HEAD round trip');
    releaseManifest();
    await page.waitForFunction(()=>window.imageLoadingDone);
    assert.match(await page.locator('#anh-chinh').getAttribute('srcset'),/small.webp 480w/);
    assert.equal(await page.evaluate(()=>danhSachAnhDangXem.length),2);
    releaseGuesses();
    await page.waitForFunction(()=>!dangQuetAnh);
    assert.deepEqual(await page.evaluate(()=>danhSachAnhDangXem),['Material/00123.jpg','Material/00123_02.jpg']);
    const before=requests.length;
    await page.evaluate(()=>taiBoSuuTapAnh('00123'));
    assert.equal(requests.slice(before).filter(x=>x.name.startsWith('/Material/')&&!x.name.includes('_optimized')).length,0);
    assert.deepEqual(errors,[]);

    folder=fs.mkdtempSync(path.join(os.tmpdir(),'checking-image-files-'));
    fs.writeFileSync(path.join(folder,'Checking.html'),html);
    fs.writeFileSync(path.join(folder,'data.js'),stockSource);
    fs.writeFileSync(path.join(folder,'Amount.js'),'window.amountData=[];');
    fs.mkdirSync(path.join(folder,'Material'));
    fs.writeFileSync(path.join(folder,'Material','00123.jpg'),png);
    fs.writeFileSync(path.join(folder,'Material','00123_10.png'),png);
    const offline=await browser.newPage();
    await offline.goto(require('node:url').pathToFileURL(path.join(folder,'Checking.html')).href);
    await offline.evaluate(()=>taiBoSuuTapAnh('00123'));
    assert.equal(await offline.locator('#anh-chinh').getAttribute('src'),'Material/00123.jpg');
    assert.deepEqual(await offline.evaluate(()=>danhSachAnhDangXem),['Material/00123.jpg','Material/00123_10.png']);
    console.log('PASS browser images: first image before a blocked manifest, direct base-name GET, late responsive manifest, cancelled guesses, cached revisit and file:// fallback through image 10.');
  }finally{await browser.close();if(folder)fs.rmSync(folder,{recursive:true,force:true})}
})().catch(error=>{console.error(error);process.exitCode=1});
