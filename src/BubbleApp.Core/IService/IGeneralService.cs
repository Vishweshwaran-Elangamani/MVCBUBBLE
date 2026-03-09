using BubbleApp.Common.ViewModels.General;

namespace BubbleApp.Core.IService;

public interface IGeneralService
{
    Task<IReadOnlyList<GeneralMessageDto>> GetAsync(string workspace, CancellationToken ct = default);
    Task<GeneralMessageDto> CreateAsync(CreateGeneralRequest req, CancellationToken ct = default);
}
