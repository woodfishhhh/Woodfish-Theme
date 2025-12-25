# 🖼️ Woodfish Theme 预览图片

## 📁 图片文件说明

### 现有图片

- `head.jpg` - 扩展图标/头像
- `icon.svg` - SVG格式图标
- `img1.png` - 预览图片1
- `img2.png` - 预览图片2

### 🎯 建议的预览截图内容

#### 1. 主预览图 (preview.png)

展示主题的整体效果，建议包含：

```javascript
// 展示彩虹光标和发光效果的代码示例
function createWoodfishTheme() {
  const theme = {
    name: 'Woodfish Theme',
    version: '2.2.0',
    features: [
      '🌈 彩虹光标动画',
      '✨ 代码发光效果',
      '🎨 渐变语法高亮',
      '🔍 透明UI设计',
    ],
  };

  // 彩虹光标动画效果
  const cursor = document.querySelector('.cursor');
  cursor.style.background = `linear-gradient(
        to bottom,
        #ff2d95, #ff4500, #ffd700, 
        #7cfc00, #00ffff, #1e90ff,
        #9370db, #ff00ff, #ff1493
    )`;

  return theme;
}

class RainbowCursor {
  constructor() {
    this.colors = ['#ff2d95', '#ff4500', '#ffd700'];
    this.animation = '30s linear infinite alternate';
  }

  animate() {
    // 30秒彩虹循环动画
    return this.colors.join(', ');
  }
}
```

#### 2. 特色功能展示

- **彩虹光标**: 展示光标的渐变动画效果
- **发光代码**: 展示不同强度的文本发光效果
- **透明菜单**: 展示悬停提示的毛玻璃效果
- **渐变语法**: 展示各种代码元素的渐变色彩

#### 3. 对比效果

- 与默认VSCode主题的对比
- 突出Woodfish主题的独特视觉效果

## 📸 截图建议

### 推荐设置

- **分辨率**: 1200x800 像素
- **背景**: 深色背景突出主题效果
- **代码语言**: JavaScript, Python, CSS, HTML
- **界面元素**: 包含侧边栏、编辑器、底部状态栏

### 展示要点

1. 🌈 彩虹光标的动画效果（可以制作GIF）
2. ✨ 代码的发光效果（高亮显示）
3. 🎨 语法高亮的渐变色彩
4. 🔍 透明UI的毛玻璃效果
5. 📊 活动栏的动画边框

## 🎬 动画预览

建议制作GIF动画展示：

- 彩虹光标的30秒循环动画
- 选中标签的渐变边框动画
- 悬停菜单的透明效果

这些预览图片将大大提升用户对主题的第一印象和安装意愿！
