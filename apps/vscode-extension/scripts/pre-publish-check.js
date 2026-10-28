#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const {
  EXTENSION_ROOT,
  REPO_ROOT,
  VSCE_ENTRY: VSCE_ENTRY_ABSOLUTE,
  withStagedRepoFiles,
} = require('./paths');

const MAX_PACKAGE_SOURCE_BYTES = 400 * 1024;
const FORBIDDEN_PACKAGE_PATHS = [
  /^AGENTS\.md$/i,
  /\/AGENTS\.md$/i,
  /^plan\.md$/i,
  /^README\.en\.md$/i,
  /^eslint\.config\.mjs$/i,
  /^jest\.config\.js$/i,
  /^browser\//i,
  /^scripts\//i,
  /^node_modules\//i,
  /^docs\/(?!walkthrough\/|TROUBLESHOOTING\.md$)/i,
  /^out\/integration\//i,
  /^coverage\//i,
  /^\.nyc_output\//i,
  /^build\//i,
  /^\.codebuddy\//i,
  /^\.omx\//i,
  /^\.superpowers\//i,
  /^\.worktrees\//i,
  /^assets\/readme\//i,
  /^images\/(?:img1\.png|img2\.png|icon\.svg|head\.jpg)$/i,
  // 开发模式下扩展把安装记录写在扩展目录里，里面是本机路径，绝不能随包发布
  /(?:^|\/)\.woodfish-installations\.json$/i,
];
const REQUIRED_PACKAGE_PATHS = [
  'README.md',
  'LICENSE',
  'out/extension.js',
  'out/uninstall.js',
  'images/icon.jpg',
  'THIRD_PARTY_NOTICES.md',
  'themes/bearded/Woodfish Dark.json',
  'themes/bearded/theme.meta.json',
  'themes/bearded/NOTICE.md',
  'themes/bearded/LICENSE.txt',
  'themes/dracula/Woodfish Dracula.json',
  'themes/dracula/theme.meta.json',
  'themes/dracula/NOTICE.md',
  'themes/dracula/LICENSE.txt',
  'themes/shared/activity-bar.css',
  'themes/shared/tab-bar.css',
  'themes/shared/overlay-bootstrap.js',
  'themes/shared/cursor-core.css',
  'themes/shared/cursor-glow.css',
  'themes/shared/native-window-main.mjs',
  'themes/black/Woodfish Black.json',
  'themes/black/theme.meta.json',
  'themes/neon/Woodfish Neon.json',
  'themes/neon/theme.meta.json',
  'themes/light/Woodfish Light.json',
  'themes/light/theme.meta.json',
  'docs/walkthrough/enable.md',
];
const REQUIRED_README_PREVIEWS = [
  {
    url: 'https://github.com/woodfishhhh/Woodfish-Theme/raw/HEAD/assets/readme/hero.png',
    sourcePrefix: '<img src="',
    sourceSuffix: '"',
  },
  {
    url: 'https://github.com/woodfishhhh/Woodfish-Theme/raw/HEAD/assets/readme/dracula-preview.png',
    sourcePrefix: '<img src="',
    sourceSuffix: '"',
  },
  {
    url: 'https://github.com/woodfishhhh/Woodfish-Theme/raw/HEAD/images/img1.png',
    sourcePrefix: '![Woodfish Dark 彩虹光标效果](',
    sourceSuffix: ')',
  },
  {
    url: 'https://github.com/woodfishhhh/Woodfish-Theme/raw/HEAD/images/img2.png',
    sourcePrefix: '![Woodfish Dark 渐变语法与发光效果](',
    sourceSuffix: ')',
  },
];

function isValidExtensionVersion(version) {
  return /^\d+\.\d+\.\d+(?:-[0-9A-Za-z-.]+)?(?:\+[0-9A-Za-z-.]+)?$/.test(version);
}

