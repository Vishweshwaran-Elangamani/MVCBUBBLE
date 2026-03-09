using BubbleApp.Api.Security;
using BubbleApp.Common.Entities;
using BubbleApp.Data.Mongo;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;

namespace BubbleApp.Api.Controllers;

[ApiController]
[Route("api/todos")]
[ValidateWorkspaceKey]
public class TodosController : ControllerBase
{
    private readonly MongoContext _ctx;
    public TodosController(MongoContext ctx) => _ctx = ctx;

    [HttpGet]
    public async Task<IActionResult> Get(
        [FromQuery] string workspace,
        [FromQuery] string userId,
        CancellationToken ct)
    {
        var list = await _ctx.Todos
            .Find(t => t.Workspace == workspace && t.UserId == userId)
            .SortBy(t => t.CreatedAt)
            .ToListAsync(ct);
        return Ok(list);
    }

    // ✅ priority and done are nullable/optional with defaults
    public sealed record CreateTodoDto(
        string  workspace,
        string  userId,
        string  content,
        string? priority = "medium",
        bool?   done     = false);

    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] CreateTodoDto dto,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(dto.workspace) ||
            string.IsNullOrWhiteSpace(dto.userId)    ||
            string.IsNullOrWhiteSpace(dto.content))
            return BadRequest("workspace, userId, content are required");

        var item = new Todo
        {
            Id        = Guid.NewGuid().ToString(),
            Workspace = dto.workspace,
            UserId    = dto.userId,
            Content   = dto.content.Trim(),
            Priority  = dto.priority ?? "medium",
            Done      = dto.done     ?? false,
            CreatedAt = DateTime.UtcNow
        };
        await _ctx.Todos.InsertOneAsync(item, cancellationToken: ct);
        return Ok(item);
    }

    public sealed record PatchTodoDto(string workspace, string userId, bool done);

    [HttpPatch("{id}")]
    public async Task<IActionResult> Patch(
        string id,
        [FromBody] PatchTodoDto dto,
        CancellationToken ct)
    {
        var update = Builders<Todo>.Update.Set(t => t.Done, dto.done);
        var res = await _ctx.Todos.UpdateOneAsync(
            t => t.Id == id && t.Workspace == dto.workspace && t.UserId == dto.userId,
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
        var res = await _ctx.Todos.DeleteOneAsync(
            t => t.Id == id && t.Workspace == workspace && t.UserId == userId, ct);
        return res.DeletedCount == 0 ? NotFound() : NoContent();
    }
}
