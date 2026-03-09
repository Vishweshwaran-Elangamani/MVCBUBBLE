using BubbleApp.Common.Entities;
using BubbleApp.Common.ViewModels.Reminder;
using BubbleApp.Data.IRepository;
using BubbleApp.Data.Mongo;
using MongoDB.Driver;

namespace BubbleApp.Data.Repository;

public class ReminderRepository : IReminderRepository
{
    private readonly MongoContext _ctx;
    public ReminderRepository(MongoContext ctx) => _ctx = ctx;

    public async Task<IReadOnlyList<ReminderDto>> ListAsync(string workspace, string userId, CancellationToken ct = default)
    {
        var filter = Builders<Reminder>.Filter.Eq(r => r.Workspace, workspace) &
                     Builders<Reminder>.Filter.Eq(r => r.UserId,    userId);
        var list = await _ctx.Reminders.Find(filter).SortBy(r => r.RemindAt).ToListAsync(ct);
        return list.Select(Map).ToList();
    }

    public async Task<ReminderDto> CreateAsync(Reminder reminder, CancellationToken ct = default)
    {
        await _ctx.Reminders.InsertOneAsync(reminder, cancellationToken: ct);
        return Map(reminder);
    }

    public async Task<bool> AcknowledgeAsync(string id, string workspace, string userId, CancellationToken ct = default)
    {
        var filter = Builders<Reminder>.Filter.Eq(r => r.Id, id) &
                     Builders<Reminder>.Filter.Eq(r => r.Workspace, workspace) &
                     Builders<Reminder>.Filter.Eq(r => r.UserId, userId);
        var update = Builders<Reminder>.Update.Set(r => r.Acknowledged, true);
        var res = await _ctx.Reminders.UpdateOneAsync(filter, update, cancellationToken: ct);
        return res.ModifiedCount > 0;
    }

    public async Task<bool> DeleteAsync(string id, string workspace, string userId, CancellationToken ct = default)
    {
        var filter = Builders<Reminder>.Filter.Eq(r => r.Id, id) &
                     Builders<Reminder>.Filter.Eq(r => r.Workspace, workspace) &
                     Builders<Reminder>.Filter.Eq(r => r.UserId, userId);
        var res = await _ctx.Reminders.DeleteOneAsync(filter, ct);
        return res.DeletedCount > 0;
    }

    private static ReminderDto Map(Reminder r) =>
        new(r.Id, r.Workspace, r.UserId, r.Content, r.RemindAt, r.Acknowledged, r.CreatedAt);
}
