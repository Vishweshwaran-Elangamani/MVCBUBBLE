using BubbleApp.Common.Entities;
using BubbleApp.Common.ViewModels.General;

namespace BubbleApp.Data.IRepository;

public interface IGeneralRepository
{
    Task<IReadOnlyList<GeneralMessageDto>> ListAsync(string workspace, CancellationToken ct = default);
    Task<GeneralMessageDto>               CreateAsync(GeneralMessage msg, CancellationToken ct = default);
    Task<GeneralMessage?>                 GetByIdAsync(string id, CancellationToken ct = default);
    Task<bool>                            EditAsync(string id, string workspace, string userId, string content, CancellationToken ct = default);
    Task<bool>                            DeleteAsync(string id, string workspace, string userId, CancellationToken ct = default);
}
