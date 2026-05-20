package com.example.viadapp.resolvers.internal

import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.registerKotlinModule
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.time.Duration
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

object InternalClient {
    private val http: HttpClient = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(5))
        .build()

    private val mapper: ObjectMapper = ObjectMapper().registerKotlinModule()

    /**
     * GET the given URL and parse the response body as JSON.
     * Returns null on 404. Throws on other non-2xx.
     */
    suspend fun getJson(url: String): JsonNode? = withContext(Dispatchers.IO) {
        val req = HttpRequest.newBuilder(URI.create(url))
            .timeout(Duration.ofSeconds(10))
            .GET()
            .build()
        val res = http.send(req, HttpResponse.BodyHandlers.ofString())
        when {
            res.statusCode() == 404 -> null
            res.statusCode() in 200..299 -> mapper.readTree(res.body())
            else -> throw RuntimeException("$url -> HTTP ${res.statusCode()}: ${res.body()}")
        }
    }
}

object ServiceUrls {
    val customer: String = System.getenv("CUSTOMER_SERVICE_URL") ?: "http://customer-service:5101"
    val billing: String = System.getenv("BILLING_SERVICE_URL") ?: "http://billing-service:5102"
    val support: String = System.getenv("SUPPORT_SERVICE_URL") ?: "http://support-service:5103"
    val usage: String = System.getenv("USAGE_SERVICE_URL") ?: "http://usage-service:5104"
}
