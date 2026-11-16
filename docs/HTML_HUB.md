# Quản lý các HTML con bằng Built-app

`HTML_Hub.html` là trang quản lý độc lập, mở trực tiếp bằng trình duyệt, không cần cài Node, Python, máy chủ hoặc kết nối Internet. Mã CSS, JavaScript và biểu tượng nằm trong cùng tệp. Không có đăng nhập, tải dữ liệu lên mạng hoặc đồng bộ giữa thiết bị.

## Mở từ mã nguồn repo

1. Tải repo bằng **Code → Download ZIP**, giải nén toàn bộ.
2. Trên Windows, nhấp đúp **Mo_HTML_Hub.bat**. Mỗi lần chạy, tệp này chép bản gốc `Checking` sang `Checking.html` và mở `HTML_Hub.html` bằng trình duyệt mặc định. Bản sao được cập nhật lại khi nguồn Checking thay đổi; không sửa trực tiếp bản sao nếu cần giữ thay đổi.
3. Trên macOS/Linux, tự chép `Checking` thành `Checking.html` trong cùng thư mục rồi mở `HTML_Hub.html`.
4. Chọn **Mở ứng dụng** trên thẻ. Có thể mở tối đa 6 ứng dụng trong các thẻ riêng. Chọn **Thư viện** để quay lại; các thẻ vẫn giữ trạng thái. Đóng thẻ, sửa ứng dụng, khôi phục thư viện hoặc đóng trình duyệt sẽ bỏ vùng làm việc tương ứng; lưu dữ liệu trong trang con trước.

Các liên kết mặc định:

| Ứng dụng | Đường dẫn |
| --- | --- |
| Quản lý kho SAP | `Checking.html` (bản sao từ `Checking`) |
| Theo dõi PO / GR | `PO_GR_Report.html` |
| Sơ đồ kho 3D | `Layout WH.html` |
| VLOOKUP nâng cao | `VLOOKUP_Nâng_Cao_Offline.html` (giữ nguyên tên Unicode trong repo) |

Hub không thay đổi mã nguồn hoặc dữ liệu của các trang con. Thời điểm “đã mở” là lúc người dùng chọn mở, không chứng nhận trang con đã nạp dữ liệu thành công.

## Thêm và quản lý

- **Liên kết HTML trong cùng thư mục:** nhập tên, danh mục, mô tả và đường dẫn, ví dụ `tools/Bao_cao.html`. Giữ nguyên cây thư mục của JS, CSS, ảnh và dữ liệu. Liên kết chỉ lưu đường dẫn, không chép nội dung. Đường dẫn phải nằm bên trong thư mục của Hub, không nhận URL mạng, đường dẫn ổ đĩa hoặc `../`.
- **Lưu bản sao một tệp HTML:** chọn `.html`, `.htm`, `.txt` chứa HTML hoặc tệp không đuôi qua tùy chọn “Tất cả tệp” trong hộp thoại. Nội dung HTML được lưu trong trình duyệt, tối đa 10 MB/tệp. Không chép kèm tệp phụ thuộc. Phù hợp nhất với HTML tự chứa; bản sao mở trong iframe giới hạn quyền truy cập trang quản lý, bộ nhớ trình duyệt, trang cha và cửa sổ mới. Có nút **Tải HTML** để lấy lại nội dung.
- Dùng nút sao để đánh dấu yêu thích, nút bút để sửa, nút thùng rác để xóa khỏi danh sách sau xác nhận. Xóa không tác động tệp gốc trên máy.
- Tìm kiếm bỏ qua dấu tiếng Việt; tìm theo tên, mô tả, danh mục, đường dẫn. Lọc theo danh mục, yêu thích, các trang đã mở; sắp xếp theo tên và thời gian. Có dạng lưới/danh sách và giao diện sáng/tối. `Ctrl+K` / `Cmd+K` tập trung ô tìm kiếm.

## Lưu và sao lưu

Hub dùng IndexedDB để lưu thư viện, bản sao HTML, giao diện, yêu thích và lịch sử mở. Không tự đọc toàn bộ ổ đĩa. Giữ tên và vị trí của `HTML_Hub.html`, dùng cùng trình duyệt/hồ sơ để tiếp tục; hành vi lưu trữ với `file://` phụ thuộc trình duyệt. Khi trình duyệt chặn lưu hoặc đầy bộ nhớ, Hub hiển thị cảnh báo và cho phép làm việc trong phiên hiện tại.

**Sao lưu** tải một JSON gồm danh sách và toàn bộ HTML đã nhập. **Khôi phục** kiểm tra định dạng, đường dẫn, kích thước, mã trùng; chỉ thay thế thư viện sau xác nhận. Giới hạn 200 ứng dụng, 30 MB cho bản sao lưu. Đừng xóa bản sao lưu cho tới khi đã kiểm tra khôi phục. Sao lưu của Hub không chứa dữ liệu mà các trang con lưu riêng. Các liên kết cần được chép cùng tệp gốc và các phụ thuộc khi chuyển máy.

## Khả năng chạy offline của trang con

Trang quản lý chạy hoàn toàn offline. Mỗi HTML con vẫn có các yêu cầu riêng:

- **Checking:** cần các tệp nguồn dữ liệu, lịch sử và ảnh phù hợp theo cấu hình của Checking. Dữ liệu thiếu từ repo không được Hub tự tạo.
- **PO / GR:** giữ các nguồn PO, GR, Request đi kèm và dùng chức năng nhập dữ liệu hiện có.
- **Sơ đồ kho:** `data.txt` chứa dữ liệu cá nhân không có sẵn trong repo; dùng chức năng nhập/liên kết tệp của trang nếu cần.
- **VLOOKUP:** bản hiện tại lấy Tailwind, Font Awesome, SheetJS và phông chữ từ Internet. Muốn dùng đầy đủ offline, tải thư viện về và sửa các tham chiếu trong trang con. Hub hiển thị ghi chú này trong mô tả mặc định, không tự tải thư viện.

Nếu iframe không chạy do quyền tệp của trình duyệt, thử **Mở tệp gốc**, kiểm tra tên/đường dẫn, hoặc tạo bản `.html` cho nguồn không có đuôi. Mở từ ứng dụng quản lý tệp trên điện thoại có thể vào chế độ xem trước thay vì trình duyệt có JavaScript; hỗ trợ phụ thuộc hệ điều hành, không tương đương một ứng dụng cài đặt.

## Kiểm tra

Kiểm tra trình duyệt bao gồm mở qua `file://` không có mạng, nhập HTML và giữ sau nạp lại, khung sandbox, liên kết có tên Unicode/khoảng trắng, tìm kiếm/lọc, yêu thích, khôi phục hợp lệ và từ chối đường dẫn không an toàn, nhiều thẻ, giao diện điện thoại và xử lý lỗi lưu trữ.

```sh
npm install --no-save playwright
npx playwright install chromium
node tests/html_hub_browser.cjs
```

Có thể đặt `CHROMIUM_EXECUTABLE=/usr/bin/chromium` để dùng trình duyệt đã có sẵn. Bộ kiểm tra không sửa hoặc thực thi chức năng nghiệp vụ trong các trang kho hiện hữu.
