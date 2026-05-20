@file:Suppress("ForbiddenImport")

package com.example.viadapp

import io.ktor.server.application.Application

const val SCHEMA_ID: String = "publicSchema"

fun main(argv: Array<String>) {
    io.ktor.server.jetty.jakarta.EngineMain.main(argv)
}

fun Application.module() {
    configurePlugins()
    configureRouting()
    val port = environment.config.propertyOrNull("ktor.deployment.port")?.getString() ?: "8080"
    environment.log.info("viaduct-server listening on http://localhost:$port")
    environment.log.info("GraphiQL available at http://localhost:$port/graphiql")
}
