using BubbleApp.Common.Entities;
using BubbleApp.Common.ViewModels.General;

namespace BubbleApp.Data.IRepository;

public interface IGeneralRepository
{
    Task<IReadOnlyList<GeneralMessageDto>> ListAsync(string workspace, CancellationToken ct = default);
    Task<GeneralMessageDto> CreateAsync(GeneralMessage msg, CancellationToken ct = default);
}
