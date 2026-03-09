using BubbleApp.Common.Entities;
using BubbleApp.Common.ViewModels.Notes;
using BubbleApp.Core.IService;
using BubbleApp.Data.IRepository;

namespace BubbleApp.Core.Service;

public class NotesService : INotesService
{
    private readonly INoteRepository _repo;
    public NotesService(INoteRepository repo) => _repo = repo;

    public Task<IReadOnlyList<NoteDto>> GetAsync(string workspace, string userId, CancellationToken ct = default)
        => _repo.ListAsync(workspace, userId, ct);

    public Task<NoteDto> CreateAsync(CreateNoteRequest req, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(req.Workspace) ||
            string.IsNullOrWhiteSpace(req.UserId)    ||
            string.IsNullOrWhiteSpace(req.Content))
            throw new ArgumentException("workspace, userId, content are required.");

        var n = new Note
        {
            Id        = Guid.NewGuid().ToString(),
            Workspace = req.Workspace,
            UserId    = req.UserId,
            Content   = req.Content.Trim(),
            CreatedAt = DateTime.UtcNow
        };
        return _repo.CreateAsync(n, ct);
    }

    public Task<bool> EditAsync(string id, string workspace, string userId, string content, CancellationToken ct = default)
        => _repo.EditAsync(id, workspace, userId, content, ct);

    public Task<bool> DeleteAsync(string id, string workspace, string userId, CancellationToken ct = default)
        => _repo.DeleteAsync(id, workspace, userId, ct);
}
