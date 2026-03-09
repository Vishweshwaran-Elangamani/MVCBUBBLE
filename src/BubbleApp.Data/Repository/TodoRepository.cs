using BubbleApp.Common.Entities;
using BubbleApp.Common.ViewModels.Todo;
using BubbleApp.Data.IRepository;
using BubbleApp.Data.Mongo;
using MongoDB.Driver;

namespace BubbleApp.Data.Repository;

public class TodoRepository : ITodoRepository
{
    private readonly MongoContext _ctx;
    public TodoRepository(MongoContext ctx) => _ctx = ctx;

    public async Task<IReadOnlyList<TodoDto>> ListAsync(string workspace, string userId, CancellationToken ct = default)
    {
        var filter = Builders<Todo>.Filter.Eq(t => t.Workspace, workspace) &
                     Builders<Todo>.Filter.Eq(t => t.UserId,    userId);
        var list = await _ctx.Todos.Find(filter).SortByDescending(t => t.CreatedAt).ToListAsync(ct);
        return list.Select(Map).ToList();
    }

    public async Task<TodoDto> CreateAsync(Todo todo, CancellationToken ct = default)
    {
        await _ctx.Todos.InsertOneAsync(todo, cancellationToken: ct);
        return Map(todo);
    }

    public async Task<bool> PatchDoneAsync(string id, string workspace, string userId, bool done, CancellationToken ct = default)
    {
        var filter = Builders<Todo>.Filter.Eq(t => t.Id, id) &
                     Builders<Todo>.Filter.Eq(t => t.Workspace, workspace) &
                     Builders<Todo>.Filter.Eq(t => t.UserId, userId);
        var update = Builders<Todo>.Update.Set(t => t.Done, done);
        var res = await _ctx.Todos.UpdateOneAsync(filter, update, cancellationToken: ct);
        return res.ModifiedCount > 0;
    }

    public async Task<bool> DeleteAsync(string id, string workspace, string userId, CancellationToken ct = default)
    {
        var filter = Builders<Todo>.Filter.Eq(t => t.Id, id) &
                     Builders<Todo>.Filter.Eq(t => t.Workspace, workspace) &
                     Builders<Todo>.Filter.Eq(t => t.UserId, userId);
        var res = await _ctx.Todos.DeleteOneAsync(filter, ct);
        return res.DeletedCount > 0;
    }

    private static TodoDto Map(Todo t) =>
        new(t.Id, t.Workspace, t.UserId, t.Content, t.Priority, t.Done, t.CreatedAt);
}
