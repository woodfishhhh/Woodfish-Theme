package demo;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Woodfish 效果预览：覆盖关键字、字符串、数字、注释、注解、泛型、Lambda 等常见 token。
 *
 * @param <T> 元素类型
 * @author Woodfish
 */
@SuppressWarnings("unused")
public final class Demo<T extends Comparable<T>> {

    private static final int MAX_RETRY = 3;
    private static final double RATIO = 0.618_033;
    private static final String GREETING = "Hello, \"Woodfish\"!\n";

    private final List<T> items;
    private int counter = 0x2A;

    public Demo(List<T> items) {
        this.items = List.copyOf(items);
    }

    /** 统计每个元素出现的次数（连字测试：-> != == >= <= =>） */
    public Map<T, Long> histogram() {
        return items.stream()
                .filter(item -> item != null)
                .collect(Collectors.groupingBy(Function.identity(), Collectors.counting()));
    }

    @Override
    public String toString() {
        // TODO: 中文注释应保持原样，不能出现重影
        String label = counter >= MAX_RETRY ? "busy" : "idle";
        return String.format("%s[%d] %s ratio=%.3f", GREETING.trim(), counter, label, RATIO);
    }

    public static int fibonacci(int n) {
        if (n <= 1) {
            return n;
        }
        int a = 0, b = 1;
        for (int i = 2; i <= n; i++) {
            int next = a + b;
            a = b;
            b = next;
        }
        return b;
    }

    public static void main(String[] args) {
        var demo = new Demo<>(List.of("alpha", "beta", "alpha", "gamma", "beta", "alpha"));
        System.out.println(demo.histogram());
        System.out.println(fibonacci(20) + " " + demo + " " + (MAX_RETRY << 2) + " " + (RATIO * 100));
        String veryLongLineToCheckSoftWrapAndHorizontalScrolling = "The quick brown fox jumps over the lazy dog, again and again, until the line is long enough to wrap.";
        System.out.println(veryLongLineToCheckSoftWrapAndHorizontalScrolling.length());
    }
}
