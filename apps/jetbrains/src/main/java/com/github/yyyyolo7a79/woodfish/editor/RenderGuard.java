package com.github.yyyyolo7a79.woodfish.editor;

import com.intellij.openapi.diagnostic.ControlFlowException;
import com.intellij.openapi.diagnostic.Logger;

/**
 * 单个编辑器的故障隔离：渲染器吞掉所有异常，连续失败若干次就熔断，只记录一次日志。
 *
 * <p>为什么必须熔断而不是每次记录：custom renderer 每一帧都会被调用，光标闪烁就是每秒两帧，
 * 一个必现的异常会让 idea.log 每秒刷两条堆栈，同时还在每帧白白做一遍失败的计算。
 *
 * <p>只在 EDT 上使用。
 */
final class RenderGuard {

    private static final Logger LOG = Logger.getInstance(RenderGuard.class);

    /** 连续失败多少次后熔断：允许偶发失败（如绘制途中编辑器被释放），必现错误第三帧就停下 */
    static final int MAX_CONSECUTIVE_FAILURES = 3;

    private int consecutiveFailures;
    private boolean tripped;
    private boolean logged;

    boolean isTripped() {
        return tripped;
    }

    void success() {
        consecutiveFailures = 0;
    }

    /**
     * 记录一次失败。
     *
     * @return true 表示这次失败让它熔断了，调用方应撤下该编辑器的效果
     */
    boolean failure(Throwable t, String where) {
        if (t instanceof ControlFlowException) {
            // 取消类异常不是我们的错误，也不允许记日志
            return false;
        }
        consecutiveFailures++;
        if (tripped || consecutiveFailures < MAX_CONSECUTIVE_FAILURES && !(t instanceof VirtualMachineError)) {
            LOG.debug("woodfish: " + where + " 绘制失败", t);
            return false;
        }
        tripped = true;
        if (!logged) {
            logged = true;
            LOG.warn("woodfish: " + where + " 连续绘制失败，已停用该编辑器的渐变与发光（重新打开编辑器可恢复）", t);
        }
        return true;
    }
}
