using BubbleApp.Common.Entities;
using BubbleApp.Data.IRepository;
using BubbleApp.Data.Mongo;
using MongoDB.Driver;

namespace BubbleApp.Data.Repository
{
    public class WorkspaceRepository : IWorkspaceRepository
    {
        private readonly MongoContext _ctx;
        public WorkspaceRepository(MongoContext ctx) => _ctx = ctx;

        public async Task<Workspace> CreateAsync(Workspace ws, CancellationToken ct = default)
        {
            await _ctx.Workspaces.InsertOneAsync(ws, cancellationToken: ct);
            return ws;
        }

        public Task<Workspace?> GetBySlugAsync(string slug, CancellationToken ct = default) =>
            _ctx.Workspaces.Find(w => w.Slug == slug).FirstOrDefaultAsync(ct)!;

        public Task<Workspace?> GetByIdAsync(string workspaceId, CancellationToken ct = default) =>
            _ctx.Workspaces.Find(w => w.Id == workspaceId).FirstOrDefaultAsync(ct)!;

        public async Task<IReadOnlyList<Workspace>> ListByAdminAsync(string adminId, CancellationToken ct = default)
            => await _ctx.Workspaces.Find(w => w.AdminId == adminId).ToListAsync(ct);

        public Task<Workspace?> GetByKeyHashAsync(string keyHash, CancellationToken ct = default) =>
            _ctx.Workspaces.Find(w => w.WorkspaceKeyHash == keyHash).FirstOrDefaultAsync(ct)!;

        public Task<Workspace?> GetByAdminAndSlugAsync(string adminId, string slug, CancellationToken ct = default) =>
            _ctx.Workspaces.Find(w => w.AdminId == adminId && w.Slug == slug).FirstOrDefaultAsync(ct)!;

        public Task RotateKeyAsync(string workspaceId, string newPlainKey, string newKeyHash, CancellationToken ct = default)
        {
            var update = Builders<Workspace>.Update
                .Set(w => w.WorkspaceKey,     newPlainKey)
                .Set(w => w.WorkspaceKeyHash, newKeyHash);
            return _ctx.Workspaces.UpdateOneAsync(w => w.Id == workspaceId, update, cancellationToken: ct);
        }

        public Task UpdateAppearanceAsync(string workspaceId, string bubbleColor, string bubbleText, CancellationToken ct = default)
        {
            var update = Builders<Workspace>.Update
                .Set(w => w.BubbleColor, bubbleColor)
                .Set(w => w.BubbleText,  bubbleText);
            return _ctx.Workspaces.UpdateOneAsync(w => w.Id == workspaceId, update, cancellationToken: ct);
        }

        // FIX: was missing from the updated paste
        public Task DeleteAsync(string workspaceId, CancellationToken ct = default) =>
            _ctx.Workspaces.DeleteOneAsync(w => w.Id == workspaceId, ct);
    }
}
