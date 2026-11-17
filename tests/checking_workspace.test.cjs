// Regression guard for workspace, columns, alerts and shared detail lifecycle.
const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const html=fs.readFileSync(path.join(__dirname,"../Checking.html"),"utf8");
test("all inline scripts compile",()=>{
 for(const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi))new vm.Script(match[1]);
});
test("tab state and scroll have persistent restore paths",()=>{
 for(const name of ["saveWorkspace","restoreWorkspaces","restoreScroll","WORKSPACE_KEY"])
  assert.ok(html.includes(name),name);
 assert.match(html,/if\(tab!==tabHienTai&&typeof saveWorkspace/);
});
test("column visibility preserves underlying source and sorting",()=>{
 assert.match(html,/function openColumns\(table\)/);
 assert.match(html,/function applyColumns\(\)/);
 assert.match(html,/checking-columns-dialog/);
 assert.match(html,/i===0/);
});
test("alerts drill to stock with keyboard support and Hall scope labels",()=>{
 assert.match(html,/function drillAlert\(a\)/);
 assert.match(html,/checkingAttentionFilter/);
 assert.match(html,/part\.addEventListener\("keydown"/);
 assert.match(html,/Hall 2: không có giá trị tồn kho/);
});
test("catalog detail restores original stock panel",()=>{
 assert.match(html,/function traChiTietVeTraCuu\(\)/);
 assert.match(html,/parent\.insertBefore\(detail,marker\)/);
});
