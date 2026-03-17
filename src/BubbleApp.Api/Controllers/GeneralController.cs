using BubbleApp.Api.Security;
using BubbleApp.Common.ViewModels.General;
using BubbleApp.Core.IService;
using Microsoft.AspNetCore.Mvc;

namespace BubbleApp.Api.Controllers;

[ApiController]
[Route("api/general")]
[ValidateWorkspaceKey]
public class GeneralController : ControllerBase
{
    private readonly IGeneralService _svc;
    public GeneralController(IGeneralService svc) => _svc = svc;

    // ── GET /api/general?workspace=xxx ───────────────────────────────
    [HttpGet]
    public async Task<IActionResult> Get(
        [FromQuery] string workspace,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(workspace))
            return BadRequest("workspace is required.");

        return Ok(await _svc.GetAsync(workspace, ct));
    }

    // ── POST /api/general ────────────────────────────────────────────
    public sealed record CreateGeneralDto(
        string  workspace,
        string  userId,
        string  userEmail,
        string  content,
        string? replyToId        = null,
        string? replyToUserId    = null,
        string? replyToUserEmail = null,
        string? replyToContent   = null);

    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] CreateGeneralDto dto,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(dto.workspace) ||
            string.IsNullOrWhiteSpace(dto.userId)    ||
            string.IsNullOrWhiteSpace(dto.content))
            return BadRequest(new { error = "workspace, userId, content are required." });

        try
        {
            var result = await _svc.CreateAsync(new CreateGeneralRequest(
                dto.workspace,
                string.Empty,   // Key is handled by [ValidateWorkspaceKey]
                dto.userId,
                dto.userEmail,
                dto.content,
                dto.replyToId,
                dto.replyToUserId,
                dto.replyToUserEmail,
                dto.replyToContent
            ), ct);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    // ── PUT /api/general/{id} ────────────────────────────────────────
    public sealed record EditGeneralDto(
        string workspace,
        string userId,
        string content);

    [HttpPut("{id}")]
    public async Task<IActionResult> Edit(
        string id,
        [FromBody] EditGeneralDto dto,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(dto.workspace) ||
            string.IsNullOrWhiteSpace(dto.userId)    ||
            string.IsNullOrWhiteSpace(dto.content))
            return BadRequest(new { error = "workspace, userId, content are required." });

        try
        {
            var ok = await _svc.EditAsync(id, dto.workspace, dto.userId, dto.content, ct);
            return ok ? NoContent() : NotFound(new { error = "Message not found or you are not the owner." });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    // ── DELETE /api/general/{id} ─────────────────────────────────────
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(
        string id,
        [FromQuery] string workspace,
        [FromQuery] string userId,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(workspace) || string.IsNullOrWhiteSpace(userId))
            return BadRequest(new { error = "workspace and userId are required." });

        var ok = await _svc.DeleteAsync(id, workspace, userId, ct);
        return ok ? NoContent() : NotFound(new { error = "Message not found or you are not the owner." });
    }
}
