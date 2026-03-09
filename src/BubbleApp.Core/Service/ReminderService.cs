using BubbleApp.Common.Entities;
using BubbleApp.Common.ViewModels.Reminder;
using BubbleApp.Core.IService;
using BubbleApp.Data.IRepository;

namespace BubbleApp.Core.Service;

public class ReminderService : IReminderService
{
    private readonly IReminderRepository _repo;
    public ReminderService(IReminderRepository repo) => _repo = repo;

    public Task<IReadOnlyList<ReminderDto>> GetAsync(string workspace, string userId, CancellationToken ct = default)
        => _repo.ListAsync(workspace, userId, ct);

    public Task<ReminderDto> CreateAsync(CreateReminderRequest req, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(req.Content))
            throw new ArgumentException("Content is required.");
        if (req.RemindAt <= DateTime.UtcNow)
            throw new ArgumentException("Reminder time must be in the future.");

        var reminder = new Reminder
        {
            Id           = Guid.NewGuid().ToString(),
            Workspace    = req.Workspace,
            UserId       = req.UserId,
            Content      = req.Content.Trim(),
            RemindAt     = req.RemindAt.ToUniversalTime(),
            Acknowledged = false,
            CreatedAt    = DateTime.UtcNow
        };
        return _repo.CreateAsync(reminder, ct);
    }

    public Task<bool> AcknowledgeAsync(string id, string workspace, string userId, CancellationToken ct = default)
        => _repo.AcknowledgeAsync(id, workspace, userId, ct);

    public Task<bool> DeleteAsync(string id, string workspace, string userId, CancellationToken ct = default)
        => _repo.DeleteAsync(id, workspace, userId, ct);
}
