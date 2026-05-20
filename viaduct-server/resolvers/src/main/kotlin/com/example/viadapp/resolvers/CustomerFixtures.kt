package com.example.viadapp.resolvers

data class CustomerFixture(
    val id: String,
    val name: String,
    val status: String,
)

object CustomerFixtures {
    val byId: Map<String, CustomerFixture> = listOf(
        CustomerFixture("C-1001", "Northstar Labs",          "HEALTHY"),
        CustomerFixture("C-1027", "Mission Market Collective", "RISKY"),
        CustomerFixture("C-2044", "Meridian Finance",        "RESTRICTED"),
    ).associateBy { it.id }
}
