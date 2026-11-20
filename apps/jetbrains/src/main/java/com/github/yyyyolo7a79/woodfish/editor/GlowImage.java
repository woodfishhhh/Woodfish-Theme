package com.github.yyyyolo7a79.woodfish.editor;

import java.awt.image.BufferedImage;

/**
 * 一个视觉行的发光栅格（预乘 alpha，设备像素），由后台线程生成后只读共享。
 *
 * <p>位置相对「内容区 x = 0、该行顶部」在设备空间里的点；绘制时按当前 Graphics 的平移把它
 * 摆到整数设备像素上，走最快的 1:1 混合路径（不做缩放插值）。
 *
 * @param image   裁掉全透明边缘后的图像；{@link #NONE} 时为 null
 * @param offsetX 图像左上角相对内容区原点的设备像素偏移
 * @param offsetY 图像左上角相对行顶的设备像素偏移（通常为负：发光向上溢出）
 */
record GlowImage(BufferedImage image, int offsetX, int offsetY) {

    /** 该行没有可见发光（也用作栅格化失败的结果，避免反复重试） */
    static final GlowImage NONE = new GlowImage(null, 0, 0);

    boolean isEmpty() {
        return image == null;
    }

    /** 像素数据占用的字节数（缓存按它限额） */
    long bytes() {
        return image == null ? 0 : (long) image.getWidth() * image.getHeight() * 4;
    }
}
