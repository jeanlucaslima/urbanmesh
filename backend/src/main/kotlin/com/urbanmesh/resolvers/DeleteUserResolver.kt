package com.urbanmesh.resolvers

import com.urbanmesh.resolvers.resolverbases.MutationResolvers
import com.urbanmesh.services.UserService
import viaduct.api.Resolver

@Resolver
class DeleteUserResolver(
    private val userService: UserService
) : MutationResolvers.DeleteUser() {
    override suspend fun resolve(ctx: Context): Boolean {
        val input = ctx.arguments.input
        return userService.deleteUser(ctx.authenticatedClient, input.userId)
    }
}
