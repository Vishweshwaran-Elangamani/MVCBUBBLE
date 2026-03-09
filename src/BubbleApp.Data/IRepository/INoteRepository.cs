using BubbleApp.Common.Entities;
using BubbleApp.Common.ViewModels.Notes;

namespace BubbleApp.Data.IRepository;

public interface INoteRepository
{
    Task<IReadOnlyList<NoteDto>> ListAsync(string workspace, string userId, CancellationToken ct = default);
    Task<NoteDto>                CreateAsync(Note n, CancellationToken ct = default);
    Task<bool>                   EditAsync(string id, string workspace, string userId, string content, CancellationToken ct = default);
    Task<bool>                   DeleteAsync(string id, string workspace, string userId, CancellationToken ct = default);
}
