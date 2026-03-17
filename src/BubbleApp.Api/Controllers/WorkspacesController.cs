using System.Security.Claims;
using BubbleApp.Api.RealTime;
using BubbleApp.Common.ViewModels.Workspace;
using BubbleApp.Core.IService;
using BubbleApp.Data.IRepository;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BubbleApp.Api.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/workspaces")]
    public class WorkspacesController : ControllerBase
    {
        private readonly IWorkspaceService    _svc;
        private readonly IWorkspaceRepository _repo;

        public WorkspacesController(IWorkspaceService svc, IWorkspaceRepository repo)
        {
            _svc  = svc;
            _repo = repo;
        }

        private string AdminId =>
            User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub")
            ?? throw new InvalidOperationException("Admin id missing.");

        /* ── Create ─────────────────────────────────────────── */
        [HttpPost]
        public async Task<IActionResult> Create(
            [FromBody] WorkspaceCreateRequest req, CancellationToken ct)
        {
            try
            {
                var result = await _svc.CreateAsync(AdminId, req, ct);
                return Ok(result);
            }
            catch (InvalidOperationException ex) when (ex.Message.Contains("already exists"))
            {
                return Conflict(new { error = ex.Message });
            }
        }

        /* ── List ───────────────────────────────────────────── */
        [HttpGet]
        public async Task<IActionResult> List(CancellationToken ct)
            => Ok(await _svc.ListAsync(AdminId, ct));

        /* ── Get by slug ────────────────────────────────────── */
        [HttpGet("{slug}")]
        public async Task<IActionResult> GetBySlug(string slug, CancellationToken ct)
        {
            var ws = await _svc.GetBySlugAsync(slug, ct);
            return ws is null ? NotFound() : Ok(ws);
        }

        /* ── Soft Delete (schedules 24-hour grace period) ───── */
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(string id, CancellationToken ct)
        {
            try
            {
                await _svc.SoftDeleteAsync(id, AdminId, ct);
                AppearanceChangeBus.Bump(id);
                return NoContent();
            }
            catch (InvalidOperationException)
            {
                return NotFound();
            }
        }

        /* ── Restore (cancel scheduled deletion) ────────────── */
        [HttpPost("{id}/restore")]
        public async Task<IActionResult> Restore(string id, CancellationToken ct)
        {
            try
            {
                await _svc.RestoreAsync(id, AdminId, ct);
                AppearanceChangeBus.Bump(id);
                return NoContent();
            }
            catch (InvalidOperationException)
            {
                return NotFound();
            }
        }

        /* ── Backup: download all user data ─────────────────── */
        [HttpGet("{id}/backup")]
        public async Task<IActionResult> GetBackup(string id, CancellationToken ct)
        {
            var backup = await _svc.GetBackupAsync(id, AdminId, ct);
            return backup is null ? NotFound() : Ok(backup);
        }

        /* ── Appearance ─────────────────────────────────────── */
        [HttpGet("{id}/appearance")]
        public async Task<IActionResult> GetAppearance(string id, CancellationToken ct)
            => Ok(await _svc.GetAppearanceAsync(id, ct));

        [HttpPut("{id}/appearance")]
        public async Task<IActionResult> UpdateAppearance(
            string id,
            [FromBody] UpdateAppearanceRequest req,
            CancellationToken ct)
        {
            await _svc.UpdateAppearanceAsync(id, req, ct);
            var ws = await _repo.GetByIdAsync(id, ct);
            if (ws != null) AppearanceChangeBus.Bump(ws.Id);
            return NoContent();
        }
    }
}
