const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const Service = require('../src/models/ServiceModel');

const selectedServices = [
  {
    code: 'HT-PET-HOTEL',
    name: 'Khách sạn thú cưng',
    slug: 'khach-san-thu-cung',
    category: 'combo',
    species: 'all',
    durationMin: 1440,
    price: 320000,
    salePrice: 0,
    image: '/service-images/service-khach-san-thu-cung.jpg',
    description: 'Dịch vụ lưu trú thú cưng trong không gian ấm cúng, an toàn và thoải mái.',
    includes: ['Phòng nghỉ riêng', 'Theo dõi cơ bản', 'Vệ sinh khu vực nghỉ'],
    exclusions: ['Điều trị y tế chuyên sâu'],
    isActive: true,
    sortOrder: 1,
  },
  {
    code: 'GR-DOG-STYLING',
    name: 'Grooming cắt tỉa lông',
    slug: 'grooming-cat-tia-long-thu-cung',
    category: 'grooming',
    species: 'dog',
    durationMin: 75,
    price: 350000,
    salePrice: 0,
    image: '/service-images/service-grooming-cat-tia.jpg',
    description: 'Dịch vụ cắt tỉa lông chuyên nghiệp, tạo kiểu gọn gàng cho chó.',
    includes: ['Cắt tỉa lông', 'Tỉa vệ sinh', 'Chỉnh dáng lông'],
    exclusions: [],
    isActive: true,
    sortOrder: 2,
  },
  {
    code: 'CAT-CLEAN-DEEP',
    name: 'Vệ sinh mèo chuyên sâu',
    slug: 've-sinh-meo-chuyen-sau',
    category: 'spa',
    species: 'cat',
    durationMin: 60,
    price: 250000,
    salePrice: 0,
    image: '/service-images/service-spa-thu-cung.jpg',
    description: 'Vệ sinh và chăm sóc làm sạch chuyên sâu cho mèo.',
    includes: ['Tắm gội', 'Sấy khô', 'Vệ sinh tai cơ bản'],
    exclusions: [],
    isActive: true,
    sortOrder: 3,
  },
  {
    code: 'VT-HEALTH-CHECK',
    name: 'Khám sức khỏe thú y',
    slug: 'kham-suc-khoe-thu-y',
    category: 'medical-basic',
    species: 'all',
    durationMin: 45,
    price: 250000,
    salePrice: 0,
    image: '/service-images/service-kham-suc-khoe-thu-y.jpg',
    description: 'Khám tổng quát và tư vấn sức khỏe định kỳ cho chó mèo.',
    includes: ['Khám tổng quát', 'Tư vấn bác sĩ thú y'],
    exclusions: ['Xét nghiệm chuyên sâu'],
    isActive: true,
    sortOrder: 4,
  },
];

const legacyServiceSlugs = [
  'combo-deluxe-tam-cat-duong',
  'tam-goi-co-ban',
  'tam-grooming-co-ban',
  'spa-thu-cung',
  'spa-thu-gian',
];

async function run() {
  const uri = process.env.MONGODB_URL;
  if (!uri) throw new Error('Thiếu MONGODB_URL trong BE/.env');

  await mongoose.connect(uri);

  const keepSlugs = selectedServices.map((item) => item.slug);

  for (const item of selectedServices) {
    await Service.updateOne(
      { slug: item.slug },
      { $set: item },
      { upsert: true }
    );
  }

  const deleteResult = await Service.deleteMany({
    slug: { $in: legacyServiceSlugs },
  });

  console.log(`Kept ${selectedServices.length} services, deleted ${deleteResult.deletedCount || 0} legacy services.`);
}

run()
  .catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
