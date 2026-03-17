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

    public async Task<GeneralMessageDto> CreateAsync(CreateGeneralRequest req, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(req.Workspace))
            throw new ArgumentException("workspace is required.");
        if (string.IsNullOrWhiteSpace(req.UserId))
            throw new ArgumentException("userId is required.");
        if (string.IsNullOrWhiteSpace(req.Content))
            throw new ArgumentException("content is required.");

        // If replying, validate that the original message exists
        string? replyToContent   = req.ReplyToContent;
        string? replyToUserId    = req.ReplyToUserId;
        string? replyToUserEmail = req.ReplyToUserEmail;

        if (!string.IsNullOrWhiteSpace(req.ReplyToId))
        {
            var original = await _repo.GetByIdAsync(req.ReplyToId, ct);
            if (original is null)
                throw new ArgumentException("The message you are replying to does not exist.");

            // Always use live data from DB for reply snapshot
            replyToContent   = original.Content;
            replyToUserId    = original.UserId;
            replyToUserEmail = original.UserEmail;
        }

        var msg = new GeneralMessage
        {
            Id               = Guid.NewGuid().ToString(),
            Workspace        = req.Workspace,
            UserId           = req.UserId,
            UserEmail        = (req.UserEmail ?? string.Empty).Trim(),
            Content          = req.Content.Trim(),
            IsEdited         = false,
            CreatedAt        = DateTime.UtcNow,
            ReplyToId        = req.ReplyToId,
            ReplyToUserId    = replyToUserId,
            ReplyToUserEmail = replyToUserEmail,
            ReplyToContent   = replyToContent
        };

        return await _repo.CreateAsync(msg, ct);
    }

    public async Task<bool> EditAsync(
        string id, string workspace, string userId, string content,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(content))
            throw new ArgumentException("content is required.");

        return await _repo.EditAsync(id, workspace, userId, content, ct);
    }

    public Task<bool> DeleteAsync(
        string id, string workspace, string userId,
        CancellationToken ct = default)
        => _repo.DeleteAsync(id, workspace, userId, ct);
}
