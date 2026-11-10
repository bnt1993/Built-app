## Tab Yêu cầu vật tư (Request.js)

Ứng dụng có hai tab độc lập: **Theo dõi PO / GR** và **Yêu cầu vật tư**. Đặt `Request.js` **cùng thư mục HTML** với `PO.js`, `GR.js`. Tab Request tải dữ liệu khi mở lần đầu, hỗ trợ làm mới và chọn file thủ công nếu quyền truy cập ổ mạng không cho phép tải script.

### Cấu trúc thực tế Request.js

Dữ liệu đặt trong `window.duLieuRequest = [[...], ...];` và thời gian trong `window.thoiGianCapNhatRequest`. Các cột chính: `File Name`, `No`, `Purchasing Group `, `SAP No`, `Requested date`, `Description`, `Stock`, `Reorder Point`, `Lot size of reorder`, `Qty need to order`, `Unit`, `Price(EUR)`, `Amount(EUR)`, `OrderType`, `Note`, `Supplier`, `Hall`, `Status`, `PO No.`, `Ordered date`. Ngày lưu theo số ngày Excel (serial); tiền EUR có thể chứa dấu phẩy thập phân.

### Giao diện Request gọn và mã tuần từ File Name

- Nút tab **Yêu cầu vật tư** và bốn thẻ thống kê được thu gọn để nhường không gian cho bảng.
- Sáu bộ lọc Request (tìm kiếm, trạng thái, kết quả đối chiếu, Hall, từ ngày, đến ngày) được sắp trên **một hàng khi màn hình máy tính đủ rộng**; trên máy tính bảng/điện thoại chúng xuống hàng để không bị cắt chữ.
- Cột **Tuần (File Name)** được đặt **đầu tiên** trong bảng Request, chỉ hiển thị phần tuần ở cuối tên file: `Order sparepart list of ME56_5244_WK31.xlsx` → `WK31`; `..._Wk32.xlsx` → `WK32`.
- Mã tuần được chuẩn hóa thành `WK01`–`WK53`; tên không có tuần hợp lệ hiển thị `—`. Khi di chuột lên cột tuần, bảng hiển thị **tên file gốc**. Popup chi tiết vẫn giữ `File Name` đầy đủ.
- Có thể **sắp xếp theo tuần** với các dòng không có tuần được đưa xuống cuối; **Excel xuất theo bộ lọc** có cột Tuần đầu tiên và vẫn giữ cột File nguồn gốc.
- Cách đối chiếu Request ↔ PO ↔ GR, trạng thái Hall và nội dung `Request.js` gốc không thay đổi.

### Bộ lọc tuần từ File Name

- Bộ lọc **Tuần (File Name)** nằm cùng hàng với các bộ lọc của tab Yêu cầu vật tư khi mở trên desktop; màn hình hẹp tự xuống 3/2/1 cột.
- Danh sách tuần tự động lấy từ toàn bộ `Request.js`, dựa trên mã `WK01`–`WK53` nằm ở **cuối tên file**, không suy ra từ ngày yêu cầu.
- Danh sách tuần sắp xếp theo số tăng dần, có số yêu cầu mỗi tuần: `WK31 · 18 yêu cầu`, `WK32 · 16 yêu cầu`. Khi file có hàng không có tuần hợp lệ, hiện thêm mục **Không có tuần**.
- Lọc tuần có thể kết hợp **Hall, trạng thái Request, kết quả đối chiếu, khoảng ngày, ô tìm kiếm**. KPI, bảng, số dòng và **xuất XLSX theo bộ lọc** được cập nhật tương ứng.
- Mục **Tất cả tuần** là mặc định. Bấm **Xóa bộ lọc** sẽ xóa cả lựa chọn tuần. Khi nạp lại Request.js, nếu tuần đang chọn vẫn tồn tại thì giữ lựa chọn; nếu tuần đã biến mất thì chọn lại Tất cả.
- Danh sách luôn lấy số liệu từ nguồn Request.js gốc; không thay đổi nội dung nguồn hoặc quy tắc đối chiếu Request → PO → GR.

