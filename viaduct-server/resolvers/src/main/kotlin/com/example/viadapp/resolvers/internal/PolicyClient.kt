package com.example.viadapp.resolvers.internal

/**
 * Calls `policy-service` /check for a (actorRole, field, customerId) tuple
 * and records both the service touch and the resulting decision on the
 * current [RequestState].
 *
 * Returns true if allowed, false if denied. Resolvers should treat a deny
 * as "set the value to null"; PolicyClient also records the field path in
 * the request's blockedFields list.
 *
 * If no [RequestState] is in scope (e.g. greeting-only queries), the
 * client returns true and records nothing — there is nothing to deny.
 */
object PolicyClient {

    suspend fun isAllowed(field: String, customerId: String? = null): Boolean {
        val state = RequestStateHolder.current() ?: return true
        val actorRole = state.actorRole
        state.recordService("policy-service")

        val payload = buildMap<String, Any> {
            put("actorRole", actorRole)
            put("field", field)
            if (customerId != null) put("customerId", customerId)
        }
        val body = InternalClient.mapper.writeValueAsString(payload)
        val node = InternalClient.postJson("${ServiceUrls.policy}/check", body)

        val allowed = node["allowed"]?.asBoolean() ?: false
        val reason = node["reason"]?.asText() ?: ""

        state.recordDecision(
            PolicyDecisionRecord(
                field = field,
                decision = if (allowed) "ALLOW" else "DENY",
                reason = reason,
                actorRole = actorRole,
            )
        )
        if (!allowed) {
            state.recordBlocked(field)
        }
        return allowed
    }
}
