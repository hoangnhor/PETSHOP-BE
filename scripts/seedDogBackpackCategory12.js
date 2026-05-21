const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const Type = require('../src/models/TypeModel');
const Product = require('../src/models/ProductModel');

const products = [
  {
    name: 'Balo Vận Chuyển Lưng',
    image: '/product-images/dog-backpack-carrier.jpg',
    price: 459000,
    countInStock: 40,
    discount: 0,
    species: 'dog',
    description: 'Balo vận chuyển lưng tiện dụng, thoáng khí và chắc chắn.',
  },
  {
    name: 'Túi Xách Vận Chuyển',
    image: '/product-images/dog-handbag-carrier.jpg',
    price: 399000,
    countInStock: 42,
    discount: 0,
    species: 'dog',
    description: 'Túi xách vận chuyển gọn nhẹ, phù hợp đi dạo và di chuyển ngắn.',
  },
  {
    name: 'Balo Có Cửa Sổ Lưới',
    image: '/product-images/dog-backpack-mesh-window.jpg',
    price: 519000,
    countInStock: 38,
    discount: 0,
    species: 'dog',
    description: 'Balo có cửa sổ lưới thoáng mát, giúp thú cưng dễ quan sát.',
  },
];

async function run() {
  const uri = process.env.MONGODB_URL;
  if (!uri) throw new Error('Thiếu MONGODB_URL trong BE/.env');

  await mongoose.connect(uri);

  const type = await Type.findOne({ name: 'Balo & Túi Vận Chuyển Cho Chó' }).lean();
  if (!type?._id) throw new Error('Không tìm thấy type: Balo & Túi Vận Chuyển Cho Chó');

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
