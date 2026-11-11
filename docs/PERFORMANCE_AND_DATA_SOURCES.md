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

Chương trình tạo checking-versions.js chỉ chứa hash SHA-256 rút gọn, không chứa dữ liệu Stock hoặc History. Các ảnh SAP_01.jpg, SAP_02.png... trong Material được xử lý thành thumbnail WebP 160px, ảnh xem trước 480px và 960px ở Material/_optimized; giữ nguyên ảnh gốc. Đồng thời sinh Material/manifest.js và manifest.json. Trình duyệt chọn preview bằng srcset/sizes. Script bỏ qua giải mã ảnh gốc khi mọi biến thể có hash tương ứng đã tồn tại, rồi xuất file phiên bản bằng thao tác thay thế sau khi hoàn tất ảnh/manifest.

**Chạy lại lệnh sau khi thay đổi data.js, History.js, Amount.js hoặc ảnh vật tư.** Có thể gắn lệnh vào tác vụ đồng bộ SAP ở máy nội bộ.

## Cơ chế tải

- HTTP(S): kiểm tra HEAD/ETag hoặc Last-Modified của data.js mỗi 30 giây, History.js mỗi 60 giây sau lần tải đầu. Nếu file không đổi, bỏ qua tải và lập chỉ mục. Nếu server không có validator, trở về chế độ tải cũ.
- file://: dùng checking-versions.js nhỏ để biết khi nào cần tải lại Stock/History. Nếu không có file phiên bản, Stock dùng tải lại dự phòng còn History tải khi cần, không tải tự động liên tục file dung lượng lớn.
- Amount.js: nạp từ cùng thư mục với HTML, làm mới theo chu kỳ và nút trên giao diện. Tổng giá trị của Tất cả và Hall 1 bằng nhau; Hall 2 không có giá trị.
- HistoryWorker.js: JSON.parse, chuẩn hóa ngày/chiều giao dịch, lập chỉ mục ngày xuất cuối và sắp xếp bản ghi trên luồng riêng. Kết quả đã lập chỉ mục được gửi về cho bảng và dashboard; một số phép tổng hợp dashboard vẫn chạy ở luồng chính. Worker cũ/không có vẫn dùng đường đọc dự phòng.
- IndexedDB: cache một bản History đã lập chỉ mục có hiệu lực tối đa 24 giờ, gắn với ETag/Last-Modified và schema 3. Cache schema cũ được thay thế sau lần đọc lại đầu tiên. Người dùng có nút xóa cache ngay trên Dashboard. File mở trực tiếp qua file:// không lưu cache IndexedDB.
- Material: HTTP ưu tiên manifest.json, mở file trực tiếp dùng manifest.js. Nút Đồng bộ tải lại manifest và bộ sưu tập đang chọn; lỗi tải manifest chỉ cache ngắn hạn rồi cho thử lại. Đổi SAP hủy các yêu cầu dò ảnh của SAP cũ, không ghi kết quả bị hủy thành lỗi "không có ảnh". Nếu manifest không tồn tại, tiếp tục cơ chế dò cũ.

## Tìm kiếm và cập nhật nguồn

- Mã SAP đã nhận diện, hoặc danh sách SAP ở chế độ Mã SAP, được tra qua Map tới tất cả các dòng nguồn tương ứng; vẫn giữ các dòng trùng SAP ở nhiều vị trí. Danh sách ở Tất cả có mã SAP đã biết vẫn dùng đường tra nhanh khi có thêm mã không tồn tại. Danh sách mã phụ tùng thuần túy giữ cách tìm cũ; các từ khóa còn lại được chuẩn hóa một lần mỗi truy vấn. Dòng tóm tắt phân biệt mã có/chưa có trong nguồn, độc lập với bộ lọc tồn kho.
- Sắp xếp Stock và Danh mục tạo một Intl.Collator mỗi lần sắp xếp; Stock chuẩn hóa khóa so sánh trước khi sort, không tạo bộ so sánh/phân tích số ở mỗi lần so hai dòng. Bộ định dạng tiền dùng lại theo VI/EN.
- Lịch sử theo SAP được lập Map một lần cho mỗi phiên bản History, rồi lọc Hall/ngày/Cost Center trên các bản ghi đúng SAP. Quy tắc Hall 1/Tất cả/Hall 2 không thay đổi.
- Dấu phẩy đơn là dấu thập phân SAP: `0,125` = 0.125; không diễn giải `1,234` thành 1234. Số JavaScript và định dạng kết hợp `1.234,56`/`1,234.56` vẫn được đọc. Ngày Excel serial chấp nhận cả số và chuỗi số; ngày lịch không hợp lệ để trống.
- Nguồn Stock có ETag/hash mới được lập lại chỉ mục dù timestamp trong file giữ nguyên. Phiên bản chỉ được chốt sau khi lập chỉ mục thành công. Bản tải không gán mảng dữ liệu mới không được sử dụng lại global cũ để báo thành công. Các script Stock/History legacy chia sẻ global được nạp tuần tự khi chạy offline.

