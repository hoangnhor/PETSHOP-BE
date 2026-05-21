const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const Type = require('../src/models/TypeModel');
const Product = require('../src/models/ProductModel');

const products = [
  {
    name: 'Thuốc Tẩy Giun Sán',
    image: '/product-images/dog-medicine-deworm.jpg',
    price: 189000,
    countInStock: 40,
    discount: 0,
    species: 'dog',
    description: 'Thuốc tẩy giun sán hỗ trợ đường ruột khỏe mạnh cho chó.',
  },
  {
    name: 'Dụng Cụ Y Tế Cơ Bản',
    image: '/product-images/dog-medical-kit-basic.jpg',
    price: 249000,
    countInStock: 35,
    discount: 0,
    species: 'dog',
    description: 'Bộ dụng cụ y tế cơ bản tiện dụng để chăm sóc chó tại nhà.',
  },
  {
    name: 'Thuốc Xịt Khử Trùng',
    image: '/product-images/dog-disinfectant-spray.jpg',
    price: 159000,
    countInStock: 45,
    discount: 0,
    species: 'dog',
    description: 'Thuốc xịt khử trùng giúp làm sạch và bảo vệ vùng da nhạy cảm.',
  },
];

async function run() {
  const uri = process.env.MONGODB_URL;
  if (!uri) throw new Error('Thiếu MONGODB_URL trong BE/.env');

  await mongoose.connect(uri);

  const type = await Type.findOne({ slug: 'phu-kien-cua-cho-thuoc-thuc-pham-chuc-nang-cho-cho-thuoc-thu-y-dung-cu-y-te' }).lean();
  if (!type?._id) throw new Error('Không tìm thấy type theo slug danh mục 14 cho chó');

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
