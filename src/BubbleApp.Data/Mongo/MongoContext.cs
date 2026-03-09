using BubbleApp.Common.Entities;
using Microsoft.Extensions.Options;
using MongoDB.Driver;

namespace BubbleApp.Data.Mongo;

public class MongoContext
{
    public IMongoDatabase                    Db              { get; }
    public IMongoCollection<Admin>           Admins          { get; }
    public IMongoCollection<Workspace>       Workspaces      { get; }
    public IMongoCollection<Note>            Notes           { get; }
    public IMongoCollection<Todo>            Todos           { get; }     // NEW
    public IMongoCollection<GeneralMessage>  GeneralMessages { get; }     // NEW
    public IMongoCollection<Reminder>        Reminders       { get; }     // NEW

    public MongoContext(IOptions<MongoSettings> options)
    {
        var s      = options.Value;
        var client = new MongoClient(s.ConnectionString);
        Db = client.GetDatabase(s.Database);

        Admins          = Db.GetCollection<Admin>          (s.AdminsCollection);
        Workspaces      = Db.GetCollection<Workspace>      (s.WorkspacesCollection);
        Notes           = Db.GetCollection<Note>           (s.NotesCollection);
        Todos           = Db.GetCollection<Todo>           (s.TodosCollection);
        GeneralMessages = Db.GetCollection<GeneralMessage> (s.GeneralCollection);
        Reminders       = Db.GetCollection<Reminder>       (s.RemindersCollection);

        // Workspace indexes
        Workspaces.Indexes.CreateOne(new CreateIndexModel<Workspace>(
            Builders<Workspace>.IndexKeys.Ascending(w => w.Slug),
            new CreateIndexOptions { Unique = true }));
        Workspaces.Indexes.CreateOne(new CreateIndexModel<Workspace>(
            Builders<Workspace>.IndexKeys.Ascending(w => w.WorkspaceKeyHash),
            new CreateIndexOptions { Unique = true }));

        // Notes index
        Notes.Indexes.CreateOne(new CreateIndexModel<Note>(
            Builders<Note>.IndexKeys.Ascending(n => n.Workspace).Ascending(n => n.UserId).Descending(n => n.CreatedAt)));

        // Todos index
        Todos.Indexes.CreateOne(new CreateIndexModel<Todo>(
            Builders<Todo>.IndexKeys.Ascending(t => t.Workspace).Ascending(t => t.UserId).Descending(t => t.CreatedAt)));

        // General index
        GeneralMessages.Indexes.CreateOne(new CreateIndexModel<GeneralMessage>(
            Builders<GeneralMessage>.IndexKeys.Ascending(m => m.Workspace).Ascending(m => m.CreatedAt)));

        // Reminders index
        Reminders.Indexes.CreateOne(new CreateIndexModel<Reminder>(
            Builders<Reminder>.IndexKeys.Ascending(r => r.Workspace).Ascending(r => r.UserId).Ascending(r => r.RemindAt)));
    }
}
