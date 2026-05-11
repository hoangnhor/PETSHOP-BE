# petshop Backend (NodeJS + Express + MongoDB)

Backend REST API cho hệ thống thương mại điện tử `petshop`, phục vụ frontend ReactJS và cung cấp đầy đủ nghiệp vụ người dùng, sản phẩm, danh mục, đơn hàng.

## 1) Thông tin dự án

- Project: `petshop`
- Mục tiêu: Xây dựng API ổn định cho e-commerce thú cưng
- Đối tượng sử dụng:
  - Khách hàng mua hàng online
  - Admin vận hành hệ thống

## 2) Vai trò thực hiện

- Vai trò: **Fullstack Developer** (trong repo này là phần **Backend**)
- Thực hiện:
  - Thiết kế kiến trúc API theo module
  - Xây dựng auth JWT + refresh token cookie
  - Xây dựng CRUD + business logic cho user/product/type/bill
  - Phân quyền admin/user bằng middleware
  - Chuẩn hóa format lỗi để dễ debug production

## 3) Tính năng chính

- User:
  - Đăng ký, đăng nhập, đăng xuất
  - Lấy thông tin user, cập nhật user
  - Admin tạo/xóa user, lấy danh sách user
- Product:
  - CRUD sản phẩm
  - Lấy danh sách sản phẩm (filter/sort/pagination)
  - Tìm kiếm sản phẩm
- Type (Category):
  - CRUD danh mục
- Bill (Order):
  - Tạo đơn hàng
  - Lấy danh sách đơn / chi tiết đơn
  - Cập nhật trạng thái đơn (admin)
  - Hủy/xóa đơn theo quyền
- Security:
  - JWT access token + refresh token
  - Cookie refresh token (`httpOnly`)
  - CORS theo whitelist
  - Rate limit + sanitize payload

## 4) Công nghệ và thư viện

- Runtime/Framework:
  - `nodejs`, `express`
- Database:
  - `mongodb`, `mongoose`
- Authentication/Security:
  - `jsonwebtoken`
  - `bcrypt`, `bcryptjs`
  - `cookie-parser`
  - `cors`
- Config/Utilities:
  - `dotenv`
  - `body-parser`
- Dev:
  - `nodemon`

## 5) Kiến trúc thư mục

```text
BE/src
├── controllers/       # Validate input + response mapping
├── middleware/        # auth/role/security middleware
├── models/            # Mongoose schemas
├── routes/            # API route definitions
├── services/          # Business logic + DB operations
└── index.js           # App bootstrap
```

## 6) Cài đặt và chạy local

```bash
cd BE
npm install
npm run dev
```

Server mặc định chạy tại: `http://localhost:3030`

## 7) Environment variables

Tạo file `.env` trong thư mục `BE`:

```env
PORT=3030
CLIENT_URL=http://localhost:3000
MONGODB_URL=mongodb+srv://<username>:<password>@<cluster>/<database>?retryWrites=true&w=majority
ACCESS_TOKEN=your_access_token_secret
REFRESH_TOKEN=your_refresh_token_secret
```

Biến bắt buộc:
- `MONGODB_URL`
- `ACCESS_TOKEN`
- `REFRESH_TOKEN`

## 8) Database design (collections chính)

- `users`
  - `name, email, password, isAdmin, phone, address, avatar`
- `types`
  - `name`
- `products`
  - `name, image, type(ref Type), price, countInStock, description, discount, selled`
- `bills`
  - `iduser(ref User), items[], shippingAddress, paymentMethod, paymentStatus, orderStatus, tongtien, note, timestamps`

## 9) Authentication flow

- Access token:
  - JWT, thời hạn ngắn (`15m`)
  - Gửi qua `Authorization: Bearer <token>`
- Refresh token:
  - JWT, thời hạn dài (`365d`)
  - Lưu trong cookie `httpOnly`
- Middleware:
  - `verifyToken`: yêu cầu đăng nhập
  - `authUserMiddleware`: đúng user hoặc admin
  - `authMiddleware`: chỉ admin

## 10) API modules

Base URL:

```text
http://localhost:3030/api
```

- `/api/user`
  - sign-up, sign-in, log-out, refresh-token
  - get-details, update
  - admin: create/getall/delete
- `/api/product`
  - getall, get-details, search
  - admin: create/update/delete
- `/api/type`
  - getall
  - admin: create/update/delete
- `/api/bill`
  - create/getall/get-details/cancel
  - admin: update-status/delete

## 11) Format response

Thành công:

```json
{
  "status": "OK",
  "message": "Thành công",
  "data": {}
}
```

Lỗi:

```json
{
  "status": "ERR",
  "code": "ERROR_CODE",
  "message": "Lý do lỗi"
}
```

## 12) Deploy

- Backend production: Render
- URL: `https://petshopbe.onrender.com`

## 13) Liên kết liên quan

- Backend repo: `https://github.com/hoangnhor/petshopBE`
- Frontend repo: `https://github.com/hoangnhor/petshopFE`
