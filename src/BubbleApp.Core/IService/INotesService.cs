using BubbleApp.Common.ViewModels.Notes;

namespace BubbleApp.Core.IService;

public interface INotesService
{
    Task<IReadOnlyList<NoteDto>> GetAsync(string workspace, string userId, CancellationToken ct = default);
    Task<NoteDto>                CreateAsync(CreateNoteRequest req, CancellationToken ct = default);
    Task<bool>                   EditAsync(string id, string workspace, string userId, string content, CancellationToken ct = default);
    Task<bool>                   DeleteAsync(string id, string workspace, string userId, CancellationToken ct = default);
}