### Quy tắc đối chiếu ba nguồn

1. Đọc **mọi dòng Request.js**, kể cả các yêu cầu chưa có PO và các yêu cầu ở nhiều Hall; Request không bị giới hạn PO 48* khi thống kê.
2. Khi Request có số PO, tìm đúng số đó trong PO.js và **phải trùng mã SAP**. Số PO thiếu hoặc chưa xuất hiện trong nguồn được giữ nguyên và ghi rõ từng trạng thái. Không tự nhận một PO chỉ vì có chung mã SAP.
3. Với PO khớp, cộng lượng đặt của các Item có cùng PO + SAP, rồi sử dụng phép tính GR 101 cộng / 102 trừ của tab PO/GR để thể hiện **số lượng GR và % GR so với PO**. Số lượng Request được hiển thị **riêng**, không coi GR/PO là lượng đã giao riêng cho từng Request.
4. Nếu một số PO + SAP gắn với nhiều yêu cầu, cột số lượng PO/GR có thể lặp lại ở các dòng Request, **không nên cộng tổng số lượng PO/GR từ bảng Request** để làm tổng thực tế.
5. Các trạng thái phân biệt: *Chưa ghi số PO*, *PO chưa có trong PO.js*, *PO khác mã SAP*, *Có PO/chưa nhập*, *Đã nhập một phần*, *Đã nhận đủ*; nếu không có dữ liệu PO/GR thì báo rõ là chưa xác minh.
6. `Status` (ví dụ `Done`, `Waiting for IR`) **là trạng thái Request**, không tự suy ra đã có PO hoặc đã nhập hàng. Với dữ liệu mẫu 334 dòng trên GitHub, có 247 dòng ghi số PO nhưng PO.js mẫu chưa có mã tương ứng; vì vậy cần thay bằng dữ liệu PO.js/GR.js đầy đủ để xác minh.
7. Các bộ lọc Request: tìm mã, trạng thái Request, trạng thái đối chiếu, Hall, khoảng ngày yêu cầu. Nhấp đúp một dòng mở thông tin, Item PO khớp, và có nút chuyển sang PO/GR khi đã đối chiếu. Có chức năng cuộn tự thêm dữ liệu và **xuất Request_PO_GR.xlsx theo toàn bộ bộ lọc hiện tại**.

Đặt file như sau:

```text
PO_GR_Report.html
PO.js
GR.js
Request.js
```

Không tải dữ liệu Request lên dịch vụ ngoài; tránh commit dữ liệu Request/PO/GR thật nếu repository GitHub có thể công khai.


# PO / GR Report (offline HTML)

## Mở báo cáo

Dùng file **PO_GR_Report.html** trong cùng thư mục với **PO.js** và **GR.js**. Có thể mở HTML trực tiếp trên máy tính hoặc qua máy chủ nội bộ. **Không cần đổi tên biến trong PO.js**: cả `duLieuPO` và `duLieuCongTy` đều được nhận tự động. File `PO_GR_Report` (không có phần mở rộng) cũng chứa HTML giống hệt, nhưng trình duyệt dễ nhận diện `.html` hơn.

```text
Thư mục báo cáo/
├─ PO_GR_Report.html
├─ PO.js
└─ GR.js
```

Không cần thư viện CDN, dịch vụ web ngoài hay gửi dữ liệu SAP lên máy chủ. Khi một trình duyệt hoặc hệ thống mạng không cho phép đọc file JS cạnh HTML, mở **Nguồn dữ liệu và tải file thủ công** và chọn hai file. Nút **Làm mới dữ liệu** đọc lại hai file cùng thư mục. Nếu nguồn JS có lỗi cú pháp, ứng dụng hiển thị cảnh báo; không sử dụng dữ liệu đoán.

## Cấu trúc PO.js và GR.js

PO.js phiên bản mới đặt danh sách hai chiều trong **`window.duLieuPO`**. Trang cũng tiếp tục chấp nhận **`window.duLieuCongTy`** của phiên bản cũ; khi một file khai báo cả hai, ứng dụng ưu tiên `duLieuPO`. Dòng đầu là các cột:

