# SAP Inventory — Hướng dẫn nâng cấp thống nhất

## Phạm vi của Pull Request
Nâng cấp trong một nhánh: trạng thái Stock theo **Reorder Point**, tìm nhiều mã SAP, tìm gần đúng, bộ lọc yêu thích, biểu đồ trạng thái tồn / mức đáp ứng ROP / xếp hạng giá trị và chi phí bổ sung, ảnh thumbnail, `Material/manifest.json`, ảnh chụp tổng hợp theo ngày, báo cáo XLSX và nhắc báo cáo khi ứng dụng đang mở. Giữ Light/Dark, VI/EN và dữ liệu hiện có.

## 1. Quy tắc màu Stock
Nguồn là cột `Stock` hoặc `Quantity` (fallback là cột thứ tư) và cột `Reorder Point`.
- **Xanh:** Stock > Reorder Point
- **Vàng:** Stock = Reorder Point, và Stock khác 0
- **Cam:** Stock < Reorder Point, và Stock khác 0 (kể cả âm)
- **Đỏ:** Stock = 0 (luôn ưu tiên đỏ, kể cả Reorder Point = 0 hoặc bị thiếu)
- **Trung tính/xám:** Reorder Point bị thiếu hoặc không hợp lệ, Stock khác 0. **Không giả định ngưỡng 0 hay 1.**

Tên cột Reorder Point được chấp nhận: `Reorder Point`, `Re-order Point`, `ReorderPoint`, `Reorder Level`, `ROP`, `Điểm đặt hàng lại`, `Mức đặt hàng lại`, `Ngưỡng đặt hàng lại`. So khớp không phân biệt chữ hoa/thường.

`data.js` phải thiết lập `window.duLieuCongTy = [headers, ...records]`. Ví dụ bảng:

```javascript
window.duLieuCongTy = [
  ["SAP","Description","Part No","Stock","Price","Group","BM No","Reorder Point"],
  ["SAP001","Motor","P-001",12,2500000,"Mechanical","BM-001",10],
  ["SAP002","Bearing","P-002",10,380000,"Mechanical","BM-002",10],
  ["SAP003","Valve","P-003",6,1250000,"Hydraulic","BM-003",10],
  ["SAP004","Seal","P-004",0,98000,"Hydraulic","BM-004",10]
];
window.thoiGianCapNhat = "2026-11-05 09:00";
```

`Price` được tính là **VND**, thống nhất với định dạng tiền hiện tại. Nếu SAP dùng ngoại tệ, cần thêm dữ liệu đơn vị tiền/tỷ giá ở backend thay vì cộng trực tiếp.

## 2. Tìm kiếm và báo cáo
- **Một ô tìm kiếm duy nhất ở trên cùng**: nhập một mã SAP, mô tả hoặc Part No như trước; hoặc nhập nhiều mã SAP cách nhau bằng dấu phẩy, chấm phẩy, dấu gạch đứng hay khoảng trắng. Ví dụ `SAP001, SAP002, SAP003` hoặc `SAP001 SAP002`. Khi dán danh sách nhiều dòng từ Excel, các dòng được gộp thành dấu phẩy. Với danh sách mã giống mã SAP, ứng dụng so khớp chính xác từng mã và giữ cả số 0 đầu.
- Có thể tìm nhiều cụm mô tả, ngăn cách bởi dấu phẩy/dấu chấm phẩy (OR). Chuỗi mô tả có khoảng trắng vẫn được tìm như một cụm, ví dụ `Blue bolt`.
- **"Tìm trong" luôn hiển thị dưới ô tìm kiếm**, gồm Tất cả, Mã SAP, Mô tả, Part No và BM No. Bấm một tùy chọn sẽ tự cập nhật kết quả.
- **Các trạng thái lọc nằm ngay cạnh ô tìm kiếm**: chọn trạng thái Stock so với Reorder Point (trên/bằng/dưới định mức, hết hàng, thiếu định mức), tùy chọn chỉ còn hàng và tìm gần đúng. Không có menu Bộ lọc ẩn.
- **Tìm gần đúng** cho phép tối đa một sai khác ký tự trên mỗi từ độ dài 4–48; khi bật có thể cần nhiều tài nguyên hơn trên tập dữ liệu rất lớn.
- **Không có chức năng lưu/áp dụng/xóa bộ lọc yêu thích.** Các tùy chọn lọc áp dụng ngay khi chọn; nút **Xóa** đặt lại từ khóa và các điều kiện lọc hiện tại.
- File **XLSX** gồm Tổng quan và Chi tiết, giữ mọi cột SAP; có màu Stock theo Reorder Point và mô tả bộ lọc nâng cao. Bản ghi xuất là toàn bộ kết quả lọc, không chỉ một trang.