function parsePackagePaths(tree) {
  return tree
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function findForbiddenPackagePaths(tree) {
  const packagePaths = parsePackagePaths(tree);

  return packagePaths.filter((packagePath) =>
    FORBIDDEN_PACKAGE_PATHS.some((pattern) => pattern.test(packagePath.replaceAll('\\', '/')))
  );
}

function findMissingReadmePreviewUrls(readme) {
  return REQUIRED_README_PREVIEWS.filter(
    ({ sourcePrefix, sourceSuffix, url }) =>
      !readme.includes(`${sourcePrefix}${url}${sourceSuffix}`)
  ).map(({ url }) => url);
}

function findMissingRequiredPackagePaths(tree) {
  const packagePaths = new Set(
    parsePackagePaths(tree).map((packagePath) => packagePath.replaceAll('\\', '/').toLowerCase())
  );

  return REQUIRED_PACKAGE_PATHS.filter(
    (requiredPath) => !packagePaths.has(requiredPath.toLowerCase())
  );
}

function calculatePackageSourceBytes(
  tree,
  getSize = (packagePath) => fs.statSync(path.resolve(packagePath)).size
) {
  return parsePackagePaths(tree).reduce(
    (total, packagePath) => total + getSize(packagePath.replaceAll('\\', '/')),
    0
  );
}

// 检查项目结构
function checkProjectStructure() {
  console.log('📁 检查项目结构...');

  // 扩展自身的文件位于 apps/vscode-extension，README、LICENSE 与预览图位于仓库根目录
  const requiredStructure = [
    [EXTENSION_ROOT, 'package.json', '扩展配置文件'],
    [REPO_ROOT, 'README.md', '项目说明文档'],
    [REPO_ROOT, 'LICENSE', '许可证文件'],
    [EXTENSION_ROOT, 'CHANGELOG.md', '更新日志'],
    [EXTENSION_ROOT, 'THIRD_PARTY_NOTICES.md', '许可与第三方主题声明'],
    [EXTENSION_ROOT, 'out/extension.js', '扩展主文件(编译产物)'],
    [EXTENSION_ROOT, 'themes/', '主题文件夹'],
    [EXTENSION_ROOT, 'themes/shared/', '共享注入资源'],
    [EXTENSION_ROOT, 'themes/bearded/Woodfish Dark.json', 'Woodfish Dark 主题配置'],
    [EXTENSION_ROOT, 'themes/dracula/Woodfish Dracula.json', 'Woodfish Dracula 主题配置'],
    [REPO_ROOT, 'assets/readme/dracula-preview.png', 'Woodfish Dracula 效果预览'],
    [EXTENSION_ROOT, 'images/', '图片资源文件夹'],
  ];

  let allGood = true;
  for (const [root, relativePath, description] of requiredStructure) {
    const file = path.relative(REPO_ROOT, path.join(root, relativePath)).split(path.sep).join('/');
    if (fs.existsSync(path.join(root, relativePath))) {
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
    'themes/shared/overlay-bootstrap.js',
    'themes/shared/cursor-core.css',
    'themes/shared/cursor-glow.css',
    'themes/bearded/theme.meta.json',
    'themes/bearded/NOTICE.md',
    'themes/bearded/LICENSE.txt',
    'themes/dracula/theme.meta.json',
    'themes/dracula/NOTICE.md',
    'themes/dracula/LICENSE.txt',
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
  const readme = fs.readFileSync(path.join(REPO_ROOT, 'README.md'), 'utf8');
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

  const missingPreviewUrls = findMissingReadmePreviewUrls(readme);
  for (const previewUrl of missingPreviewUrls) {
    console.log(`❌ README 缺少规范远程预览链接: ${previewUrl}`);
    allGood = false;
  }

  const markdownImages = [...readme.matchAll(/!\[[^\]]*]\(([^)]+)\)/g)].map((match) => match[1]);
  const htmlImages = [...readme.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)].map(
    (match) => match[1]
  );
  for (const imagePath of [...markdownImages, ...htmlImages]) {
    if (/^(?:https?:)?\/\//i.test(imagePath)) {
      console.log(`✅ 远程图片引用: ${imagePath}`);
    } else if (fs.existsSync(path.join(REPO_ROOT, imagePath))) {
      console.log(`✅ 图片存在: ${imagePath}`);
    } else {
      console.log(`❌ 图片缺失: ${imagePath}`);
      allGood = false;
    }
  }

  return allGood;
}

// 检查打包清单是否干净
function checkPackageHygiene() {
  console.log('\n📦 检查 VSIX 打包清单...');

  try {
    // README 与 LICENSE 只在打包期间复制进扩展目录，清单检查需要同样的条件
    const { tree, packageSourceBytes } = withStagedRepoFiles(() => {
      // `vsce ls` ignores the manifest's `vsce.dependencies`; without the flag it asks npm for
      // dependencies, which inside the workspace resolves to the repository root.
      const listing = execFileSync(
        process.execPath,
        [VSCE_ENTRY_ABSOLUTE, 'ls', '--no-dependencies'],
        {
          cwd: EXTENSION_ROOT,
          encoding: 'utf8',
        }
      );
      return {
        tree: listing,
        packageSourceBytes: calculatePackageSourceBytes(
          listing,
          (packagePath) => fs.statSync(path.join(EXTENSION_ROOT, packagePath)).size
        ),
      };
    });
    const forbiddenPackagePaths = findForbiddenPackagePaths(tree);
    const missingRequiredPackagePaths = findMissingRequiredPackagePaths(tree);

    if (forbiddenPackagePaths.length > 0) {
      forbiddenPackagePaths.forEach((entry) => {
        console.log(`❌ 打包内容不应包含: ${entry}`);
      });
    }

    if (missingRequiredPackagePaths.length > 0) {
      missingRequiredPackagePaths.forEach((entry) => {
        console.log(`❌ 打包内容缺少运行所需文件: ${entry}`);
      });
    }

    if (packageSourceBytes > MAX_PACKAGE_SOURCE_BYTES) {
      console.log(
        `❌ 打包源文件共 ${packageSourceBytes} bytes，超过 ${MAX_PACKAGE_SOURCE_BYTES} bytes 预算`
      );
    }

    const passed =
      forbiddenPackagePaths.length === 0 &&
      missingRequiredPackagePaths.length === 0 &&
      packageSourceBytes <= MAX_PACKAGE_SOURCE_BYTES;
    if (passed) {
      console.log(`✅ 打包清单完整且精简（源文件 ${packageSourceBytes} bytes）`);
    }
    return passed;
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
  // 下面的相对路径都以扩展目录为准，从仓库根目录直接运行脚本时也一样
  process.chdir(EXTENSION_ROOT);
  console.log('🔍 Woodfish Theme 发布前检查');
  console.log('================================');

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

module.exports = {
  MAX_PACKAGE_SOURCE_BYTES,
  calculatePackageSourceBytes,
  findForbiddenPackagePaths,
  findMissingReadmePreviewUrls,
  findMissingRequiredPackagePaths,
  isValidExtensionVersion,
  main,
};
