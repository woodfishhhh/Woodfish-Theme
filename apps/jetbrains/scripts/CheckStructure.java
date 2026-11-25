import com.sun.source.tree.*;
import com.sun.source.util.*;
import javax.tools.ToolProvider;
import java.nio.file.*;
import java.util.*;

/** Run with JDK 21: java scripts/CheckStructure.java src/main/java */
class CheckStructure {
    public static void main(String[] args) throws Exception {
        var root = Path.of(args[0]);
        var compiler = ToolProvider.getSystemJavaCompiler();
        var errors = new ArrayList<String>();
        try (var fs = Files.walk(root); var manager = compiler.getStandardFileManager(null, null, java.nio.charset.StandardCharsets.UTF_8)) {
            var sources = manager.getJavaFileObjectsFromPaths(fs.filter(p -> p.toString().endsWith(".java")).sorted().toList());
            var task = (JavacTask) compiler.getTask(null, manager, null, List.of("-proc:none"), null, sources);
            var positions = Trees.instance(task).getSourcePositions();
            for (var unit : task.parse()) {
                new TreeScanner<Void, Void>() {
                    @Override public Void visitMethod(MethodTree method, Void unused) {
                        if (method.getBody() != null) measure(root, unit, positions, method, errors);
                        return super.visitMethod(method, unused);
                    }
                }.scan(unit, null);
            }
        }
        errors.forEach(System.out::println);
        if (!errors.isEmpty()) System.exit(1);
    }

    static void measure(Path root, CompilationUnitTree unit, SourcePositions pos, MethodTree method, List<String> errors) {
        var lines = unit.getLineMap();
        long first = lines.getLineNumber(pos.getStartPosition(unit, method));
        long last = lines.getLineNumber(pos.getEndPosition(unit, method) - 1);
        long length = last - first + 1;
        var depth = new Depth();
        depth.scan(method.getBody(), 0);
        if (length > 50 || depth.max > 4) {
            String file = root.toAbsolutePath().relativize(Path.of(unit.getSourceFile().toUri())).toString();
            errors.add(file + ":" + first + " " + method.getName() + " lines=" + length + " nesting=" + depth.max);
        }
    }

    static class Depth extends TreeScanner<Void, Integer> {
        int max;
        @Override public Void visitClass(ClassTree nested, Integer depth) { return null; }
        @Override public Void scan(Tree tree, Integer depth) {
            if (tree == null) return null;
            int level = switch (tree.getKind()) {
                case IF, FOR_LOOP, ENHANCED_FOR_LOOP, WHILE_LOOP, DO_WHILE_LOOP, SWITCH, SWITCH_EXPRESSION,
                        TRY, SYNCHRONIZED, LAMBDA_EXPRESSION -> depth + 1;
                default -> depth;
            };
            max = Math.max(max, level);
            return super.scan(tree, level);
        }
    }
}
