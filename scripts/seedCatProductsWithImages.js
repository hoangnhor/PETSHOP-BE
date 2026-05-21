const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const Type = require('../src/models/TypeModel');
const Product = require('../src/models/ProductModel');

const DOWNLOADS_DIR = path.resolve(__dirname, '../../..');
const FRONTEND_IMAGE_DIR = path.resolve(__dirname, '../../FE/public/product-images');

const categories = [
  {
    typeName: 'Thức Ăn Hạt Cho Mèo',
    sourcePrefix:
      'Ba túi thức ăn hạt khô cho mèo với thiết kế bao bì khác nhau, một túi cho mèo trưởng thành, một túi cho mèo con, một túi dinh dưỡng cao cấp, phong cách nhiếp ảnh sản phẩm chuyên nghiệp, nền sáng sạch, bố cục',
    products: [
      { name: 'Thức Ăn Hạt Cho Mèo Trưởng Thành', file: 'cat-kibble-adult.jpg', price: 219000, stock: 80, description: 'Thức ăn hạt cho mèo trưởng thành, cân bằng dinh dưỡng mỗi ngày.' },
      { name: 'Thức Ăn Hạt Cho Mèo Con', file: 'cat-kibble-kitten.jpg', price: 229000, stock: 80, description: 'Thức ăn hạt cho mèo con, hỗ trợ phát triển khỏe mạnh.' },
      { name: 'Thức Ăn Hạt Dinh Dưỡng Cao Cấp', file: 'cat-kibble-premium.jpg', price: 259000, stock: 70, description: 'Hạt cao cấp cho mèo, giàu đạm và vitamin thiết yếu.' },
    ],
  },
  {
    typeName: 'Sữa Dinh Dưỡng Cho Mèo',
    sourcePrefix:
      'Ba chai sữa dinh dưỡng cho mèo với thiết kế khác nhau, một chai sữa cho mèo con, một chai sữa bổ sung canxi, một chai sữa tăng cường miễn dịch, phong cách nhiếp ảnh sản phẩm chuyên nghiệp, nền sáng sạch',
    products: [
      { name: 'Sữa Dinh Dưỡng Cho Mèo Con', file: 'cat-milk-kitten.jpg', price: 139000, stock: 60, description: 'Sữa dinh dưỡng cho mèo con, dễ hấp thu và thơm ngon.' },
      { name: 'Sữa Bổ Sung Canxi Cho Mèo', file: 'cat-milk-calcium.jpg', price: 149000, stock: 60, description: 'Sữa bổ sung canxi giúp xương và răng mèo chắc khỏe.' },
      { name: 'Sữa Tăng Cường Miễn Dịch', file: 'cat-milk-immunity.jpg', price: 159000, stock: 60, description: 'Sữa tăng đề kháng, hỗ trợ miễn dịch tự nhiên cho mèo.' },
    ],
  },
  {
    typeName: 'Pate & Nước Sốt Cho Mèo',
    sourcePrefix:
      'Ba hộp pate và nước sốt cho mèo với thiết kế khác nhau, một hộp pate cá ngừ, một hộp pate gà, một hộp nước sốt hải sản, phong cách nhiếp ảnh sản phẩm chuyên nghiệp, nền sáng sạch',
    products: [
      { name: 'Pate Cá Ngừ Cho Mèo', file: 'cat-pate-tuna.jpg', price: 49000, stock: 100, description: 'Pate cá ngừ thơm ngon, kích thích vị giác của mèo.' },
      { name: 'Pate Gà Cho Mèo', file: 'cat-pate-chicken.jpg', price: 49000, stock: 100, description: 'Pate gà mềm mịn, phù hợp khẩu vị nhiều giống mèo.' },
      { name: 'Nước Sốt Hải Sản', file: 'cat-sauce-seafood.jpg', price: 55000, stock: 90, description: 'Nước sốt hải sản giúp bữa ăn của mèo hấp dẫn hơn.' },
    ],
  },
  {
    typeName: 'Bánh Thưởng, Súp Thưởng & Cỏ Mèo',
    sourcePrefix:
      'Ba loại bánh thưởng, súp thưởng và cỏ mèo, một túi bánh thưởng giòn tan, một gói súp thưởng dinh dưỡng, một chậu cỏ mèo tươi, phong cách nhiếp ảnh sản phẩm chuyên nghiệp, nền sáng sạch',
    products: [
      { name: 'Bánh Thưởng Giòn Tan', file: 'cat-treat-crispy.jpg', price: 69000, stock: 90, description: 'Bánh thưởng giòn tan dùng để huấn luyện và thưởng hằng ngày.' },
      { name: 'Súp Thưởng Dinh Dưỡng', file: 'cat-soup-treat.jpg', price: 59000, stock: 90, description: 'Súp thưởng dinh dưỡng, dễ ăn và bổ sung năng lượng nhanh.' },
      { name: 'Cỏ Mèo Tươi Hữu Cơ', file: 'cat-grass-organic.jpg', price: 79000, stock: 50, description: 'Cỏ mèo tươi giúp hỗ trợ tiêu hóa và giảm búi lông.' },
    ],
  },
  {
    typeName: 'Quần Áo Cho Mèo',
    sourcePrefix:
      'Ba loại quần áo cho mèo, một áo len ấm áp, một áo hoodie dễ thương, một áo thun mỏng nhẹ, nhiều màu sắc khác nhau, phong cách nhiếp ảnh sản phẩm chuyên nghiệp, nền sáng sạch',
    products: [
      { name: 'Áo Len Ấm Áp', file: 'cat-sweater-warm.jpg', price: 179000, stock: 45, description: 'Áo len giữ ấm tốt cho mèo trong thời tiết lạnh.' },
      { name: 'Áo Hoodie Dễ Thương', file: 'cat-hoodie-cute.jpg', price: 189000, stock: 45, description: 'Áo hoodie mềm mại, thiết kế dễ thương cho mèo.' },
      { name: 'Áo Thun Mỏng Nhẹ', file: 'cat-tshirt-light.jpg', price: 159000, stock: 45, description: 'Áo thun mỏng nhẹ, phù hợp mặc hằng ngày.' },
    ],
  },
  {
    typeName: 'Đồ Chơi Cho Mèo',
    sourcePrefix:
      'Ba loại đồ chơi cho mèo, một chuột đồ chơi lông vũ, một cần câu mèo tương tác, một bóng lông nhiều màu, phong cách nhiếp ảnh sản phẩm chuyên nghiệp, nền sáng sạch',
    products: [
      { name: 'Chuột Đồ Chơi Lông Vũ', file: 'cat-toy-mouse-feather.jpg', price: 79000, stock: 70, description: 'Chuột đồ chơi lông vũ giúp mèo tăng phản xạ khi chơi.' },
      { name: 'Cần Câu Mèo Tương Tác', file: 'cat-toy-wand-interactive.jpg', price: 99000, stock: 70, description: 'Cần câu tương tác giúp mèo vận động và giảm buồn chán.' },
      { name: 'Bóng Lông Nhiều Màu', file: 'cat-toy-color-ball.jpg', price: 69000, stock: 70, description: 'Bóng lông nhiều màu kích thích săn bắt tự nhiên của mèo.' },
    ],
  },
  {
    typeName: 'Vòng Cổ & Dây Dắt Cho Mèo',
    sourcePrefix:
      'Ba bộ vòng cổ và dây dắt cho mèo, một vòng cổ có chuông, một dây dắt mềm mại, một bộ vòng cổ và dây dắt hoàn chỉnh, nhiều màu sắc, phong cách nhiếp ảnh sản phẩm chuyên nghiệp, nền sáng sạch',
    products: [
      { name: 'Vòng Cổ Có Chuông', file: 'cat-collar-bell.jpg', price: 99000, stock: 55, description: 'Vòng cổ có chuông nhỏ, đeo êm và dễ nhận biết mèo.' },
      { name: 'Dây Dắt Mềm Mại', file: 'cat-leash-soft.jpg', price: 119000, stock: 55, description: 'Dây dắt mềm mại, cầm chắc tay khi dẫn mèo đi dạo.' },
      { name: 'Bộ Vòng Cổ Và Dây Dắt', file: 'cat-collar-leash-set.jpg', price: 149000, stock: 55, description: 'Bộ vòng cổ và dây dắt đồng bộ, tiện dụng và đẹp mắt.' },
    ],
  },
  {
    typeName: 'Bát Ăn, Bình Nước & Lược Chải Cho Mèo',
    sourcePrefix:
      'Ba loại bát ăn và bình nước cho mèo, một bát ăn đôi inox, một bình nước tự động, một máy cho ăn tự động, nhiều màu sắc, phong cách nhiếp ảnh sản phẩm chuyên nghiệp, nền sáng sạch',
    products: [
      { name: 'Bát Ăn Đôi Inox', file: 'cat-bowl-double-inox.jpg', price: 139000, stock: 60, description: 'Bát ăn đôi inox bền chắc, dễ vệ sinh cho mèo.' },
      { name: 'Bình Nước Tự Động', file: 'cat-water-dispenser-auto.jpg', price: 199000, stock: 50, description: 'Bình nước tự động giữ nước sạch cho mèo cả ngày.' },
      { name: 'Máy Cho Ăn Tự Động', file: 'cat-feeder-auto.jpg', price: 790000, stock: 25, description: 'Máy cho ăn tự động hỗ trợ chia khẩu phần đúng giờ.' },
    ],
  },
  {
    typeName: 'Sữa Tắm & Nước Hoa Cho Mèo',
    sourcePrefix:
      'Ba chai sữa tắm và nước hoa cho mèo, một chai sữa tắm dưỡng lông, một chai sữa tắm khử mùi, một chai nước hoa thú cưng, phong cách nhiếp ảnh sản phẩm chuyên nghiệp, nền sáng sạch',
    products: [
      { name: 'Sữa Tắm Dưỡng Lông', file: 'cat-shampoo-conditioning.jpg', price: 149000, stock: 65, description: 'Sữa tắm dưỡng lông giúp lông mèo mềm mượt và bóng khỏe.' },
      { name: 'Sữa Tắm Khử Mùi', file: 'cat-shampoo-deodorant.jpg', price: 149000, stock: 65, description: 'Sữa tắm khử mùi giúp giảm mùi hôi và làm sạch sâu.' },
      { name: 'Nước Hoa Thú Cưng', file: 'cat-perfume-pet.jpg', price: 129000, stock: 65, description: 'Nước hoa thú cưng hương nhẹ, an toàn cho mèo.' },
    ],
  },
  {
    typeName: 'Cát Vệ Sinh Cho Mèo',
    sourcePrefix:
      'Ba loại cát vệ sinh cho mèo, một túi cát vệ sinh vón cục, một túi cát vệ sinh đậu nành, một túi cát vệ sinh khử mùi, phong cách nhiếp ảnh sản phẩm chuyên nghiệp, nền sáng sạch',
    products: [
      { name: 'Cát Vệ Sinh Vón Cục', file: 'cat-litter-clumping.jpg', price: 129000, stock: 100, description: 'Cát vệ sinh vón cục nhanh, dễ dọn và tiết kiệm.' },
      { name: 'Cát Vệ Sinh Đậu Nành', file: 'cat-litter-soy.jpg', price: 149000, stock: 100, description: 'Cát đậu nành thân thiện môi trường, ít bụi.' },
      { name: 'Cát Vệ Sinh Khử Mùi', file: 'cat-litter-deodorizing.jpg', price: 139000, stock: 100, description: 'Cát khử mùi hiệu quả, giữ khu vực khô thoáng.' },
    ],
  },
  {
    typeName: 'Khay Vệ Sinh Cho Mèo',
    sourcePrefix:
      'Ba loại khay vệ sinh cho mèo, một khay vệ sinh có nắp đậy, một khay vệ sinh mở, một khay vệ sinh tự động, nhiều màu sắc, phong cách nhiếp ảnh sản phẩm chuyên nghiệp, nền sáng sạch',
    products: [
      { name: 'Khay Vệ Sinh Có Nắp Đậy', file: 'cat-litter-tray-covered.jpg', price: 289000, stock: 35, description: 'Khay vệ sinh có nắp giúp hạn chế mùi và cát văng.' },
      { name: 'Khay Vệ Sinh Mở', file: 'cat-litter-tray-open.jpg', price: 189000, stock: 35, description: 'Khay vệ sinh mở, dễ làm quen cho mèo mới.' },
      { name: 'Khay Vệ Sinh Tự Động', file: 'cat-litter-tray-auto.jpg', price: 1690000, stock: 15, description: 'Khay vệ sinh tự động, giảm công dọn cát hằng ngày.' },
    ],
  },
  {
    typeName: 'Balo & Túi Vận Chuyển Cho Mèo',
    sourcePrefix:
      'Ba loại balo và túi vận chuyển cho mèo, một balo vận chuyển lưng, một túi xách vận chuyển, một balo có cửa sổ lưới, nhiều màu sắc, phong cách nhiếp ảnh sản phẩm chuyên nghiệp, nền sáng sạch',
    products: [
      { name: 'Balo Vận Chuyển Lưng', file: 'cat-backpack-carrier.jpg', price: 399000, stock: 40, description: 'Balo vận chuyển lưng thoáng khí, chắc chắn khi di chuyển.' },
      { name: 'Túi Xách Vận Chuyển', file: 'cat-handbag-carrier.jpg', price: 349000, stock: 40, description: 'Túi xách vận chuyển gọn nhẹ cho các chuyến đi ngắn.' },
      { name: 'Balo Có Cửa Sổ Lưới', file: 'cat-backpack-mesh-window.jpg', price: 429000, stock: 40, description: 'Balo cửa sổ lưới giúp mèo thoáng và dễ quan sát.' },
    ],
  },
  {
    typeName: 'Đệm, Nệm & Ổ Nằm Cho Mèo',
    sourcePrefix:
      'Ba loại đệm nệm và ổ nằm cho mèo, một đệm vuông êm ái, một ổ nằm tròn mềm mại, một nệm chữ nhật cao cấp, nhiều màu sắc, phong cách nhiếp ảnh sản phẩm chuyên nghiệp, nền sáng sạch',
    products: [
      { name: 'Đệm Vuông Êm Ái', file: 'cat-cushion-square.jpg', price: 259000, stock: 45, description: 'Đệm vuông êm ái, nâng đỡ tốt cho mèo nghỉ ngơi.' },
      { name: 'Ổ Nằm Tròn Mềm Mại', file: 'cat-bed-round-soft.jpg', price: 279000, stock: 45, description: 'Ổ nằm tròn mềm mại tạo cảm giác an toàn cho mèo.' },
      { name: 'Nệm Chữ Nhật Cao Cấp', file: 'cat-mattress-rectangle-premium.jpg', price: 329000, stock: 40, description: 'Nệm chữ nhật cao cấp, chất liệu bền và dễ vệ sinh.' },
    ],
  },
  {
    typeName: 'Thuốc Thú Y & Dụng Cụ Y Tế Cho Mèo',
    sourcePrefix:
      'Ba loại thuốc thú y và dụng cụ y tế cho mèo, một lọ thuốc tẩy giun sán, một bộ dụng cụ y tế cơ bản, một chai thuốc xịt khử trùng, phong cách nhiếp ảnh sản phẩm chuyên nghiệp, nền sáng sạch',
    products: [
      { name: 'Thuốc Tẩy Giun Sán', file: 'cat-medicine-deworm.jpg', price: 189000, stock: 30, description: 'Thuốc tẩy giun sán hỗ trợ đường ruột khỏe mạnh cho mèo.' },
      { name: 'Dụng Cụ Y Tế Cơ Bản', file: 'cat-medical-kit-basic.jpg', price: 239000, stock: 30, description: 'Bộ dụng cụ y tế cơ bản dùng chăm sóc mèo tại nhà.' },
      { name: 'Thuốc Xịt Khử Trùng', file: 'cat-disinfectant-spray.jpg', price: 159000, stock: 30, description: 'Xịt khử trùng giúp vệ sinh vết thương ngoài da cho mèo.' },
    ],
  },
  {
    typeName: 'Thực Phẩm Chức Năng Cho Mèo',
    sourcePrefix:
      'Ba lọ thực phẩm chức năng cho mèo, một lọ vitamin tổng hợp, một lọ viên bổ sung canxi, một lọ thực phẩm chức năng tăng cường miễn dịch, phong cách nhiếp ảnh sản phẩm chuyên nghiệp, nền sáng sạch',
    products: [
      { name: 'Vitamin Tổng Hợp', file: 'cat-supplement-multivitamin.jpg', price: 199000, stock: 50, description: 'Vitamin tổng hợp giúp mèo ăn ngon và khỏe toàn diện.' },
      { name: 'Viên Bổ Sung Canxi', file: 'cat-supplement-calcium.jpg', price: 219000, stock: 50, description: 'Viên bổ sung canxi hỗ trợ xương, răng và khớp.' },
      { name: 'Thực Phẩm Chức Năng Tăng Cường Miễn Dịch', file: 'cat-supplement-immunity.jpg', price: 229000, stock: 50, description: 'TPCN tăng miễn dịch, hỗ trợ sức đề kháng cho mèo.' },
    ],
  },
  {
    typeName: 'Lược Chải Lông Cho Mèo',
    sourcePrefix:
      'Ba loại lược chải lông cho mèo, một lược kim loại chải lông, một bàn chải lông mềm, một lược gỡ rối chuyên dụng, nhiều màu sắc, phong cách nhiếp ảnh sản phẩm chuyên nghiệp, nền sáng sạch',
    products: [
      { name: 'Lược Kim Loại Chải Lông', file: 'cat-comb-metal.jpg', price: 129000, stock: 60, description: 'Lược kim loại giúp loại bỏ lông rụng hiệu quả.' },
      { name: 'Bàn Chải Lông Mềm', file: 'cat-brush-soft.jpg', price: 119000, stock: 60, description: 'Bàn chải lông mềm phù hợp da nhạy cảm của mèo.' },
      { name: 'Lược Gỡ Rối Chuyên Dụng', file: 'cat-comb-detangle.jpg', price: 139000, stock: 60, description: 'Lược gỡ rối chuyên dụng, hạn chế rối và vón lông.' },
    ],
  },
];

