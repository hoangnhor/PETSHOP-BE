const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const Type = require('../src/models/TypeModel');
const Product = require('../src/models/ProductModel');

const products = [
  {
    name: 'Lược Kim Loại Chải Lông',
    image: '/product-images/dog-comb-metal.jpg',
    price: 139000,
    countInStock: 50,
    discount: 0,
    species: 'dog',
    description: 'Lược kim loại chải lông giúp loại bỏ lông rụng hiệu quả.',
  },
  {
    name: 'Bàn Chải Lông Mềm',
    image: '/product-images/dog-brush-soft.jpg',
    price: 149000,
    countInStock: 48,
    discount: 0,
    species: 'dog',
    description: 'Bàn chải lông mềm, phù hợp cho da nhạy cảm của chó.',
  },
  {
    name: 'Lược Gỡ Rối Chuyên Dụng',
    image: '/product-images/dog-comb-detangle.jpg',
    price: 159000,
    countInStock: 46,
    discount: 0,
    species: 'dog',
    description: 'Lược gỡ rối chuyên dụng giúp chải mượt và hạn chế đau rát.',
  },
];

async function run() {
  const uri = process.env.MONGODB_URL;
  if (!uri) throw new Error('Thiếu MONGODB_URL trong BE/.env');

  await mongoose.connect(uri);

  const type = await Type.findOne({ name: 'Lược Chải Lông Cho Chó' }).lean();
  if (!type?._id) throw new Error('Không tìm thấy type: Lược Chải Lông Cho Chó');

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