`Pur. Doc.`, `Item`, `Created By`, `Doc. Date`, `Plnt`, `Supplier`, `Material`, `Short Text`, `PO Quantity`, `OUn`, `Net Price`, `Gross value`, `Crcy`.

GR.js giữ danh sách hai chiều trong **`window.duLieuGR`**, có các cột `Purchase order`, `Item`, `Material`, `Movement Type`, `Posting Date`, `Qty in unit of entry`, `Unit of Entry`, `Material Document`, `Bill of Lading`.

Tệp PO.js mới có `window.thoiGianCapNhatPO`, và GR.js mới có `window.thoiGianCapNhatGR`. Ứng dụng lấy **đúng mốc cập nhật riêng của từng file**; vẫn tương thích `window.thoiGianCapNhat` của bản cũ. Ngày cập nhật nguồn chỉ phục vụ kiểm tra, **không được sử dụng thay cho ngày PO/GR thực tế**.

## Quy tắc đối chiếu và tính toán

- Từng dòng PO được xác định theo **Purchase Order + Item**, đồng thời **Material** trên GR phải khớp PO. Item `10` và `00010` được xem là cùng Item; mã vật tư được giữ dạng chuỗi để không mất số 0 đầu.
- Với chế độ mặc định: Movement Type `101` **cộng** số lượng nhận; `102` **trừ** số lượng hoàn nhập. Người dùng có thể tích thêm 105/106 nếu đó là nghiệp vụ muốn tính. Những Movement khác không bị tự ý cộng vào GR.
- Trùng chứng từ theo **Material Document + Material Doc.Item + Posting Date** được loại ra khi tổng hợp. Tổng lượng nhận có thể âm khi dữ liệu đảo bút toán vượt lượng nhận; dòng đó được đánh dấu cần kiểm tra.
- **SL còn thiếu** = `max(0, SL PO - SL GR)`. **% nhận** = `SL GR / SL PO × 100`, chỉ tính khi SL PO lớn hơn 0.
- **Ngày chờ** = số ngày từ **Doc. Date** của PO đến ngày hiện tại, tối thiểu bằng 0; với PO chưa có ngày hợp lệ hiển thị dấu gạch.
- Phân màu cột Ngày chờ: **đỏ ≥80 ngày**, **cam 60–79**, **vàng 30–59**, **xanh dưới 30**. PO đã nhận đủ hiển thị màu trung tính.
- Ngày Excel serial như `46024` được đổi sang **02/01/2026**, dùng mốc Excel 1899-12-30.
- `Net Price` và số lượng dùng định dạng số SAP có dấu phẩy thập phân. Không cộng gộp EUR và VND thành một tổng tiền.

## Quy tắc phạm vi và tải toàn bộ PO.js

- Ứng dụng tải và đọc **toàn bộ dữ liệu** trong `window.duLieuPO` (hoặc `window.duLieuCongTy` cũ), không chỉ một phần dữ liệu hay 25/50 dòng đầu.
- Chỉ đưa vào báo cáo các dòng có **Pur. Doc. bắt đầu bằng chuỗi `48`**. PO bắt đầu 47, 49 hoặc trống bị loại khỏi danh sách và khỏi các KPI.
- **Mặc định là Tất cả trạng thái**: chưa nhận, nhận một phần, đã nhận đủ, nhận vượt và cần kiểm tra. Không tự ẩn các PO đã hoàn tất.
- Phân trang mặc định 50 dòng để bảng tải nhẹ, nhưng có thể chuyển 25/50/100/200 và qua các trang; số dòng đọc từ PO.js, số dòng đầu 48 và số dòng qua bộ lọc được hiển thị riêng.
- Bộ lọc nhanh Tất cả / Chưa hoàn tất / Chờ từ 60 ngày / Đã nhận đủ giúp chuyển báo cáo tức thời. Nút Xóa bộ lọc quay về Tất cả trạng thái.
- **Xuất Excel luôn xuất toàn bộ các dòng của kết quả lọc** theo thứ tự đang sắp xếp, không giới hạn trang phân trang hiện tại.
- Bộ lọc theo số PO bắt đầu 48 là quy tắc cố định, không thể tắt trong giao diện. File PO.js và GR.js gốc không bị thay đổi.

