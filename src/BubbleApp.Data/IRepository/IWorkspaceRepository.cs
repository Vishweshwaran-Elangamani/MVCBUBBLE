using BubbleApp.Common.Entities;

namespace BubbleApp.Data.IRepository
{
    public interface IWorkspaceRepository
    {
        Task<Workspace>                CreateAsync(Workspace ws, CancellationToken ct = default);
        Task<Workspace?>               GetBySlugAsync(string slug, CancellationToken ct = default);
        Task<Workspace?>               GetByIdAsync(string workspaceId, CancellationToken ct = default);
        Task<IReadOnlyList<Workspace>> ListByAdminAsync(string adminId, CancellationToken ct = default);
        Task<Workspace?>               GetByKeyHashAsync(string keyHash, CancellationToken ct = default);
        Task<Workspace?>               GetByAdminAndSlugAsync(string adminId, string slug, CancellationToken ct = default);
        Task                           RotateKeyAsync(string workspaceId, string newPlainKey, string newKeyHash, CancellationToken ct = default);
        Task                           UpdateAppearanceAsync(string workspaceId, string bubbleColor, string bubbleText, CancellationToken ct = default);
        Task                           DeleteAsync(string workspaceId, CancellationToken ct = default);
        Task                           SoftDeleteAsync(string workspaceId, CancellationToken ct = default);
        Task                           RestoreAsync(string workspaceId, CancellationToken ct = default);
        Task<IReadOnlyList<Workspace>> ListExpiredAsync(DateTime cutoff, CancellationToken ct = default);
    }
}
