# NERO.SEC — chạy local và cấu hình production

Website dùng duy nhất Astro 7.4.5. Cài dependency bằng `npm ci` (Node.js 24 LTS (minimum 22.23.4)).

- `npm run dev`: xem toàn bộ báo cáo, gồm Evidence Pending, tại http://127.0.0.1:4321/writeups/.
- `npm run build`: kiểm tra và tạo production tại `dist/`, chỉ gồm bài đã duyệt xuất bản.
- `npm run preview`: xem `dist/` tại http://127.0.0.1:4321/.
- `npm run build:review` và `npm run preview:review`: review toàn bộ bài trong `.review/`, cùng cổng 4321.

Dừng server hiện tại trước khi chuyển chế độ. Nếu cổng bận, lệnh báo tiến trình xung đột và thoát; không đổi cổng hoặc tự dừng dịch vụ khác.

Cấu hình Cloudflare Pages trong repository:

- Build command: `npm run build`
- Build output directory: `dist`
- `wrangler.toml`: `pages_build_output_dir = "dist"`

Hướng dẫn cũ `exit 0` + `preview/` đã được thay thế. Không còn nguồn render độc lập bằng Python; lệnh tương thích `python3 scripts/generate_static.py` gọi Astro và xuất `dist/`.

Không triển khai hoặc thay đổi dashboard hosting trong đợt refactor này. Không có cấu hình dashboard từ xa trong workspace để xác minh; nếu dự án Pages hiện vẫn trỏ `preview/`, cần áp dụng các giá trị trên trong lần triển khai được phê duyệt sau này. Không publish archive hoặc `.review/`.

Home, Research, Projects, Write-ups và About giữ nguyên route. Bốn route Research: `/research/log4shell/`, `/research/pwnkit/`, `/research/dirty-pipe/`, `/research/spring4shell/`.

Quy trình cập nhật nội dung, ảnh và phê duyệt: [docs/WRITEUPS_WORKFLOW.md](docs/WRITEUPS_WORKFLOW.md).
