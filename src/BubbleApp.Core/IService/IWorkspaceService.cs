using BubbleApp.Common.ViewModels.Workspace;

namespace BubbleApp.Core.IService
{
    public interface IWorkspaceService
    {
        Task<WorkspaceDto>              CreateAsync(string adminId, WorkspaceCreateRequest req, CancellationToken ct = default);
        Task<IReadOnlyList<WorkspaceDto>> ListAsync(string adminId, CancellationToken ct = default);
        Task<WorkspaceDto?>             GetBySlugAsync(string slug, CancellationToken ct = default);
        Task<WorkspaceDto>              RotateKeyAsync(string workspaceId, CancellationToken ct = default);
        Task<string>                    GetKeyPreviewAsync(string workspaceId, CancellationToken ct = default);
        Task<WorkspaceAppearanceDto>    GetAppearanceAsync(string workspaceId, CancellationToken ct = default);
        Task                            UpdateAppearanceAsync(string workspaceId, UpdateAppearanceRequest req, CancellationToken ct = default);

        // FIX: was dropped in the updated paste
        Task                            DeleteAsync(string workspaceId, string adminId, CancellationToken ct = default);
    }
}
