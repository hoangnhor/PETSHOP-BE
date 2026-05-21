const express = require('express');
const mongoose = require('mongoose');
const routes = require('./routes');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const { basicRateLimit, sanitizePayload } = require('./middleware/securityMiddleware');
const { requestContext } = require('./middleware/requestContextMiddleware');

const buildApp = () => {
    const app = express();
    app.set('trust proxy', 1);

    const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:3000')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);

    const isAllowedVercelPreview = (origin) => {
        if (!origin) return false;
        try {
            const { hostname, protocol } = new URL(origin);
            if (protocol !== 'https:') return false;
            return hostname === 'htpetshop.vercel.app' || (hostname.startsWith('htpetshop-') && hostname.endsWith('.vercel.app'));
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
    app.use(requestContext);
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

    app.get('/ready', (req, res) => {
        const isConnected = mongoose.connection?.readyState === 1;
        if (!isConnected) {
            return res.status(503).json({
                status: 'ERR',
                code: 'DB_NOT_READY',
                message: 'Database chưa sẵn sàng',
                dbState: mongoose.connection?.readyState ?? 0,
                timestamp: new Date().toISOString(),
            });
        }
        return res.status(200).json({
            status: 'OK',
            message: 'Service ready',
            dbState: mongoose.connection.readyState,
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

    return app;
};

module.exports = buildApp;
