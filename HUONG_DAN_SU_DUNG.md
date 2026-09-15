# InterviewAI — Prototype SaaS tiếng Việt

## Chạy ứng dụng

Yêu cầu Node.js 22 trở lên và kết nối Internet cho tính năng AI.

```powershell
npm install
npm start
```

Mở **http://localhost:3000**. Có thể chạy `start-web.bat` như trước. Nếu đã có máy chủ cũ đang chạy, dừng bằng Ctrl+C rồi chạy lại. `npm start` tự biên dịch giao diện, không cần React/Babel/Tailwind từ CDN.

Khóa OpenAI được đọc từ `.env` (hoặc `key.env` cũ) ở thư mục dự án. Không đưa khóa vào trình duyệt. Các biến cấu hình:

```dotenv
OPENAI_API_KEY=your_key_here
OPENAI_INTERVIEW_MODEL=gpt-5-mini
OPENAI_REALTIME_MODEL=gpt-realtime
OPENAI_REALTIME_VOICE=marin
OPENAI_EVALUATION_MODEL=gpt-5-mini
OPENAI_TRANSCRIPTION_MODEL=gpt-4o-mini-transcribe
OPENAI_TTS_MODEL=gpt-4o-mini-tts
PORT=3000
```

Giữ nguyên khóa đang có; không cần tạo lại. Nếu không có khóa, các trang vẫn hoạt động, tính năng AI hiển thị lỗi cấu hình rõ ràng.

## Luồng sử dụng

1. **Trang chủ → Bắt đầu phỏng vấn miễn phí**.
2. Chọn **Tiếp tục không cần tài khoản** hoặc đăng nhập/đăng ký mô phỏng.
3. Thiết lập 3 bước: vị trí và kinh nghiệm → CV/mô tả công việc/kỹ năng → ngôn ngữ, thời lượng, độ khó.
4. Cấp quyền microphone. AI hỏi trực tiếp qua Realtime. **Giữ Space hoặc giữ nút để nói, thả để gửi**. Trên điện thoại, giữ nút cảm ứng; khi nút được chọn bằng bàn phím cũng có thể giữ Enter. Mỗi lượt tối đa 2 phút. Nhấn quá ngắn hoặc mất tiêu điểm khi giữ sẽ hủy lượt. AI hỏi khoảng 6–8 câu chính, hỏi sâu khi nội dung chưa rõ; hết thời lượng chỉ nhắc để bạn chủ động kết thúc.
5. Sau ít nhất một câu trả lời, chọn **Kết thúc phỏng vấn** để nhận kết quả. Nếu AI lỗi, hội thoại vẫn được giữ và có nút thử đánh giá lại. Không tạo điểm mẫu khi dịch vụ lỗi.
6. Mở **Tổng quan**, **Lịch sử phỏng vấn** để xem tiến bộ, mở lại kết quả hoặc tiếp tục buổi luyện dang dở. Kết quả có thể tải thành JSON.

Giọng AI được tạo tự động qua WebRTC. Không cần bước sửa bản nháp hoặc bấm gửi riêng. Dùng localhost hoặc HTTPS; nếu microphone bị từ chối, cấp quyền rồi nhấn **Kết nối lại**. Camera tự xin quyền khi vào phòng, có nút bật/tắt; camera bị từ chối không chặn phỏng vấn. MediaPipe xử lý chuyển động khuôn mặt cục bộ, không ghi hình, không gửi hình ảnh hoặc dùng tín hiệu này để chấm điểm. Model và WASM được phục vụ từ tài nguyên cục bộ đã build. Mic chỉ truyền giọng nói khi giữ nút/phím và tất cả luồng mic/camera được đóng khi rời phòng.

Bản chép lời được tạo song song với việc AI nghe âm thanh trực tiếp, nên có thể đến sau câu hỏi AI và đôi khi khác với cách AI hiểu lời nói, nhất là tên riêng. Nút kết thúc chờ bản chép lời hoàn tất; lượt lỗi hoặc quá 20 giây được đánh dấu rõ và không đưa vào chấm điểm. Có thể nói lại để bổ sung. Khi tiếp tục buổi chưa hoàn thành, ứng dụng tạo kết nối Realtime mới và phục hồi nội dung hội thoại đã lưu.

## CV và lưu trữ

- Chấp nhận PDF có văn bản, DOCX và TXT, tối đa 8 MB. PDF bản quét cần chuyển sang văn bản hoặc dán thông tin vào mục kinh nghiệm.
- Máy chủ đọc tệp trong bộ nhớ, không lưu CV vào ổ đĩa. Tối đa 20.000 ký tự được đưa vào ngữ cảnh AI; có thông báo khi cắt ngắn.
- `localStorage`: hồ sơ cơ bản, vị trí gần đây, tài khoản và gói mô phỏng, mã buổi đang xem.
- `IndexedDB` (InterviewAI): lịch sử, hội thoại, đánh giá, điểm số và tệp/nội dung CV.
- Dữ liệu chỉ tồn tại trên cùng trình duyệt, thiết bị và địa chỉ website (đổi cổng localhost cũng là nơi lưu khác). Có thể mất khi xóa dữ liệu trình duyệt hoặc dùng chế độ ẩn danh. Chưa có đồng bộ/khôi phục đám mây.
- Khi dùng AI, nội dung cần thiết từ CV, hồ sơ và hội thoại được gửi đến OpenAI. Responses đặt `store:false`; ứng dụng không ghi hội thoại lên cơ sở dữ liệu máy chủ. Điều này không thay thế chính sách lưu dữ liệu của nhà cung cấp AI.
- **Cài đặt → Xóa toàn bộ dữ liệu** xóa dữ liệu InterviewAI, có hộp thoại xác nhận và không đụng dữ liệu ứng dụng khác.

