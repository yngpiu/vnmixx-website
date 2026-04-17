---
description:
---

# Git Workflow Rules

## Mục tiêu

Đảm bảo mọi commit:

- Được format và lint trước khi ghi vào Git
- Chỉ kiểm tra các file đang staged
- Tuân thủ Conventional Commits
- Có nội dung rõ ràng, chia nhỏ hợp lý theo từng mục đích thay đổi

---

## Pre-commit Rules

Trước mỗi commit phải chạy tuần tự:

1. `pnpm prettier --write`
2. `pnpm eslint --fix`

Chỉ áp dụng cho staged files thuộc các loại:

- `.ts`
- `.tsx`
- `.js`
- `.jsx`
- `.json`
- `.css`
- `.scss`
- `.md`

Nếu còn lỗi lint chưa xử lý được:

- Commit phải bị chặn ngay

Không được chạy format/lint toàn bộ project nếu chỉ có một phần file được commit.

---

## Commit Message Rules

Bắt buộc theo format:

```bash
<type>(scope): nội dung tiếng Việt
```