## Giao diện phiên bản mới

Dashboard sử dụng thanh điều hướng gọn, header thông tin nguồn riêng của PO/GR, bốn KPI, thanh xác nhận phạm vi PO 48*, bộ lọc trực quan và thanh trạng thái nhanh. Bảng có tiêu đề cố định khi cuộn dọc, cột PO cố định khi cuộn ngang, tối ưu tương phản và bố cục trên điện thoại. Không cần thư viện CSS hoặc font tải từ internet.

## Giao diện một trang và tự tải khi cuộn (10/11/2026)

- Loại phần header "Trung tâm theo dõi PO & GR" và banner "Phạm vi báo cáo"; thay bằng dải trạng thái nguồn nhỏ ngay dưới thanh công cụ.
- Bỏ **bộ lọc Nhà máy**. Nhà máy vẫn được giữ trong dữ liệu PO, popup chi tiết và file Excel, không ảnh hưởng phép đối chiếu.
- Ẩn cột **Khóa đối chiếu** trên bảng **và trong file Excel**. Ứng dụng vẫn dùng PO + Item + Material nội bộ để ghép PO/GR chính xác.
- Dữ liệu được hiển thị **trong một trang liên tục**, tự nối thêm 25/50/100/200 dòng (mặc định 50) khi cuộn đến cuối trang; **không thay thế các dòng đã tải**. Hai nút **Đầu / Cuối** nhảy nhanh đến lượt đầu hoặc lượt cuối.
- Trường "Tải mỗi lượt" chỉ quyết định số dòng thêm vào giao diện, không giới hạn dữ liệu đã đọc từ PO.js.
- **Xuất Excel theo bộ lọc** nằm trong thanh công cụ của bảng. File XLSX xuất **tất cả kết quả hiện được lọc và sắp xếp**, kể cả các dòng chưa cuộn tới. Không cần tải thêm từ mạng.
- Vẫn chỉ nhận PO bắt đầu bằng `48`, mặc định hiện mọi trạng thái và hỗ trợ dữ liệu PO/GR mới cùng định dạng cũ.

## Giao diện và xuất kết quả

Tìm theo PO, Item, Material, mô tả, nhà cung cấp, người tạo; lọc trạng thái, nhà cung cấp, nhà máy, khoảng ngày; lọc các dòng chờ từ 60 ngày. Có sắp xếp trên cột, phân trang 25/50/100/200, nhấp đúp hoặc Enter để xem chứng từ GR chi tiết.

Xuất **Excel .xlsx** theo toàn bộ kết quả lọc và thứ tự sắp xếp hiện tại (không chỉ trang đang xem). File xuất chứa các cột PO/GR trên giao diện và các thông tin Item, nhà cung cấp, nhà máy, người tạo, đơn giá và tiền tệ.

## Trạng thái dữ liệu mẫu trong GitHub

Ở thời điểm tạo trang, PO.js có **5 dòng PO**, GR.js có **2 dòng GR** nhưng số PO trên hai nguồn **chưa trùng nhau**. Vì vậy lượng nhận bằng 0 ở các dòng PO mẫu là kết quả đúng với dữ liệu hiện có, không có nghĩa hàm ghép PO/GR bị lỗi.

Hai nguồn mẫu trước đó thiếu `];` kết thúc bảng. PR chỉ bổ sung dấu đóng mảng để chúng chạy được, giữ nguyên các hàng đã có. Khi cập nhật bằng PO.js/GR.js đầy đủ cùng cấu trúc, bảng tự đối chiếu theo dữ liệu mới.

**Bảo mật:** Repository có thể công khai. Tránh tải dữ liệu mua hàng/nhà cung cấp thực tế lên GitHub công khai nếu đó là dữ liệu nội bộ.