## Tài khoản và gói dịch vụ

- Đăng ký/đăng nhập chỉ là **mô phỏng trên thiết bị**, không mật khẩu, không xác thực email, không đồng bộ. Không dùng cơ chế này để bảo vệ tài khoản thật.
- Guest vẫn dùng toàn bộ luồng phỏng vấn, CV, lịch sử và Tổng quan.
- Free: 3 buổi hoàn tất/tháng trên thiết bị. Premium: 99.000 VNĐ/tháng. Pro: 199.000 VNĐ/tháng.
- Nâng cấp yêu cầu tạo tài khoản mô phỏng, sau đó vào checkout, xác nhận thanh toán giả lập và xem trang thành công. Không nhập thẻ, không thu tiền và không tự động gia hạn.
- Premium/Pro được lưu cục bộ và bỏ giới hạn số buổi. Báo cáo được phân tầng ở prompt, JSON schema, phản hồi API, giao diện và tệp xuất:
  - **Free:** điểm tổng thể/4 tiêu chí, tóm tắt ngắn, tối đa 2 điểm mạnh và 2 điểm cải thiện, 1 bước luyện tiếp.
  - **Premium:** thêm nhận xét từng câu, câu trả lời gốc, gợi ý trả lời tốt hơn và các bước cải thiện ưu tiên.
  - **Pro:** toàn bộ Premium với phân tích sâu hơn, đối chiếu vị trí/JD, bằng chứng còn thiếu và kế hoạch luyện 7 ngày.
- Gói báo cáo được chốt lúc bắt đầu buổi. Nâng cấp áp dụng cho buổi tiếp theo. Buổi cũ chưa có thông tin gói mặc định Free. Điểm số luôn lấy từ AI, không thay bằng điểm mẫu.
- Đây vẫn là phân tầng trong prototype: gói do trình duyệt cung cấp, chưa có xác thực quyền thuê bao trên máy chủ hoặc thanh toán thật. Chưa phù hợp để kiểm soát dịch vụ trả phí ngoài thực tế.
- Nhận xét người dùng và biểu đồ trên trang giới thiệu có nhãn minh họa. Tổng quan sử dụng dữ liệu lịch sử thực; trạng thái chưa có dữ liệu không hiển thị điểm giả.

## Cấu trúc mã nguồn

- `app.jsx`: điều hướng và trạng thái ứng dụng.
- `src/Public.jsx`: trang chủ, bảng giá, tài khoản và checkout mô phỏng.
- `src/Pages.jsx`, `src/Setup.jsx`, `src/Results.jsx`: các trang luyện tập.
- `src/Interview.jsx`, `src/realtime.js`, `src/Camera.jsx`: phòng phỏng vấn, WebRTC, camera và lưu tiến trình.
- `src/report-policy.js`, `src/evaluation-schema.js`: mức chi tiết và schema đánh giá từng gói.
- `src/storage.js`, `src/domain.js`, `src/api.js`: lưu trữ, thống kê và gọi API.
- `server.js`: phục vụ tệp công khai, đọc CV và các endpoint AI; không phục vụ `.env`, mã nguồn hay thư mục sessions.
- `scripts/build.mjs`: biên dịch thành `public/app.js`. `index.html` và `index.css` được phục vụ trực tiếp.

## Kiểm tra

```powershell
npm run build
npm test
npm run test:e2e
```

Kiểm thử trình duyệt dùng Chrome cài sẵn, cổng 3001 và hồ sơ trình duyệt tách biệt. Phần AI trong kiểm thử tự động được thay bằng phản hồi kiểm thử có kiểm soát. Microphone dùng thiết bị âm thanh giả của Chrome, không thu tiếng người dùng.

```powershell
npm run test:ai
```

Lệnh cuối gọi OpenAI thật bằng nội dung giả lập ngắn, có sử dụng hạn mức API: 2 lượt hỏi, 1 đánh giá, 1 tạo âm thanh và 1 nhận diện âm thanh. Không chạy trong bộ kiểm thử mặc định.

Kiểm tra luồng mới với WebRTC thật và âm thanh ứng viên tổng hợp:

```powershell
node scripts/smoke-realtime.mjs
```

Lệnh này dùng Chrome headless, tạo một bản giọng nói, phỏng vấn Realtime ngắn và đánh giá đủ Free/Premium/Pro. Có sử dụng hạn mức API; không dùng mic/camera thật hoặc hồ sơ của người dùng. Máy chủ kiểm thử chạy cổng tạm và được đóng sau kiểm thử.

Tham chiếu Realtime: [WebRTC](https://developers.openai.com/api/docs/guides/voice-webrtc), [push-to-talk và sự kiện hội thoại](https://developers.openai.com/api/docs/guides/realtime-conversations).

Tài liệu API đã đối chiếu: [Text generation](https://developers.openai.com/api/docs/guides/text), [Speech to text](https://developers.openai.com/api/docs/guides/speech-to-text), [Text to speech](https://developers.openai.com/api/docs/guides/text-to-speech).

Chưa triển khai: xác thực thật, đồng bộ cloud, thanh toán thật, subscription phía máy chủ, phân tích biểu cảm/giọng nói nâng cao, ứng dụng di động hoặc B2B.