function resolveSourceFile(prefix, variant) {
  const allFiles = fs
    .readdirSync(DOWNLOADS_DIR)
    .filter((name) => name.toLowerCase().endsWith('.jpg') && name.startsWith(prefix));

  const withVariant = allFiles.find((name) => name.includes(`(${variant}).jpg`));
  if (withVariant) return path.join(DOWNLOADS_DIR, withVariant);

  const plain = allFiles.find((name) => !name.includes('('));
  if (plain) return path.join(DOWNLOADS_DIR, plain);

  if (allFiles[0]) return path.join(DOWNLOADS_DIR, allFiles[0]);
  return null;
}

async function run() {
  const uri = process.env.MONGODB_URL;
  if (!uri) throw new Error('Thiếu MONGODB_URL trong BE/.env');

  if (!fs.existsSync(FRONTEND_IMAGE_DIR)) {
    fs.mkdirSync(FRONTEND_IMAGE_DIR, { recursive: true });
  }

  await mongoose.connect(uri);

  for (const category of categories) {
    const type = await Type.findOne({ name: category.typeName, species: 'cat' }).lean();
    if (!type?._id) {
      throw new Error(`Không tìm thấy type: ${category.typeName}`);
    }

    for (let i = 0; i < category.products.length; i += 1) {
      const product = category.products[i];
      const sourceFile = resolveSourceFile(category.sourcePrefix, i + 1);
      if (!sourceFile) {
        throw new Error(`Không tìm thấy ảnh nguồn cho danh mục: ${category.typeName}, sản phẩm: ${product.name}`);
      }

      const destPath = path.join(FRONTEND_IMAGE_DIR, product.file);
      fs.copyFileSync(sourceFile, destPath);

      const image = `/product-images/${product.file}`;
      const exists = await Product.findOne({ name: product.name, type: type._id }).lean();
      const data = {
        name: product.name,
        image,
        price: product.price,
        countInStock: product.stock,
        discount: 0,
        species: 'cat',
        description: product.description,
        type: type._id,
        isActive: true,
      };

      if (exists?._id) {
        await Product.updateOne({ _id: exists._id }, { $set: data });
        console.log(`Updated: ${product.name}`);
      } else {
        await Product.create(data);
        console.log(`Inserted: ${product.name}`);
      }
    }
  }

  const catCount = await Product.countDocuments({ species: 'cat' });
  console.log(`Done. Total cat products: ${catCount}`);
}

run()
  .catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
