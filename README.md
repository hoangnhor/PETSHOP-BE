# Petshop.vn Backend

Backend REST API cho website thương mại điện tử bán sản phẩm thú cưng. Server dùng Express, MongoDB Atlas/Mongoose, JWT authentication và cookie refresh token.

## Tính năng chính

- Đăng ký, đăng nhập, đăng xuất người dùng.
- Xác thực JWT access token và refresh token.
- Phân quyền admin cho API quản trị.
- Quản lý sản phẩm: tạo, sửa, xóa, danh sách, chi tiết, tìm kiếm.
- Quản lý danh mục sản phẩm.
- Quản lý đơn hàng: tạo đơn, xem đơn, cập nhật trạng thái, hủy đơn.
- CORS cấu hình theo frontend URL.
- Kết nối MongoDB bằng Mongoose.

## Công nghệ

- Node.js
- Express
- MongoDB, Mongoose
- JSON Web Token
- bcrypt/bcryptjs
- cookie-parser
- cors
- dotenv
- nodemon

## Yêu cầu môi trường

- Node.js 18 trở lên
- npm
- MongoDB connection string
- Frontend chạy tại `http://localhost:3000`

## Cài đặt

```bash
cd BE
npm install
```

## Cấu hình môi trường

Tạo file `.env` trong thư mục `BE`:

```env
PORT=3030
CLIENT_URL=http://localhost:3000
MONGODB_URL=mongodb+srv://<username>:<password>@<cluster>/<database>?retryWrites=true&w=majority
ACCESS_TOKEN=your_access_token_secret
REFRESH_TOKEN=your_refresh_token_secret
```

Ý nghĩa biến môi trường:

| Biến | Bắt buộc | Mô tả |
|---|---:|---|
| `PORT` | Không | Port chạy server, mặc định `3030` |
| `CLIENT_URL` | Không | Origin frontend được phép gọi API, mặc định `http://localhost:3000` |
| `MONGODB_URL` | Có | Chuỗi kết nối MongoDB |
| `ACCESS_TOKEN` | Có | Secret ký access token |
| `REFRESH_TOKEN` | Có | Secret ký refresh token |

Không commit file `.env` thật lên repository.

## Chạy dự án

Chạy dev bằng nodemon:

```bash
npm run dev
```

Chạy production/local bình thường:

```bash
npm start
```

Kiểm tra server:

```text
http://localhost:3030
```

Kết quả mong đợi:

```text
Backend is running!
```

## Cấu trúc thư mục

```text
BE/
├── src/
│   ├── controllers/            # Nhận request, validate cơ bản, trả response
│   ├── middleware/             # Middleware xác thực và phân quyền
│   ├── models/                 # Mongoose schema/model
│   ├── routes/                 # Khai báo route API
│   ├── services/               # Xử lý nghiệp vụ và database
│   └── index.js                # Entry point server
├── .env
├── package.json
└── README.md
```

## Base URL

```text
http://localhost:3030/api
```

## Authentication

API private dùng header:

```http
Authorization: Bearer <access_token>
```

Refresh token được lưu bằng cookie HTTP qua các request có `withCredentials`.

Phân quyền:

- `verifyToken`: người dùng đã đăng nhập.
- `authUserMiddleware`: đúng user đang đăng nhập hoặc admin.
- `authMiddleware`: chỉ admin.

## API người dùng

Base path:

```text
/api/user
```

| Method | Endpoint | Quyền | Mô tả |
|---|---|---|---|
| `POST` | `/sign-up` | Public | Đăng ký tài khoản |
| `POST` | `/sign-in` | Public | Đăng nhập |
| `POST` | `/log-out` | Public | Đăng xuất |
| `POST` | `/refresh-token` | Public/cookie | Làm mới access token |
| `GET` | `/get-details/:id` | User/Admin | Lấy chi tiết user |
| `PUT` | `/update/:id` | User/Admin | Cập nhật user |
| `GET` | `/getall` | Admin | Lấy danh sách user |
| `POST` | `/create` | Admin | Tạo user bởi admin |
| `DELETE` | `/delete/:id` | Admin | Xóa user |

Body đăng ký/đăng nhập cơ bản:

```json
{
  "email": "user@example.com",
  "password": "123456"
}
```

## API sản phẩm

Base path:

```text
/api/product
```

| Method | Endpoint | Quyền | Mô tả |
|---|---|---|---|
| `GET` | `/getall` | Public | Lấy danh sách sản phẩm |
| `GET` | `/get-details/:id` | Public | Lấy chi tiết sản phẩm |
| `GET` | `/search?keyword=...` | Public | Tìm kiếm sản phẩm |
| `POST` | `/create` | Admin | Tạo sản phẩm |
| `PUT` | `/update/:id` | Admin | Cập nhật sản phẩm |
| `DELETE` | `/delete/:id` | Admin | Xóa sản phẩm |

