package com.github.yyyyolo7a79.woodfish.editor;

import com.github.yyyyolo7a79.woodfish.WoodfishPluginDisposable;
import com.intellij.openapi.diagnostic.ControlFlowException;
import com.intellij.openapi.diagnostic.Logger;
import com.intellij.openapi.util.Disposer;
import com.intellij.util.concurrency.AppExecutorUtil;

import java.lang.ref.WeakReference;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * 发光图的后台生产：全应用一个有界线程池 + 一份 {@link GlowCache}。
 *
 * <p>约束：
 * <ul>
 *   <li>模糊绝不在 EDT 上做：EDT 只查缓存，未命中就把不可变的 {@link GlowSpec} 交给这里</li>
 *   <li>同一个 spec 同时只算一次（多个编辑器、多行相同内容会共用一个任务）</li>
 *   <li>任务开始前再问一次请求方是否还需要（{@link Client#wants}）：快速滚动大文件时，已经滚出视野
 *       的行直接丢弃，线程池不会被积压的旧任务拖住</li>
 *   <li>请求方用弱引用登记：编辑器关闭后排队中的任务不会把它拖住</li>
 *   <li>插件动态卸载时随 {@link WoodfishPluginDisposable} 关闭线程池、清空缓存</li>
 * </ul>
 */
final class GlowService {

    private static final Logger LOG = Logger.getInstance(GlowService.class);

    private static final Object LOCK = new Object();
    private static GlowService instance;

    /** 发光图的请求方（每个编辑器的发光渲染器）。两个方法都可能在任意线程被调用。 */
    interface Client {
        /** 该 spec 是否仍在当前视野内等待结果 */
        boolean wants(GlowSpec spec);

        /** 结果已写入缓存，请求方应安排重绘 */
        void glowReady(GlowSpec spec);
    }

    private static final class Job {
        final GlowSpec spec;
        final List<WeakReference<Client>> clients = new ArrayList<>(2);
        boolean submitted;
        boolean done;

        Job(GlowSpec spec) {
            this.spec = spec;
        }
    }

    private final GlowCache cache = new GlowCache(budget());
    private final ExecutorService executor = AppExecutorUtil.createBoundedApplicationPoolExecutor(
            "Woodfish Glow", Math.max(1, Math.min(2, Runtime.getRuntime().availableProcessors() / 2)));
    private final ConcurrentHashMap<GlowSpec, Job> jobs = new ConcurrentHashMap<>();
    private final AtomicBoolean failureLogged = new AtomicBoolean();
    private volatile boolean shutDown;

    private GlowService() {
    }

    static GlowService getInstance() {
        synchronized (LOCK) {
            if (instance == null) {
                GlowService service = new GlowService();
                try {
                    Disposer.register(WoodfishPluginDisposable.getInstance(), service::shutdown);
                } catch (Throwable t) {
                    // 插件正在卸载（父 Disposable 已释放）：照常工作，GC 随类加载器一起回收
                    LOG.debug("woodfish: 发光服务未能绑定插件生命周期", t);
                }
                instance = service;
            }
            return instance;
        }
    }

    GlowImage lookup(GlowSpec spec) {
        return cache.get(spec);
    }

    void request(GlowSpec spec, Client client) {
        if (shutDown) {
            return;
        }
        Job job = jobs.computeIfAbsent(spec, Job::new);
        boolean submit;
        synchronized (job) {
            if (job.done) {
                // 刚好在登记前完成：结果要么已在缓存，要么被丢弃了，让请求方重画一次自行决定
                client.glowReady(spec);
                return;
            }
            job.clients.add(new WeakReference<>(client));
            submit = !job.submitted;
            job.submitted = true;
        }
        if (submit) {
            try {
                executor.execute(() -> run(job));
            } catch (RejectedExecutionException e) {
                jobs.remove(spec, job);
            }
        }
    }

    /** 设置或配色变化后旧图大多不会再命中，主动释放内存 */
    void clearCache() {
        cache.clear();
    }

    private void run(Job job) {
        boolean produced = false;
        try {
            if (!shutDown && anyWants(job)) {
                GlowImage image;
                try {
                    image = GlowRasterizer.rasterize(job.spec);
                } catch (Throwable t) {
                    if (t instanceof ControlFlowException) {
                        return;
                    }
                    if (failureLogged.compareAndSet(false, true)) {
                        LOG.warn("woodfish: 发光栅格化失败，该行将不显示发光（之后的失败不再记录）", t);
                    }
                    image = GlowImage.NONE; // 记成「无发光」，避免每帧重试
                }
                cache.put(job.spec, image);
                produced = true;
            }
        } finally {
            finish(job, produced);
        }
    }

    private void finish(Job job, boolean produced) {
        List<Client> clients = new ArrayList<>(job.clients.size());
        synchronized (job) {
            job.done = true;
            for (WeakReference<Client> ref : job.clients) {
                Client client = ref.get();
                if (client != null) {
                    clients.add(client);
                }
            }
            job.clients.clear();
        }
        jobs.remove(job.spec, job);
        if (shutDown) {
            return;
        }
        for (Client client : clients) {
            if (produced) {
                client.glowReady(job.spec);
            } else if (client.wants(job.spec)) {
                // 任务开始时没人要、之后又有请求方登记进来：重新排队，不能让它一直等
                request(job.spec, client);
            }
        }
    }

    private static boolean anyWants(Job job) {
        synchronized (job) {
            for (WeakReference<Client> ref : job.clients) {
                Client client = ref.get();
                if (client != null && client.wants(job.spec)) {
                    return true;
                }
            }
            return false;
        }
    }

    private void shutdown() {
        shutDown = true;
        executor.shutdownNow();
        jobs.clear();
        cache.clear();
        synchronized (LOCK) {
            if (instance == this) {
                instance = null;
            }
        }
    }

    /** 缓存上限：堆的 1/32，夹在 8 ~ 48 MB 之间（2 GB 堆约 48 MB，1x 屏约可存 4 屏的行） */
    private static long budget() {
        long max = Runtime.getRuntime().maxMemory();
        long mb = 1024L * 1024L;
        return Math.max(8 * mb, Math.min(48 * mb, max / 32));
    }
}