## Danh mục Database

- Nhấn mã SAP trong Danh mục mở Tra cứu tồn kho và ảnh của mã đó; không đọc nhầm data.js làm nguồn danh mục.
- Khi mở file trực tiếp, mỗi lần Làm mới đọc Database trong iframe ẩn mới rồi nhận hai mảng qua postMessage (kiểm tra source và token). Cách này cho phép nạp lại các khai báo const DATABASE_* mà không khai báo trùng trong trang chính.
- Database hiện có trên repository bị cắt giữa dòng. Cần xuất/upload lại file đầy đủ; không thể tái tạo dữ liệu đã thiếu bằng cách thêm dấu đóng mảng. App tiếp tục báo lỗi định dạng/incomplete và không tự ghép dữ liệu giả.
- Kiểm tra file mới trước khi thay thế bản đang dùng:

      python scripts/validate_catalog.py "/path/to/Database"

  Lệnh kiểm tra hai mảng JSON, cột bắt buộc và số cột từng dòng mà không chạy nội dung JavaScript.

## Cấu hình máy chủ và kiểm thử

Với HTTP(S) nội bộ, bật nén văn bản cho JS/JSON. Các ảnh WebP có hash trong tên có thể dùng Cache-Control private, max-age=31536000, immutable. Manifest và file phiên bản cần revalidate bằng ETag/no-cache; không áp cache dài hạn bất biến cho đường dẫn manifest cố định. Các thiết lập này thuộc máy chủ triển khai, không được tự áp dụng bởi HTML.

Workflow chạy kiểm thử Stock/History thật, số thập phân, Map SAP, Worker so với fallback, cập nhật cùng timestamp/ETag khác, hủy dò ảnh, preview responsive, VI/EN và làm mới Database nhiều lần trên file://. Không cam kết thời gian tải NAS/điện thoại từ phép thử Node mô phỏng; đo tại thiết bị/mạng thực tế trước khi đặt mục tiêu thời gian phản hồi.

## Số liệu và cảnh báo

Tỷ lệ thay đổi tổng giá trị tồn kho = (giá trị bản ghi Amount mới nhất - giá trị bản ghi trước đó) / giá trị bản ghi trước đó x 100%. Khi không đủ hai mốc hoặc kỳ trước bằng 0, app không tự tạo phần trăm.

Các cảnh báo: tổng giá trị kho thay đổi từ 10% trở lên; dòng vật tư còn 0 hoặc tồn không vượt Reorder Point; giá trị xuất chung hoặc theo từng mã SAP tăng trên 100% so với kỳ trước (chỉ khi kỳ trước dương).

Nhấp hoặc dùng Enter/Space vào cột tuần/tháng/năm của biểu đồ nhập/xuất để mở lịch sử giao dịch đúng bộ lọc Hall và khoảng ngày, phân trang 50 dòng.

## Bảo mật và kiểm tra

History lưu trong IndexedDB của profile trình duyệt có thể chứa thông tin SAP nội bộ; chỉ dùng trên thiết bị được phép và nhấn Xóa bộ nhớ đệm lịch sử nếu dùng máy chung. Không tự động tải dữ liệu lên dịch vụ bên ngoài.

Trước khi triển khai, kiểm tra trạng thái tải tại Dashboard (ngày nguồn cập nhật, số dòng, thời gian nạp), lưu ý lỗi HistoryWorker.js nếu chưa sao chép sang thư mục và kiểm tra ảnh được tạo đúng tên SAP. So sánh thời gian tải thực tế trước và sau tối ưu trên mạng NAS nội bộ.
