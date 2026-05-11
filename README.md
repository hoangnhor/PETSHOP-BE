# 🛡️ petshop BE — Node.js Commerce API Core

![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)
![Mongoose](https://img.shields.io/badge/Mongoose-8.x-880000?logo=mongoose&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-Auth-000000?logo=jsonwebtokens&logoColor=white)
![CORS](https://img.shields.io/badge/CORS-Enabled-2E7D32)
![Cookie Parser](https://img.shields.io/badge/Cookie_Parser-1.x-795548)

> “petshop BE” là lõi nghiệp vụ e-commerce: bảo vệ tài nguyên bằng phân quyền nhiều lớp, chuẩn hóa API contract, và đảm bảo các domain user/product/order vận hành nhất quán ở production.

- 🌐 Live API: `<YOUR_BE_LIVE_URL>`
- 🔗 Backend Repo: `<YOUR_BE_REPO_URL>`
- 🔗 Frontend Repo: `<YOUR_FE_REPO_URL>`

---

## 🔥 Điểm sáng Kỹ thuật (Technical Highlights)

1. **Bảo mật & Phân quyền nhiều lớp (RBAC)**
- `verifyToken`, `authUserMiddleware`, `authMiddleware` tách quyền theo use-case.
- Bảo đảm “same user or admin” cho tài nguyên nhạy cảm.

2. **Kiến trúc Layered để tối ưu bảo trì**
- Chia tách `routes -> controllers -> services -> models`.
- Giảm coupling, tăng khả năng mở rộng domain và tái sử dụng business logic.

3. **Auth strategy chuẩn production**
- Access token ngắn hạn + refresh token dài hạn qua cookie httpOnly.
- Cân bằng giữa bảo mật phiên và trải nghiệm người dùng frontend.

4. **Response/Error contract nhất quán**
- Chuẩn hóa payload `status/code/message` (và path cho 404).
- Hỗ trợ debug production nhanh và ổn định FE integration.

---

## 🗄️ Database Design

| Collection | Mục đích | Trường cốt lõi | Quan hệ |
|---|---|---|---|
| `users` | Tài khoản & phân quyền | `name`, `email`, `password`, `isAdmin`, `phone`, `address`, `avatar` | 1-N với `bills` |
| `types` | Danh mục sản phẩm | `name` | 1-N với `products` |
| `products` | Catalog sản phẩm | `name`, `image`, `type`, `price`, `countInStock`, `discount`, `selled` | `type` ref `types` |
| `bills` | Đơn hàng | `iduser`, `items[]`, `shippingAddress`, `paymentMethod`, `paymentStatus`, `orderStatus`, `tongtien` | `iduser` ref `users`, `items.idsp` ref `products` |

---

## 🔄 Luồng nghiệp vụ cốt lõi (Core Flow)

```text
Client Login
  -> POST /api/user/sign-in
     -> Validate credentials
        -> Issue access_token + refresh_token(cookie)
           -> Protected API call with Bearer token
              -> Middleware verifies role/context
                 -> Service executes business logic
                    -> MongoDB read/write
                       -> Standardized response back to client
```

```text
Checkout
  -> POST /api/bill/create
     -> Verify token
        -> Validate payload + stock constraints
           -> Persist order (bill)
              -> Admin updates order status through secured endpoints
```

---

## 🚀 Cài đặt & Khởi chạy (Local Development)

```bash
cd BE
npm install
npm run dev
```

`.env`
```env
PORT=
CLIENT_URL=
MONGODB_URL=
ACCESS_TOKEN=
REFRESH_TOKEN=
```

Production run:
```bash
npm start
```

---

## 📂 Cấu trúc mã nguồn (Folder Structure)

```text
src/
├── controllers/                 # HTTP layer: validate input, map status code, shape response
├── middleware/                  # AuthN/AuthZ, token verification, security guards
├── models/                      # Mongoose schemas + collection contracts
├── routes/                      # Endpoint declarations theo domain
├── services/                    # Business logic, orchestration, persistence operations
└── index.js                     # App bootstrap, CORS config, health, global error handling
```
