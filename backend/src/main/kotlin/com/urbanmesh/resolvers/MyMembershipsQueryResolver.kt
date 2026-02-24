package com.urbanmesh.resolvers

import com.urbanmesh.resolvers.resolverbases.QueryResolvers
import com.urbanmesh.services.GroupService
import viaduct.api.Resolver
import viaduct.api.grts.GroupMember

/**
 * Resolver for the myMemberships query.
 * Returns all group memberships for the authenticated user.
 */
@Resolver
class MyMembershipsQueryResolver(
    private val groupService: GroupService
) : QueryResolvers.MyMemberships() {
    override suspend fun resolve(ctx: Context): List<GroupMember> {
        val membershipEntities = groupService.getUserMemberships(
            ctx.authenticatedClient,
            ctx.userId
        )

        return membershipEntities.map { entity ->
            GroupMember.Builder(ctx)
                .id(entity.id)
                .groupId(entity.group_id)
                .userId(entity.user_id)
                .joinedAt(entity.joined_at)
                .build()
        }
    }
}
