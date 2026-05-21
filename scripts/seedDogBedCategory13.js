const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const Type = require('../src/models/TypeModel');
const Product = require('../src/models/ProductModel');

const products = [
  {
    name: 'Đệm Vuông Êm Ái',
    image: '/product-images/dog-cushion-square.jpg',
    price: 329000,
    countInStock: 40,
    discount: 0,
    species: 'dog',
    description: 'Đệm vuông êm ái cho chó, chất liệu mềm mịn và dễ vệ sinh.',
  },
  {
    name: 'Ổ Nằm Tròn Mềm Mại',
    image: '/product-images/dog-bed-round-soft.jpg',
    price: 359000,
    countInStock: 36,
    discount: 0,
    species: 'dog',
    description: 'Ổ nằm tròn mềm mại, giữ ấm tốt và tạo cảm giác an toàn cho chó.',
  },
  {
    name: 'Nệm Chữ Nhật Cao Cấp',
    image: '/product-images/dog-mattress-rectangle-premium.jpg',
    price: 389000,
    countInStock: 34,
    discount: 0,
    species: 'dog',
    description: 'Nệm chữ nhật cao cấp, nâng đỡ tốt và phù hợp nhiều giống chó.',
  },
];

async function run() {
  const uri = process.env.MONGODB_URL;
  if (!uri) throw new Error('Thiếu MONGODB_URL trong BE/.env');

  await mongoose.connect(uri);

  const type = await Type.findOne({ name: 'Đệm, Nệm & Ổ Nằm Cho Chó' }).lean();
  if (!type?._id) throw new Error('Không tìm thấy type: Đệm, Nệm & Ổ Nằm Cho Chó');

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