Query `/getall` hỗ trợ:

| Query | Mô tả |
|---|---|
| `limit` | Số sản phẩm mỗi lần lấy, tối đa 1000 |
| `page` | Trang, bắt đầu từ 0 |
| `keyword` | Tìm theo tên sản phẩm |
| `type` | Lọc theo ID danh mục |
| `sort` | Dạng `asc,price` hoặc `desc,price` |
| `filter` | Dạng `type,<typeId>` hoặc `<field>,<value>` |

Body tạo sản phẩm:

```json
{
  "name": "Thức ăn mèo",
  "image": "https://example.com/product.jpg",
  "type": "type_id",
  "price": 120000,
  "countInStock": 20,
  "description": "Sản phẩm chăm sóc thú cưng",
  "discount": 10
}
```

Field bắt buộc:

- `name`
- `type`
- `price`
- `countInStock`

## API danh mục

Base path:

```text
/api/type
```

| Method | Endpoint | Quyền | Mô tả |
|---|---|---|---|
| `GET` | `/getall` | Public | Lấy danh sách danh mục |
| `POST` | `/create` | Admin | Tạo danh mục |
| `PUT` | `/update/:id` | Admin | Cập nhật danh mục |
| `DELETE` | `/delete/:id` | Admin | Xóa danh mục |

Body tạo danh mục:

```json
{
  "name": "Thức ăn"
}
```

## API đơn hàng

Base path:

```text
/api/bill
```

| Method | Endpoint | Quyền | Mô tả |
|---|---|---|---|
| `POST` | `/create` | User | Tạo đơn hàng |
| `GET` | `/getall` | User | Lấy danh sách đơn hàng |
| `GET` | `/get-details/:id` | User | Lấy chi tiết đơn hàng |
| `PATCH` | `/cancel/:id` | User | Hủy đơn hàng |
| `PATCH` | `/update-status/:id` | Admin | Cập nhật trạng thái đơn |
| `DELETE` | `/delete/:id` | Admin | Xóa đơn hàng |

Body tạo đơn hàng:

```json
{
  "iduser": "user_id",
  "items": [
    {
      "idsp": "product_id",
      "name": "Thức ăn mèo",
      "image": "https://example.com/product.jpg",
      "price": 120000,
      "discount": 10,
      "quantity": 2,
      "subtotal": 216000
    }
  ],
  "shippingAddress": {
    "fullName": "Nguyen Van A",
    "phone": "0900000000",
    "address": "123 Duong ABC",
    "city": "TP.HCM"
  },
  "paymentMethod": "COD",
  "tongtien": 216000,
  "note": "Giao giờ hành chính"
}
```

Giá trị hợp lệ:

- `paymentMethod`: `COD`, `BANKING`, `MOMO`, `VNPAY`
- `paymentStatus`: `unpaid`, `paid`, `refunded`
- `orderStatus`: `pending`, `confirmed`, `shipping`, `delivered`, `cancelled`

## Format response chung

Thành công:

```json
{
  "status": "OK",
  "message": "Thành công",
  "data": {}
}
```

Thất bại:

```json
{
  "status": "ERR",
  "message": "Lý do lỗi"
}
```

## Chạy fullstack

Mở 2 terminal riêng:

Terminal backend:

```bash
cd BE
npm run dev
```

Terminal frontend:

```bash
cd FE
npm start
```

URL:

```text
Frontend: http://localhost:3000
Backend:  http://localhost:3030
API:      http://localhost:3030/api
```

## Lỗi thường gặp

### Thiếu biến môi trường

Server sẽ dừng nếu thiếu:

```text
MONGODB_URL, ACCESS_TOKEN, REFRESH_TOKEN
```

Kiểm tra lại file:

```text
BE/.env
```

### Không kết nối được MongoDB

- Kiểm tra `MONGODB_URL`.
- Kiểm tra whitelist IP trong MongoDB Atlas.
- Kiểm tra tài khoản database có quyền truy cập database.

### Lỗi CORS

Kiểm tra biến:

```env
CLIENT_URL=http://localhost:3000
```

Nếu có nhiều frontend origin, dùng dấu phẩy:

```env
CLIENT_URL=http://localhost:3000,http://localhost:3001
```

### Port 3030 đã được dùng

Đổi port trong `.env`:

```env
PORT=3031
```

Sau đó cập nhật frontend:

```env
REACT_APP_API_URL=http://localhost:3031/api
```
