using BubbleApp.Common.Entities;
using BubbleApp.Common.ViewModels.Todo;

namespace BubbleApp.Data.IRepository;

public interface ITodoRepository
{
    Task<IReadOnlyList<TodoDto>> ListAsync(string workspace, string userId, CancellationToken ct = default);
    Task<TodoDto>  CreateAsync(Todo todo, CancellationToken ct = default);
    Task<bool>     PatchDoneAsync(string id, string workspace, string userId, bool done, CancellationToken ct = default);
    Task<bool>     DeleteAsync(string id, string workspace, string userId, CancellationToken ct = default);
}
