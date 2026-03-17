using BubbleApp.Common.Entities;
using BubbleApp.Common.ViewModels.Reminder;

namespace BubbleApp.Data.IRepository;

public interface IReminderRepository
{
    Task<IReadOnlyList<ReminderDto>> ListAsync(string workspace, string userId, CancellationToken ct = default);
    Task<ReminderDto>                CreateAsync(Reminder reminder, CancellationToken ct = default);
    Task<bool>                       AcknowledgeAsync(string id, string workspace, string userId, CancellationToken ct = default);
    Task<bool>                       DeleteAsync(string id, string workspace, string userId, CancellationToken ct = default);
}
