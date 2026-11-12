# Bảng Yêu cầu và Lịch sử tìm kiếm

## Bố cục

- Yêu cầu giới hạn chiều rộng phần nội dung ở 1100px; Lịch sử tìm kiếm ở 900px. Cột tên vật tư/từ khóa rộng hơn, cột số lượng, đơn vị và thao tác gọn lại.
- Chiều rộng cột được khai báo bằng `colgroup`; bảng không trải dữ liệu trên toàn màn hình lớn. Nội dung dài xuống dòng, có tooltip đầy đủ; số lượng căn phải.
- Màn hình nhỏ cuộn ngang bên trong bảng. Header ứng dụng và cách chuyển trang vẫn dùng bố cục chung đã có.

## Chọn và xóa

- Checkbox đầu dòng chọn riêng một bản ghi. Checkbox đầu bảng chỉ chọn/bỏ chọn **trang hiện tại**, có trạng thái chọn một phần.
- Nút **Chọn tất cả N kết quả** chọn toàn bộ kết quả của bộ lọc, gồm các trang chưa hiển thị. Không có bộ lọc thì chọn toàn bộ bảng.
- Lựa chọn giữ nguyên khi chuyển trang, đổi số dòng/trang, sắp xếp hoặc đổi ngôn ngữ. Đổi bộ lọc sẽ bỏ lựa chọn; hai tab giữ lựa chọn riêng.
- Có nút Xóa riêng từng dòng và nút Xóa dòng đã chọn. Hộp xác nhận ghi số dòng và tab sẽ bị xóa. Hủy xác nhận giữ nguyên dữ liệu.
- Nếu xóa hết bản ghi của đơn vị/vị trí đang lọc, lựa chọn bộ lọc vẫn được giữ để hiển thị kết quả rỗng; không tự mở rộng sang dữ liệu ngoài bộ lọc.
- Sau khi xóa, số kết quả, phân trang, lựa chọn và trạng thái xuất Excel cập nhật ngay.

## Định danh, lưu và hoàn tác

- Mỗi bản ghi có ID ổn định, độc lập mã SAP, thời gian, vị trí trong mảng và thứ tự đang sắp xếp. Dữ liệu cũ được gán ID khi tải; ID thiếu/trùng/không hợp lệ được thay thế. Hai yêu cầu trùng mã và thời gian vẫn có thể xóa riêng.
- Xóa/hoàn tác ghi vào cùng khóa localStorage hiện có. Chỉ đổi dữ liệu trong bộ nhớ sau khi ghi thành công; lỗi lưu không làm mất bản ghi.
- Mỗi tab có thể hoàn tác **lần xóa gần nhất trong phiên hiện tại**. Tải lại trang sẽ kết thúc khả năng hoàn tác, còn dữ liệu đã lưu vẫn giữ nguyên.
- Hoàn tác bổ sung bản ghi bị xóa vào dữ liệu hiện tại, giữ bản ghi mới tạo sau đó. Lịch sử tìm kiếm không tạo bản trùng từ khóa/phạm vi nếu người dùng đã tìm lại. Khi đạt giới hạn 100 lượt tìm kiếm hoặc 500 yêu cầu, ứng dụng báo chưa đủ chỗ để khôi phục và giữ nguyên dữ liệu.

## Kiểm tra

`node tests/checking_activity_logic.cjs` kiểm tra ID, bản ghi trùng, hủy xác nhận, xóa đúng bản ghi, dữ liệu lưu, hoàn tác khi có bản ghi mới, lỗi lưu và giới hạn khôi phục.

`node tests/checking_activity_browser.cjs` kiểm tra bố cục gọn, lựa chọn qua trang/sắp xếp, checkbox chọn một phần, xóa từng dòng/nhiều dòng/tất cả, phạm vi lọc, hoàn tác, tải lại, VI/EN và mobile; đồng thời chạy lại các luồng lọc, Excel, header và tạo yêu cầu trước đó.
