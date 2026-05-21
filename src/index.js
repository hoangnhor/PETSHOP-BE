const dotenv = require('dotenv');
const { default: mongoose } = require("mongoose");
const buildApp = require('./app');

// Load biến môi trường từ file .env
dotenv.config();

const app = buildApp();
const port = process.env.PORT || 3030;
const requiredEnv = ['MONGODB_URL', 'ACCESS_TOKEN', 'REFRESH_TOKEN'];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);

if (missingEnv.length) {
    console.error(`Lỗi: Thiếu biến môi trường ${missingEnv.join(', ')}`);
    process.exit(1);
}

mongoose.connect(process.env.MONGODB_URL)
    .then(() => console.log('Ket noi MONGODB thanh cong!'))
    .catch(err => {
        console.error('Lỗi kết nối MongoDB:', err);
        process.exit(1);
    });
app.listen(port, () => {
    console.log('Server is running on port:', port);
});




