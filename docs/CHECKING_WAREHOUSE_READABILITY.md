# Checking.html — Tổng quan và Phân tích kho

Bản nâng cấp này áp dụng cho `Checking.html`, là phiên bản được audit ngày 17/11/2026. Tệp `Checking` không phần mở rộng hiện là một phiên bản riêng; PR không thay thế phiên bản đó bằng nội dung mới hơn.

## Bố cục

- Tổng quan mặc định có bốn chỉ số trong cùng kỳ: tồn ghi nhận, nhập, xuất và chênh lệch nhập − xuất. Tồn ghi nhận chỉ lấy bản ghi Amount.js nằm trong kỳ, kèm ngày ghi nhận; không suy diễn tồn cuối kỳ.
- Hai biểu đồ dùng chung Khoảng thời gian và Nhóm theo (ngày/tuần/tháng/năm). Các kỳ thiếu định giá là khoảng trống, không nối thành một số dư giả định.
- Tuần cuối kỳ, tồn hiện tại, phân bố trạng thái, lịch sử định giá và chẩn đoán nguồn nằm trong mục Thông tin bổ sung.
- Phân tích kho chỉ mở một báo cáo toàn chiều rộng mỗi lần: Giá trị tồn cao, Xuất nhiều, Tồn lâu hoặc Mức sử dụng. Các nhóm ABC bị loại khỏi giao diện chính.
- Kỳ giao dịch chỉ áp dụng cho báo cáo Xuất nhiều. Các báo cáo dựa trên tồn hiện tại/12–24–36 tháng ghi rõ mốc tính và ẩn ô chọn kỳ không áp dụng.
- Nút Xem lịch sử, nhấn đúp và phím Enter cùng mở chi tiết. Báo cáo xuất giữ khu vực, khoảng ngày và loại Xuất khi mở lịch sử; báo cáo tồn lâu luôn dùng Hall 1.
- Xuất báo cáo đang xem áp dụng từ khóa, ngưỡng, sắp xếp và toàn bộ kết quả (không chỉ trang hiện tại). Kết quả lọc rỗng không được thay bằng toàn bộ dữ liệu.

## Sửa độ chính xác

- Lọc đúng ngày trước khi cộng vào nhóm tuần/tháng/năm; không tính giao dịch ngoài hai đầu khoảng chọn.
- Dòng chưa xác định tồn kho không được tính là dòng tồn dương.
- Chuyển Hall 2/nguồn chưa sẵn sàng xóa số liệu cũ, chỉ số phụ, phân trang và kết quả xuất đang giữ trong bộ nhớ.
- Không vẽ chiều cao giả cho cột có giá trị 0. Chênh lệch nhập − xuất không được gọi là dòng tiền.
- Hợp nhất các hàm vẽ/thống kê bị ghi đè để mỗi hàm có một triển khai chính.

## Kiểm tra

```sh
node tests/warehouse_readability_logic.cjs
npm install --no-save playwright@1.56.1
npx playwright install chromium --with-deps
node tests/warehouse_readability_browser.cjs
```

Các bộ kiểm thử mới đọc trực tiếp `Checking.html`; workflow cũng chạy khi tệp này thay đổi. Kiểm tra logic bao gồm biên ngày, dữ liệu thiếu so với 0, Hall 2, tỷ lệ tồn dương, Excel sau lọc, ID HTML và cú pháp script. Kiểm tra trình duyệt dùng dữ liệu giả lập, kiểm tra VI/EN, sáng/tối, bàn phím, bộ lọc, lịch sử, xuất tệp và chiều rộng 390/768/1440 px.
