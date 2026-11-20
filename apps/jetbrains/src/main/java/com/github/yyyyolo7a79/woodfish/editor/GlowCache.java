package com.github.yyyyolo7a79.woodfish.editor;

import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 发光图的 LRU 缓存（按字节限额，线程安全）。EDT 读、后台线程写，临界区只做 Map 操作。
 *
 * <p>全应用共享一份：键是内容（{@link GlowSpec}），不含编辑器引用，多个编辑器里相同的行可以共用；
 * 编辑器关闭后它的条目只会随 LRU 自然淘汰，不会把编辑器对象拖住。
 */
final class GlowCache {

    private final long budgetBytes;
    private final LinkedHashMap<GlowSpec, GlowImage> map = new LinkedHashMap<>(256, 0.75f, true);
    private long usedBytes;

    GlowCache(long budgetBytes) {
        this.budgetBytes = budgetBytes;
    }

    synchronized GlowImage get(GlowSpec spec) {
        return map.get(spec);
    }

    synchronized void put(GlowSpec spec, GlowImage image) {
        GlowImage previous = map.put(spec, image);
        if (previous != null) {
            usedBytes -= cost(spec, previous);
        }
        usedBytes += cost(spec, image);
        // 至少留下刚放进去的这一条：即使单张图超过限额，也要让它被画一次
        Iterator<Map.Entry<GlowSpec, GlowImage>> it = map.entrySet().iterator();
        while (usedBytes > budgetBytes && map.size() > 1 && it.hasNext()) {
            Map.Entry<GlowSpec, GlowImage> eldest = it.next();
            if (eldest.getKey() == spec) {
                continue;
            }
            usedBytes -= cost(eldest.getKey(), eldest.getValue());
            it.remove();
        }
    }

    synchronized void clear() {
        map.clear();
        usedBytes = 0;
    }

    synchronized long usedBytes() {
        return usedBytes;
    }

    synchronized int size() {
        return map.size();
    }

    long budgetBytes() {
        return budgetBytes;
    }

    private static long cost(GlowSpec spec, GlowImage image) {
        return spec.approximateBytes() + image.bytes();
    }
}
