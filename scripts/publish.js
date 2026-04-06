#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execFileSync, execSync } = require('child_process');

const VSCE_ENTRY = path.join(
  'node_modules',
  '@vscode',
  'vsce',
  'vsce',
);
const VSCE_ENTRY_ABSOLUTE = path.resolve(VSCE_ENTRY);

console.log('🚀 Woodfish Theme 发布脚本');
console.log('================================');

// 检查必要文件
function checkRequiredFiles() {
  const requiredFiles = [
    'package.json',
    'README.md',
    'LICENSE',
    'themes/Bearded Theme/Bearded Theme.json',
    'themes/Bearded Theme/index.css',
    'out/extension.js',
  ];

  console.log('📋 检查必要文件...');
  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      console.error(`❌ 缺少必要文件: ${file}`);
      process.exit(1);
    }
  }
  console.log('✅ 所有必要文件检查通过');
}

// 清理临时文件
function cleanTempFiles() {
  console.log('🧹 清理临时文件...');
  const tempFiles = [
    'themes/woodfish-theme-test.css',
    'VSCode主题扩展发布准备.md',
    'VSCode主题CSS文件模块化重构.md',
  ];

  tempFiles.forEach((file) => {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
      console.log(`🗑️  删除: ${file}`);
    }
  });
  console.log('✅ 临时文件清理完成');
}

// 更新版本号
function updateVersion() {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  console.log(`📦 当前版本: ${packageJson.version}`);

  // 这里可以根据需要自动递增版本号
  // 暂时保持当前版本
  return packageJson.version;
}

const isPreReleasePublish = process.argv.includes('--pre-release');

function buildVsceArgs(command) {
  const args = [command];

  if (isPreReleasePublish) {
    args.push('--pre-release');
  }

  return args;
}

// 运行测试
function runCommand(command, description) {
  console.log(`${description}...`);
  execSync(command, { stdio: 'inherit' });
}

function runVerification() {
  console.log('🧪 运行发布前验证...');
  runCommand('npm run compile', '🔨 TypeScript 编译');
  runCommand('npm run lint', '🧹 ESLint 检查');
  runCommand('npm test', '✅ Jest 测试');
  runCommand('node scripts/pre-publish-check.js', '🔍 发布前检查');
}

// 打包扩展
function packageExtension(version) {
  console.log('📦 打包扩展...');
  try {
    execFileSync(
      process.execPath,
      [VSCE_ENTRY_ABSOLUTE, ...buildVsceArgs('package')],
      { stdio: 'inherit' },
    );
    console.log('✅ 扩展打包完成');
  } catch (error) {
    console.error('❌ 打包失败:', error.message);
    process.exit(1);
  }
}

// 发布到市场
function publishToMarketplace(version) {
  console.log('🌐 准备发布到VSCode市场...');
  if (isPreReleasePublish) {
    console.log('ℹ️  本次将按 VS Code Marketplace 预发布版本渠道发布');
  }
  console.log(
    'ℹ️  注意：将使用您本地环境配置的 VSCode 发布令牌 (通过 vsce login 设置)',
  );
  console.log(
    '    如果您未在本地登录，发布可能会失败。脚本不会保存或读取任何令牌文件。',
  );

  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  readline.question('是否继续发布到市场？(y/N): ', (answer) => {
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      try {
        execFileSync(
          process.execPath,
          [VSCE_ENTRY_ABSOLUTE, ...buildVsceArgs('publish')],
          { stdio: 'inherit' },
        );
        console.log('🎉 发布到VSCode市场成功！');
      } catch (error) {
        console.error('❌ 发布失败:', error.message);
        console.log('💡 请检查发布令牌和网络连接');
      }
    } else {
      console.log('⏸️  跳过市场发布');
    }
    readline.close();

    // 提示GitHub发布
    console.log('\n📋 GitHub发布清单:');
    console.log('1. git add .');
    console.log('2. git commit -m "Release v' + version + '"');
    console.log('3. git tag v' + version);
    console.log('4. git push origin main --tags');
    console.log('5. 在GitHub上创建Release并上传.vsix文件');
    console.log('6. Release notes 中注明 integrated runtime 已取代第三方 CSS Loader 依赖');
  });
}

// 主函数
function main() {
  try {
    checkRequiredFiles();
    cleanTempFiles();
    const version = updateVersion();
    runVerification();
    packageExtension(version);
    publishToMarketplace(version);
  } catch (error) {
    console.error('❌ 发布过程中出现错误:', error.message);
    process.exit(1);
  }
}

// 运行脚本
if (require.main === module) {
  main();
}

module.exports = { main };
