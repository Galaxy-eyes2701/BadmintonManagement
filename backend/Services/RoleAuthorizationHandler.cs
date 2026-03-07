using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace backend.Services;

public class RoleRequirement : IAuthorizationRequirement
{
    public string[] AllowedRoles { get; }

    public RoleRequirement(params string[] roles)
    {
        AllowedRoles = roles;
    }
}

public class RoleAuthorizationHandler : AuthorizationHandler<RoleRequirement>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        RoleRequirement requirement)
    {
        var roleClaim = context.User.FindFirst(ClaimTypes.Role)?.Value;

        if (roleClaim != null && requirement.AllowedRoles.Contains(roleClaim))
        {
            context.Succeed(requirement);
        }

        return Task.CompletedTask;
    }
}
