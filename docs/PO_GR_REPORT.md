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

Cột **Tuần** của Request lấy mã WK01–WK53 ở cuối tên file. Năm ưu tiên mã năm 19xx/20xx tách riêng trong tên file; nếu không có thì lấy từ ngày yêu cầu, có xử lý năm tuần ISO tại ranh giới đầu/cuối năm khi mã tuần trùng ngày. Nếu không xác định được năm thì ghi rõ chưa rõ năm. Hiển thị `WK31 · 2026` và lọc theo khóa năm–tuần, tránh gộp cùng tuần ở hai năm. Popup và Excel vẫn giữ tên file đầy đủ.

`Waiting for GR` dùng màu tím, `Waiting for IR` màu vàng hổ phách, `Done` màu xanh. Cột Hall không hiển thị trên bảng Request; bộ lọc Hall, chi tiết và Excel vẫn giữ thông tin khu vực.

## Bộ lọc

- Các bộ lọc danh sách ở cả hai tab cho chọn nhiều mục bằng checkbox: trạng thái, nhà cung cấp, tuần PO; trạng thái yêu cầu, kết quả đối chiếu, tuần file và Hall.
- Nhiều mục trong một bộ lọc lấy theo **hoặc**; giữa các bộ lọc lấy theo **và**. Không chọn mục nào nghĩa là tất cả. Có nút bỏ chọn tất cả và đóng menu khi bấm bên ngoài.
- Khoảng ngày vẫn là từ–đến; nếu ngày đầu lớn hơn ngày cuối, báo lỗi và không đưa số liệu không hợp lệ vào bảng/xuất.
- Tìm nhiều từ khóa ngăn bằng dấu phẩy/chấm phẩy/xuống dòng; hỗ trợ tìm không dấu tiếng Việt. Bộ lọc tự áp dụng, KPI và Excel cùng dùng tập kết quả lọc.

## Cuộn và hiệu năng

Header nguồn hai tab cùng cao 52px trên desktop, header bảng 64px, các card và bộ lọc cùng kích thước gọn; màn hình nhỏ tự xuống dòng.

Hai bảng dùng cùng bộ điều khiển: cuộn dọc trang, cuộn ngang trong bảng, tiêu đề nổi đồng bộ vị trí và độ rộng cột. Cột đầu được giữ trên tiêu đề nổi; nút sắp xếp vẫn hoạt động.

Cuộn xuống đến cuối tải lượt kế tiếp, cuộn lên ở đầu cửa sổ hiện tại tải lại lượt trước. Số dòng đang dựng giới hạn 200, với mốc cuộn được giữ khi bỏ các dòng ngoài cửa sổ. Các nút Đầu/Cuối và cỡ lượt 25/50/100/200 vẫn hoạt động. Thay bộ lọc/sắp xếp quay về cửa sổ đầu; vẽ lại hoặc cuộn bằng code không tự nạp thêm. Đặt con trỏ giữa bảng vẫn cuộn dọc trang được; cuộn ngang vẫn thuộc bảng. Bỏ chặn cuộn dọc tiếp từ bảng ra trang và định tuyến con lăn dọc qua bộ điều khiển dùng chung; Ctrl/Shift hoặc cuộn ngang không bị chiếm. Cuộn trong menu bộ lọc/popup không làm bảng nền tải thêm; tab ẩn không được thay đổi cửa sổ.

Excel luôn xuất toàn bộ tập lọc theo thứ tự hiện tại, kể cả các dòng chưa dựng trong DOM; có hàng tiêu đề xanh đậm, độ rộng cột, hàng tiêu đề cố định và AutoFilter. Ngày là ô ngày thực, tiền/số có định dạng riêng, phần trăm lưu dạng tỷ lệ và hiển thị đúng định dạng %. Báo cáo PO thêm Tuần PO; báo cáo Request có cả trạng thái tính lại và trạng thái gốc.

## Dashboard yêu cầu vật tư

Tab **Dashboard yêu cầu** dùng chung Request.js, PO.js và GR.js với tab chi tiết, chỉ nạp Request khi cần. Bộ lọc dashboard độc lập với bộ lọc danh sách: tìm mã/tên/ghi chú, nhiều năm, nhiều tuần, trạng thái, phụ trách/Supplier, Hall, loại đặt, kết quả đối chiếu và khoảng ngày. Chọn năm cập nhật danh sách tuần theo năm đó; nhiều mục cùng bộ lọc lấy OR, giữa bộ lọc lấy AND. Dòng không rõ năm hoặc thiếu thông tin có nhóm riêng.

