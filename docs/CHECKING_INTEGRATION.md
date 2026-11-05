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
- Nhấn nút **Bộ lọc** ở ngay sau nút **Xóa** để mở phạm vi tìm kiếm, chỉ còn hàng, lọc Reorder Point, tìm gần đúng và các bộ lọc lưu sẵn. Menu hiển thị số bộ lọc đang áp dụng.
- **Tìm gần đúng** cho phép tối đa một sai khác ký tự trên mỗi từ độ dài 4–48; khi bật có thể cần nhiều tài nguyên hơn trên tập dữ liệu rất lớn.
- Bộ lọc yêu thích lưu tối đa 12 mục bằng `localStorage` trên **thiết bị/trình duyệt hiện tại**.
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

## 4. Lịch sử tồn kho và nhập/xuất
- **Ảnh chụp giá trị tổng hợp**: app lưu tối đa 60 ngày trên thiết bị với số mã, tổng giá trị và số mã cần chú ý. Đây không phải báo cáo lịch sử giao dịch; xóa dữ liệu trình duyệt sẽ làm mất lịch sử này.
- **Nhật ký nhập/xuất**: muốn hiển thị giao dịch thật, hệ thống tích hợp cần đưa danh sách vào `window.lichSuNhapXuat` (hoặc `window.inventoryTransactions`) trước/sau khi tải `data.js`, với dạng:

```javascript
window.lichSuNhapXuat = [
  { date: "2026-11-05T08:30:00", sap: "SAP001", type: "IN", quantity: 5 },
  { date: "2026-11-05T08:45:00", sap: "SAP002", type: "OUT", quantity: 2 }
];
```

App chỉ hiển thị 15 giao dịch gần nhất từ feed. **Không được suy đoán số lần nhập/xuất chỉ từ hai snapshot tồn kho**, vì điều chỉnh, chuyển kho và đồng bộ muộn có thể làm kết quả sai.

## 5. Phân quyền, nhật ký kiểm toán và báo cáo tự động
Repo hiện là một ứng dụng HTML đọc `data.js`, **không có backend xác thực/ủy quyền và không có dịch vụ lập lịch**. Vì vậy:
- Không thể triển khai **phân quyền an toàn** chỉ bằng cách ẩn/hiện nút trên client. Cần đăng nhập SSO/AD, kiểm tra vai trò **trên API máy chủ** và giới hạn quyền truy cập nguồn dữ liệu/ảnh; audit phải ghi server-side.
- App hiện cung cấp **nhắc tải báo cáo khi đang mở tab** theo ngày (sau 9h) hoặc Thứ Hai (sau 9h). Người dùng chủ động bấm xuất XLSX; **không tự chạy khi tab đóng**, không gửi email.
- Muốn **báo cáo tự động theo lịch ngay cả khi không ai mở app**, cần một job scheduler (ví dụ Windows Task Scheduler/cron + service), hệ thống gửi email/SharePoint và kho lưu báo cáo với bảo mật ở server.

Những phần này **chưa thể được xác nhận là hoàn tất** nếu chưa có backend và thông tin truy cập. Không sử dụng localStorage như hệ thống phân quyền hoặc audit chính thức.

## 6. Kiểm thử triển khai
Kiểm tra Stock trên/bằng/dưới/0; dòng có Reorder Point không hợp lệ; VI/EN và sáng/tối; danh sách SAP nhiều mã; tìm gần đúng; bảng phân trang; mở bộ ảnh; XLSX có công thức và màu; manifest có/không có; dùng thử khi mất mạng. Nên thử trên môi trường nội bộ có `data.js` và thư mục `Material/` thật trước khi merge.
