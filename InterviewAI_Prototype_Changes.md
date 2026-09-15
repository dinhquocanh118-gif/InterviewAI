# Tóm tắt các thay đổi cần thực hiện cho prototype InterviewAI

## 1. Định hướng sản phẩm
- Chuyển InterviewAI từ demo AI Interview sang prototype của một sản phẩm SaaS thương mại.
- Giao diện cần tạo cảm giác đây là một sản phẩm thật có thể đăng ký, dùng thử, nâng cấp gói và theo dõi tiến trình luyện tập.
- Loại bỏ hoàn toàn định hướng AR.
- Nếu sau này có camera, phân tích biểu cảm hoặc ngôn ngữ cơ thể thì xem đó là tính năng AI riêng, không định vị sản phẩm là AR.

## 2. Ngôn ngữ giao diện
- Chuyển toàn bộ giao diện mặc định sang tiếng Việt.
- Giữ lại một số thuật ngữ quen thuộc như:
  - AI
  - CV
  - Premium
  - Pro
- Một số cách dịch nên dùng:
  - Dashboard → Tổng quan
  - Interview Library → Thư viện phỏng vấn
  - Start Interview → Bắt đầu phỏng vấn
  - Results → Kết quả
  - Interview History → Lịch sử phỏng vấn
  - Pricing → Bảng giá
  - Profile → Hồ sơ
  - Upgrade → Nâng cấp
  - Continue without account → Tiếp tục không cần tài khoản
- Có thể bổ sung VI / EN trong tương lai, nhưng tiếng Việt là mặc định.

## 3. Luồng người dùng
Luồng đề xuất:

**Trang chủ → Đăng nhập / Tiếp tục không cần tài khoản → Thiết lập hồ sơ hoặc tải CV → Chọn vị trí phỏng vấn → Phỏng vấn với AI → Kết quả → Tổng quan → Luyện tiếp / Nâng cấp**

Mục tiêu:
- Người dùng có thể dùng thử nhanh.
- Không bắt buộc đăng ký tài khoản trước khi trải nghiệm.
- Chỉ yêu cầu tạo tài khoản khi thật sự cần đồng bộ hoặc nâng cấp dịch vụ.

## 4. Chế độ khách - không cần tài khoản
Bổ sung nút:

**Tiếp tục không cần tài khoản**

Guest vẫn có thể:
- Tải CV.
- Chọn ngành nghề và vị trí.
- Thực hiện phỏng vấn với AI.
- Sử dụng microphone.
- Xem transcript.
- Nhận đánh giá AI.
- Xem kết quả.
- Xem lịch sử phỏng vấn.
- Xem tiến độ và điểm trung bình trên trang Tổng quan.

Thông báo nên hiển thị cho guest:

> Bạn đang sử dụng InterviewAI với tư cách khách. Dữ liệu của bạn chỉ được lưu trên thiết bị này. Hãy tạo tài khoản để đồng bộ tiến trình trên nhiều thiết bị.

Có nút:

**Tạo tài khoản miễn phí**

## 5. Lưu dữ liệu trên trình duyệt
Không bắt buộc xây database cloud cho prototype hiện tại.

Đề xuất:
- `localStorage`:
  - Thông tin cài đặt.
  - Hồ sơ cơ bản.
  - Vị trí gần đây.
  - Một số dữ liệu nhẹ.
- `IndexedDB`:
  - Lịch sử phỏng vấn.
  - Transcript dài.
  - Feedback.
  - Điểm số.
  - Dữ liệu CV hoặc dữ liệu có kích thước lớn hơn.

Dữ liệu guest:
- Chỉ tồn tại trên cùng trình duyệt và cùng thiết bị.
- Có thể mất khi người dùng xóa dữ liệu trình duyệt.
- Có thể không tồn tại khi dùng chế độ ẩn danh.
- Không đồng bộ sang thiết bị khác.

