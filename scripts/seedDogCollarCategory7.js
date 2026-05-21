const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const Type = require('../src/models/TypeModel');
const Product = require('../src/models/ProductModel');

const products = [
  {
    name: 'Vòng Cổ Da Cao Cấp',
    image: '/product-images/dog-collar-premium.jpg',
    price: 229000,
    countInStock: 40,
    discount: 0,
    species: 'dog',
    description: 'Vòng cổ da cao cấp cho chó, bền chắc và thoải mái khi đeo.',
  },
  {
    name: 'Dây Dắt Chống Giật',
    image: '/product-images/dog-leash-anti-pull.jpg',
    price: 199000,
    countInStock: 40,
    discount: 0,
    species: 'dog',
    description: 'Dây dắt chống giật giúp kiểm soát tốt hơn khi dắt chó đi dạo.',
  },
  {
    name: 'Bộ Vòng Cổ Và Dây Dắt',
    image: '/product-images/dog-collar-leash-set.jpg',
    price: 269000,
    countInStock: 40,
    discount: 0,
    species: 'dog',
    description: 'Bộ vòng cổ và dây dắt đồng bộ, tiện lợi và thời trang.',
  },
];

async function run() {
  const uri = process.env.MONGODB_URL;
  if (!uri) throw new Error('Thiếu MONGODB_URL trong BE/.env');

  await mongoose.connect(uri);

  const type = await Type.findOne({ name: 'Vòng Cổ, Dây Dắt & Rọ Mõm' }).lean();
  if (!type?._id) throw new Error('Không tìm thấy type: Vòng Cổ, Dây Dắt & Rọ Mõm');

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
