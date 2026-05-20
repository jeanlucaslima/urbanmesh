package com.example.viadapp

import io.ktor.http.ContentType
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.Application
import io.ktor.server.application.call
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.response.respondBytes
import io.ktor.server.response.respondText
import io.ktor.server.routing.get
import io.ktor.server.routing.post
import io.ktor.server.routing.route
import io.ktor.server.routing.routing
import com.example.viadapp.resolvers.internal.RequestState
import com.example.viadapp.resolvers.internal.RequestStateHolder
import kotlinx.coroutines.asContextElement
import kotlinx.coroutines.future.await
import kotlinx.coroutines.withContext
import viaduct.service.BasicViaductFactory
import viaduct.service.SchemaScopeInfo
import viaduct.service.api.ExecutionInput
import viaduct.service.api.ExecutionResult
import viaduct.service.wiring.graphiql.GraphiQLHtmlConfig
import viaduct.service.wiring.graphiql.graphiQLHtml

private val viaductGraphiQLConfig = GraphiQLHtmlConfig(
    title = "GraphiQL - viaduct-server",
    defaultQuery = """
        query Baseline {
          greeting
          customer(id: "C-1027") {
            id
            name
            status
          }
        }
    """.trimIndent(),
    storageKey = "viaduct-server",
)

private val viaduct by lazy {
    BasicViaductFactory.create(
        scopedSchemas = listOf(SchemaScopeInfo(SCHEMA_ID)),
    )
}

fun Application.configureRouting() {
    routing {
        get("/health") {
            call.respond(mapOf("ok" to true, "service" to "viaduct-server"))
        }

        route("/graphql") {
            post {
                @Suppress("UNCHECKED_CAST")
                val request = call.receive<Map<String, Any?>>() as Map<String, Any>

                val query = request["query"] as? String
                if (query == null) {
                    call.respond(
                        HttpStatusCode.BadRequest,
                        mapOf("errors" to listOf(mapOf("message" to "Query parameter is required and must be a string")))
                    )
                    return@post
                }

                @Suppress("UNCHECKED_CAST")
                val executionInput = ExecutionInput.create(
                    operationText = query,
                    variables = (request["variables"] as? Map<String, Any>) ?: emptyMap(),
                )

                // Fresh per-request state so concurrent requests do not share
                // accumulated metadata. Propagated to resolvers via a
                // ThreadLocal-backed coroutine context element.
                val state = RequestState()
                val result: ExecutionResult = withContext(
                    RequestStateHolder.tl.asContextElement(state)
                ) {
                    viaduct.executeAsync(executionInput).await()
                }

                // Attach executionMetadata to the GraphQL response extensions.
                val spec = result.toSpecification().toMutableMap()
                @Suppress("UNCHECKED_CAST")
                val existingExt = (spec["extensions"] as? Map<String, Any?>)?.toMutableMap()
                    ?: mutableMapOf()
                existingExt["executionMetadata"] = state.snapshot()
                spec["extensions"] = existingExt
                call.respond(spec)
            }
        }

        get("/graphiql") {
            call.respondText(graphiQLHtml(viaductGraphiQLConfig), ContentType.Text.Html)
        }

        for (faviconFile in listOf("favicon.svg" to ContentType.Image.SVG, "favicon.ico" to ContentType("image", "x-icon"))) {
            val (name, contentType) = faviconFile
            get("/$name") {
                val resource = this::class.java.classLoader.getResource("graphiql/$name")
                if (resource == null) {
                    call.respond(HttpStatusCode.NotFound)
                    return@get
                }
                call.respondBytes(resource.readBytes(), contentType)
            }
        }

        route("/js") {
            get("/{filename}") {
                val filename = call.parameters["filename"]
                if (filename == null || filename.contains('/') || filename.contains('\\')) {
                    call.respond(HttpStatusCode.NotFound, "JavaScript resource not found")
                    return@get
                }

                val resource = this::class.java.classLoader.getResource("graphiql/js/$filename")
                if (resource == null) {
                    call.respond(HttpStatusCode.NotFound, "JavaScript resource not found")
                    return@get
                }

                call.respondText(resource.readText(), ContentType.Text.JavaScript)
            }
        }
    }
}
