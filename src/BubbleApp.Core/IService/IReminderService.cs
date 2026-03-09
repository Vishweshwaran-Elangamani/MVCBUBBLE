using BubbleApp.Common.ViewModels.Reminder;

namespace BubbleApp.Core.IService;

public interface IReminderService
{
    Task<IReadOnlyList<ReminderDto>> GetAsync(string workspace, string userId, CancellationToken ct = default);
    Task<ReminderDto> CreateAsync(CreateReminderRequest req, CancellationToken ct = default);
    Task<bool> AcknowledgeAsync(string id, string workspace, string userId, CancellationToken ct = default);
    Task<bool> DeleteAsync(string id, string workspace, string userId, CancellationToken ct = default);
}
