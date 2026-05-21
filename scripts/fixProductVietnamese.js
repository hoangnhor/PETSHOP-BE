const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const Product = require('../src/models/ProductModel');

const fixes = [
  {
    id: '6a079def4b7bfc179bdefa0c',
    description: 'Vòng cổ da cao cấp cho chó, bền chắc và thoải mái khi đeo.',
  },
  {
    id: '6a079def4b7bfc179bdefa11',
    description: 'Dây dắt chống giật giúp kiểm soát tốt hơn khi dắt chó đi dạo.',
  },
  {
    id: '6a079def4b7bfc179bdefa16',
    description: 'Bộ vòng cổ và dây dắt đồng bộ, tiện lợi và thời trang.',
  },
  {
    id: '6a079ebe59d38fed7688cdd6',
    description: 'Bát ăn đôi inox cho chó, chắc chắn và dễ vệ sinh.',
  },
  {
    id: '6a079ebe59d38fed7688cddb',
    description: 'Bình nước tự động cho chó, cấp nước liên tục và sạch sẽ.',
  },
  {
    id: '6a079ebf59d38fed7688cde0',
    description: 'Máy cho ăn tự động giúp kiểm soát khẩu phần và giờ ăn.',
  },
  {
    id: '6a079f9f7115b39e9338abbf',
    description: 'Sữa tắm dưỡng lông giúp lông mềm mượt và sạch sâu.',
  },
  {
    id: '6a079f9f7115b39e9338abc4',
    description: 'Sữa tắm khử mùi giúp giảm mùi hôi và làm sạch da lông.',
  },
  {
    id: '6a079f9f7115b39e9338abc9',
    description: 'Nước hoa thú cưng hương dịu nhẹ, lưu hương dễ chịu.',
  },
  {
    id: '6a07a04a21f79d73b3a471c6',
    description: 'Bỉm lót sàn thấm hút cho chó, chống tràn và khử mùi hiệu quả.',
  },
  {
    id: '6a07a04a21f79d73b3a471cb',
    description: 'Tã quần cho chó ôm vừa vặn, tiện lợi khi di chuyển hoặc đi chơi.',
  },
  {
    id: '6a07a04b21f79d73b3a471d0',
    description: 'Khay vệ sinh cỏ giả giúp chó dễ làm quen, vệ sinh nhanh gọn.',
  },
];

async function run() {
  const uri = process.env.MONGODB_URL;
  if (!uri) throw new Error('Thiếu MONGODB_URL trong BE/.env');

  await mongoose.connect(uri);

  let updated = 0;
  for (const item of fixes) {
    const result = await Product.updateOne({ _id: item.id }, { $set: { description: item.description } });
    updated += result.modifiedCount;
  }

  const remained = await Product.countDocuments({ description: /\?/ });
  console.log(`Updated: ${updated}`);
  console.log(`Remaining broken descriptions: ${remained}`);
}

run()
  .catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
