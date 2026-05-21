const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const Type = require('../src/models/TypeModel');
const Product = require('../src/models/ProductModel');

const products = [
  {
    name: 'Bóng Cao Su Nhai',
    image: '/product-images/dog-toy-ball.jpg',
    price: 99000,
    countInStock: 55,
    discount: 0,
    species: 'dog',
    description: 'Bóng cao su nhai bền chắc, hỗ trợ vận động và giải trí cho chó.',
  },
  {
    name: 'Xương Đồ Chơi Nhiều Màu',
    image: '/product-images/dog-toy-bone-color.jpg',
    price: 109000,
    countInStock: 55,
    discount: 0,
    species: 'dog',
    description: 'Xương đồ chơi nhiều màu giúp kích thích sự hứng thú khi chơi.',
  },
  {
    name: 'Đồ Chơi Gặm Tương Tác',
    image: '/product-images/dog-toy-interactive.jpg',
    price: 119000,
    countInStock: 55,
    discount: 0,
    species: 'dog',
    description: 'Đồ chơi gặm tương tác giúp giảm buồn chán và hỗ trợ rèn luyện.',
  },
];

async function run() {
  const uri = process.env.MONGODB_URL;
  if (!uri) throw new Error('Thiếu MONGODB_URL trong BE/.env');

  await mongoose.connect(uri);

  const type = await Type.findOne({ name: 'Đồ Chơi Cho Chó' }).lean();
  if (!type?._id) throw new Error('Không tìm thấy type: Đồ Chơi Cho Chó');

  for (const item of products) {
    const exists = await Product.findOne({ name: item.name, type: type._id }).lean();
    if (exists?._id) {
      await Product.updateOne(
        { _id: exists._id },
        { $set: { ...item, type: type._id, isActive: true } }
      );
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