## 3. Ảnh SAP — manifest tùy chọn
Khi có `Material/manifest.json`, app dùng danh sách ảnh, tránh yêu cầu dò 22 tên file cho mỗi mã SAP. Xem `Material/manifest.example.json`, sao chép thành `Material/manifest.json` và khai báo đúng tên file đã tồn tại:

```json
{
  "SAP001": ["SAP001_01.jpg", "SAP001_02.png"],
  "SAP002": [],
  "SAP003": ["SAP003.jpg"]
}
```

Nếu không có manifest hoặc mã SAP không nằm trong đó, app dùng cơ chế HEAD/Image() hiện tại. Mỗi entry chỉ chấp nhận basename ảnh JPG/JPEG/PNG/WEBP; không chấp nhận đường dẫn tùy ý.

## 4. Ba tab chuyên biệt và tích hợp `History.js`
Ứng dụng `Checking` hiện có ba tab, không cần tải lại `data.js` khi chuyển:
1. **Tra cứu Stock:** thanh tìm kiếm/ROP, bảng vật tư, chi tiết SAP và ảnh.
2. **Dashboard phân tích kho:** bốn KPI, biểu đồ mức tồn so với ROP, top mã có giá trị cao, chi phí bổ sung đến ROP, biểu đồ vòng tình trạng Stock, lịch sử ảnh chụp tổng hợp trên thiết bị và nhắc xuất báo cáo XLSX.
3. **Lịch sử nhập/xuất:** danh sách giao dịch thực từ file **`History.js`**, lọc SAP/chứng từ/từ khóa, Nhập/Xuất, khoảng ngày, phân trang 100 dòng và đầy đủ cột dữ liệu nguồn.

### File History.js thực tế trong repository
Đã kiểm tra **`History.js` ở thư mục gốc repository**. Phiên bản nguồn ghi thời điểm `05/11/2026 12:36:10`, dung lượng khoảng **6,38 MB** và có **62.801 giao dịch** (+1 hàng tiêu đề).

File dùng đúng cấu trúc:
```javascript
window.thoiGianCapNhat = "05/11/2026 12:36:10";
window.duLieuCongTy = [
  ["Posting Date","Movement Type","Material","Material Description",
   "Purchase order","Qty in unit of entry","Unit of Entry",
   "Amt.in loc.cur.","Cost Center"]
  // 62.801 dòng giao dịch thực, không sao chép vào tài liệu.
];
```
**Lưu ý quan trọng:** Cả `data.js` (Stock) và `History.js` đều dùng `window.duLieuCongTy` cùng `window.thoiGianCapNhat`. Trực tiếp chạy script lịch sử trong cửa sổ chính sẽ ghi đè dữ liệu tồn kho. Tab Lịch sử mới ưu tiên dùng `fetch` để đọc văn bản `History.js`, trích bảng bằng `JSON.parse`, **không thực thi History.js**. Nếu mở ứng dụng bằng `file://` và không đọc được bằng fetch, nó chạy script dự phòng nhưng sao lưu và **khôi phục ngay hai biến Stock**, sau đó tạo bản riêng trong bộ nhớ tab Lịch sử.

### Phân loại Nhập / Xuất từ nguồn thực
Các loại giao dịch hiện thấy trong file gồm `INPUT`, `OUTPUT`, `SCRAP` và mã `102`, `202`, `301`, `302`, `311`, `312`, `501`, `502`, `552`. Bộ lọc phân loại:
- **Nhập:** `INPUT`, `202` (hoàn nhập xuất), `501`, `552` (đảo scrap), hoặc nhánh chuyển kho có `Qty in unit of entry > 0`.
- **Xuất:** `OUTPUT`, `SCRAP`, `102` (đảo nhập), `502`, hoặc nhánh chuyển kho có `Qty in unit of entry < 0`.
- **Khác:** không có đủ thông tin để xác định chiều (ví dụ số lượng bằng 0 và mã không nhận biết).

Bộ lọc **Tất cả / Nhập / Xuất / Khác** là các nút hiển thị trực tiếp, tự áp dụng khi chọn. Bảng có thêm cột **Phân loại** ở đầu, đồng thời **giữ nguyên cột `Movement Type` gốc** để kiểm tra. Cột `Qty in unit of entry` được tô màu theo chiều giao dịch. Hỗ trợ tìm theo Material/mô tả/Purchase order/Cost Center, lọc từ ngày-đến ngày theo `Posting Date` (`dd/mm/yyyy`), phân trang 100 giao dịch.

