using BubbleApp.Common.Entities;
using BubbleApp.Common.ViewModels.General;
using BubbleApp.Data.IRepository;
using BubbleApp.Data.Mongo;
using MongoDB.Driver;

namespace BubbleApp.Data.Repositories;   // ← must be this exactly

public class GeneralRepository : IGeneralRepository
{
    private readonly MongoContext _ctx;
    public GeneralRepository(MongoContext ctx) => _ctx = ctx;

    public async Task<IReadOnlyList<GeneralMessageDto>> ListAsync(string workspace, CancellationToken ct = default)
    {
        var list = await _ctx.GeneralMessages
            .Find(g => g.Workspace == workspace)
            .SortBy(g => g.CreatedAt)
            .ToListAsync(ct);

        return list.Select(ToDto).ToList().AsReadOnly();
    }

    public async Task<GeneralMessageDto> CreateAsync(GeneralMessage msg, CancellationToken ct = default)
    {
        await _ctx.GeneralMessages.InsertOneAsync(msg, cancellationToken: ct);
        return ToDto(msg);
    }

    public async Task<GeneralMessage?> GetByIdAsync(string id, CancellationToken ct = default)
    {
        return await _ctx.GeneralMessages
            .Find(g => g.Id == id)
            .FirstOrDefaultAsync(ct);
    }

    public async Task<bool> EditAsync(
        string id, string workspace, string userId, string content,
        CancellationToken ct = default)
    {
        var update = Builders<GeneralMessage>.Update
            .Set(g => g.Content,  content.Trim())
            .Set(g => g.IsEdited, true)
            .Set(g => g.EditedAt, DateTime.UtcNow);

        var res = await _ctx.GeneralMessages.UpdateOneAsync(
            g => g.Id == id && g.Workspace == workspace && g.UserId == userId,
            update, cancellationToken: ct);

        return res.MatchedCount > 0;
    }

    public async Task<bool> DeleteAsync(
        string id, string workspace, string userId,
        CancellationToken ct = default)
    {
        var res = await _ctx.GeneralMessages.DeleteOneAsync(
            g => g.Id == id && g.Workspace == workspace && g.UserId == userId, ct);
        return res.DeletedCount > 0;
    }

    private static GeneralMessageDto ToDto(GeneralMessage g) => new(
        g.Id,
        g.Workspace,
        g.UserId,
        g.UserEmail,
        g.Content,
        g.IsEdited,
        g.CreatedAt,
        g.EditedAt,
        g.ReplyToId,
        g.ReplyToUserId,
        g.ReplyToUserEmail,
        g.ReplyToContent
    );
}
