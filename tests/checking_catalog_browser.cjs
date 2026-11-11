const {chromium}=require("playwright");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");

const html=fs.readFileSync(path.join(__dirname,"../Checking"),"utf8");
const headers=[
  "Material","Material Description","Plnt","Name 1","MPN",
  "Size/dimensions","Typ","Reorder Point","BUn",
  "Min. Lot Sze","BUn","Bin","Stor. Bin"
];
const records=Array.from({length:123},(_,i)=>[
  "000"+String(1000+i),"Part "+i,"5244",i%3===0?"Supplier A":"Supplier B",
  "MPN-"+i,"Size "+i+"x20",i%2===0?"F":"S",
  i===0?"":i%3===0?"0":"5",i%2===0?"PC":"EA",
  String(i+1),"NOT-THE-BASE-UNIT","NOT-THE-STORAGE-BIN",
  i%4===0?"":"BIN-"+i
]);
const script='// Source: Database_20261111.XLSX\n'+
  'const DATABASE_HEADERS='+JSON.stringify(headers)+';\n'+
  'const DATABASE_DATA='+JSON.stringify(records)+';\n';
const stock=[["Material","Material Description","Part No","Stock","Price","Group","Reorder Point"],
  ["0009999","Stock-only part","P-9",10,2500,"G",3]];
const stockSource='window.duLieuCongTy='+JSON.stringify(stock)+
  ';window.thoiGianCapNhat="11/11/2026 10:00";';
