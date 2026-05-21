const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const Type = require('../src/models/TypeModel');
const Product = require('../src/models/ProductModel');

const products = [
  {
    name: 'Bánh Thưởng Hình Xương',
    image: '/product-images/dog-treat-bone.jpg',
    price: 69000,
    countInStock: 60,
    discount: 0,
    species: 'dog',
    description: 'Bánh thưởng hình xương thơm ngon, phù hợp huấn luyện và thưởng hằng ngày.',
  },
  {
    name: 'Xương Gặm Tự Nhiên',
    image: '/product-images/dog-chew-natural.jpg',
    price: 79000,
    countInStock: 60,
    discount: 0,
    species: 'dog',
    description: 'Xương gặm tự nhiên giúp chó giải trí và giảm căng thẳng.',
  },
  {
    name: 'Xương Gặm Sạch Răng',
    image: '/product-images/dog-dental-chew.jpg',
    price: 89000,
    countInStock: 60,
    discount: 0,
    species: 'dog',
    description: 'Xương gặm hỗ trợ làm sạch răng, giảm mảng bám và hôi miệng.',
  },
];

async function run() {
  const uri = process.env.MONGODB_URL;
  if (!uri) throw new Error('Thiếu MONGODB_URL trong BE/.env');

  await mongoose.connect(uri);

  const type = await Type.findOne({ name: 'Bánh Thưởng & Xương Gặm Cho Chó' }).lean();
  if (!type?._id) throw new Error('Không tìm thấy type: Bánh Thưởng & Xương Gặm Cho Chó');

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
