using BubbleApp.Api.Security;
using BubbleApp.Data.IRepository;
using BubbleApp.Data.Mongo;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;

namespace BubbleApp.Api.Controllers
{
    [ApiController]
    [Route("api/widget/backup")]
    [ValidateWorkspaceKey]
    public class WidgetBackupController : ControllerBase
    {
        private readonly MongoContext         _ctx;
        private readonly IWorkspaceRepository _repo;

        public WidgetBackupController(MongoContext ctx, IWorkspaceRepository repo)
        {
            _ctx  = ctx;
            _repo = repo;
        }

        [HttpGet]
        public async Task<IActionResult> Get(
            [FromQuery] string userId,
            CancellationToken  ct)
        {
            var workspaceId = HttpContext.Items["WorkspaceId"] as string;
            if (string.IsNullOrWhiteSpace(workspaceId)) return Unauthorized();

            if (string.IsNullOrWhiteSpace(userId))
                return BadRequest(new { error = "userId is required." });

            var ws = await _repo.GetByIdAsync(workspaceId, ct);
            if (ws is null)
                return NotFound(new { error = "Workspace not found." });

            var slug = ws.Slug;

            // General messages intentionally excluded — can be very large
            var notesTask = _ctx.Notes
                .Find(n => n.Workspace == slug && n.UserId == userId)
                .SortBy(n => n.CreatedAt)
                .ToListAsync(ct);

            var todosTask = _ctx.Todos
                .Find(t => t.Workspace == slug && t.UserId == userId)
                .SortBy(t => t.CreatedAt)
                .ToListAsync(ct);

            var remTask = _ctx.Reminders
                .Find(r => r.Workspace == slug && r.UserId == userId)
                .SortBy(r => r.RemindAt)
                .ToListAsync(ct);

            await Task.WhenAll(notesTask, todosTask, remTask);

            return Ok(new
            {
                exportedAt = DateTime.UtcNow,
                workspace  = ws.Name,
                slug       = ws.Slug,
                userId,
                notes     = notesTask.Result,
                todos     = todosTask.Result,
                reminders = remTask.Result
            });
        }
    }
}
