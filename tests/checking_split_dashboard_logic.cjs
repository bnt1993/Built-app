const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const vm = require("node:vm");

const html = readFileSync(path.join(__dirname, "../Checking_Dashboard_Analysis (1).html"), "utf8");

function section(first, next) {
  const start = html.indexOf(first);
  const end = html.indexOf(next, start + first.length);
  assert.ok(start >= 0 && end > start, first);
  return html.slice(start, end);
}

function fixture({ stockReady = true, quantityColumn = true } = {}) {
  const elements = new Map();
  const get = id => {
    if (!elements.has(id)) elements.set(id, {
      value: "", children: [], dataset: {}, textContent: "", innerHTML: "",
      appendChild(child) { this.children.push(child); },
      replaceChildren() { this.children = []; this.innerHTML = ""; },
      closest() { return null; },
      querySelectorAll() { return []; }
    });
    return elements.get(id);
  };
  const stock = (sap, name, amount, location = "Hall 1") => ({
    dong: [sap, name, amount, 100, "EA", location], soLuong: amount, trangThaiTon: "healthy"
  });
  const headers = ["Material", "Storage Location", "Posting Date", "Movement",
    quantityColumn ? "Qty in unit of entry" : "Other quantity", "Unit of Entry", "Amt.In"];
  const row = (sap, hall, date, type, quantity, value, unit = "EA") => ({
    date, type, cells: [sap, hall, date, type === "in" ? "INPUT" : "OUTPUT", quantity, unit, value]
  });
  const history = [
    row("A", "Hall 1", "2023-11-18", "in", 1, 100),
    row("A", "Hall 1", "2026-11-18", "out", 24, -1200),
    row("B", "Hall 1", "2026-11-17", "out", 10, -200),
    row("C", "Hall 1", "2026-11-17", "out", "invalid", -200),
    row("D", "Hall 1", "2026-11-16", "out", 12, -500, "KG"),
    row("E", "Hall 2", "2026-11-15", "out", 5, -50)
  ];
  const sandbox = vm.createContext({
    tabHienTai: "dashboard", ngonNguHienTai: "vi", analyticsReady: stockReady,
    historyLoaded: true, historyLoading: false, historyTypeColumn: 3,
    historyStatusKey: "historyLoaded", historyColumns: headers, historyAll: history,
    tieuDeCot: ["Material", "Material Description", "Stock", "Price", "BUn", "Storage Location"],
    duLieuTimKiem: [
      stock("A", "Bạc đạn", 1), stock("B", "Van", NaN), stock("C", "Bánh răng", 20),
      stock("D", "Bộ lọc", 5), stock("E", "Bu lông", 50, "Hall 2"), stock("F", "Ron", 5)
    ],
    document: {getElementById:get, createElement:()=>({dataset:{}})},
    $upgrade:get, ngayDiaPhuongISO:()=> "2026-11-18", layKyPhanTichKho:()=> ({
      from:"2026-11-01", to:"2026-11-18", prevFrom:"2026-10-01", prevTo:"2026-10-18"
    }),
    dinhDangSoLuong: {format: String}, dinhDangGiaTriKho: value=>value+" ₫",
    dinhDangRutGonKho: String, thoatHTML: String, tuDien: key=>key,
    layGiaTriKhoTuAmount:()=>[{date:"2026-11-09",value:1234}],
    nhomKyTrongKhoangKho:()=>[{key:"2026-11",label:"11/2026"}],
    khoaNhomKho:()=> "2026-11", dashboardSortState:{value:{column:"value",direction:-1}},
    sapXepBangPhanTich:rows=>rows,
    tieuDeSapXepPhanTich:()=>"<th></th>",
    tinhBienDongAmount:()=>({percent:null}), showDataScope:()=>{},
    vatTuXuatDotBienTrongKy:()=>[],
    trangThaiNguon:{stock:{status:"error"},amount:{status:"ready"},history:{status:"ready"}}
  });
  const functions = [
    'let analyticsSearchQuery="", dashboardValuePage=1, veBangTopGiaTriVatTu;',
    section("    function chuanHoaMaSap(", "\n    function "),
    section("    function phanTramBienDongKho(", "\n    function "),
    section("    function chuyenThanhSo(", "\n    function "),
    section("    function tenHistoryChuan(", "\n    function ngayHistoryISO("),
    section("    function ngayHistoryHopLe(", "\n    function "),
    section("    function cotStorageLocation(", "    function lichSuTheoSap("),
    section("    function cotGiaTriLichSuKho(", "    function khoangTuanCuoiDashboard("),
    section("    function tongHopGiaoDichTheoNgay(", "    function tinhGiaTriNhapXuat("),
    section("const upgradeDailyIndex=", "function upgradeRiskRows("),
    section("    function tonKhoHall1TonLau(", "    function thongKeVatTuTonLau("),
    section("    function chuanHoaTimKiem(", "\n    function "),
    section("    function congNamKho(", "    function dinhDangThapPhan("),
    section("    function tinhPhanTichDashboard(", "    const dashboardSortState"),
    section("    let dashboardStockStatsCache=", "    function capNhatThongKeNangCao("),
    section("    function locVatTuGiaTriTon(", "    vePhanBoTrangThai ="),
    section("    function taoDuLieuXuatThongKe(", "    // Self-contained XLSX exporter"),
    section("    function capNhatCanhBaoKhoNangCap(", "    capNhatCanhBaoKho=capNhatCanhBaoKhoNangCap"),
    section("const upgradeCompareIds=", "function upgradeInitCompare(")
  ];
  vm.runInContext(functions.join("\n"), sandbox);
  get("dashboard-hall").value = "hall1";
  get("dashboard-limit").value = "20";
  get("dashboard-value-period").value = "month";
  return { get, run: source=>vm.runInContext(source, sandbox), stock, history };
}

