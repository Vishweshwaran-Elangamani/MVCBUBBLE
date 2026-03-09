using BubbleApp.Common.Entities;
using BubbleApp.Common.ViewModels.Notes;
using BubbleApp.Data.IRepository;
using BubbleApp.Data.Mongo;
using MongoDB.Driver;

namespace BubbleApp.Data.Repository;

public class NoteRepository : INoteRepository
{
    private readonly MongoContext _ctx;
    public NoteRepository(MongoContext ctx) => _ctx = ctx;

    public async Task<IReadOnlyList<NoteDto>> ListAsync(string workspace, string userId, CancellationToken ct = default)
    {
        var filter = Builders<Note>.Filter.Eq(n => n.Workspace, workspace)
                   & Builders<Note>.Filter.Eq(n => n.UserId,    userId);
        var list = await _ctx.Notes.Find(filter)
            .SortByDescending(n => n.CreatedAt)
            .ToListAsync(ct);
        return list.Select(n => new NoteDto(n.Id, n.Workspace, n.UserId, n.Content, n.CreatedAt)).ToList();
    }

    public async Task<NoteDto> CreateAsync(Note n, CancellationToken ct = default)
    {
        await _ctx.Notes.InsertOneAsync(n, cancellationToken: ct);
        return new NoteDto(n.Id, n.Workspace, n.UserId, n.Content, n.CreatedAt);
    }

    public async Task<bool> EditAsync(string id, string workspace, string userId, string content, CancellationToken ct = default)
    {
        var update = Builders<Note>.Update.Set(n => n.Content, content.Trim());
        var res = await _ctx.Notes.UpdateOneAsync(
            n => n.Id == id && n.Workspace == workspace && n.UserId == userId,
            update, cancellationToken: ct);
        return res.MatchedCount > 0;
    }

    public async Task<bool> DeleteAsync(string id, string workspace, string userId, CancellationToken ct = default)
    {
        var filter = Builders<Note>.Filter.Eq(n => n.Id,        id)
                   & Builders<Note>.Filter.Eq(n => n.Workspace, workspace)
                   & Builders<Note>.Filter.Eq(n => n.UserId,    userId);
        var res = await _ctx.Notes.DeleteOneAsync(filter, ct);
        return res.DeletedCount > 0;
    }
}
