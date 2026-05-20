plugins {
    `java-library`
    alias(libs.plugins.kotlinJvm)
    alias(libs.plugins.ksp)
    alias(libs.plugins.viaduct.module)
}

viaductModule {
    modulePackageSuffix.set("resolvers")
}

dependencies {
    implementation(enforcedPlatform(libs.viaduct.bom))
    api(libs.viaduct.api)
    implementation(libs.viaduct.runtime)
    implementation(libs.jackson.module.kotlin)
    implementation(libs.kotlinx.coroutines.core)
}
