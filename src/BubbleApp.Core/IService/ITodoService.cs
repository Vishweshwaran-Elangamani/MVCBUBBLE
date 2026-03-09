using BubbleApp.Common.ViewModels.Todo;

namespace BubbleApp.Core.IService;

public interface ITodoService
{
    Task<IReadOnlyList<TodoDto>> GetAsync(string workspace, string userId, CancellationToken ct = default);
    Task<TodoDto>  CreateAsync(CreateTodoRequest req, CancellationToken ct = default);
    Task<bool>     PatchDoneAsync(string id, string workspace, string userId, bool done, CancellationToken ct = default);
    Task<bool>     DeleteAsync(string id, string workspace, string userId, CancellationToken ct = default);
}