Trong phần Cài đặt nên có:
- Thông báo rõ dữ liệu được lưu trên thiết bị.
- Nút **Xóa toàn bộ dữ liệu**.

## 6. Tài khoản và đồng bộ
Prototype không cần bắt buộc đăng nhập.

Tài khoản chỉ cần thiết khi:
- Người dùng muốn đồng bộ dữ liệu giữa nhiều thiết bị.
- Người dùng muốn khôi phục dữ liệu.
- Người dùng muốn mua hoặc nâng cấp gói Premium / Pro.
- Sau này cần triển khai thanh toán thật.

Luồng đề xuất:

**Dùng thử miễn phí → thấy giá trị → muốn nâng cấp hoặc đồng bộ → tạo tài khoản**

## 7. Cấu trúc website
Chia thành 2 khu vực chính.

### 7.1. Public Website
Bao gồm:
- Trang chủ.
- Tính năng.
- Cách hoạt động.
- Bảng giá.
- Đăng nhập.
- Đăng ký.

### 7.2. Web App
Bao gồm:
- Tổng quan.
- Thư viện phỏng vấn.
- Tạo buổi phỏng vấn mới.
- Phòng phỏng vấn AI.
- Kết quả.
- Lịch sử phỏng vấn.
- Hồ sơ.
- Cài đặt.
- Gói dịch vụ.

## 8. Trang chủ
Nội dung chính nên gồm:
- Hero section.
- Giới thiệu ngắn về InterviewAI.
- Tính năng nổi bật.
- Cách hoạt động.
- Demo giao diện.
- Đánh giá người dùng giả lập.
- Bảng giá.
- FAQ.
- CTA cuối trang.

CTA chính:

**Bắt đầu phỏng vấn miễn phí**

CTA phụ:

**Xem cách hoạt động**

## 9. Trang Tổng quan
Hiển thị:
- Số buổi đã luyện.
- Điểm trung bình.
- Tổng thời gian luyện.
- Chuỗi ngày luyện tập.
- Buổi phỏng vấn được đề xuất.
- Lịch sử gần đây.
- Biểu đồ tiến bộ.
- Gợi ý buổi luyện tiếp theo.

Đối với prototype, các phần này có thể sử dụng dữ liệu thật từ localStorage / IndexedDB kết hợp mock data khi cần.

## 10. Thư viện phỏng vấn
Tạo các card theo ngành hoặc vị trí:

- Logistics.
- Marketing.
- Finance.
- IT.
- Management Trainee.
- English Interview.

Có bộ lọc:
- Tất cả.
- Logistics.
- Marketing.
- Finance.
- IT.
- Business.

## 11. Màn hình tạo buổi phỏng vấn
Nên chia khoảng 3 bước.

### Bước 1 - Vị trí mục tiêu
- Tên vị trí.
- Ngành nghề.
- Cấp độ kinh nghiệm.

### Bước 2 - Hồ sơ ứng viên
- Chọn hoặc tải CV.
- Job Description.
- Kỹ năng.
- Kinh nghiệm.

### Bước 3 - Cài đặt phỏng vấn
- Ngôn ngữ.
- Thời lượng.
- Độ khó.

Sau đó:

**Bắt đầu phỏng vấn**

## 12. Phòng phỏng vấn AI
Giao diện nên tối giản.

Thành phần:
- AI Interviewer.
- Câu hỏi hiện tại.
- Microphone.
- Trạng thái Listening / Thinking / Speaking.
- Transcript.
- Tiến độ buổi phỏng vấn.
- Nút tắt mic.
- Nút kết thúc phỏng vấn.

Không nên hiển thị điểm số liên tục trong lúc phỏng vấn để giữ cảm giác giống phỏng vấn thật.

## 13. Trang Kết quả
Cần đầu tư mạnh vì đây là nơi thể hiện giá trị của InterviewAI.

Hiển thị:
- Điểm tổng thể.
- Chất lượng câu trả lời.
- Khả năng giao tiếp.
- Mức độ phù hợp với vị trí.
- Cấu trúc câu trả lời.
- Điểm mạnh.
- Điểm cần cải thiện.

