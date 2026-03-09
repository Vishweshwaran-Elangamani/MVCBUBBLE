using BubbleApp.Common.Entities;
using BubbleApp.Common.ViewModels.Todo;
using BubbleApp.Core.IService;
using BubbleApp.Data.IRepository;

namespace BubbleApp.Core.Service;

public class TodoService : ITodoService
{
    private readonly ITodoRepository _repo;
    public TodoService(ITodoRepository repo) => _repo = repo;

    public Task<IReadOnlyList<TodoDto>> GetAsync(string workspace, string userId, CancellationToken ct = default)
        => _repo.ListAsync(workspace, userId, ct);

    public Task<TodoDto> CreateAsync(CreateTodoRequest req, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(req.Content))
            throw new ArgumentException("Content is required.");

        var validPriorities = new[] { "high", "medium", "low" };
        var priority = validPriorities.Contains(req.Priority) ? req.Priority : "medium";

        var todo = new Todo
        {
            Id        = Guid.NewGuid().ToString(),
            Workspace = req.Workspace,
            UserId    = req.UserId,
            Content   = req.Content.Trim(),
            Priority  = priority,
            Done      = false,
            CreatedAt = DateTime.UtcNow
        };
        return _repo.CreateAsync(todo, ct);
    }

    public Task<bool> PatchDoneAsync(string id, string workspace, string userId, bool done, CancellationToken ct = default)
        => _repo.PatchDoneAsync(id, workspace, userId, done, ct);

    public Task<bool> DeleteAsync(string id, string workspace, string userId, CancellationToken ct = default)
        => _repo.DeleteAsync(id, workspace, userId, ct);
}
