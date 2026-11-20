package com.github.yyyyolo7a79.woodfish.editor;

import com.intellij.openapi.diagnostic.Logger;
import com.intellij.openapi.editor.Editor;
import org.jetbrains.annotations.Nullable;

import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;

/**
 * 编辑器的字符网格（平台内部 API {@code EditorImpl.getCharacterGrid()}：2025.2 已有，2024.3 没有）。
 *
 * <p>网格模式下编辑器不再按字形步进排字：{@code TextFragment} 让每个字占 1 或 2 格（单格宽 = 粗斜体 'W' 的字宽
 * × 倍率），字宽与格宽不符的字在格子里居中（SimpleTextFragment 逐字画，ComplexTextFragment 改写 GlyphVector 的
 * 字形位置）。2026.2 的 Markdown 插件在文档同时含全角字符与表格分隔行时开启它，让中日韩表格对齐：中文回退字体的
 * 字宽约 1em，格宽却是 2 × 0.6em，插件若照字形步进重画，同一段里越画越偏，就是重影。
 *
 * <p>编译目标 243 还没有这个 API，于是经方法句柄调用；平台没有时 {@link #of} 恒返回 null，即不在网格模式。
 * 只在 EDT 的绘制过程中使用。
 */
final class EditorGrid {

    private static final Logger LOG = Logger.getInstance(EditorGrid.class);

    /** 编辑器实现类与三个方法（取网格、某字的格宽、单格宽）；平台没有字符网格时都为 null */
    private static final Class<?> EDITOR_IMPL;
    private static final MethodHandle GET_GRID;
    private static final MethodHandle CODE_POINT_WIDTH;
    private static final MethodHandle CHAR_WIDTH;

    static {
        ClassLoader loader = EditorGrid.class.getClassLoader();
        Class<?> gridClass = null;
        try {
            gridClass = Class.forName("com.intellij.openapi.editor.impl.view.CharacterGrid", false, loader);
        } catch (ClassNotFoundException | LinkageError absent) {
            // 2024.x：平台没有字符网格，编辑器永远按字形步进排字
        }
        Class<?> editorImpl = null;
        MethodHandle getGrid = null;
        MethodHandle codePointWidth = null;
        MethodHandle charWidth = null;
        if (gridClass != null) {
            try {
                editorImpl = Class.forName("com.intellij.openapi.editor.impl.EditorImpl", false, loader);
                MethodHandles.Lookup lookup = MethodHandles.publicLookup();
                getGrid = lookup.findVirtual(editorImpl, "getCharacterGrid", MethodType.methodType(gridClass))
                        .asType(MethodType.methodType(Object.class, Object.class));
                codePointWidth = lookup.findVirtual(gridClass, "codePointWidth",
                                MethodType.methodType(float.class, int.class))
                        .asType(MethodType.methodType(float.class, Object.class, int.class));
                charWidth = lookup.findVirtual(gridClass, "getCharWidth", MethodType.methodType(float.class))
                        .asType(MethodType.methodType(float.class, Object.class));
            } catch (ReflectiveOperationException | RuntimeException | LinkageError e) {
                editorImpl = null;
                getGrid = null;
                codePointWidth = null;
                charWidth = null;
                LOG.warn("woodfish: 无法访问编辑器的字符网格，网格模式下（如含中文的 Markdown 表格）效果会与文字错位", e);
            }
        }
        EDITOR_IMPL = editorImpl;
        GET_GRID = getGrid;
        CODE_POINT_WIDTH = codePointWidth;
        CHAR_WIDTH = charWidth;
    }

    private final Object grid;
    /** 单格宽（用户空间像素） */
    final float unit;

    private EditorGrid(Object grid, float unit) {
        this.grid = grid;
        this.unit = unit;
    }

    /**
     * 编辑器当前的字符网格；不在网格模式（或平台不支持）时返回 null。网格随文档内容开关
     * （Markdown 插件在文档修改后重新判定），每帧取一次。
     */
    static @Nullable EditorGrid of(Editor editor) {
        if (GET_GRID == null || !EDITOR_IMPL.isInstance(editor)) {
            return null;
        }
        try {
            Object grid = (Object) GET_GRID.invokeExact((Object) editor);
            if (grid == null) {
                return null;
            }
            float unit = (float) CHAR_WIDTH.invokeExact(grid);
            // 单格宽异常（字体度量为 0）时编辑器自己的排版也已失真，按不在网格模式处理
            return unit > 0 ? new EditorGrid(grid, unit) : null;
        } catch (Throwable t) {
            throw rethrow(t);
        }
    }

    /** 编辑器在网格模式下给这个字的宽度（1 或 2 格），即 {@code TextFragment.adjustedWidth} */
    float cellWidth(int codePoint) {
        try {
            return (float) CODE_POINT_WIDTH.invokeExact(grid, codePoint);
        } catch (Throwable t) {
            throw rethrow(t);
        }
    }

    /** invokeExact 声明抛 Throwable：运行时异常与 Error 原样抛出，交给 RenderGuard 隔离 */
    private static RuntimeException rethrow(Throwable t) {
        if (t instanceof RuntimeException e) {
            throw e;
        }
        if (t instanceof Error e) {
            throw e;
        }
        return new IllegalStateException(t);
    }
}
