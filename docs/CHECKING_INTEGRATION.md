# SAP Inventory — Hướng dẫn nâng cấp thống nhất

## Phạm vi của Pull Request
Nâng cấp trong một nhánh: trạng thái Stock theo **Reorder Point**, tìm nhiều mã SAP, tìm gần đúng, bộ lọc yêu thích, ABC / Top 10 / phân nhóm, ảnh thumbnail, `Material/manifest.json`, ảnh chụp tổng hợp theo ngày, báo cáo XLSX và nhắc báo cáo khi ứng dụng đang mở. Giữ Light/Dark, VI/EN và dữ liệu hiện có.

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
2. **Dashboard phân tích kho:** bốn KPI, biểu đồ ABC, top mã có giá trị cao, giá trị theo nhóm, biểu đồ vòng tình trạng Stock, lịch sử ảnh chụp tổng hợp trên thiết bị và nhắc xuất báo cáo XLSX.
3. **Lịch sử nhập/xuất:** danh sách giao dịch thực từ file **`History.js`**, lọc SAP/chứng từ/từ khóa, Nhập/Xuất, khoảng ngày, phân trang 100 dòng và đầy đủ cột dữ liệu nguồn.

### Cách đặt file History.js
Đặt file **`History.js` cùng thư mục chạy ứng dụng `Checking`** (cùng cấp với `data.js`). Tab Lịch sử sẽ tải file này theo yêu cầu khi mở tab; nhấn "Tải lại History.js" để cập nhật thủ công. Tên file và chữ hoa/thường phải chính xác nếu web server phân biệt chữ hoa/thường.

Hiện repository **chưa có `History.js` thực tế**. Sau khi merge PR, cần đưa file thật từ hệ thống nội bộ vào đúng đường dẫn thì tab mới hiển thị dữ liệu. Nếu thiếu hoặc sai định dạng, ứng dụng hiển thị thông báo rõ ràng và không tự tạo giao dịch giả.

### Hai định dạng được hỗ trợ
Cách 1 — mảng hàng/cột (đầu tiên là tên cột):
```javascript
window.duLieuLichSu = [
  ["Posting Date", "SAP", "Movement Type", "Quantity", "Document", "Warehouse"]
  // Nối các dòng nhập/xuất thực của bạn tại đây
];
```

Cách 2 — mảng đối tượng:
```javascript
window.duLieuLichSu = [
  // {date: "...", sap: "...", type: "IN" | "OUT", quantity: 0, document: "..."}
];
```
Đây là **mẫu cấu trúc rỗng**, không phải dữ liệu lịch sử đã được xác nhận. Hãy dùng dữ liệu SAP thật. Ngoài `window.duLieuLichSu`, mã cũng nhận các biến `window.duLieuHistory`, `window.lichSuNhapXuat`, `window.inventoryTransactions`, `window.historyData`, `window.HistoryData`, v.v. Có thể truyền `{headers,rows}` hoặc `{data:[...]}`.

Cột ngày hỗ trợ các tên như `Date`, `Posting Date`, `Transaction Date`, `Ngày`. Loại giao dịch hỗ trợ `Type`, `Movement Type`, `Loại`, với các giá trị thông dụng `IN`, `OUT`, `Nhập`, `Xuất`, `101`, `201`. Nếu không xác định được loại, app gán **Khác/chưa rõ**; không tự coi số lượng dương là nhập kho.

**Bảo mật:** Không đưa lịch sử nhạy cảm lên GitHub công khai. Chỉ triển khai `History.js` trong hệ thống nội bộ có kiểm soát quyền truy cập. Trình duyệt có quyền truy cập file sẽ đọc được nội dung.

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
