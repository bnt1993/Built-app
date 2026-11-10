# PO / GR Report (offline HTML)

## Mở báo cáo

Dùng file **PO_GR_Report.html** trong cùng thư mục với **PO.js** và **GR.js**. Có thể mở HTML trực tiếp trên máy tính hoặc qua máy chủ nội bộ. File `PO_GR_Report` (không có phần mở rộng) cũng chứa HTML giống hệt, nhưng trình duyệt dễ nhận diện `.html` hơn.

```text
Thư mục báo cáo/
├─ PO_GR_Report.html
├─ PO.js
└─ GR.js
```

Không cần thư viện CDN, dịch vụ web ngoài hay gửi dữ liệu SAP lên máy chủ. Khi một trình duyệt hoặc hệ thống mạng không cho phép đọc file JS cạnh HTML, mở **Nguồn dữ liệu và tải file thủ công** và chọn hai file. Nút **Làm mới dữ liệu** đọc lại hai file cùng thư mục. Nếu nguồn JS có lỗi cú pháp, ứng dụng hiển thị cảnh báo; không sử dụng dữ liệu đoán.

## Cấu trúc PO.js và GR.js

PO.js đặt danh sách hai chiều trong `window.duLieuCongTy`, trong đó dòng đầu là các cột:

`Pur. Doc.`, `Item`, `Created By`, `Doc. Date`, `Plnt`, `Supplier`, `Material`, `Short Text`, `PO Quantity`, `OUn`, `Net Price`, `Gross value`, `Crcy`.

GR.js đặt danh sách hai chiều trong `window.duLieuGR`, có các cột `Purchase order`, `Item`, `Material`, `Movement Type`, `Posting Date`, `Qty in unit of entry`, `Unit of Entry`, `Material Document`, `Bill of Lading`.

Cả hai có thể có `window.thoiGianCapNhat = "dd/mm/yyyy hh:mm:ss"`. Ứng dụng hiển thị ngày cập nhật nhưng **không sử dụng nó thay cho ngày PO/GR thực tế**.

## Quy tắc đối chiếu và tính toán

- Từng dòng PO được xác định theo **Purchase Order + Item**, đồng thời **Material** trên GR phải khớp PO. Item `10` và `00010` được xem là cùng Item; mã vật tư được giữ dạng chuỗi để không mất số 0 đầu.
- Với chế độ mặc định: Movement Type `101` **cộng** số lượng nhận; `102` **trừ** số lượng hoàn nhập. Người dùng có thể tích thêm 105/106 nếu đó là nghiệp vụ muốn tính. Những Movement khác không bị tự ý cộng vào GR.
- Trùng chứng từ theo **Material Document + Material Doc.Item + Posting Date** được loại ra khi tổng hợp. Tổng lượng nhận có thể âm khi dữ liệu đảo bút toán vượt lượng nhận; dòng đó được đánh dấu cần kiểm tra.
- **SL còn thiếu** = `max(0, SL PO - SL GR)`. **% nhận** = `SL GR / SL PO × 100`, chỉ tính khi SL PO lớn hơn 0.
- **Ngày chờ** = số ngày từ **Doc. Date** của PO đến ngày hiện tại, tối thiểu bằng 0; với PO chưa có ngày hợp lệ hiển thị dấu gạch.
- Phân màu cột Ngày chờ: **đỏ ≥80 ngày**, **cam 60–79**, **vàng 30–59**, **xanh dưới 30**. PO đã nhận đủ hiển thị màu trung tính.
- Ngày Excel serial như `46024` được đổi sang **02/01/2026**, dùng mốc Excel 1899-12-30.
- `Net Price` và số lượng dùng định dạng số SAP có dấu phẩy thập phân. Không cộng gộp EUR và VND thành một tổng tiền.

## Giao diện và xuất kết quả

Tìm theo PO, Item, Material, mô tả, nhà cung cấp, người tạo; lọc trạng thái, nhà cung cấp, nhà máy, khoảng ngày; lọc các dòng chờ từ 60 ngày. Có sắp xếp trên cột, phân trang 25/50/100/200, nhấp đúp hoặc Enter để xem chứng từ GR chi tiết.

Xuất **Excel .xlsx** theo toàn bộ kết quả lọc và thứ tự sắp xếp hiện tại (không chỉ trang đang xem). File xuất chứa các cột PO/GR trên giao diện và các thông tin Item, nhà cung cấp, nhà máy, người tạo, đơn giá và tiền tệ.

## Trạng thái dữ liệu mẫu trong GitHub

Ở thời điểm tạo trang, PO.js có **5 dòng PO**, GR.js có **2 dòng GR** nhưng số PO trên hai nguồn **chưa trùng nhau**. Vì vậy lượng nhận bằng 0 ở các dòng PO mẫu là kết quả đúng với dữ liệu hiện có, không có nghĩa hàm ghép PO/GR bị lỗi.

Hai nguồn mẫu trước đó thiếu `];` kết thúc bảng. PR chỉ bổ sung dấu đóng mảng để chúng chạy được, giữ nguyên các hàng đã có. Khi cập nhật bằng PO.js/GR.js đầy đủ cùng cấu trúc, bảng tự đối chiếu theo dữ liệu mới.

**Bảo mật:** Repository có thể công khai. Tránh tải dữ liệu mua hàng/nhà cung cấp thực tế lên GitHub công khai nếu đó là dữ liệu nội bộ.
