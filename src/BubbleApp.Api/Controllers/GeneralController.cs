using BubbleApp.Api.Security;
using BubbleApp.Common.Entities;
using BubbleApp.Data.Mongo;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;

namespace BubbleApp.Api.Controllers;

[ApiController]
[Route("api/general")]
[ValidateWorkspaceKey]
public class GeneralController : ControllerBase
{
    private readonly MongoContext _ctx;
    public GeneralController(MongoContext ctx) => _ctx = ctx;

    [HttpGet]
    public async Task<IActionResult> Get(
        [FromQuery] string workspace,
        CancellationToken ct)
    {
        var list = await _ctx.GeneralMessages
            .Find(g => g.Workspace == workspace)
            .SortBy(g => g.CreatedAt)
            .ToListAsync(ct);
        return Ok(list);
    }

    public sealed record CreateGeneralDto(
        string workspace, string userId,
        string userEmail, string content);

    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] CreateGeneralDto dto,
        CancellationToken ct)
    {
        var msg = new GeneralMessage
        {
            Id        = Guid.NewGuid().ToString(),
            Workspace = dto.workspace,
            UserId    = dto.userId,
            UserEmail = dto.userEmail ?? "",
            Content   = dto.content.Trim(),
            CreatedAt = DateTime.UtcNow
        };
        await _ctx.GeneralMessages.InsertOneAsync(msg, cancellationToken: ct);
        return Ok(msg);
    }
}
