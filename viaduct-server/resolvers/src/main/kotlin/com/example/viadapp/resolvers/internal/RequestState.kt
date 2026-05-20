package com.example.viadapp.resolvers.internal

import java.util.Collections
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.CopyOnWriteArrayList

data class PolicyDecisionRecord(
    val field: String,
    val decision: String, // ALLOW or DENY
    val reason: String,
    val actorRole: String,
)

/**
 * Per-request state shared across resolvers. Holds the actor role for the
 * current operation and accumulates execution metadata (services touched,
 * blocked fields, and policy decisions) for the response `extensions`.
 *
 * Instances are created fresh per HTTP request by the Ktor /graphql route and
 * exposed to resolvers via [RequestStateHolder].
 */
class RequestState {
    @Volatile
    var actorRole: String = "AI_ASSISTANT"

    private val services: MutableSet<String> =
        Collections.newSetFromMap(ConcurrentHashMap())
    private val blocked = CopyOnWriteArrayList<String>()
    private val decisions = CopyOnWriteArrayList<PolicyDecisionRecord>()

    fun recordService(name: String) { services.add(name) }
    fun recordBlocked(field: String) { blocked.add(field) }
    fun recordDecision(d: PolicyDecisionRecord) { decisions.add(d) }

    fun snapshot(): Map<String, Any> = mapOf(
        "servicesTouched" to services.sorted(),
        "blockedFields" to blocked.toList(),
        "policyDecisions" to decisions.map {
            mapOf(
                "field" to it.field,
                "decision" to it.decision,
                "reason" to it.reason,
                "actorRole" to it.actorRole,
            )
        },
    )
}

/**
 * ThreadLocal-backed holder for [RequestState]. The Ktor route uses
 * `RequestStateHolder.tl.asContextElement(state)` so the value propagates
 * across coroutine suspensions during Viaduct execution.
 */
object RequestStateHolder {
    val tl: ThreadLocal<RequestState?> = ThreadLocal()
    fun current(): RequestState? = tl.get()
}
