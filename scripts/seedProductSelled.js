const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const Product = require('../src/models/ProductModel');

const HOT_KEYWORDS = [
  'snack',
  'thuong',
  'banh',
  'day dat',
  'vong co',
  'bat an',
  'balo',
  'cat ve sinh',
  'pate',
  'hat',
];

const normalize = (text = '') =>
  String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const matchHot = (name = '') => {
  const n = normalize(name);
  return HOT_KEYWORDS.some((kw) => n.includes(kw));
};

async function run() {
  const uri = process.env.MONGODB_URL;
  if (!uri) throw new Error('Thiếu MONGODB_URL trong BE/.env');
  await mongoose.connect(uri);

  const products = await Product.find({ isActive: true })
    .select('_id name selled')
    .sort({ createdAt: -1 })
    .lean();

  if (!products.length) {
    console.log('Không có sản phẩm để seed selled.');
    return;
  }

  const hotProducts = products.filter((p) => matchHot(p.name));
  const normalProducts = products.filter((p) => !matchHot(p.name));

  const ops = [];

  hotProducts.forEach((product, index) => {
    const target = 1200 - index * 120;
    ops.push({
      updateOne: {
        filter: { _id: product._id },
        update: { $set: { selled: Math.max(350, target) } },
      },
    });
  });

  normalProducts.slice(0, 20).forEach((product, index) => {
    const target = 280 - index * 8;
    ops.push({
      updateOne: {
        filter: { _id: product._id },
        update: { $set: { selled: Math.max(25, target) } },
      },
    });
  });

  if (ops.length) await Product.bulkWrite(ops);

  const top = await Product.find({ isActive: true })
    .select('name selled')
    .sort({ selled: -1, createdAt: -1 })
    .limit(8)
    .lean();

  console.log(`Updated selled for ${ops.length} products.`);
  console.log('Top selled products:');
  top.forEach((item, idx) => {
    console.log(`${idx + 1}. ${item.name} - ${item.selled}`);
  });
}

run()
  .catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });

