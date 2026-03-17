using System.Threading;
using System.Threading.Tasks;
using BubbleApp.Api.RealTime;
using BubbleApp.Api.Security;
using BubbleApp.Data.IRepository;
using Microsoft.AspNetCore.Mvc;

namespace BubbleApp.Api.Controllers
{
    [ApiController]
    [Route("api/widget/config")]
    [ValidateWorkspaceKey]
    public class WidgetConfigController : ControllerBase
    {
        private readonly IWorkspaceRepository _repo;

        public WidgetConfigController(IWorkspaceRepository repo) => _repo = repo;

        // GET api/widget/config?workspace=...&key=...
        [HttpGet]
        public async Task<IActionResult> Get(
            [FromQuery] string workspace,
            CancellationToken ct)
        {
            var workspaceId = HttpContext.Items["WorkspaceId"] as string;
            var ws          = await _repo.GetByIdAsync(workspaceId!, ct);

            if (ws is null) return NotFound();

            // Soft-deleted — still return appearance but signal grace period
            if (ws.IsDeleted)
            {
                var hoursLeft = CalculateHoursLeft(ws.DeletedAt);
                SetNoCache();
                return StatusCode(410, new
                {
                    color     = string.IsNullOrWhiteSpace(ws.BubbleColor) ? "5b8def" : ws.BubbleColor,
                    text      = ws.BubbleText ?? "",
                    version   = AppearanceChangeBus.Current(ws.Id),
                    hoursLeft = hoursLeft
                });
            }

            SetNoCache();
            return Ok(new
            {
                color   = string.IsNullOrWhiteSpace(ws.BubbleColor) ? "5b8def" : ws.BubbleColor,
                text    = ws.BubbleText ?? "",
                version = AppearanceChangeBus.Current(ws.Id)
            });
        }

        // GET api/widget/config/long?workspace=...&key=...&since=version
        [HttpGet("long")]
        public async Task<IActionResult> Long(
            [FromQuery] string workspace,
            [FromQuery] long   since = 0,
            CancellationToken  ct    = default)
        {
            var workspaceId = HttpContext.Items["WorkspaceId"] as string;
            if (string.IsNullOrWhiteSpace(workspaceId)) return Unauthorized();

            var version = await AppearanceChangeBus.WaitForChangeAsync(
                workspaceId, since, TimeSpan.FromSeconds(25), ct);

            var ws = await _repo.GetByIdAsync(workspaceId, ct);
            if (ws is null) return NotFound();

            // Soft-deleted during grace period
            if (ws.IsDeleted)
            {
                var hoursLeft = CalculateHoursLeft(ws.DeletedAt);
                SetNoCache();
                return StatusCode(410, new
                {
                    color     = string.IsNullOrWhiteSpace(ws.BubbleColor) ? "5b8def" : ws.BubbleColor,
                    text      = ws.BubbleText ?? "",
                    version   = version,
                    hoursLeft = hoursLeft
                });
            }

            if (version == since)
            {
                SetNoCache();
                return NoContent(); // no change within 25s timeout
            }

            SetNoCache();
            return Ok(new
            {
                color   = string.IsNullOrWhiteSpace(ws.BubbleColor) ? "5b8def" : ws.BubbleColor,
                text    = ws.BubbleText ?? "",
                version = version
            });
        }

        private static int CalculateHoursLeft(DateTime? deletedAt)
        {
            if (deletedAt is null) return 0;
            var expiresAt = deletedAt.Value.AddHours(24);
            var diff      = expiresAt - DateTime.UtcNow;
            return (int)Math.Max(0, Math.Ceiling(diff.TotalHours));
        }

        private void SetNoCache()
        {
            Response.Headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
            Response.Headers["Pragma"]        = "no-cache";
            Response.Headers["Expires"]       = "0";
        }
    }
}
