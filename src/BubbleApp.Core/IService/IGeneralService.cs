using BubbleApp.Common.ViewModels.General;

namespace BubbleApp.Core.IService;

public interface IGeneralService
{
    Task<IReadOnlyList<GeneralMessageDto>> GetAsync(string workspace, CancellationToken ct = default);
    Task<GeneralMessageDto>               CreateAsync(CreateGeneralRequest req, CancellationToken ct = default);
    Task<bool>                            EditAsync(string id, string workspace, string userId, string content, CancellationToken ct = default);
    Task<bool>                            DeleteAsync(string id, string workspace, string userId, CancellationToken ct = default);
}