- Tám KPI: số yêu cầu, giá trị EUR, Waiting for IR, Waiting for GR, nhập một phần, nhận đủ/vượt, tỷ lệ khớp PO + SAP và số dòng cần kiểm tra.
- Bảy biểu đồ: xu hướng theo tuần/tháng/năm (đổi giữa EUR/số dòng), cơ cấu trạng thái, top 10 vật tư, top 10 phụ trách, tiến độ đối chiếu, thời gian chờ và loại đặt hàng. Bấm trạng thái/phụ trách/loại đặt/kết quả đối chiếu để lọc; bấm vật tư để tìm mã. Có bảng dữ liệu cho biểu đồ xu hướng và nhãn số liệu cho các biểu đồ khác.
- Bảng chi tiết tối đa 50 dòng mỗi trang, sắp xếp giá trị/ngày/tuần/SAP; nhấp đúp hoặc Enter mở popup đối chiếu dùng chung. Excel xuất toàn bộ kết quả theo thứ tự sắp xếp, kể cả các trang chưa hiển thị.
- Giá trị EUR ưu tiên Amount(EUR) hợp lệ không âm; thiếu/lỗi thì tính Price(EUR) × Qty khi cả hai hợp lệ không âm. Số 0 là giá trị hợp lệ. Thiếu cả hai cách được báo rõ và không cộng vào tổng; Excel Dashboard có cột **Cách tính giá trị EUR**. Các số chính xác trong nguồn, ví dụ `81,078` = 81.078, được giữ trong ô số Excel.
- Giá trị theo trạng thái là **giá trị yêu cầu**, không phải chi phí GR hoặc giá trị nhập kho. Không cộng tổng lượng PO/GR lặp ở nhiều yêu cầu cùng PO/SAP, không cộng số lượng khác đơn vị. Số PO và số mã SAP được đếm duy nhất.
- Done có thể mới nhập một phần. KPI và biểu đồ đối chiếu tách riêng nhập thiếu/đã đủ. Nhóm ngày chờ chỉ áp dụng Waiting for IR/GR, loại ngày thiếu/tương lai và báo số dòng bị loại.
- Khi nguồn lỗi, dashboard bỏ kết quả cũ; sau tải lại thành công, biểu đồ và bộ lọc cập nhật theo dữ liệu mới. Không cần thư viện biểu đồ hoặc CDN; SVG và DOM được dựng trực tiếp, nhãn dữ liệu luôn là text.

## Định dạng số Excel

Cả hai báo cáo và Dashboard dùng chung bộ xuất XLSX. Số lượng/ngày chờ là số nguyên dùng `#,##0`, không còn dấu thập phân rỗng (dấu phẩy trên máy dùng locale VI). Số lẻ dùng định dạng có ít nhất một chữ số thập phân; tiền giữ ít nhất hai chữ số, ngày và phần trăm dùng định dạng riêng. Không xóa dấu phẩy trong dữ liệu gốc vì đó có thể là dấu thập phân hợp lệ hoặc nội dung mô tả.

## Kiểm thử

- `node tests/po_gr_integrity_logic.cjs`: cấu trúc HTML/ID, hai bản file, số thập phân, ngày/tuần ISO, nguồn lỗi/khôi phục, GR đảo bút toán, thiếu Item chứng từ, trạng thái mới, bộ lọc mảng và đọc file chồng nhau.
- `node tests/po_gr_report_browser.cjs` và `node tests/request_report_browser.cjs`: luồng cũ, nguồn thật, popup, xuất Excel, header nổi, cuộn toàn trang và mobile.
- `node tests/request_dashboard_browser.cjs`: KPI và giá trị thiếu/ước tính, lọc nhiều năm/tuần, chọn checkbox, drill-down, phân trang, popup, xuất đầy đủ, khôi phục nguồn và màn hình nhỏ.
- `node tests/po_gr_upgrades_browser.cjs`: chọn nhiều checkbox, OR/AND, tuần, trạng thái GR ròng, đối chiếu PO ngoài 48, giới hạn DOM, cuộn tiến/lùi dùng chung và xuất toàn bộ kết quả.

Các bài trình duyệt cần Playwright và Chromium; GitHub Actions cài chúng và chạy kiểm tra khi sửa các file liên quan.
