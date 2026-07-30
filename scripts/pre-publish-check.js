#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const VSCE_ENTRY = path.join('node_modules', '@vscode', 'vsce', 'vsce');
const VSCE_ENTRY_ABSOLUTE = path.resolve(VSCE_ENTRY);

console.log('🔍 Woodfish Theme 发布前检查');
console.log('================================');

function isValidExtensionVersion(version) {
  return /^\d+\.\d+\.\d+(?:-[0-9A-Za-z-.]+)?(?:\+[0-9A-Za-z-.]+)?$/.test(version);
}

// 检查项目结构
function checkProjectStructure() {
  console.log('📁 检查项目结构...');

  const requiredStructure = {
    'package.json': '扩展配置文件',
    'README.md': '项目说明文档',
    LICENSE: '许可证文件',
    'CHANGELOG.md': '更新日志',
    'out/extension.js': '扩展主文件(编译产物)',
    'themes/': '主题文件夹',
    'themes/shared/': '共享注入资源',
    'themes/bearded/Woodfish Dark.json': 'Woodfish Dark 主题配置',
    'themes/dracula/Woodfish Dracula.json': 'Woodfish Dracula 主题配置',
    'assets/readme/dracula-preview.png': 'Woodfish Dracula 效果预览',
    'images/': '图片资源文件夹',
  };

  let allGood = true;
  for (const [file, description] of Object.entries(requiredStructure)) {
    if (fs.existsSync(file)) {
      console.log(`✅ ${file} - ${description}`);
    } else {
      console.log(`❌ ${file} - ${description} (缺失)`);
      allGood = false;
    }
  }

  return allGood;
}

// 检查package.json配置
function checkPackageJson() {
  console.log('\n📦 检查package.json配置...');

  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const requiredFields = {
    name: packageJson.name,
    displayName: packageJson.displayName,
    description: packageJson.description,
    version: packageJson.version,
    publisher: packageJson.publisher,
    'engines.vscode': packageJson.engines?.vscode,
    categories: packageJson.categories,
    keywords: packageJson.keywords,
    repository: packageJson.repository,
    license: packageJson.license,
  };

  let allGood = true;
  for (const [field, value] of Object.entries(requiredFields)) {
    if (value) {
      console.log(`✅ ${field}: ${Array.isArray(value) ? value.join(', ') : value}`);
    } else {
      console.log(`❌ ${field}: 未设置`);
      allGood = false;
    }
  }

  // 检查版本号格式
  if (!isValidExtensionVersion(packageJson.version)) {
    console.log(`❌ 版本号格式不正确: ${packageJson.version}`);
    allGood = false;
  }

  return allGood;
}

// 检查主题文件
function checkThemeFiles() {
  console.log('\n🎨 检查主题文件...');

  let allGood = true;

  const themeConfigs = [
    'themes/bearded/Woodfish Dark.json',
    'themes/dracula/Woodfish Dracula.json',
  ];

  themeConfigs.forEach((file) => {
    try {
      const themeConfig = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (themeConfig.name && themeConfig.colors && themeConfig.tokenColors) {
        console.log(`✅ ${file} 格式正确`);
      } else {
        console.log(`❌ ${file} 格式不完整`);
        allGood = false;
      }
    } catch (error) {
      console.log(`❌ ${file} 解析失败:`, error.message);
      allGood = false;
    }
  });

  // 检查主题 CSS 文件
  const moduleFiles = [
    'themes/shared/activity-bar.css',
    'themes/shared/tab-bar.css',
    'themes/shared/glow-effects.css',
    'themes/shared/cursor-core.css',
    'themes/shared/cursor-glow.css',
    'themes/bearded/syntax-highlighting.css',
    'themes/bearded/theme.meta.json',
    'themes/dracula/syntax-highlighting.css',
    'themes/dracula/glow-effects.css',
    'themes/dracula/theme.meta.json',
    'themes/dracula/NOTICE.md',
  ];

  moduleFiles.forEach((file) => {
    if (fs.existsSync(file)) {
      console.log(`✅ ${file}`);
    } else {
      console.log(`❌ ${file} (缺失)`);
      allGood = false;
    }
  });

  return allGood;
}

// 检查文档质量
function checkDocumentation() {
  console.log('\n📚 检查文档质量...');

  let allGood = true;

  // 检查README.md
  const readme = fs.readFileSync('README.md', 'utf8');
  const requiredSections = [
    '## 效果预览',
    '## 它提供什么',
    '## 三步开始',
    '## 配置示例',
    '## 本地开发',
  ];

  requiredSections.forEach((section) => {
    if (readme.includes(section)) {
      console.log(`✅ README包含: ${section}`);
    } else {
      console.log(`❌ README缺少: ${section}`);
      allGood = false;
    }
  });

  // 检查图片引用
  const imageRefs = readme.match(/!\[.*?\]\((.*?)\)/g);
  if (imageRefs) {
    imageRefs.forEach((ref) => {
      const imagePath = ref.match(/\((.*?)\)/)[1];
      if (fs.existsSync(imagePath)) {
        console.log(`✅ 图片存在: ${imagePath}`);
      } else {
        console.log(`⚠️  图片缺失: ${imagePath}`);
      }
    });
  }

  return allGood;
}

// 检查打包清单是否干净
function checkPackageHygiene() {
  console.log('\n📦 检查 VSIX 打包清单...');

  try {
    const tree = execFileSync(process.execPath, [VSCE_ENTRY_ABSOLUTE, 'ls', '--tree'], {
      encoding: 'utf8',
    });
    const forbiddenEntries = [
      'plan.md',
      'eslint.config.mjs',
      'jest.config.js',
      '.omx/',
      '.superpowers/',
      '.worktrees/',
      'AGENTS.md',
    ];
    let allGood = true;

    forbiddenEntries.forEach((entry) => {
      if (tree.includes(entry)) {
        console.log(`❌ 打包内容不应包含: ${entry}`);
        allGood = false;
      } else {
        console.log(`✅ 已排除: ${entry}`);
      }
    });

    return allGood;
  } catch (error) {
    console.log(`❌ 无法检查 VSIX 打包清单: ${error.message}`);
    return false;
  }
}

// 生成发布清单
function generateReleaseChecklist() {
  console.log('\n📋 发布清单:');
  console.log('================================');
  console.log('□ 代码审查完成');
  console.log('□ 功能测试通过');
  console.log('□ 文档更新完成');
  console.log('□ 版本号已更新');
  console.log('□ CHANGELOG.md已更新');
  console.log('□ 截图已更新');
  console.log('□ 发布令牌已配置');
  console.log('□ Git仓库状态干净');
  console.log('□ 准备发布说明（强调 integrated runtime，不依赖第三方 CSS Loader）');
}

// 主函数
function main() {
  const checks = [
    checkProjectStructure(),
    checkPackageJson(),
    checkThemeFiles(),
    checkDocumentation(),
    checkPackageHygiene(),
  ];

  const allPassed = checks.every((check) => check);

  console.log('\n🎯 检查结果:');
  console.log('================================');

  if (allPassed) {
    console.log('🎉 所有检查通过！项目已准备好发布。');
    generateReleaseChecklist();
    console.log('\n💡 运行 `node scripts/publish.js` 开始发布流程');
  } else {
    console.log('❌ 发现问题，请修复后再次检查。');
    process.exit(1);
  }
}

// 运行脚本
if (require.main === module) {
  main();
}

module.exports = { isValidExtensionVersion, main };
