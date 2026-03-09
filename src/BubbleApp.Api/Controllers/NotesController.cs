using System.Threading;
using System.Threading.Tasks;
using BubbleApp.Api.Security;
using BubbleApp.Common.ViewModels.Notes;
using BubbleApp.Core.IService;
using Microsoft.AspNetCore.Mvc;

namespace BubbleApp.Api.Controllers;

[ApiController]
[Route("api/notes")]
[ValidateWorkspaceKey]
public class NotesController : ControllerBase
{
    private readonly INotesService _svc;
    public NotesController(INotesService svc) => _svc = svc;

    [HttpGet]
    public async Task<IActionResult> Get(
        [FromQuery] string workspace,
        [FromQuery] string userId,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(workspace) || string.IsNullOrWhiteSpace(userId))
            return BadRequest("workspace and userId are required");
        return Ok(await _svc.GetAsync(workspace, userId, ct));
    }

    public sealed record AddNoteDto(string workspace, string userId, string content);

    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] AddNoteDto dto,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(dto.workspace) ||
            string.IsNullOrWhiteSpace(dto.userId)    ||
            string.IsNullOrWhiteSpace(dto.content))
            return BadRequest("workspace, userId, content are required");
        return Ok(await _svc.CreateAsync(new CreateNoteRequest(dto.workspace, dto.userId, dto.content), ct));
    }

    public sealed record EditNoteDto(string workspace, string userId, string content);

    [HttpPut("{id}")]
    public async Task<IActionResult> Edit(
        string id,
        [FromBody] EditNoteDto dto,
        CancellationToken ct)
    {
        var ok = await _svc.EditAsync(id, dto.workspace, dto.userId, dto.content, ct);
        return ok ? NoContent() : NotFound();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(
        string id,
        [FromQuery] string workspace,
        [FromQuery] string userId,
        CancellationToken ct)
    {
        var ok = await _svc.DeleteAsync(id, workspace, userId, ct);
        return ok ? NoContent() : NotFound();
    }
}