test("all inline scripts compile and the analysis no longer presents ABC", () => {
  const scripts = [...html.matchAll(/<script\b([^<>]*)>([\s\S]*?)<\/script\s*>/gi)]
    .filter(match=>!match[1].includes("src="));
  assert.equal(scripts.length, 4);
  for (const script of scripts) assert.doesNotThrow(()=>new vm.Script(script[2]));
  assert.doesNotMatch(html,/Phân tích ABC|Pareto ABC/);
});

test("unknown stock, quantity and units cannot become a coverage estimate", () => {
  const {run} = fixture();
  assert.equal(run('tinhDuLieuConsumption123().find(r=>r.sap==="A").m12.coverDays'), 15);
  assert.equal(run('tinhDuLieuConsumption123().find(r=>r.sap==="B").stock'), null);
  assert.equal(run('tinhDuLieuConsumption123().find(r=>r.sap==="B").m12.tier'), "unknown");
  assert.equal(run('tinhDuLieuConsumption123().find(r=>r.sap==="C").m12.tier'), "unknown");
  assert.equal(run('tinhDuLieuConsumption123().find(r=>r.sap==="D").m12.tier'), "mismatch");
  assert.equal(run('tinhDuLieuConsumption123().some(r=>r.sap==="E")'), false);
  assert.equal(run('tinhDuLieuConsumption123().find(r=>r.sap==="F").m12.tier'), "idle");
  assert.equal(fixture({quantityColumn:false}).run('tinhDuLieuConsumption123().find(r=>r.sap==="F").m12.tier'), "unknown");
  assert.equal(run(`historyAll=historyAll.map(r=>({...r,cells:r.cells.map((v,i)=>i===1?"H01":v)}));
    tinhDuLieuConsumption123().find(r=>r.sap==="F").m12.tier`), "unknown");
});

test("a period with no transactions displays zero only inside observed history", () => {
  const {run, get} = fixture();
  assert.equal(run('danhGiaGiaTriKyKho({from:"2023-01-01",to:"2023-02-01"})'), null);
  assert.equal(run('danhGiaGiaTriKyKho({from:"2026-11-01",to:"2026-11-05"}).out'), 0);
  assert.equal(run('danhGiaGiaTriKyKho({from:"2026-11-18",to:"2026-11-30"}).in'), null);
  assert.equal(run('danhGiaGiaTriKyKho({from:"2026-11-18",to:"2026-11-18"}).out'), 1200);
  get("warehouse-compare-a-from").value = "2026-11-18";
  get("warehouse-compare-a-to").value = "2026-11-18";
  get("warehouse-compare-b-from").value = "2023-01-01";
  get("warehouse-compare-b-to").value = "2023-01-07";
  run("upgradeRenderCompare()");
  assert.match(get("warehouse-compare-results").innerHTML, /<span>B<\/span><strong>—<\/strong>/);
  assert.match(get("warehouse-compare-note").textContent, /dashboardHistoryPartial/);
  get("dashboard-hall").value = "hall2";
  assert.equal(run('danhGiaGiaTriKyKho({from:"2026-11-14",to:"2026-11-14"})'), null);
  assert.equal(run('danhGiaGiaTriKyKho({from:"2026-11-15",to:"2026-11-15"}).out'), 50);
});

test("the dashboard never reports a healthy warehouse when required data is missing", () => {
  const {run, get} = fixture({stockReady:false});
  run("capNhatCanhBaoKhoNangCap()");
  assert.match(get("dashboard-alert-list").children[0].innerHTML, /dashboardAlertIncomplete/);
  assert.doesNotMatch(get("dashboard-alert-list").children[0].innerHTML, /dashboardAlertNormal/);
});

test("Excel uses the visible table's search and rejects valuation only for unsupported scope", () => {
  const {run, get} = fixture();
  get("analytics-search").value = "bánh răng";
  run('analyticsSearchQuery="banh rang"');
  assert.equal(run('locVatTuGiaTriTon()[0].name'), "C");
  assert.equal(run('taoDuLieuXuatThongKe("value").rows.map(row=>row[0]).join(",")'), "C");
  assert.equal(run('taoDuLieuXuatThongKe("value").rows[0][2]'), 20);
  assert.equal(run('taoDuLieuXuatThongKe("value").rows[0][3]'), "EA");
  assert.equal(run('analyticsReady=false;taoDuLieuXuatThongKe("valueTrend").rows[0][2]'), 1234);
  get("dashboard-hall").value = "hall2";
  assert.throws(()=>run('taoDuLieuXuatThongKe("valueTrend")'), /DASHBOARD_EXPORT_UNAVAILABLE/);
});

test("the complete inventory ranking is paginated while Excel receives all matching rows", () => {
  const {run, get, stock} = fixture();
  const more = Array.from({length:75}, (_,i)=>stock("S"+i, "Bạc đạn "+i, i+1));
  run("tabHienTai='analytics'");
  run("duLieuTimKiem").push(...more);
  get("dashboard-limit").value = "all";
  run("veBangTopGiaTriVatTu()");
  assert.equal((get("insight-top").innerHTML.match(/<tr data-sap=/g)||[]).length, 50);
  assert.equal(get("dashboard-value-pages").textContent, "1 / 2");
  assert.ok(run('taoDuLieuXuatThongKe("value").rows.length') > 50);
  run("doiTrangGiaTriTon(1)");
  assert.equal(get("dashboard-value-pages").textContent, "2 / 2");
});
