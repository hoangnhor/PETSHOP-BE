const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const Type = require('../src/models/TypeModel');
const Product = require('../src/models/ProductModel');

const products = [
  {
    name: 'Sữa Dinh Dưỡng Cho Chó Con',
    image: '/product-images/dog-milk-puppy.jpg',
    price: 135000,
    countInStock: 40,
    discount: 0,
    species: 'dog',
    description: 'Sữa dinh dưỡng cho chó con, hỗ trợ phát triển toàn diện.',
  },
  {
    name: 'Sữa Bổ Sung Canxi Cho Chó',
    image: '/product-images/dog-milk-calcium.jpg',
    price: 149000,
    countInStock: 40,
    discount: 0,
    species: 'dog',
    description: 'Sữa bổ sung canxi giúp xương và răng chắc khỏe.',
  },
  {
    name: 'Sữa Tăng Cường Miễn Dịch',
    image: '/product-images/dog-milk-immunity.jpg',
    price: 159000,
    countInStock: 40,
    discount: 0,
    species: 'dog',
    description: 'Sữa tăng cường miễn dịch, nâng cao sức đề kháng cho chó.',
  },
];

async function run() {
  const uri = process.env.MONGODB_URL;
  if (!uri) throw new Error('Thiếu MONGODB_URL trong BE/.env');

  await mongoose.connect(uri);

  const type = await Type.findOne({ name: 'Sữa Dinh Dưỡng Cho Chó' }).lean();
  if (!type?._id) throw new Error('Không tìm thấy type: Sữa Dinh Dưỡng Cho Chó');

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
