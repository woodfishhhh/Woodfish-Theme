pluginManagement {
    repositories {
        mavenCentral()
        maven("https://cache-redirector.jetbrains.com/plugins.gradle.org/m2") {
            content { includeGroup("org.jetbrains.intellij.platform") }
        }
    }
}

rootProject.name = "woodfish-theme-jetbrains"
