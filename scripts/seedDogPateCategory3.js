const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const Type = require('../src/models/TypeModel');
const Product = require('../src/models/ProductModel');

const products = [
  {
    name: 'Pate Thịt Gà Cho Chó',
    image: '/product-images/dog-pate-chicken.jpg',
    price: 49000,
    countInStock: 50,
    discount: 0,
    species: 'dog',
    description: 'Pate thịt gà cho chó, thơm ngon và dễ tiêu hóa.',
  },
  {
    name: 'Pate Thịt Bò Cho Chó',
    image: '/product-images/dog-pate-beef.jpg',
    price: 52000,
    countInStock: 50,
    discount: 0,
    species: 'dog',
    description: 'Pate thịt bò cho chó, giàu đạm và dinh dưỡng.',
  },
  {
    name: 'Nước Sốt Thịt Hỗn Hợp',
    image: '/product-images/dog-sauce-mixed.jpg',
    price: 55000,
    countInStock: 50,
    discount: 0,
    species: 'dog',
    description: 'Nước sốt thịt hỗn hợp giúp bữa ăn của chó hấp dẫn hơn.',
  },
];

async function run() {
  const uri = process.env.MONGODB_URL;
  if (!uri) throw new Error('Thiếu MONGODB_URL trong BE/.env');

  await mongoose.connect(uri);

  const type = await Type.findOne({ name: 'Pate & Nước Sốt Cho Chó' }).lean();
  if (!type?._id) throw new Error('Không tìm thấy type: Pate & Nước Sốt Cho Chó');

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
