using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using BubbleApp.Core.IService;

namespace BubbleApp.Api.Controllers
{
    [ApiController]
    [Route("api/snippet")]
    public class SnippetController : ControllerBase
    {
        private readonly ISnippetService _svc;
        private readonly IConfiguration  _cfg;

        public SnippetController(ISnippetService svc, IConfiguration cfg)
        {
            _svc = svc;
            _cfg = cfg;
        }

        [Authorize]
        [HttpGet("{workspaceSlug}")]
        public IActionResult Get(string workspaceSlug)
        {
            var cdn     = _cfg["Widget:CdnUrl"] ?? throw new InvalidOperationException("Widget:CdnUrl missing.");
            var apiBase = new Uri($"{Request.Scheme}://{Request.Host}"); // ← NEW
            var snip    = _svc.Generate(workspaceSlug, new Uri(cdn), apiBase);
            return Ok(snip);
        }

        [Authorize]
        [HttpGet("{workspaceSlug}/raw")]
        public IActionResult GetRaw(string workspaceSlug)
        {
            var cdn     = _cfg["Widget:CdnUrl"] ?? throw new InvalidOperationException("Widget:CdnUrl missing.");
            var apiBase = new Uri($"{Request.Scheme}://{Request.Host}"); // ← NEW
            var snip    = _svc.Generate(workspaceSlug, new Uri(cdn), apiBase);
            Response.Headers.ContentDisposition = $"inline; filename=\"bubble-snippet-{workspaceSlug}.html\"";
            return Content(snip.Snippet, "text/plain; charset=utf-8");
        }
    }
}
