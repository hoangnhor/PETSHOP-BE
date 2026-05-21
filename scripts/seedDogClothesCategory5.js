const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const Type = require('../src/models/TypeModel');
const Product = require('../src/models/ProductModel');

const products = [
  {
    name: 'Áo Hoodie Cho Chó',
    image: '/product-images/dog-hoodie.jpg',
    price: 189000,
    countInStock: 45,
    discount: 0,
    species: 'dog',
    description: 'Áo hoodie cho chó, giữ ấm và thời trang cho thú cưng.',
  },
  {
    name: 'Áo Len Ấm Áp',
    image: '/product-images/dog-sweater.jpg',
    price: 199000,
    countInStock: 45,
    discount: 0,
    species: 'dog',
    description: 'Áo len ấm áp cho chó, chất liệu mềm và thoải mái.',
  },
  {
    name: 'Áo Thun Thời Trang',
    image: '/product-images/dog-tshirt.jpg',
    price: 169000,
    countInStock: 45,
    discount: 0,
    species: 'dog',
    description: 'Áo thun thời trang cho chó, phù hợp dạo phố hằng ngày.',
  },
];

async function run() {
  const uri = process.env.MONGODB_URL;
  if (!uri) throw new Error('Thiếu MONGODB_URL trong BE/.env');

  await mongoose.connect(uri);

  const type = await Type.findOne({ name: 'Quần Áo Cho Chó' }).lean();
  if (!type?._id) throw new Error('Không tìm thấy type: Quần Áo Cho Chó');

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
