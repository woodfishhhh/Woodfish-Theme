# 主题预览图片说明

## 需要的预览图片

### 1. 主预览图 (preview.png)

- 尺寸：1200x800 像素
- 内容：展示主题的整体效果
- 包含：代码编辑器、侧边栏、底部状态栏

### 2. 特色功能展示图

- 彩虹光标动画效果
- 代码发光效果
- 渐变语法高亮
- 透明UI效果

### 3. 对比图

- 与默认主题的对比
- 突出Woodfish主题的特色

## 建议的截图内容

```javascript
// 展示语法高亮和发光效果的代码示例
function createRainbowCursor() {
  const cursor = document.querySelector('.cursor');
  const colors = ['#ff2d95', '#ff4500', '#ffd700', '#7cfc00', '#00ffff'];

  cursor.style.background = `linear-gradient(to bottom, ${colors.join(', ')})`;
  cursor.style.animation = '30s linear infinite alternate bp-animation';

  return cursor;
}

class WoodfishTheme {
  constructor() {
    this.name = 'Woodfish Theme';
    this.version = '2.2.0';
    this.features = [
      '彩虹光标动画',
      '代码发光效果',
      '渐变语法高亮',
      '透明UI设计',
    ];
  }
}
```

## 截图建议

1. 使用深色背景突出主题效果
2. 包含多种编程语言的代码
3. 展示光标动画的不同阶段
4. 显示悬停提示的透明效果
