using BubbleApp.Api.Security;
using BubbleApp.Common.Entities;
using BubbleApp.Data.Mongo;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;

namespace BubbleApp.Api.Controllers;

[ApiController]
[Route("api/reminders")]
[ValidateWorkspaceKey]
public class RemindersController : ControllerBase
{
    private readonly MongoContext _ctx;
    public RemindersController(MongoContext ctx) => _ctx = ctx;

    [HttpGet]
    public async Task<IActionResult> Get(
        [FromQuery] string workspace,
        [FromQuery] string userId,
        CancellationToken ct)
    {
        var list = await _ctx.Reminders
            .Find(r => r.Workspace == workspace && r.UserId == userId)
            .SortBy(r => r.RemindAt)
            .ToListAsync(ct);
        return Ok(list);
    }

    public sealed record CreateReminderDto(
        string workspace, string userId,
        string content,   DateTime remindAt);

    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] CreateReminderDto dto,
        CancellationToken ct)
    {
        var item = new Reminder
        {
            Id           = Guid.NewGuid().ToString(),
            Workspace    = dto.workspace,
            UserId       = dto.userId,
            Content      = dto.content.Trim(),
            RemindAt     = dto.remindAt,
            Acknowledged = false,
            CreatedAt    = DateTime.UtcNow
        };
        await _ctx.Reminders.InsertOneAsync(item, cancellationToken: ct);
        return Ok(item);
    }

    public sealed record AckDto(string workspace, string userId);

    [HttpPatch("{id}/ack")]
    public async Task<IActionResult> Ack(
        string id,
        [FromBody] AckDto dto,
        CancellationToken ct)
    {
        var update = Builders<Reminder>.Update.Set(r => r.Acknowledged, true);
        var res = await _ctx.Reminders.UpdateOneAsync(
            r => r.Id == id && r.Workspace == dto.workspace && r.UserId == dto.userId,
            update, cancellationToken: ct);
        return res.MatchedCount == 0 ? NotFound() : NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(
        string id,
        [FromQuery] string workspace,
        [FromQuery] string userId,
        CancellationToken ct)
    {
        var res = await _ctx.Reminders.DeleteOneAsync(
            r => r.Id == id && r.Workspace == workspace && r.UserId == userId, ct);
        return res.DeletedCount == 0 ? NotFound() : NoContent();
    }
}
