/* Parse exported History.js as JSON data, never eval or import its script. */
"use strict";
self.postMessage({ready:true});
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
    if(event.data?.index&&Array.isArray(data[0])){
      self.postMessage({indexed:indexHistory(data),updated});
    }else self.postMessage({data,updated});
  }catch(error){
    self.postMessage({error:error?.message||"HISTORY_BAD_FORMAT"});
  }
};

function normalizeHeader(value){
  return String(value??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/đ/g,"d").toLowerCase().replace(/[^a-z0-9]/g,"");
}
function findColumn(headers,names){
  const accepted=new Set(names.map(normalizeHeader));
  return headers.findIndex(name=>accepted.has(normalizeHeader(name)));
}
function historyDate(value){
  if(value==null||value==="")return "";
  const text=String(value).trim();
  const valid=iso=>{const date=new Date(iso+"T00:00:00Z");
    return !Number.isNaN(date.valueOf())&&date.toISOString().slice(0,10)===iso?iso:"";};
  let m=text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if(m)return valid(m[1]+"-"+m[2].padStart(2,"0")+"-"+m[3].padStart(2,"0"));
  m=text.match(/^(\d{1,2})[/. -](\d{1,2})[/. -](\d{4})/);
  if(m)return valid(m[3]+"-"+m[2].padStart(2,"0")+"-"+m[1].padStart(2,"0"));
  const serial=/^\d+(?:[.,]\d+)?$/.test(text)?Number(text.replace(",",".")):NaN;
  return serial>20000&&serial<100000?
    new Date(Date.UTC(1899,11,30)+Math.floor(serial)*86400000).toISOString().slice(0,10):"";
}
function indexHistory(data){
  const input=data.slice(1).filter(Array.isArray);
  const width=Math.max(data[0].length,...input.slice(0,100).map(row=>row.length));
  const columns=Array.from({length:width},(_,i)=>String(data[0][i]??("Column "+(i+1))));
  const posting=findColumn(columns,["Posting Date","PostingDate","Ngày hạch toán"]);
  const dateColumn=posting>=0?posting:findColumn(columns,["Date","Document Date","Transaction Date",
    "Datetime","Created At","Ngay","Ngày","Ngày giao dịch"]);
  const movement=findColumn(columns,["Movement"]);
  const typeColumn=movement>=0?movement:findColumn(columns,["Movement Type","Type","IN/OUT",
    "Transaction Type","Loai","Loại","Loại giao dịch","Nhập/Xuất","Action"]);
  const sapColumn=findColumn(columns,["Material","SAP","SAP Code","Material Number","Mã SAP","Mã vật tư"]);
  const output=new Map();
  const records=input.map((row,number)=>{
    const cells=row.map(value=>value!==null&&typeof value==="object"?JSON.stringify(value):String(value??""));
    const date=dateColumn>=0?historyDate(row[dateColumn]):"";
    const movement=String(typeColumn>=0?row[typeColumn]??"":"").trim().toUpperCase();
    const type=movement==="INPUT"?"in":movement==="OUTPUT"?"out":"unknown";
    if(sapColumn>=0&&type==="out"&&date){
      const raw=String(row[sapColumn]??"").trim();
      const sap=(/^\d+\.0+$/.test(raw)?raw.replace(/\.0+$/,""):raw).toLowerCase();
      if(sap&&(!output.has(sap)||date>output.get(sap)))output.set(sap,date);
    }
    return {cells,number,date,type};
  }).sort((a,b)=>(b.date||"").localeCompare(a.date||"")||a.number-b.number);
  return {schema:"checking-history-index-v3",columns,records,typeColumn,output:[...output]};
}
