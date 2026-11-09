/* Parse exported History.js as JSON data, never eval or import its script. */
"use strict";
self.onmessage=event=>{
  try{
    const source=String(event.data?.source??"");
    const assignment=/window\.(?:materialHistory|duLieuCongTy|duLieuLichSu|duLieuHistory|lichSuNhapXuat|inventoryTransactions|historyData)\s*=\s*\[/.exec(source);
    if(!assignment)throw Error("HISTORY_BAD_FORMAT");
    const from=assignment.index+assignment[0].length-1;
    const to=source.lastIndexOf("]");
    if(to<=from)throw Error("HISTORY_BAD_FORMAT");
    const data=JSON.parse(source.slice(from,to+1));
    const time=/window\.(?:lastUpdate|thoiGianCapNhat)\s*=\s*("(?:\\.|[^"\\])*")/.exec(source);
    const updated=time?JSON.parse(time[1]):"";
    self.postMessage({data,updated});
  }catch(error){
    self.postMessage({error:error?.message||"HISTORY_BAD_FORMAT"});
  }
};
