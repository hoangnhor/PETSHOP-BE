const express = require("express");
const dotenv = require('dotenv');
const { default: mongoose } = require("mongoose");
const routes = require("./routes");
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const { basicRateLimit, sanitizePayload } = require('./middleware/securityMiddleware');

// Load biến môi trường từ file .env
dotenv.config();

const app = express();
const port = process.env.PORT || 3030;
app.set('trust proxy', 1);
const requiredEnv = ['MONGODB_URL', 'ACCESS_TOKEN', 'REFRESH_TOKEN'];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);

if (missingEnv.length) {
    console.error(`Lỗi: Thiếu biến môi trường ${missingEnv.join(', ')}`);
    process.exit(1);
}

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

const isAllowedVercelPreview = (origin) => {
    if (!origin) return false;
    try {
        const { hostname, protocol } = new URL(origin);
        if (protocol !== 'https:') return false;
        return hostname === 'htpetshop.vercel.app' || hostname.startsWith('htpetshop-') && hostname.endsWith('.vercel.app');
    } catch (error) {
        return false;
    }
};

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || isAllowedVercelPreview(origin)) {
            return callback(null, true);
        }
        return callback(new Error('Origin không được phép bởi CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'token'],
}));
app.use(helmet());
app.use(basicRateLimit);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ limit: '2mb', extended: true }));
app.use(cookieParser());
app.use(sanitizePayload);

routes(app);

app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        message: 'Service healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
    });
});

app.use((req, res) => {
    return res.status(404).json({
        status: 'ERR',
        code: 'NOT_FOUND',
        message: 'Không tìm thấy endpoint',
        path: req.originalUrl,
    });
});

app.use((err, req, res, next) => {
    console.error('Server error:', err);
    const statusCode = Number(err?.statusCode) || 500;
    return res.status(statusCode).json({
        status: 'ERR',
        code: err?.code || 'INTERNAL_ERROR',
        message: statusCode >= 500 ? 'Lỗi hệ thống' : (err?.message || 'Yêu cầu không hợp lệ'),
    });
});

mongoose.connect(process.env.MONGODB_URL)
    .then(() => console.log('Ket noi MONGODB thanh cong!'))
    .catch(err => {
        console.error('Lỗi kết nối MongoDB:', err);
        process.exit(1);
    });
app.listen(port, () => {
    console.log('Server is running on port:', port);
});




