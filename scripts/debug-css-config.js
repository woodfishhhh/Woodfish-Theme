const fs = require('fs');
const path = require('path');

// 切换到项目根目录，确保脚本在任何位置运行都能找到文件
try {
  process.chdir(path.join(__dirname, '..'));
} catch (err) {
  console.error('无法切换到根目录:', err);
}

// 模拟VSCode配置检查
console.log('=== Woodfish主题CSS配置调试 ===');

// 1. 检查package.json中的配置
console.log('\n1. 检查package.json配置:');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
  console.log('扩展配置:', {
    name: packageJson.name,
    version: packageJson.version,
    commands:
      packageJson.contributes?.commands?.map((cmd) => cmd.command) || [],
  });
} catch (e) {
  console.error('读取package.json失败:', e.message);
}

// 2. 检查主题文件是否存在
console.log('\n2. 检查主题文件:');
const themeFiles = [
  'themes/woodfish-theme.css',
  'themes/woodfish-theme-modular.css',
  'themes/modules/glow-effects.css',
  'themes/modules/syntax-highlighting.css',
  'themes/modules/variables.css',
  'themes/modules/cursor-animation.css',
  'themes/modules/transparent-ui.css',
  'themes/modules/activity-bar.css',
  'themes/modules/tab-bar.css',
  'custom-css/rainbow-cursor.css',
  'custom-css/cursor-loader.css',
];

const existingFiles = [];
themeFiles.forEach((file) => {
  if (fs.existsSync(file)) {
    existingFiles.push(file);
    console.log(`✅ ${file} - 存在`);
  } else {
    console.log(`❌ ${file} - 不存在`);
  }
});

// 3. 检查文件内容
console.log('\n3. 检查文件内容关键词:');
const keywords = ['text-shadow', 'gradient', 'glow', 'rainbow', 'animation'];

existingFiles.forEach((file) => {
  try {
    const content = fs.readFileSync(file, 'utf-8');
    const foundKeywords = keywords.filter((keyword) =>
      content.includes(keyword),
    );
    if (foundKeywords.length > 0) {
      console.log(`${file}: 包含关键词 ${foundKeywords.join(', ')}`);
    }
  } catch (e) {
    console.error(`读取${file}失败:`, e.message);
  }
});

// 4. 模拟文件URI生成
console.log('\n4. 模拟文件URI:');
const projectRoot = process.cwd();
const testFiles = [
  'themes/woodfish-theme.css',
  'themes/woodfish-theme-modular.css',
  'themes/modules/glow-effects.css',
];

testFiles.forEach((file) => {
  const fullPath = path.join(projectRoot, file);
  const fileUri = `file:///${fullPath.replace(/\\/g, '/')}`;
  console.log(`${file} -> ${fileUri}`);
});

// 5. 关键词匹配测试
console.log('\n5. 关键词匹配测试:');
const testPaths = [
  'file:///C:/Users/woodfish/Desktop/woodfish theme/themes/woodfish-theme.css',
  'file:///C:/Users/woodfish/Desktop/woodfish theme/themes/modules/glow-effects.css',
  'file:///C:/Users/woodfish/Desktop/woodfish theme/custom-css/rainbow-cursor.css',
];

const woodfishKeywords = [
  'woodfish-theme',
  'glow-effects',
  'cursor-animation',
  'rainbow-cursor',
  'woodfish',
];

testPaths.forEach((testPath) => {
  const matched = woodfishKeywords.some((keyword) =>
    testPath.includes(keyword),
  );
  console.log(`${testPath}: ${matched ? '✅ 匹配' : '❌ 不匹配'}`);
});

console.log('\n=== 调试完成 ===');
