const {chromium}=require('playwright');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..');
const fixture=fs.mkdtempSync(path.join(os.tmpdir(),'built-app-hub-'));
fs.mkdirSync(path.join(fixture,'tools'));
fs.copyFileSync(path.join(root,'HTML_Hub.html'),path.join(fixture,'HTML_Hub.html'));
const child='<!doctype html><html lang="vi"><title>Ứng dụng con</title><body><h1>Trang con hoạt động</h1><button onclick="this.textContent=Number(this.textContent)+1">0</button></body></html>';
for(const name of ['Checking.html','PO_GR_Report.html','Layout WH.html','VLOOKUP_Nâng_Cao_Offline.html','tools/Báo cáo.html'])fs.writeFileSync(path.join(fixture,name),child);
const options={headless:true,args:['--no-sandbox'],...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{})};
const appCount=async(page,count)=>assert.equal(await page.locator('.app-card').count(),count);
const waitSaved=page=>page.waitForFunction(()=>document.getElementById('save-status').textContent==='Đã lưu trên thiết bị này');
const card=(page,id)=>page.locator('[data-app-id="'+id+'"]');
async function addLink(page,name,relativePath){
  await page.locator('#add-btn').click();
  await page.locator('#app-name').fill(name);
  await page.locator('#app-category').fill('Kiểm tra');
  await page.locator('#app-path').fill(relativePath);
  await page.locator('#save-app').click();
}
async function importBackup(page,value){
  await page.locator('#restore-file').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(value))});
}
(async()=>{
  const browser=await chromium.launch(options);
  try{
    const context=await browser.newContext({offline:true,acceptDownloads:true,viewport:{width:1440,height:1000}});
    const page=await context.newPage(),errors=[],network=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('request',r=>{if(/^https?:/.test(r.url()))network.push(r.url());});
    const url=pathToFileURL(path.join(fixture,'HTML_Hub.html')).href;
    await page.goto(url);await waitSaved(page);await appCount(page,4);
    assert.equal(await page.locator('#storage-warning').isHidden(),true);
    assert.equal(await page.locator('#stat-favorites').innerText(),'1');
    await page.locator('#search').fill('so do');await appCount(page,1);assert.match(await page.locator('.card-title').innerText(),/Sơ đồ/);
    await page.locator('#search').fill('');
    await page.locator('#category-filter').selectOption('Quản lý kho');await appCount(page,2);
    await page.locator('#category-filter').selectOption('');
    await card(page,'po-gr').locator('[data-action="favorite"]').click();
    await page.locator('[data-filter="favorites"]').click();await appCount(page,2);
    await page.locator('[data-filter="all"]').click();
    await page.locator('#sort').selectOption('name');
    const names=await page.locator('.card-title').allTextContents();assert.deepEqual(names,[...names].sort((a,b)=>a.localeCompare(b,'vi')));
    await page.locator('#sort').selectOption('default');
    await page.locator('#theme-toggle').click();await page.locator('#list-view').click();await waitSaved(page);
    await page.reload();await waitSaved(page);
    assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
    assert.equal(await page.locator('#cards').evaluate(el=>el.classList.contains('list')),true);
    assert.equal(await page.locator('#stat-favorites').innerText(),'2');
    await page.locator('#grid-view').click();

    // Real file:// links preserve Unicode, spaces and child state between tabs.
    await card(page,'checking').locator('.open-btn').click();
    const checking=page.frameLocator('#frame-area iframe:not([hidden])');
    await checking.getByRole('heading').waitFor();await checking.getByRole('button').click();
    await page.locator('#back-library').click();
    await card(page,'layout').locator('.open-btn').click();
    await page.frameLocator('#frame-area iframe:not([hidden])').getByRole('heading').waitFor();
    assert.equal(await page.locator('.tab').count(),2);
    await page.locator('[data-tab-id="checking"] .tab-label').click();
    assert.equal(await page.frameLocator('#frame-area iframe:not([hidden])').getByRole('button').innerText(),'1');
    await page.locator('#back-library').click();
    assert.equal(await page.locator('#stat-recent').innerText(),'2');
    await page.locator('[data-filter="recent"]').click();await appCount(page,2);
    await page.locator('[data-filter="all"]').click();

    // Invalid links cannot escape the app directory or execute a protocol.
    await addLink(page,'Lien ket sai','../outside.html');
    assert.match(await page.locator('#app-error').innerText(),/đường dẫn tương đối/);
    for(const bad of ['javascript:alert(1)','https://example.com/x.html','%2e%2e/test.html','C:\\secret.html','//example.com/a.html']){
      await page.locator('#app-path').fill(bad);await page.locator('#save-app').click();assert.equal(await page.locator('#app-dialog').evaluate(el=>el.open),true);
    }
    await page.locator('#app-name').fill('Báo cáo riêng');await page.locator('#app-path').fill('tools/Báo cáo.html');await page.locator('#save-app').click();await page.waitForFunction(()=>!document.getElementById('app-dialog').open);await appCount(page,5);
    const custom=page.locator('.app-card').filter({has:page.getByRole('button',{name:'Báo cáo riêng',exact:true})});
    await custom.locator('.open-btn').click();await page.frameLocator('#frame-area iframe:not([hidden])').getByRole('heading').waitFor();
    assert.match(await page.locator('#frame-area iframe:not([hidden])').getAttribute('src'),/B%C3%A1o%20c%C3%A1o\.html/);
    await page.locator('#reload-frame').click();await page.locator('#confirm-cancel').click();
    assert.equal(await page.locator('#frame-area iframe').count(),3);
    await page.locator('#back-library').click();

    // Import a self-contained source with no extension. Imported code cannot read the hub.
    const imported='<!doctype html><html><body><h1>HTML đã nhập</h1><script>try{parent.document.body.dataset.compromised="yes"}catch(e){document.body.dataset.isolated="yes"}</script></body></html>';
    await page.locator('#add-btn').click();await page.locator('#app-type').selectOption('file');
    await page.locator('#app-file').setInputFiles({name:'Trang_con',mimeType:'text/plain',buffer:Buffer.from(imported)});
    await page.waitForFunction(()=>document.getElementById('file-hint').textContent.startsWith('Đã chọn'));
    await page.locator('#app-category').fill('HTML tự chứa');await page.locator('#save-app').click();await page.waitForFunction(()=>!document.getElementById('app-dialog').open);await appCount(page,6);
    let importedCard=page.locator('.app-card').filter({has:page.getByRole('button',{name:'Trang_con',exact:true})});
    const importedId=await importedCard.getAttribute('data-app-id');
    await importedCard.locator('.open-btn').click();
    await page.frameLocator('#frame-area iframe:not([hidden])').getByRole('heading',{name:'HTML đã nhập'}).waitFor();
    assert.equal(await page.locator('body').getAttribute('data-compromised'),null);
    assert.equal(await page.frameLocator('#frame-area iframe:not([hidden])').locator('body').getAttribute('data-isolated'),'yes');
    assert(!String(await page.locator('#frame-area iframe:not([hidden])').getAttribute('sandbox')).includes('allow-same-origin'));
    const htmlDownload=page.waitForEvent('download');await page.locator('#open-original').click();assert.equal((await htmlDownload).suggestedFilename(),'Trang_con.html');
    await page.locator('#back-library').click();await waitSaved(page);await page.reload();await waitSaved(page);await appCount(page,6);
    importedCard=card(page,importedId);await importedCard.locator('.open-btn').click();
    await page.frameLocator('#frame-area iframe:not([hidden])').getByRole('heading',{name:'HTML đã nhập'}).waitFor();await page.locator('#back-library').click();
    // Edit imported metadata without replacing the stored HTML.
    await importedCard.locator('[data-action="edit"]').click();await page.locator('#app-name').fill('Đã sửa tên');await page.locator('#save-app').click();await page.waitForFunction(()=>!document.getElementById('app-dialog').open);
    assert.equal(await card(page,importedId).locator('.card-title').innerText(),'Đã sửa tên');
    await card(page,importedId).locator('[data-action="delete"]').click();await page.locator('#confirm-cancel').click();await appCount(page,6);

    // Backup contains full imported content; restore is all-or-nothing and confirmation gated.
    const downloadPromise=page.waitForEvent('download');await page.locator('#backup-btn').click();const backupDownload=await downloadPromise;
    const backup=JSON.parse(fs.readFileSync(await backupDownload.path(),'utf8'));assert.equal(backup.apps.length,6);assert.equal(backup.apps.find(a=>a.id===importedId).html,imported);
    await card(page,importedId).locator('[data-action="delete"]').click();await page.locator('#confirm-accept').click();await appCount(page,5);
    await importBackup(page,backup);await page.locator('#confirm-cancel').click();await appCount(page,5);
    await importBackup(page,backup);await page.locator('#confirm-accept').click();await page.waitForFunction(()=>document.querySelectorAll('.app-card').length===6);
    const dangerous=structuredClone(backup);dangerous.apps[0].path='javascript:alert(1)';await importBackup(page,dangerous);await page.waitForFunction(()=>document.getElementById('toast').textContent.includes('Không thể khôi phục'));await appCount(page,6);
    const duplicate=structuredClone(backup);duplicate.apps[1].id=duplicate.apps[0].id;await importBackup(page,duplicate);await page.waitForFunction(()=>document.getElementById('toast').textContent.includes('trùng'));await appCount(page,6);

    // User-controlled text is displayed as text, including category option values.
    const escaped=structuredClone(backup);escaped.apps[0].name='<img src=x onerror="window.pwned=1">';escaped.apps[0].category='"><img src=x>';await importBackup(page,escaped);await page.locator('#confirm-accept').click();await page.waitForFunction(()=>document.querySelector('.card-title').textContent.startsWith('<img'));
    assert.equal(await page.locator('#cards img').count(),0);assert.equal(await page.evaluate(()=>window.pwned),undefined);
    await importBackup(page,backup);await page.locator('#confirm-accept').click();await page.waitForFunction(()=>document.querySelector('.card-title').textContent==='Quản lý kho SAP');
    await page.locator('#theme-toggle').click();await waitSaved(page);
    if(process.env.HUB_SCREENSHOT_DIR){fs.mkdirSync(process.env.HUB_SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.HUB_SCREENSHOT_DIR,'html-hub-desktop.png'),fullPage:true});}
    await page.setViewportSize({width:390,height:844});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.locator('#search').fill('kiem tra');await appCount(page,1);await page.locator('#search').fill('');
    if(process.env.HUB_SCREENSHOT_DIR)await page.screenshot({path:path.join(process.env.HUB_SCREENSHOT_DIR,'html-hub-mobile.png'),fullPage:true});
    assert.deepEqual(network,[],'The hub and local test children must make no HTTP requests');
    assert.deepEqual(errors,[]);

    // A fresh profile and a fresh page can work even when IndexedDB is denied.
    const denied=await browser.newContext({offline:true});await denied.addInitScript(()=>Object.defineProperty(window,'indexedDB',{get(){throw Error('denied');}}));
    const deniedPage=await denied.newPage();await deniedPage.goto(url);await deniedPage.locator('.app-card').first().waitFor();
    assert.equal(await deniedPage.locator('#storage-warning').isVisible(),true);
    await deniedPage.locator('#theme-toggle').click();assert.equal(await deniedPage.locator('html').getAttribute('data-theme'),'dark');
    await addLink(deniedPage,'Phiên tạm','test.html');await deniedPage.waitForFunction(()=>!document.getElementById('app-dialog').open);await appCount(deniedPage,5);
    const fallbackDownload=deniedPage.waitForEvent('download');await deniedPage.locator('#backup-btn').click();assert.match((await fallbackDownload).suggestedFilename(),/^Built-app-HTML/);
    await denied.close();await context.close();
    console.log('PASS: offline file://, links, imported HTML isolation/persistence, metadata, favorites, tabs, backup/restore, path and XSS validation, mobile layout, storage failure');
  }finally{await browser.close();fs.rmSync(fixture,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