Theo phiên bản file đã kiểm tra: **27.816 dòng Nhập và 34.985 dòng Xuất**, không có dòng Khác; tổng **62.801**. Số liệu sẽ được tính lại khi bạn cập nhật History.js. Đây là **số dòng giao dịch**, không phải tổng số lượng xuất/nhập quy đổi (vì có nhiều đơn vị PC, EA, M...).

### Đường dẫn và định dạng hỗ trợ
Giữ file **`History.js` cùng thư mục ứng dụng `Checking` và `data.js`** trong môi trường chạy. Tên file đúng chữ hoa/chữ thường nếu máy chủ phân biệt. Chuyển sang tab Lịch sử sẽ tải theo yêu cầu; có nút **Tải lại History.js**. Nếu file không tải được hoặc lỗi, app thông báo rõ ràng và giữ dữ liệu lịch sử đã tải trước đó.

Ngoài cấu trúc gốc `window.duLieuCongTy` vừa xác thực, bộ đọc cũng nhận một số tên biến lịch sử độc lập như `window.duLieuLichSu` hoặc `window.historyData` nếu dữ liệu được xuất dạng mảng JSON hợp lệ. Khi không có đủ dữ liệu thực, **không tự tạo giao dịch giả**.

**Bảo mật:** History.js có thông tin vật tư, giá trị giao dịch, số đơn mua và Cost Center. Kiểm tra quyền truy cập repository và môi trường triển khai trước khi chia sẻ công khai.

### Lịch sử tổng hợp khác với lịch sử nhập/xuất
Dashboard lưu tối đa 60 ảnh chụp tổng hợp theo ngày trên chính trình duyệt, dùng để theo dõi xu hướng tồn kho cục bộ. **Ảnh chụp tổng hợp không phải nhật ký giao dịch**; chênh lệch số lượng giữa hai ngày không thể dùng để tự kết luận lượng nhập/xuất.

## 5. Phân quyền, nhật ký kiểm toán và báo cáo tự động
Repo hiện là một ứng dụng HTML đọc `data.js`, **không có backend xác thực/ủy quyền và không có dịch vụ lập lịch**. Vì vậy:
- Không thể triển khai **phân quyền an toàn** chỉ bằng cách ẩn/hiện nút trên client. Cần đăng nhập SSO/AD, kiểm tra vai trò **trên API máy chủ** và giới hạn quyền truy cập nguồn dữ liệu/ảnh; audit phải ghi server-side.
- App hiện cung cấp **nhắc tải báo cáo khi đang mở tab** theo ngày (sau 9h) hoặc Thứ Hai (sau 9h). Người dùng chủ động bấm xuất XLSX; **không tự chạy khi tab đóng**, không gửi email.
- Muốn **báo cáo tự động theo lịch ngay cả khi không ai mở app**, cần một job scheduler (ví dụ Windows Task Scheduler/cron + service), hệ thống gửi email/SharePoint và kho lưu báo cáo với bảo mật ở server.

Những phần này **chưa thể được xác nhận là hoàn tất** nếu chưa có backend và thông tin truy cập. Không sử dụng localStorage như hệ thống phân quyền hoặc audit chính thức.

## 6. Kiểm thử triển khai
Kiểm tra chuyển qua 3 tab, tải History.js thật hoặc hiển thị lỗi khi thiếu file; lọc ngày và loại giao dịch, phân trang lịch sử; Stock trên/bằng/dưới/0; dòng có Reorder Point không hợp lệ; VI/EN và sáng/tối; danh sách SAP nhiều mã; tìm gần đúng; bảng phân trang; mở bộ ảnh; XLSX có công thức và màu; manifest có/không có; dùng thử khi mất mạng. Nên thử trên môi trường nội bộ có `data.js` và thư mục `Material/` thật trước khi merge.

## 7. Tăng tốc ảnh và card Số lượng xuất

### Chuẩn bị ảnh một lần và chạy lại khi thêm/thay ảnh
Repo hiện chỉ có manifest mẫu; ZIP tên IMG_* chưa có ánh xạ SAP, nên không tự đoán mã từ tên ảnh.
Đặt ảnh thật vào thư mục Material, dùng tên như `00123.jpg`, `00123_01.JPG`, `SAP001_02.png`.
Chạy từ thư mục chứa Checking:

```sh
python -m pip install -r scripts/requirements-images.txt
python scripts/build_material_images.py --material Material
```

