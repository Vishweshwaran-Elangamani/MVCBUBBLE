using BubbleApp.Common.Entities;
using BubbleApp.Common.ViewModels.General;
using BubbleApp.Data.IRepository;
using BubbleApp.Data.Mongo;
using MongoDB.Driver;

namespace BubbleApp.Data.Repository;

public class GeneralRepository : IGeneralRepository
{
    private readonly MongoContext _ctx;
    public GeneralRepository(MongoContext ctx) => _ctx = ctx;

    public async Task<IReadOnlyList<GeneralMessageDto>> ListAsync(string workspace, CancellationToken ct = default)
    {
        var filter = Builders<GeneralMessage>.Filter.Eq(m => m.Workspace, workspace);
        var list = await _ctx.GeneralMessages
            .Find(filter)
            .SortBy(m => m.CreatedAt)
            .Limit(200) // last 200 messages
            .ToListAsync(ct);
        return list.Select(Map).ToList();
    }

    public async Task<GeneralMessageDto> CreateAsync(GeneralMessage msg, CancellationToken ct = default)
    {
        await _ctx.GeneralMessages.InsertOneAsync(msg, cancellationToken: ct);
        return Map(msg);
    }

    private static GeneralMessageDto Map(GeneralMessage m) =>
        new(m.Id, m.Workspace, m.UserId, m.UserEmail, m.Content, m.CreatedAt);
}
