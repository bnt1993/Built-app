# Audit Checking và hai tab hoạt động — 12/11/2026

Nguồn: `main` tại commit `38fb1a2b73480981b876489d21d6179b649eea5a`.

## Phát hiện và xử lý

| Mức | Phát hiện | Thay đổi |
| --- | --- | --- |
| Cao | Các thao tác Tra cứu dùng `querySelector(".table-wrapper")`. Sau khi thêm Lịch sử tìm kiếm trước Tra cứu trong DOM, chúng chọn nhầm bảng; sự kiện cuộn có thể đổi trang Stock khi đang xem lịch sử. | Giới hạn bốn selector vào `#view-stock`; mỗi tab mới có trạng thái phân trang và sự kiện cuộn riêng. |
| Vừa | CSS có quy tắc `body.stock-one-screen`, `dashboard-one-screen`, `catalog-one-screen` ưu tiên hơn quy tắc header chung. Hai tab mới không có bố cục workspace tương ứng. | Lớp điều khiển cuối áp dụng cùng độ ưu tiên cho mọi tab: header 56px, padding ngang, logo 34px, brand, nút và thanh tab. Hai tab mới có cùng heading, bộ lọc, bảng và phân trang. |
| Vừa | Lịch sử chỉ tìm từ khóa, chưa lọc phạm vi/ngày hoặc sắp xếp; đổi ngôn ngữ không vẽ lại nội dung động. | Thêm bộ lọc kết hợp, sắp xếp thời gian/từ khóa/phạm vi, số kết quả, phân trang 25/50/100, cập nhật VI/EN. |
| Vừa | Yêu cầu chưa sắp xếp, chưa lọc vị trí; đơn vị nguồn `BUn` chưa được nhận diện. Yêu cầu cũ thiếu vị trí dò toàn bộ Stock nhiều lần. | Thêm lọc vị trí và chưa có vị trí; sắp xếp bảy cột; số lượng/tồn kho sắp xếp theo số; nhận `BUn`, `Unit of Entry`; dùng chỉ mục SAP cho vị trí cũ. |
| Vừa | Dữ liệu localStorage là mảng nhưng chứa `null` hoặc bản ghi lỗi có thể làm phần dựng giao diện dừng. | Kiểm tra cấu trúc, thời gian, mã và số lượng trước khi hiển thị. Giữ bản ghi hợp lệ; không ghi đè bản lưu khi chỉ lọc/sắp xếp. |
| Vừa | Loader ảnh đọc `manifest.js` ở thư mục gốc, trong khi cấu hình ảnh là `Material/`; bộ sưu tập chờ manifest hoàn tất trước khi dò ảnh. | Đọc từ thư mục ảnh đã cấu hình; chờ ưu tiên manifest tối đa 120ms rồi dò trực tiếp. Manifest đến sau vẫn hủy dò và thay đúng bộ ảnh. |
| Thấp | Kiểm thử performance chưa cung cấp hàm ghi lịch sử; một số bài kiểm tra ảnh vẫn giả lập loader manifest JSON cũ. | Cập nhật mô phỏng sang manifest JS, kiểm tra đường dẫn, thành công/thất bại khi tải lại và giới hạn số ảnh theo cấu hình hiện tại. |

## Hành vi của hai tab

- Tìm kiếm không dấu; các bộ lọc tự áp dụng và kết hợp với nhau.
- Ngày lọc theo ngày địa phương của trình duyệt, bao gồm cả hai ngày đầu/cuối. Khoảng ngày đảo ngược được báo lỗi và không cho xuất dữ liệu.
- Nhấn tiêu đề cột để đổi tăng/giảm; có dấu hướng và `aria-sort`. Giá trị số thiếu nằm cuối ở cả hai hướng.
- Bộ lọc hoặc sắp xếp mới đưa về trang đầu; số kết quả tính trên toàn bộ tập lọc. Thao tác sắp xếp không thay thứ tự dữ liệu đã lưu.
- Phân trang riêng 25/50/100, đầu/trước/sau/cuối. Cuộn đến biên chuyển trang trong đúng bảng đang xem; cuộn lên về cuối trang trước.
- Excel Yêu cầu xuất toàn bộ tập đã lọc theo thứ tự sắp xếp hiện tại, gồm vị trí vật tư, giữ header cố định và AutoFilter; không giới hạn theo trang đang xem.
- Trên desktop đủ lớn, header/thanh tab giữ vị trí, nội dung bảng cuộn trong phần còn lại. Màn hình nhỏ dùng bộ lọc hai cột và cuộn ngang bên trong bảng.
- Lịch sử tối đa 100 lượt, yêu cầu tối đa 500 bản ghi, vẫn là dữ liệu trên trình duyệt hiện tại. Tab Yêu cầu này không phải báo cáo đối chiếu `Request.js` trong `PO_GR_Report`.

## Kiểm tra dự án

- 12 bộ kiểm tra logic Node, gồm bộ mới `checking_activity_logic.cjs`: đạt tại môi trường sửa code.
- `python -m unittest discover -s tests -p 'test_*.py'`: 6 kiểm tra đạt.
- Các script inline trong Checking, hai bản PO_GR_Report và VLOOKUP đều phân tích cú pháp thành công. Hai bản PO_GR_Report hiện giống nhau.
- Bài mới `checking_activity_browser.cjs` được đưa vào GitHub Actions: kiểm tra khôi phục tab, đo header/brand/workspace/thanh tab giữa năm tab ở VI/EN, lọc kết hợp, sort số, phân trang/cuộn, tìm lại, xuất XLSX, tạo yêu cầu với BUn, sáng/tối và tràn ngang trên desktop/mobile.
- Môi trường sửa code không khởi chạy được Chromium (lỗi hệ thống tạo socket). Bài kiểm tra trình duyệt của hai tab đã đạt trên GitHub Actions, gồm đo header và các tương tác nêu trên. Trạng thái toàn bộ kiểm tra hồi quy cần xem ở workflow của PR.

## Các việc nên tách tiếp

1. `Checking` là một HTML lớn, nhiều lớp CSS ghi đè qua các lần sửa. Tách shell/layout dùng chung, bộ đọc dữ liệu và từng tab thành các phần riêng để giảm lỗi do thứ tự DOM/độ ưu tiên CSS.
2. Repo chưa có `data.js` Stock thực tế. Các bài trình duyệt dùng dữ liệu kiểm thử; cần kiểm tra đường dẫn nguồn và tên cột trên môi trường nội bộ có dữ liệu thật trước khi triển khai.
3. `PO_GR_Report` và `PO_GR_Report.html` là hai bản trùng nhau; nên sinh từ một nguồn để tránh lệch bản về sau.
4. VLOOKUP còn phụ thuộc CDN cho Tailwind/XLSX. Muốn sử dụng offline hoàn toàn cần đóng gói các thư viện tại máy chủ nội bộ.
5. Nếu cần chia sẻ yêu cầu giữa thiết bị/người dùng, bổ sung API và kho lưu phía máy chủ; localStorage hiện chỉ phục vụ lịch sử trên trình duyệt.
