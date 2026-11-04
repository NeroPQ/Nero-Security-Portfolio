# Kiểm tra source, dữ liệu và UI/UX — 2026-11-02

## Kết luận

Kiến trúc Write-ups đã thống nhất: Markdown canonical và metadata registry đi qua một renderer, không có card/route trùng. Dữ liệu vượt qua schema và kiểm tra bảo toàn nguồn. Điều đó không đồng nghĩa mọi kết quả lab đã được chứng minh: cả 6 bài vẫn Evidence Pending, không bài nào tự được duyệt xuất bản. Ngày 2026-11-03 trong nguồn Password Attacks/NEXURA tiếp tục được ghi rõ là chưa xác minh; không sửa ngày để tạo cảm giác đã được xác nhận.

Đã sao lưu source trước thay đổi giao diện tại `../nero-ui-audit-backup-20261102T202908Z/`. Workspace vẫn không có `.git`.

## Phát hiện và sửa

| Phát hiện | Thay đổi |
| --- | --- |
| Trang Write-ups dùng lại H1/banner Home; card đầu tiên nằm khoảng y=913px ở mobile 390px | Tiêu đề H1 đúng trang, phần mở đầu gọn hơn; đo sau thay đổi khoảng y=697px với cùng bề rộng |
| Header gây tràn ngang 16px tại màn hình 320px | Navigation hai hàng trên màn hình hẹp; vùng chạm tối thiểu 44px; giữ đủ 5 tab |
| Bộ lọc không cập nhật số kết quả, chưa có tìm kiếm | Tìm theo tên/chủ đề/tool/module ID; kết hợp platform; thông báo số kết quả, trạng thái không tìm thấy, reset; query URL có thể chia sẻ |
| Mục lục bài dài có 150 liên kết | Mục lục native có thể thu gọn; bài trên 20 phút mặc định thu gọn; thêm Start reading và ước tính thời gian đọc |
| Khối lệnh thiếu thao tác sao chép, vùng cuộn thiếu focus | Copy đúng nguyên văn fenced code; thông báo kết quả/thất bại; pre và bảng hỗ trợ bàn phím |
| Thiếu skip link/current-page semantics; chữ sidebar tương phản thấp | Skip to content, aria-current trên navigation, màu chữ/nút đạt kiểm tra contrast tự động trong phạm vi đã test |
| Heading có ngoặc kép hiển thị `&quot;` trong TOC | Giải mã entity đầy đủ trước khi tạo text và anchor; giữ link đúng với heading |
| Ngày metadata chỉ được kiểm tra không rỗng | Chấp nhận YYYY, YYYY-MM, ngày ISO hợp lệ; từ chối ngày sai và URL nguồn không phải HTTP(S), giữ độ chính xác vốn có |
| Test cố định tổng số bài là 6 và giả định mọi bài luôn là draft | Tổng số bài/platform lấy từ registry; kiểm thử draft bằng fixture; thêm room trong fixture không làm sai test |
| Check chưa có cấu hình TypeScript strict | Thêm tsconfig, kiểm tra TS client/browser tests trong npm run check |
| CSS Write-ups chứa selector renderer cũ và quy tắc lặp | Tách public/writeups.css; bỏ selector cũ; một script TS sở hữu tìm kiếm/filter/copy |
| Verifier gọi mọi thẻ code là code block | Phân biệt fenced block với inline code trong log; vẫn kiểm tra đầy đủ cả hai |

## Source thay đổi chính

- `src/lib/writeups-core.mjs`, `src/lib/writeups-types.ts`, `src/lib/writeups-ui.mjs`
- `src/components/WriteupCard.astro`
- `src/pages/writeups/index.astro`, `src/pages/writeups/[slug]/index.astro`
- `src/layouts/Base.astro`, `src/scripts/writeups.ts`
- `public/styles.css`, `public/writeups.css`, `public/site.js` (chỉ gỡ handler filter Write-ups cũ; giữ logic Research)
- `scripts/writeups.mjs`, `scripts/validate-writeups.mjs`, `scripts/verify_site.py`
- `tests/writeups.test.mjs`, `tests/browser/writeups.spec.ts`, `tsconfig.json`
- `package.json`, `package-lock.json`, `README.md`, `docs/WRITEUPS_WORKFLOW.md`

## Kiểm chứng và giới hạn

Kết quả lệnh thực tế được ghi ở `docs/SOURCE_DATA_UIUX_VALIDATION.txt`: Astro/TypeScript, schema, regression tests, production/review build, HTML thực tế, browser 1440px/390px và reflow 320px. Kiểm tra WCAG bằng axe chạy trên Home, Research, Projects, About, Write-ups và hai bài dài ở desktop/mobile; đây là kiểm tra tự động trong phạm vi đó, không phải chứng nhận accessibility toàn diện.

Đối chiếu SHA-256 xác nhận các báo cáo Markdown canonical, registry metadata, nguồn Research/CVE và profile không đổi trong đợt này. Không thêm ảnh lab giả, không thay kết quả kỹ thuật, không tự phê duyệt bài, không push hoặc deploy.

Tại thời điểm audit UI, dependency tree có 5 advisory (1 low, 3 high, 1 critical). Hạng mục này đã được xử lý trong đợt nâng cấp tiếp theo lên Astro 7.4.5/Zod 4.6.7; xem `docs/DEPENDENCY_UPGRADE.md` và log mới để biết kết quả hiện tại. Chưa có ảnh lab gốc và chưa xác minh các ngày nguồn/tiến độ học ngoài dữ liệu được cung cấp.