async function installRoutes(page,mode="database-js"){
  const seen=[];
  await page.route("http://catalog.test/**",route=>{
    const url=new URL(route.request().url()),name=url.pathname;
    seen.push({name,method:route.request().method()});
    if(name==="/")return route.fulfill({contentType:"text/html",body:html});
    if(name==="/data.js")return route.fulfill({contentType:"text/javascript",body:stockSource});
    if(name==="/Database.js")return route.fulfill({
      status:mode==="database-js"?200:404,contentType:"text/javascript",
      body:mode==="database-js"?script:""
    });
    if(name==="/Database")return route.fulfill({
      status:mode==="database"||mode==="incomplete"?200:404,
      contentType:"text/javascript",
      body:mode==="database"?script:mode==="incomplete"?script.slice(0,-55):""
    });
    if(name==="/Amount.js")return route.fulfill({
      contentType:"text/javascript",body:"window.amountData=[];"
    });
    return route.fulfill({status:404,body:""});
  });
  return seen;
}
async function run(){
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1440,height:950},acceptDownloads:true});
    const errors=[];page.on("pageerror",e=>errors.push(e.message));
    const seen=await installRoutes(page);
    await page.goto("http://catalog.test/");
    await page.waitForFunction(()=>window.chiMucSanSang===true||document.querySelector("#than-bang tr[data-row-index]"));
    assert.equal(await page.locator("#tab-catalog").count(),1);
    assert.equal(await page.locator("#view-catalog").isVisible(),false);
    assert.equal(seen.filter(x=>x.name==="/Database.js").length,0,
      "Database is lazy-loaded only on entering the catalog");
    await page.locator("#tab-catalog").click();
    await page.waitForFunction(()=>document.getElementById("catalog-count").textContent.includes("123"));
    assert.equal(await page.locator("#catalog-table thead th").count(),10);
    assert.equal(await page.locator("#catalog-rows tr").count(),50);
    assert.equal(await page.locator("#catalog-page-label").innerText(),"Trang 1/3");
    assert.equal(await page.locator("#catalog-table td").first().innerText(),"0001000");
    const rowFirst=await page.locator("#catalog-rows tr").first().locator("td").allTextContents();
    assert.deepEqual(rowFirst,[
      "0001000","Part 0","Supplier A","MPN-0","Size 0x20","F",
      "—","1","PC","—"
    ]);
    const second=await page.locator("#catalog-rows tr").nth(1).locator("td").allTextContents();
    assert.equal(second[8],"EA","duplicate BUn headers must use the first material unit");
    assert.equal(second[9],"BIN-1","Stor. Bin must not read the separate Bin column");
    assert.equal(seen.filter(x=>x.name==="/Database.js").length,1);
    await page.locator("#catalog-next").click();
    assert.equal(await page.locator("#catalog-table td").first().innerText(),"0001050");
    await page.locator("#catalog-last").click();
    assert.equal(await page.locator("#catalog-rows tr").count(),23);
    await page.locator("#catalog-first").click();
    await page.locator("#catalog-page-size").selectOption("100");
    assert.equal(await page.locator("#catalog-rows tr").count(),100);
    await page.locator("#catalog-page-size").selectOption("50");

    // All dropdown filters must work together and update live result counts.
    await page.locator("#catalog-type").selectOption("F");
    await page.locator("#catalog-name").selectOption("Supplier A");
    await page.locator("#catalog-unit").selectOption("PC");
    await page.locator("#catalog-reorder").selectOption("zero");
    await page.waitForTimeout(40);
    assert.ok(Number((await page.locator("#catalog-result").innerText()).match(/^\d+/)?.[0])>0);
    await page.locator("#catalog-clear").click();
    await page.waitForFunction(()=>document.getElementById("catalog-rows").children.length===50);

    // Multi-code search takes the union, while search scope can target a field.
    await page.locator("#catalog-search").fill("0001002,0001102");
    await page.waitForFunction(()=>document.querySelector("#catalog-rows").children.length===2);
    assert.equal(await page.locator("#catalog-table tbody tr").count(),2);
    const multi=await page.locator("#catalog-rows tr td:first-child").allTextContents();
    assert.deepEqual(multi,["0001002","0001102"]);
    await page.locator("#catalog-scope").selectOption("mpn");
    await page.locator("#catalog-search").fill("MPN-31");
    await page.waitForFunction(()=>{
      const cell=document.querySelector("#catalog-rows tr td:first-child");
      return cell&&cell.textContent==="0001031";
    });
    assert.equal(await page.locator("#catalog-rows tr td:first-child").first().innerText(),"0001031");

    // XLSX export is based on active filters, never on current page-size only.
    const downloadPromise=page.waitForEvent("download");
    await page.locator("#catalog-export").click();
    const download=await downloadPromise;
    assert.match(download.suggestedFilename(),/^SAP_Database_.*\.xlsx$/);
    const exported=fs.readFileSync(await download.path()).toString("utf8");
    assert.equal((exported.match(/<row r="/g)||[]).length,2);
    assert.ok(exported.includes('autoFilter ref="A1:J2"'));
    assert.ok(exported.includes("0001031"));
    await page.locator("#catalog-clear").click();

    // Switching app language must translate all catalog labels without reloading.
    await page.locator("#lang-en").click();
    assert.equal(await page.locator("#tab-catalog [data-i18n]").innerText(),"Material catalog");
    assert.equal(await page.locator("#catalog-table thead th").first().innerText().then(t=>t.includes("Material")),true);
    assert.equal(await page.locator('#catalog-scope option[value="all"]').innerText(),"All fields");
    await page.locator("#lang-vi").click();
    assert.equal(await page.locator("#catalog-search").getAttribute("placeholder"),
      "Nhập từ khóa hoặc nhiều mã, cách nhau bởi dấu phẩy / chấm phẩy");
    await page.locator("#tab-stock").click();
    assert.equal(await page.locator("#view-catalog").isVisible(),false);
    await page.locator("#tab-dashboard").click();
    assert.equal(await page.locator("#view-dashboard").isVisible(),true);
    await page.locator("#tab-catalog").click();
    assert.equal(seen.filter(x=>x.name==="/Database.js").length,1,
      "switching tabs must not re-fetch the large Database file");
    assert.equal(await page.locator("#catalog-result").innerText(),"123 / 123 vật tư");
    assert.deepEqual(errors,[]);

    // The no-extension GitHub file name "Database" is a supported fallback.
    const fallback=await browser.newPage({viewport:{width:1300,height:900}});
    const seenFallback=await installRoutes(fallback,"database");
    await fallback.goto("http://catalog.test/");
    await fallback.locator("#tab-catalog").click();
    await fallback.waitForFunction(()=>document.getElementById("catalog-count").textContent.includes("123"));
    assert.ok(seenFallback.some(x=>x.name==="/Database.js"));
    assert.ok(seenFallback.some(x=>x.name==="/Database"));
    assert.equal(await fallback.locator("#catalog-rows tr").count(),50);

    // When neither name exists, the user can load an independent local file.
    const upload=await browser.newPage({viewport:{width:1300,height:900}});
    const seenUpload=await installRoutes(upload,"missing");
    await upload.goto("http://catalog.test/");
    await upload.locator("#tab-catalog").click();
    await upload.waitForFunction(()=>document.getElementById("catalog-source-status").textContent.includes("Không tìm thấy"));
    await upload.locator("#catalog-upload-input").setInputFiles({
      name:"Database.js",mimeType:"text/javascript",buffer:Buffer.from(script,"utf8")
    });
    await upload.waitForFunction(()=>document.getElementById("catalog-count").textContent.includes("123"));
    assert.equal(await upload.locator("#catalog-table th").count(),10);
    assert.equal(seenUpload.filter(x=>x.name==="/data.js").length,1,
      "stock still reads its own data.js");

    // The Database blob currently on GitHub ends mid-record. Such source
    // must not silently show partial data or overwrite the stock dataset.
    const incomplete=await browser.newPage();
    await installRoutes(incomplete,"incomplete");
    await incomplete.goto("http://catalog.test/");
    await incomplete.locator("#tab-catalog").click();
    await incomplete.waitForFunction(()=>document.getElementById(
      "catalog-source-status").textContent.includes("chưa đầy đủ"));
    assert.equal(await incomplete.locator("#catalog-count").innerText(),"");
    assert.equal(await incomplete.locator("#catalog-rows tr").count(),0);
    console.log("PASS: independent Database catalog, exact ten columns, filters, pagination, VI/EN, XLSX, filename fallback, manual import.");
  }finally{await browser.close()}
}
run().catch(error=>{console.error(error);process.exitCode=1});
