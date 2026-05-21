const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const Product = require('../src/models/ProductModel');

const DISCOUNT_STEPS = [5, 10, 12, 15, 18, 20, 25];
const TARGET_RATIO = 0.35; // 35% sản phẩm có discount
const MIN_TARGET = 12;

const pickDiscount = (index) => DISCOUNT_STEPS[index % DISCOUNT_STEPS.length];

async function assignDiscountForQuery(query, existingOps = []) {
  const products = await Product.find(query).select('_id discount').sort({ createdAt: -1 }).lean();
  if (!products.length) return existingOps;

  const currentDiscounted = products.filter((p) => Number(p.discount || 0) > 0).length;
  const target = Math.min(
    products.length,
    Math.max(Math.ceil(products.length * TARGET_RATIO), Math.min(MIN_TARGET, products.length))
  );
  const needMore = Math.max(0, target - currentDiscounted);
  if (needMore === 0) return existingOps;

  const candidates = products.filter((p) => Number(p.discount || 0) === 0).slice(0, needMore);
  candidates.forEach((item, idx) => {
    existingOps.push({
      updateOne: {
        filter: { _id: item._id },
        update: {
          $set: {
            discount: pickDiscount(idx),
          },
        },
      },
    });
  });

  return existingOps;
}

async function run() {
  const uri = process.env.MONGODB_URL;
  if (!uri) throw new Error('Thiếu MONGODB_URL trong BE/.env');

  await mongoose.connect(uri);

  let ops = [];
  ops = await assignDiscountForQuery({ isActive: true, species: 'dog' }, ops);
  ops = await assignDiscountForQuery({ isActive: true, species: 'cat' }, ops);
  ops = await assignDiscountForQuery({ isActive: true, species: 'all' }, ops);

  if (!ops.length) {
    const fallback = await Product.find({ isActive: true, discount: 0 })
      .select('_id')
      .sort({ createdAt: -1 })
      .limit(MIN_TARGET)
      .lean();
    fallback.forEach((item, idx) => {
      ops.push({
        updateOne: {
          filter: { _id: item._id },
          update: { $set: { discount: pickDiscount(idx) } },
        },
      });
    });
  }

  if (ops.length) {
    await Product.bulkWrite(ops);
  }

  const stats = await Product.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: '$species',
        total: { $sum: 1 },
        discounted: {
          $sum: {
            $cond: [{ $gt: ['$discount', 0] }, 1, 0],
          },
        },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  console.log(`Updated discount for ${ops.length} products.`);
  console.log('Discount stats by species:');
  stats.forEach((row) => {
    console.log(`- ${row._id}: ${row.discounted}/${row.total}`);
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

