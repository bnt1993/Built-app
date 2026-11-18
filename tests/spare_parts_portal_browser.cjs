const assert = require("node:assert/strict");
const {readFileSync} = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const {test} = require("node:test");
const {chromium} = require("playwright");

const portal = readFileSync(path.join(__dirname,"../Spare_Parts_Portal.html"));

test("mobile Portal boots, opens the local app, persists deletion and reports missing files",async () => {
  const server = http.createServer((request,response) => {
    const filename = new URL(request.url,"http://localhost").pathname;
    if (filename === "/Spare_Parts_Portal.html" || filename === "/Checking.html") {
      response.writeHead(200,{"Content-Type":"text/html; charset=utf-8"});
      response.end(request.method==="HEAD" ? undefined :
        filename==="/Checking.html" ? "<h1>Ứng dụng tra cứu</h1>" : portal);
    } else {
      response.writeHead(404);
      response.end();
    }
  });
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  let browser;
  try {
    browser = await chromium.launch({headless:true});
    const page = await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    const errors=[];
    page.on("pageerror",error=>errors.push(error.message));
    const url="http://127.0.0.1:"+server.address().port+"/Spare_Parts_Portal.html";
    await page.goto(url);
    assert.equal(await page.locator("#grid .tile").count(),5);

    await page.locator("#q").fill("tra cuu");
    assert.equal(await page.locator("#grid .tile").count(),1);
    await page.locator("#grid").getByRole("button",{name:"Mở Tra cứu tồn kho"}).click();
    await page.frameLocator("#frame").getByRole("heading",{name:"Ứng dụng tra cứu"}).waitFor();
    await page.waitForFunction(()=>document.getElementById("opens").textContent==="1");
    assert.equal(await page.locator(".viewerbar").evaluate(bar=>bar.scrollWidth<=bar.clientWidth),true);
    await page.getByRole("button",{name:"Về Portal"}).click();
    await page.locator("#q").fill("");
    const layout=page.locator('#grid [data-id="layout"]');
    await layout.locator("summary").click();
    page.once("dialog",dialog=>dialog.accept());
    await layout.getByRole("button",{name:"Xóa"}).click();
    await layout.waitFor({state:"detached"});
    await page.reload();
    assert.equal(await layout.count(),0);
    assert.equal(await page.locator("#grid .tile").count(),4);

    await page.locator("#grid").getByRole("button",{name:"Mở Dashboard & Phân tích kho"}).click();
    await page.waitForFunction(()=>document.getElementById("viewerStatus").textContent.includes("Không tìm thấy file."));
    assert.equal(await page.locator("#viewerRetry").isVisible(),true);
    assert.equal(await page.locator("#opens").textContent(),"1");
    assert.deepEqual(errors,[]);
  } finally {
    await browser?.close();
    await new Promise(resolve=>server.close(resolve));
  }
});
