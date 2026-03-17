namespace BubbleApp.Common.ViewModels.Workspace
{
    public record WorkspaceDto(
        string    Id,
        string    Name,
        string    Slug,
        DateTime  CreatedAt,
        bool      IsDeleted,
        DateTime? DeletedAt
    );
}
