# Triển khai tối ưu Checking trên máy nội bộ

## Vị trí file

Lưu Checking.html, data.js, History.js, Amount.js, HistoryWorker.js và checking-versions.js cùng một thư mục. Ảnh vật tư và manifest.js nằm trong thư mục con Material/. Dữ liệu SAP không cần đưa lên GitHub.

## Tạo version và WebP

Cài Pillow:

    python -m pip install -r scripts/requirements-images.txt

Sau khi đồng bộ SAP và chép ảnh vào Material, chạy:

    python scripts/prepare_stock_assets.py --root "/path/to/Quản lý kho"

Nếu chỉ cần phiên bản dữ liệu mà không tạo ảnh:

    python scripts/prepare_stock_assets.py --root "/path/to/Quản lý kho" --no-images

Chương trình tạo checking-versions.js chỉ chứa hash SHA-256 rút gọn, không chứa dữ liệu Stock hoặc History. Các ảnh SAP_01.jpg, SAP_02.png... trong Material được xử lý thành thumbnail WebP 160px và ảnh xem trước WebP 960px ở Material/_optimized; giữ nguyên ảnh gốc. Đồng thời sinh Material/manifest.js và manifest.json.

**Chạy lại lệnh sau khi thay đổi data.js, History.js, Amount.js hoặc ảnh vật tư.** Có thể gắn lệnh vào tác vụ đồng bộ SAP ở máy nội bộ.

## Cơ chế tải

- HTTP(S): kiểm tra HEAD/ETag hoặc Last-Modified của data.js mỗi 30 giây, History.js mỗi 60 giây sau lần tải đầu. Nếu file không đổi, bỏ qua tải và lập chỉ mục. Nếu server không có validator, trở về chế độ tải cũ.
- file://: dùng checking-versions.js nhỏ để biết khi nào cần tải lại Stock/History. Nếu không có file phiên bản, Stock dùng tải lại dự phòng còn History tải khi cần, không tải tự động liên tục file dung lượng lớn.
- Amount.js: nạp từ cùng thư mục với HTML, làm mới theo chu kỳ và nút trên giao diện. Tổng giá trị của Tất cả và Hall 1 bằng nhau; Hall 2 không có giá trị.
- HistoryWorker.js: xử lý JSON.parse History trên luồng riêng khi được hỗ trợ; fallback phân tích an toàn trên luồng chính khi Worker không có.
- IndexedDB: cache một bản History đã lập chỉ mục có hiệu lực tối đa 24 giờ, gắn với ETag/Last-Modified. Người dùng có nút xóa cache ngay trên Dashboard. File mở trực tiếp qua file:// không lưu cache IndexedDB.
- Material: sử dụng manifest để không dò lần lượt tới 22 tên ảnh. Nếu manifest không tồn tại, tiếp tục cơ chế dò cũ.

## Số liệu và cảnh báo

Tỷ lệ thay đổi tổng giá trị tồn kho = (giá trị bản ghi Amount mới nhất - giá trị bản ghi trước đó) / giá trị bản ghi trước đó x 100%. Khi không đủ hai mốc hoặc kỳ trước bằng 0, app không tự tạo phần trăm.

Các cảnh báo: tổng giá trị kho thay đổi từ 10% trở lên; dòng vật tư còn 0 hoặc tồn không vượt Reorder Point; giá trị xuất chung hoặc theo từng mã SAP tăng trên 100% so với kỳ trước (chỉ khi kỳ trước dương).

Nhấp hoặc dùng Enter/Space vào cột tuần/tháng/năm của biểu đồ nhập/xuất để mở lịch sử giao dịch đúng bộ lọc Hall và khoảng ngày, phân trang 50 dòng.

## Bảo mật và kiểm tra

History lưu trong IndexedDB của profile trình duyệt có thể chứa thông tin SAP nội bộ; chỉ dùng trên thiết bị được phép và nhấn Xóa bộ nhớ đệm lịch sử nếu dùng máy chung. Không tự động tải dữ liệu lên dịch vụ bên ngoài.

Trước khi triển khai, kiểm tra trạng thái tải tại Dashboard (ngày nguồn cập nhật, số dòng, thời gian nạp), lưu ý lỗi HistoryWorker.js nếu chưa sao chép sang thư mục và kiểm tra ảnh được tạo đúng tên SAP. So sánh thời gian tải thực tế trước và sau tối ưu trên mạng NAS nội bộ.
