const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const Service = require('../src/models/ServiceModel');

const DOWNLOADS_DIR = path.resolve(__dirname, '../../..');
const SERVICE_IMAGE_DIR = path.resolve(__dirname, '../../FE/public/service-images');

const services = [
  {
    code: 'HT-PET-HOTEL',
    sourcePrefix:
      'Hình ảnh dịch vụ khách sạn thú cưng, chó hoặc mèo trong phòng nghỉ thoải mái, giường êm ái, đồ chơi, không gian ấm cúng, phong cách nhiếp ảnh chuyên nghiệp, màu sắc ấm áp',
    imageFile: 'service-khach-san-thu-cung.jpg',
    data: {
      name: 'Khách sạn thú cưng',
      slug: 'khach-san-thu-cung',
      category: 'combo',
      species: 'all',
      description: 'Dịch vụ lưu trú thú cưng trong không gian ấm cúng, an toàn và thoải mái.',
      durationMin: 1440,
      price: 320000,
      salePrice: 0,
      includes: ['Phòng nghỉ riêng', 'Theo dõi cơ bản', 'Vệ sinh khu vực nghỉ'],
      exclusions: ['Điều trị y tế chuyên sâu'],
      isActive: true,
      sortOrder: 1,
    },
  },
  {
    code: 'GR-DOG-STYLING',
    sourcePrefix:
      'Hình ảnh dịch vụ grooming cắt tỉa lông thú cưng, chó đang được cắt tỉa lông chuyên nghiệp, phong cách nhiếp ảnh đẹp, màu sắc sáng',
    imageFile: 'service-grooming-cat-tia.jpg',
    data: {
      name: 'Grooming cắt tỉa lông',
      slug: 'grooming-cat-tia-long-thu-cung',
      category: 'grooming',
      species: 'dog',
      description: 'Dịch vụ cắt tỉa lông chuyên nghiệp, tạo kiểu gọn gàng cho chó.',
      durationMin: 75,
      price: 350000,
      salePrice: 0,
      includes: ['Cắt tỉa lông', 'Tỉa vệ sinh', 'Chỉnh dáng lông'],
      exclusions: [],
      isActive: true,
      sortOrder: 2,
    },
  },
  {
    code: 'CAT-CLEAN-DEEP',
    sourcePrefix:
      'Hình ảnh dịch vụ spa thú cưng, chó đang được tắm rửa chăm sóc, bồn tắm bọt xà phòng, phong cách nhiếp ảnh chuyên nghiệp, màu sắc sạch sẽ tươi sáng',
    imageFile: 'service-spa-thu-cung.jpg',
    data: {
      name: 'Vệ sinh mèo chuyên sâu',
      slug: 've-sinh-meo-chuyen-sau',
      category: 'spa',
      species: 'cat',
      description: 'Vệ sinh và chăm sóc làm sạch chuyên sâu cho mèo.',
      durationMin: 60,
      price: 250000,
      salePrice: 0,
      includes: ['Tắm gội', 'Sấy khô', 'Vệ sinh tai cơ bản'],
      exclusions: [],
      isActive: true,
      sortOrder: 3,
    },
  },
  {
    code: 'VT-HEALTH-CHECK',
    sourcePrefix:
      'Hình ảnh dịch vụ khám sức khỏe thú y, bác sĩ thú y đang khám chó hoặc mèo, phòng khám thú y chuyên nghiệp, phong cách nhiếp ảnh đẹp, màu sắc sạch sẽ',
    imageFile: 'service-kham-suc-khoe-thu-y.jpg',
    data: {
      name: 'Khám sức khỏe thú y',
      slug: 'kham-suc-khoe-thu-y',
      category: 'medical-basic',
      species: 'all',
      description: 'Khám tổng quát và tư vấn sức khỏe định kỳ cho chó mèo.',
      durationMin: 45,
      price: 250000,
      salePrice: 0,
      includes: ['Khám tổng quát', 'Tư vấn bác sĩ thú y'],
      exclusions: ['Xét nghiệm chuyên sâu'],
      isActive: true,
      sortOrder: 4,
    },
  },
];

function resolveSourceFile(prefix) {
  const all = fs
    .readdirSync(DOWNLOADS_DIR)
    .filter((name) => name.toLowerCase().endsWith('.jpg') && name.startsWith(prefix));
  const preferred = all.find((name) => name.includes('(1).jpg'));
  if (preferred) return path.join(DOWNLOADS_DIR, preferred);
  if (all[0]) return path.join(DOWNLOADS_DIR, all[0]);
  return null;
}

async function run() {
  const uri = process.env.MONGODB_URL;
  if (!uri) throw new Error('Thiếu MONGODB_URL trong BE/.env');

  if (!fs.existsSync(SERVICE_IMAGE_DIR)) {
    fs.mkdirSync(SERVICE_IMAGE_DIR, { recursive: true });
  }

  await mongoose.connect(uri);

  for (const item of services) {
    const sourceFile = resolveSourceFile(item.sourcePrefix);
    if (!sourceFile) throw new Error(`Không tìm thấy ảnh nguồn cho: ${item.code}`);

    const destPath = path.join(SERVICE_IMAGE_DIR, item.imageFile);
    fs.copyFileSync(sourceFile, destPath);
    const image = `/service-images/${item.imageFile}`;

    const exists = await Service.findOne({ code: item.code }).lean();

    const payload = { ...item.data, code: item.code, image };
    if (exists?._id) {
      await Service.updateOne({ _id: exists._id }, { $set: payload });
      console.log(`Updated: ${item.code}`);
    } else {
      await Service.create(payload);
      console.log(`Inserted: ${item.code}`);
    }
  }

  const count = await Service.countDocuments({});
  console.log(`Done. Total services: ${count}`);
}

run()
  .catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
