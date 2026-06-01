# PetShop Backend (BE)

Backend API cho hệ thống thương mại điện tử thú cưng PetShop.

## Tech Stack
- Node.js 20
- Express 4
- MongoDB + Mongoose
- JWT (access token + refresh token)
- Cookie Parser, CORS, Helmet

## Liên kết
- Frontend Demo: https://htpetshop.vercel.app/
- Backend Repo: https://github.com/hoangnhor/PETSHOP-BE
- Frontend Repo: https://github.com/hoangnhor/PETSHOP-FE

## Kiến trúc
```text
src/
  routes/
  controllers/
  services/
  models/
  middleware/
  config/
  utils/
  app.js
  index.js
```

## Module nghiệp vụ
- User/Auth
- Product/Type (catalog)
- Cart/Wishlist
- Bill/Checkout/Order lifecycle
- Coupon
- Appointment/Pet/Service
- Inventory log

## Bảo mật & kiểm soát
- JWT dual-token:
  - Access token: Bearer token
  - Refresh token: httpOnly cookie
- Refresh token rotation + reuse grace window.
- Middleware phân quyền admin/user và kiểm tra trạng thái blocked từ DB.
- CORS allowlist theo `CLIENT_URL` + domain preview.
- Rate limiting (global + scoped).
- Sanitize payload chống key injection (`$`, `.`).
- Verify chữ ký payment webhook (HMAC SHA256).

## Cài đặt và chạy local
```bash
cd BE
npm install
npm run dev
```

Backend mặc định chạy ở `http://localhost:3030`.

## Biến môi trường
Tạo file `.env` trong thư mục `BE`:

```env
PORT=3030
NODE_ENV=development
MONGODB_URL=mongodb+srv://<user>:<pass>@<cluster>/<db>
ACCESS_TOKEN=your_access_secret
REFRESH_TOKEN=your_refresh_secret
CLIENT_URL=http://localhost:3000,https://htpetshop.vercel.app

# cookie/auth
COOKIE_SECURE=false
COOKIE_SAMESITE=lax
REFRESH_TOKEN_EXPIRES_IN=90d
REFRESH_TOKEN_COOKIE_MAX_AGE_MS=31536000000
REFRESH_TOKEN_REUSE_GRACE_MS=120000

# rate limit
RATE_LIMIT_STORE=mongo
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=180
LOGIN_RATE_LIMIT_WINDOW_MS=900000
LOGIN_RATE_LIMIT_MAX=10
BILL_CREATE_RATE_LIMIT_WINDOW_MS=60000
BILL_CREATE_RATE_LIMIT_MAX=8

# payment webhook
PAYMENT_WEBHOOK_ENABLED=false
PAYMENT_WEBHOOK_SECRET=your_webhook_secret
```

## Scripts
```bash
npm run dev                 # chạy local (watch)
npm start                   # chạy production mode
npm test                    # chạy toàn bộ test
npm run test:integration    # test integration
npm run lint                # syntax/lint check
npm run smoke:live          # smoke API thật
npm run db:probe:staging    # probe DB staging
npm run seed:be             # seed dữ liệu
```

## Endpoint health
- `GET /health`
- `GET /ready`

## Ghi chú deploy
- Set đúng `CLIENT_URL` cho domain FE.
- Bật `COOKIE_SECURE=true` và `COOKIE_SAMESITE=none` khi chạy HTTPS production.
- Cấu hình `PAYMENT_WEBHOOK_SECRET` nếu bật webhook callback.
