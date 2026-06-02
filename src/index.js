const mongoose = require('mongoose');
const buildApp = require('./app');
const { env, assertRequiredEnv } = require('./config/env');

const app = buildApp();
let server;
let isShuttingDown = false;
let hasStarted = false;

const gracefulShutdown = async (signal, exitCode = 0) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`Dang dung server (${signal})...`);

    try {
        if (server && hasStarted) {
            await new Promise((resolve, reject) => {
                server.close((error) => (error ? reject(error) : resolve()));
            });
        }
    } catch (error) {
        console.error('Lỗi khi đóng HTTP server:', error);
    }

    try {
        await mongoose.disconnect();
    } catch (error) {
        console.error('Lỗi khi đóng kết nối MongoDB:', error);
    }

    process.exit(exitCode);
};

const startServer = async () => {
    try {
        assertRequiredEnv();

        await mongoose.connect(env.mongodbUrl, {
            serverSelectionTimeoutMS: 10000,
        });
        console.log('Ket noi MONGODB thanh cong!');

        server = app.listen(env.port, () => {
            hasStarted = true;
            console.log('Server is running on port:', env.port);
        });
        server.on('error', (error) => {
            if (error?.code === 'EADDRINUSE') {
                console.error(`Port ${env.port} đang được sử dụng. Vui lòng dừng tiến trình cũ rồi chạy lại.`);
                process.exit(1);
                return;
            }
            throw error;
        });
    } catch (error) {
        console.error('Không thể khởi động server:', error.message);
        process.exit(1);
    }
};

process.on('SIGINT', () => {
    gracefulShutdown('SIGINT');
});

process.on('SIGTERM', () => {
    gracefulShutdown('SIGTERM');
});

process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason);
    gracefulShutdown('unhandledRejection', 1);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    gracefulShutdown('uncaughtException', 1);
});

startServer();