Theo từng câu hỏi:
- Câu hỏi.
- Câu trả lời của người dùng.
- Nhận xét của AI.
- Câu trả lời tốt hơn do AI đề xuất.

## 14. Bảng giá
Giữ mô hình:
- Free.
- Premium.
- Pro.

Ví dụ:

### Free
- 3 buổi phỏng vấn / tháng.
- Feedback cơ bản.

### Premium
- 99.000 VNĐ / tháng.
- Phỏng vấn không giới hạn.
- Feedback chi tiết.
- Phân tích CV.
- Lịch sử phỏng vấn.
- Theo dõi tiến độ.

### Pro
- 199.000 VNĐ / tháng.
- Toàn bộ tính năng Premium.
- Phân tích chuyên sâu.
- Phỏng vấn theo ngành nghề cụ thể.
- Báo cáo tiến bộ nâng cao.

## 15. Checkout
Prototype chưa cần tích hợp thanh toán thật.

Có thể tạo flow giả lập:

**Chọn gói → Checkout → Thanh toán giả lập → Thành công**

Ví dụ:

> Thanh toán thành công  
> Chào mừng bạn đến với InterviewAI Premium.

Khi guest nhấn nâng cấp:
- Yêu cầu tạo tài khoản.
- Sau đó mới chuyển sang checkout.

## 16. Phân chia tính năng thật và tính năng prototype

### Nên hoạt động thật
- AI Interview.
- Voice input.
- AI đặt câu hỏi.
- Transcript.
- AI feedback.
- Trang kết quả.
- Lưu lịch sử phỏng vấn cục bộ.

### Có thể dùng mock data
- Pricing.
- Checkout.
- Subscription.
- Progress chart.
- Achievements.
- Reviews.
- Một số dữ liệu Dashboard.
- Thanh toán.

## 17. Kiến trúc đề xuất cho prototype
Có thể sử dụng:

**Frontend → OpenAI API → localStorage / IndexedDB**

Không cần database cloud ở giai đoạn hiện tại.

Nếu sau này phát triển thành sản phẩm thật:
- Thêm Authentication.
- Thêm database cloud.
- Thêm đồng bộ nhiều thiết bị.
- Thêm subscription thật.
- Thêm thanh toán thật.

## 18. Checklist triển khai

### Ưu tiên cao
- [ ] Chuyển toàn bộ UI sang tiếng Việt.
- [ ] Thiết kế lại giao diện theo hướng SaaS thương mại.
- [ ] Thêm nút "Tiếp tục không cần tài khoản".
- [ ] Cho phép guest sử dụng toàn bộ flow phỏng vấn chính.
- [ ] Lưu lịch sử phỏng vấn trên trình duyệt.
- [ ] Xây trang Tổng quan.
- [ ] Xây Thư viện phỏng vấn.
- [ ] Xây flow tạo buổi phỏng vấn.
- [ ] Nâng cấp trang Kết quả.
- [ ] Thêm trang Bảng giá.
- [ ] Thêm Checkout giả lập.

### Ưu tiên trung bình
- [ ] Thêm tạo tài khoản.
- [ ] Thêm thông báo dữ liệu guest chỉ lưu trên thiết bị.
- [ ] Thêm nút xóa toàn bộ dữ liệu.
- [ ] Thêm biểu đồ tiến bộ.
- [ ] Thêm Interview History.
- [ ] Thêm Profile / Settings.

### Có thể làm sau
- [ ] Đồng bộ dữ liệu cloud.
- [ ] Thanh toán thật.
- [ ] Subscription thật.
- [ ] Mobile app.
- [ ] Phân tích giọng nói nâng cao.
- [ ] Phân tích biểu cảm / ngôn ngữ cơ thể bằng AI.
- [ ] Phiên bản B2B cho trường học và doanh nghiệp.
