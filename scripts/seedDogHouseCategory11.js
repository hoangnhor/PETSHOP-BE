const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const Type = require('../src/models/TypeModel');
const Product = require('../src/models/ProductModel');

const products = [
  {
    name: 'Nhà Gỗ Ngoài Trời',
    image: '/product-images/dog-house-wood-outdoor.jpg',
    price: 1299000,
    countInStock: 30,
    discount: 0,
    species: 'dog',
    description: 'Nhà gỗ ngoài trời chắc chắn, phù hợp cho chó nghỉ ngơi thoải mái.',
  },
  {
    name: 'Chuồng Lồng Sắt',
    image: '/product-images/dog-cage-metal.jpg',
    price: 899000,
    countInStock: 35,
    discount: 0,
    species: 'dog',
    description: 'Chuồng lồng sắt bền chắc, thoáng khí và dễ vệ sinh.',
  },
  {
    name: 'Nhà Nhựa Trong Nhà',
    image: '/product-images/dog-house-plastic-indoor.jpg',
    price: 759000,
    countInStock: 32,
    discount: 0,
    species: 'dog',
    description: 'Nhà nhựa trong nhà gọn nhẹ, phù hợp không gian nội thất.',
  },
];

async function run() {
  const uri = process.env.MONGODB_URL;
  if (!uri) throw new Error('Thiếu MONGODB_URL trong BE/.env');

  await mongoose.connect(uri);

  const type = await Type.findOne({ name: 'Chuồng, Nhà & Quây Cho Chó' }).lean();
  if (!type?._id) throw new Error('Không tìm thấy type: Chuồng, Nhà & Quây Cho Chó');

  for (const item of products) {
    const exists = await Product.findOne({ name: item.name, type: type._id }).lean();
    if (exists?._id) {
      await Product.updateOne({ _id: exists._id }, { $set: { ...item, type: type._id, isActive: true } });
      console.log(`Updated: ${item.name}`);
    } else {
      await Product.create({ ...item, type: type._id, isActive: true });
      console.log(`Inserted: ${item.name}`);
    }
  }

  const count = await Product.countDocuments({ type: type._id });
  console.log(`Done. Total products in type "${type.name}": ${count}`);
}

run()
  .catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
