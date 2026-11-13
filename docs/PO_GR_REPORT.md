# Báo cáo PO/GR và yêu cầu vật tư

## Chạy ứng dụng

Đặt `PO_GR_Report.html`, `PO.js`, `GR.js`, `Request.js` cùng thư mục. Có thể mở HTML trực tiếp hoặc qua máy chủ nội bộ. Hai file `PO_GR_Report.html` và `PO_GR_Report` phải giống hệt và chỉ chứa một tài liệu HTML/một script khởi tạo.

PO hỗ trợ `window.duLieuPO` hoặc tên cũ `window.duLieuCongTy`; GR dùng `window.duLieuGR`, Request dùng `window.duLieuRequest`. Nhận mốc cập nhật riêng từng nguồn và tên cũ `window.thoiGianCapNhat`. Có tải lại hoặc chọn file thủ công; file thủ công được đọc bằng JSON parser, không thực thi nội dung tải lên. Khi các lượt đọc chồng nhau, chỉ lượt mới nhất của từng nguồn được phép cập nhật dữ liệu hoặc lỗi.

## Đối chiếu PO và GR

- Tab Theo dõi PO/GR chỉ hiển thị PO bắt đầu bằng `48`, kể cả các dòng đã nhận đủ. Nguồn PO đầy đủ vẫn được giữ để đối chiếu Request ngoài đầu 48.
- Ghép GR theo PO + Item + mã SAP. Item có số 0 đầu được chuẩn hóa; mã SAP giữ dạng chuỗi. Mặc định 101 cộng, 102 trừ; tùy chọn thêm 105/106.
- Chống trùng GR chỉ khi có đủ số chứng từ và số dòng chứng từ. Nếu thiếu số dòng chứng từ, giữ giao dịch và cảnh báo, không tự bỏ một dòng hợp lệ.
- Khác/thiếu đơn vị, số lượng lỗi, PO không dương hoặc GR ròng âm được báo cần kiểm tra; không tự quy đổi đơn vị.
- Số SAP có dấu phẩy thập phân được giữ chính xác, kể cả `81,078` = 81.078. Số Excel serial `46024` là ngày 02/01/2026. Số hiển thị có thể làm tròn nhưng dữ liệu Excel giữ giá trị số đầy đủ.
- Số lượng còn thiếu = max(0, lượng PO − GR ròng); phần trăm nhận = GR ròng/PO × 100 khi dữ liệu hợp lệ.
- Cột đầu bảng là **Tuần PO**, tính từ ngày chứng từ PO theo tuần ISO, có kèm năm tuần; ví dụ `WK01 · 2026`. Có lọc nhiều tuần và sắp xếp. Ngày PO không hợp lệ để tuần trống.
- Ngày chờ tính từ ngày PO; đã đủ hoặc nhận vượt không hiển thị ngày chờ. Màu theo ngưỡng 30/60/80 ngày.

## Trạng thái yêu cầu

Đối chiếu Request bằng số PO + mã SAP trên **toàn bộ PO.js**, rồi cộng các Item và GR cùng đơn vị. Không suy đoán PO khi Request thiếu số PO.

| Điều kiện | Trạng thái hiển thị |
| --- | --- |
| Có PO khớp, nguồn hợp lệ, GR ròng = 0 | Waiting for GR |
| GR ròng dương, nhận thiếu | Done |
| Đã nhận đủ hoặc vượt | Done |
| Thiếu nguồn, không khớp PO/SAP, lỗi số lượng/đơn vị, GR âm | Cần kiểm tra |
| Request chưa có số PO | Giữ trạng thái gốc |

Trạng thái gốc được giữ trong popup và cột cuối Excel. Kết quả đối chiếu chi tiết vẫn phân biệt nhận một phần/đã đủ/chưa có PO/không khớp. Hoàn nhập hết về GR ròng 0 chuyển lại Waiting for GR. KPI chờ GR đếm trạng thái này.

Lượng PO/GR có thể lặp ở nhiều Request cùng PO + SAP; không cộng các cột đó qua các Request để làm tổng kho hoặc tổng đã giao riêng từng yêu cầu.

Tuần Request lấy từ mã WK01–WK53 ở cuối File Name, không lấy từ ngày PO; popup và Excel vẫn giữ File Name đầy đủ.

## Bộ lọc

- Các bộ lọc danh sách ở cả hai tab cho chọn nhiều mục bằng checkbox: trạng thái, nhà cung cấp, tuần PO; trạng thái yêu cầu, kết quả đối chiếu, tuần file và Hall.
- Nhiều mục trong một bộ lọc lấy theo **hoặc**; giữa các bộ lọc lấy theo **và**. Không chọn mục nào nghĩa là tất cả. Có nút bỏ chọn tất cả và đóng menu khi bấm bên ngoài.
- Khoảng ngày vẫn là từ–đến; nếu ngày đầu lớn hơn ngày cuối, báo lỗi và không đưa số liệu không hợp lệ vào bảng/xuất.
- Tìm nhiều từ khóa ngăn bằng dấu phẩy/chấm phẩy/xuống dòng; hỗ trợ tìm không dấu tiếng Việt. Bộ lọc tự áp dụng, KPI và Excel cùng dùng tập kết quả lọc.

## Cuộn và hiệu năng

Hai bảng dùng cùng bộ điều khiển: cuộn dọc trang, cuộn ngang trong bảng, tiêu đề nổi đồng bộ vị trí và độ rộng cột. Cột đầu được giữ trên tiêu đề nổi; nút sắp xếp vẫn hoạt động.

Cuộn xuống đến cuối tải lượt kế tiếp, cuộn lên ở đầu cửa sổ hiện tại tải lại lượt trước. Số dòng đang dựng giới hạn 200, với mốc cuộn được giữ khi bỏ các dòng ngoài cửa sổ. Các nút Đầu/Cuối và cỡ lượt 25/50/100/200 vẫn hoạt động. Thay bộ lọc/sắp xếp quay về cửa sổ đầu; vẽ lại hoặc cuộn bằng code không tự nạp thêm. Cuộn trong menu bộ lọc/popup không làm bảng nền tải thêm; tab ẩn không được thay đổi cửa sổ.

Excel luôn xuất toàn bộ tập lọc theo thứ tự hiện tại, kể cả các dòng chưa dựng trong DOM; có hàng tiêu đề cố định và AutoFilter. Báo cáo PO thêm Tuần PO; báo cáo Request có cả trạng thái tính lại và trạng thái gốc.

## Kiểm thử

- `node tests/po_gr_integrity_logic.cjs`: cấu trúc HTML/ID, hai bản file, số thập phân, ngày/tuần ISO, nguồn lỗi/khôi phục, GR đảo bút toán, thiếu Item chứng từ, trạng thái mới, bộ lọc mảng và đọc file chồng nhau.
- `node tests/po_gr_report_browser.cjs` và `node tests/request_report_browser.cjs`: luồng cũ, nguồn thật, popup, xuất Excel, header nổi, cuộn toàn trang và mobile.
- `node tests/po_gr_upgrades_browser.cjs`: chọn nhiều checkbox, OR/AND, tuần, trạng thái GR ròng, đối chiếu PO ngoài 48, giới hạn DOM, cuộn tiến/lùi dùng chung và xuất toàn bộ kết quả.

Các bài trình duyệt cần Playwright và Chromium; GitHub Actions cài chúng và chạy kiểm tra khi sửa các file liên quan.
