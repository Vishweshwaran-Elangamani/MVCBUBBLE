using BubbleApp.Common.Entities;
using BubbleApp.Common.ViewModels.General;
using BubbleApp.Core.IService;
using BubbleApp.Data.IRepository;

namespace BubbleApp.Core.Service;

public class GeneralService : IGeneralService
{
    private readonly IGeneralRepository _repo;
    public GeneralService(IGeneralRepository repo) => _repo = repo;

    public Task<IReadOnlyList<GeneralMessageDto>> GetAsync(string workspace, CancellationToken ct = default)
        => _repo.ListAsync(workspace, ct);

    public Task<GeneralMessageDto> CreateAsync(CreateGeneralRequest req, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(req.Content))
            throw new ArgumentException("Content is required.");

        var msg = new GeneralMessage
        {
            Id        = Guid.NewGuid().ToString(),
            Workspace = req.Workspace,
            UserId    = req.UserId,
            UserEmail = (req.UserEmail ?? "").Trim(), // store only what widget sends — no Redux/global lookup
            Content   = req.Content.Trim(),
            CreatedAt = DateTime.UtcNow
        };
        return _repo.CreateAsync(msg, ct);
    }
}
