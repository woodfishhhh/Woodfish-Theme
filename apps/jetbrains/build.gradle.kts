import java.util.Properties

plugins {
    id("java")
    // IntelliJ Platform Gradle Plugin 2.x —— 2024.2+ 平台必须使用 2.x 系列
    id("org.jetbrains.intellij.platform") version "2.18.1"
}

group = providers.gradleProperty("pluginGroup").get()
version = providers.gradleProperty("pluginVersion").get()

// 与当前机器相关的路径（本机 IDE 安装位置）写在 gradle.local.properties 里，该文件不入库；
// -P 命令行参数与 gradle.properties 中的同名属性优先于它。
val localProperties = Properties().apply {
    val localFile = file("gradle.local.properties")
    if (localFile.isFile) localFile.reader(Charsets.UTF_8).use { load(it) }
}

/** 先读 Gradle 属性，再读 gradle.local.properties。 */
fun localProperty(key: String): String? =
    providers.gradleProperty(key).orNull ?: localProperties.getProperty(key)

// 本机 IDE 路径存在就用它编译，否则退回下载（方便在别的机器上构建）
val platformLocalPath = localProperty("platformLocalPath")
    ?.takeIf { file(it).isDirectory }

repositories {
    mavenCentral()
    intellijPlatform {
        jetbrainsIdeInstallers()
        jetbrainsRuntime()
        releases()
        intellijDependencies()
        // 使用 local() 指向本地 IDE 时，必须从本地安装提取平台构件
        localPlatformArtifacts()
    }
}

dependencies {
    intellijPlatform {
        // 声明 IntelliJ Platform 2.x 的 JUnit 5 测试框架，供 test runner 组装其测试依赖。
        testFramework(org.jetbrains.intellij.platform.gradle.TestFrameworkType.JUnit5, "243.28141.18")
        if (platformLocalPath != null) {
            local(platformLocalPath)
        } else {
            intellijIdeaCommunity(providers.gradleProperty("platformVersion"))
        }
        pluginVerifier("1.411")
    }

    // 纯 Java 单元测试（颜色数学、设置规范化等），不依赖 IntelliJ 测试框架
    implementation("org.mozilla:rhino:1.9.2")
    implementation("com.twelvemonkeys.imageio:imageio-webp:3.12.0")
    testImplementation(platform("org.junit:junit-bom:5.11.4"))
    testImplementation("org.junit.jupiter:junit-jupiter")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
    // IntelliJ 2024.3 的 JUnit 5 初始化器仍引用 JUnit 4 的 TestRule。
    testRuntimeOnly("junit:junit:4.13.2")
}

java {
    // 2024.2 ~ 2025.x 平台运行在 JBR 21 上，与本插件的编译目标一致
    toolchain {
        languageVersion.set(JavaLanguageVersion.of(21))
    }
}

intellijPlatform {
    pluginConfiguration {
        name = providers.gradleProperty("pluginName")
        version = providers.gradleProperty("pluginVersion")

        ideaVersion {
            // 242 = 2024.2：平台改用 JBR 21 的起点，与编译目标 Java 21 一致。
            // 更早的 2024.1 跑在 JBR 17 上，加载 Java 21 字节码会抛 UnsupportedClassVersionError。
            sinceBuild = "242"
            // 不设置上限；渲染依赖部分内部 API，升级平台后仍须验证。
            // 2026.1+ 换成 JBR 25 后仍能加载 Java 21 字节码。
            untilBuild = provider { null }
        }
    }

    // ./gradlew publishPlugin：上传到 JetBrains 插件市场 stable 渠道。令牌只从 Windows 用户环境变量
    // JETBRAINS_MARKETPLACE_TOKEN 读取，绝不写进仓库；未设置时 publishPlugin 会直接失败。
    // 市场不接受重复版本号，发版前先改 gradle.properties 的 pluginVersion。
    publishing {
        token = providers.environmentVariable("JETBRAINS_MARKETPLACE_TOKEN")
    }

    // 不构建 searchable options 索引，大幅缩短构建时间
    buildSearchableOptions = false
    // 不做 @NotNull 字节码插桩：省去下载与目标平台匹配的编译器插件
    instrumentCode = false

    // ./gradlew verifyPlugin：用本机三个 IDE（2024.3 / 2025.2 / 2026.2）检查二进制兼容性与内部 API 使用
    pluginVerification {
        ides {
            create("IC", "2024.2")
            create("IC", providers.gradleProperty("platformVersion"))
            listOf("ide252LocalPath", "ide262LocalPath").mapNotNull(::localProperty).distinct().forEach { path ->
                require(file(path).isDirectory) { "找不到待验证的 IDE 目录 $path" }
                local(file(path))
            }
        }
    }
}

// 沙盒 IDE 启动时打开样例目录，保留 IDE 自身的项目安全与隐私提示。
val samplesDir = layout.projectDirectory.dir("samples").asFile.absolutePath

// 在更新的本机 IDE 上实测：./gradlew runIde252 / runIde262
intellijPlatformTesting {
    runIde {
        listOf("252" to "ide252LocalPath", "262" to "ide262LocalPath").forEach { (suffix, key) ->
            val path = localProperty(key)?.takeIf { file(it).isDirectory }
            if (path != null) {
                register("runIde$suffix") {
                    localPath = file(path)
                    task {
                        args(samplesDir)
                    }
                }
            }
        }
    }
}

tasks {
    named<JavaExec>("runIde") {
        args(samplesDir)
    }

    withType<JavaCompile> {
        options.encoding = "UTF-8"
        options.release = 21
    }

    test {
        val distribution = buildPlugin.flatMap { it.archiveFile }
        inputs.file(distribution)
        doFirst { systemProperty("woodfish.distribution", distribution.get().asFile.absolutePath) }
        useJUnitPlatform()
    }

    // 许可证随插件 jar 分发
    processResources {
        from(layout.projectDirectory.file("../../packages/renderer-runtime/assets/caiyun.webp")) { into("woodfish") }
        from(layout.projectDirectory) {
            include("LICENSE", "THIRD_PARTY_NOTICES.md")
            into("META-INF")
        }
    }
}