Công cụ tự sinh `Material/manifest.json`, `Material/manifest.js` và `Material/_optimized/`:
- Thumbnail WebP tối đa 160px; preview tối đa 960px, không phóng lớn ảnh nhỏ.
- Giữ nguyên ảnh gốc; sửa hướng theo EXIF, tên bản nhỏ chứa hash nội dung để ảnh mới không dùng nhầm cache cũ.
- Cần sao chép cả manifest, thư mục _optimized và ảnh gốc cùng ứng dụng.
- Chạy lại lệnh mỗi khi thêm/xóa/thay ảnh. Công cụ không xóa ảnh gốc hoặc các bản nhỏ cũ.
- Không tạo manifest rỗng khi chưa có ảnh. Tên IMG_* bị bỏ qua vì chưa xác định mã SAP.
- Nếu tất cả tên ảnh được nhận diện, manifest đầy đủ giúp xác định cả mã không có ảnh mà không dò file.
- Manifest JS hỗ trợ mở bằng file:// hoặc ổ mạng; manifest JSON cũ vẫn được hỗ trợ.
- Ảnh chính được ưu tiên tải trước thumbnail. Preview/thumbnail lỗi sẽ thử ảnh gốc.
- Lightbox luôn dùng ảnh gốc. Không tải trước toàn kho; chỉ nạp trước preview kế tiếp khi điều hướng.

### Cửa sổ lịch sử vật tư và card thông tin
Nhấn đúp dòng Stock (hoặc Shift+Enter) mở cửa sổ lịch sử cho đúng mã SAP, giữ nguyên tab Stock, dòng đang chọn và bộ lọc của tab Lịch sử. Cửa sổ có bộ lọc Tất cả / Nhập / Xuất / Khác, phân trang 50 dòng, nút tải lại và đóng bằng Đóng hoặc Escape. Sau khi đóng, tiêu điểm trở về dòng vật tư. Lịch sử chỉ tải khi cần và được dùng chung với tab Lịch sử; dữ liệu lỗi/thiếu được thông báo rõ, không tự tạo giao dịch.

Đã bỏ card Số lượng xuất trong chi tiết vật tư và bỏ tải lịch sử khi chỉ nhấn đơn. Các card nguồn cùng BM No dùng lưới hai cột, chiều cao đồng đều theo nội dung dài nhất, padding và khoảng cách thống nhất; nội dung dài xuống dòng.

Kiểm thử: `python tests/test_material_images.py`; `node tests/checking_logic.cjs`; `node tests/checking_browser.cjs` (cần Playwright và Chromium).

## 8. Dashboard: biểu đồ và bộ lọc riêng
Đã bỏ phân nhóm ABC và giá trị theo nhóm vật tư. Dashboard có bốn biểu đồ đồng đều theo lưới hai cột (một cột trên mobile): trạng thái tồn, mức Stock/ROP, top giá trị tồn theo SAP và chi phí ước tính bổ sung đến ROP theo SAP. Danh sách dài cuộn trong card, hỗ trợ bàn phím.

Bộ lọc gồm từ khóa, trạng thái tồn và Top 5/10/20. Từ khóa tìm không dấu trong dữ liệu vật tư. KPI và biểu đồ dùng cùng tập dòng đã lọc, độc lập ô tìm kiếm Stock. Top N chỉ giới hạn danh sách xếp hạng; mẫu số tỷ trọng vẫn là toàn bộ tập lọc. Số vật tư trong KPI/donut là số dòng, không phải số mã SAP duy nhất; các biểu đồ xếp hạng gộp tiền theo SAP.

Mức đáp ứng ROP dùng Stock/ROP khi Stock không âm và ROP > 0; dữ liệu khác được đưa vào nhóm không đủ dữ liệu. Chi phí bổ sung = max(0, ROP - Stock) × đơn giá hợp lệ (>= 0). Thiếu giá/ROP hoặc số không hợp lệ được báo rõ; không cộng lẫn số lượng khác đơn vị. Chi phí là ước tính theo giá hiện tại, không gồm chi phí mua hàng khác.

Lịch sử đồng bộ cục bộ vẫn là toàn kho, không áp dụng bộ lọc Dashboard. Nút XLSX hiện ghi rõ xuất kết quả tra Stock.

Kiểm tra: `node tests/dashboard_logic.cjs`; `node tests/dashboard_browser.cjs` (Playwright + Chromium). Đã kiểm tra browser desktop 1440px, mobile 390px, VI/EN, sáng/tối, lọc, Top N, kết quả rỗng, kích thước card và tràn ngang bằng dữ liệu kiểm thử.
