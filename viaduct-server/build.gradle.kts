plugins {
    alias(libs.plugins.kotlinJvm)
    alias(libs.plugins.ktor)
    alias(libs.plugins.viaduct.application)
}

application {
    mainClass.set("com.example.viadapp.ViaductServiceKt")
}

viaductApplication {
    modulePackagePrefix.set("com.example.viadapp")
}

dependencies {
    implementation(libs.viaduct.api)
    implementation(libs.viaduct.runtime)

    implementation(libs.jackson.module.kotlin)
    implementation(libs.kotlin.reflect)
    implementation(libs.kotlinx.coroutines.reactor)
    implementation(libs.reactor.core)

    implementation(libs.ktor.server.core.jvm)
    implementation(libs.ktor.server.jetty.jakarta)
    implementation(libs.ktor.server.content.negotiation)
    implementation(libs.ktor.serialization.jackson)
    implementation(libs.ktor.server.core)
    implementation(libs.ktor.server.config.yaml)

    runtimeOnly(libs.logback.classic)

    implementation(project(":resolvers"))
}
