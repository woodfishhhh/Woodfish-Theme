/**
 * 渐变语法与文字发光的颜色数学，移植自 VS Code 扩展 Woodfish Theme 的
 * {@code themes/shared/overlay-bootstrap.js} 与 {@code src/services/runtime/overlay.ts}。
 *
 * <p>本包是纯算法，不依赖任何 IntelliJ API，可以脱离 IDE 单独做单元测试。
 * 公开类要么无状态，要么不可变，可在 EDT 与后台发光线程上同时使用。
 */
package com.github.yyyyolo7a79.woodfish.core.color;
