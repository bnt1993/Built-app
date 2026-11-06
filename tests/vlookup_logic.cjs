const fs=require('fs'),vm=require('vm');const root=require('path').join(__dirname,'../');const name=fs.readdirSync(root).find(x=>x.startsWith('VLOOKUP'));const html=fs.readFileSync(root+name,'utf8');const code=html.slice(html.indexOf('      const normalize ='),html.indexOf('      // Update Statistics'));
function run(source,target,keys,fetch){const c={MATCHED:'__test_match_symbol__',state:{sourceFile:{data:source},targetFile:{data:target,headers:Object.keys(target[0])}},sourceKeys:keys,targetKeys:keys,fetchCols:fetch,prefix:'',trimSpace:true,ignoreCase:false,defaultValue:'',duplicateHandling:'first'};vm.createContext(c);vm.runInContext(code,c);return {headers:c.state.resultHeaders,rows:c.state.resultData}}const assert=require('assert');const collision=run([{id:'A',Price:999}],[{id:'A',Price:100}],['id'],['Price']);assert.equal(collision.rows[0].Price,100);assert.equal(collision.rows[0].Price_2,999);assert.equal(new Set(collision.headers).size,collision.headers.length);const keys=run([{a:'A___B',b:'C',value:'WRONG MATCH'}],[{a:'A',b:'B___C'}],['a','b'],['value']);assert.equal(keys.rows[0].__test_match_symbol__,false);console.log('PASS VLOOKUP preserves target columns and isolates composite keys.');
for(const file of ['Checking','HTML.txt','index.txt',name]){const src=fs.readFileSync(root+file,'utf8');let count=0;for(const m of src.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)){new Function(m[1]);count++}console.log('syntax OK',file,count)}

for(const file of ['HTML.txt','index.txt']){
 const source=fs.readFileSync(root+file,'utf8');const start=source.indexOf('    function escapeHTML('),end=source.indexOf('\n    }',start)+6;
 const context={};vm.createContext(context);vm.runInContext(source.slice(start,end),context);
 assert.equal(context.escapeHTML('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
}
console.log('PASS legacy HTML escapes injected tags and attributes.');
