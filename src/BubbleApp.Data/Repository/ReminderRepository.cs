using BubbleApp.Common.Entities;
using BubbleApp.Common.ViewModels.Reminder;
using BubbleApp.Data.IRepository;
using BubbleApp.Data.Mongo;
using MongoDB.Driver;

namespace BubbleApp.Data.Repositories;

public class ReminderRepository : IReminderRepository
{
    private readonly MongoContext _ctx;
    public ReminderRepository(MongoContext ctx) => _ctx = ctx;

    public async Task<IReadOnlyList<ReminderDto>> ListAsync(
        string workspace, string userId,
        CancellationToken ct = default)
    {
        var list = await _ctx.Reminders
            .Find(r => r.Workspace == workspace && r.UserId == userId)
            .SortBy(r => r.RemindAt)
            .ToListAsync(ct);

        return list.Select(ToDto).ToList().AsReadOnly();
    }

    public async Task<ReminderDto> CreateAsync(
        Reminder reminder,
        CancellationToken ct = default)
    {
        await _ctx.Reminders.InsertOneAsync(reminder, cancellationToken: ct);
        return ToDto(reminder);
    }

    public async Task<bool> AcknowledgeAsync(
        string id, string workspace, string userId,
        CancellationToken ct = default)
    {
        var update = Builders<Reminder>.Update
            .Set(r => r.Acknowledged, true);

        var res = await _ctx.Reminders.UpdateOneAsync(
            r => r.Id == id && r.Workspace == workspace && r.UserId == userId,
            update, cancellationToken: ct);

        return res.MatchedCount > 0;
    }

    public async Task<bool> DeleteAsync(
        string id, string workspace, string userId,
        CancellationToken ct = default)
    {
        var res = await _ctx.Reminders.DeleteOneAsync(
            r => r.Id == id && r.Workspace == workspace && r.UserId == userId,
            ct);

        return res.DeletedCount > 0;
    }

    private static ReminderDto ToDto(Reminder r) => new(
        r.Id,
        r.Workspace,
        r.UserId,
        r.Content,
        r.RemindAt,
        r.Acknowledged,
        r.CreatedAt
    );
}
