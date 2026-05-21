const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const Type = require('../src/models/TypeModel');
const Product = require('../src/models/ProductModel');

const products = [
  {
    name: 'Vitamin Tổng Hợp',
    image: '/product-images/dog-supplement-multivitamin.jpg',
    price: 259000,
    countInStock: 45,
    discount: 0,
    species: 'dog',
    description: 'Vitamin tổng hợp hỗ trợ sức khỏe toàn diện cho chó.',
  },
  {
    name: 'Viên Bổ Sung Canxi',
    image: '/product-images/dog-supplement-calcium.jpg',
    price: 279000,
    countInStock: 42,
    discount: 0,
    species: 'dog',
    description: 'Viên bổ sung canxi giúp xương và răng chắc khỏe cho chó.',
  },
  {
    name: 'Thực Phẩm Chức Năng Tăng Cường Miễn Dịch',
    image: '/product-images/dog-supplement-immunity.jpg',
    price: 299000,
    countInStock: 40,
    discount: 0,
    species: 'dog',
    description: 'Thực phẩm chức năng tăng cường miễn dịch cho chó khỏe mạnh hơn.',
  },
];

async function run() {
  const uri = process.env.MONGODB_URL;
  if (!uri) throw new Error('Thiếu MONGODB_URL trong BE/.env');

  await mongoose.connect(uri);

  const type = await Type.findOne({ name: 'Thực Phẩm Chức Năng Cho Chó' }).lean();
  if (!type?._id) throw new Error('Không tìm thấy type: Thực Phẩm Chức Năng Cho Chó');

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
