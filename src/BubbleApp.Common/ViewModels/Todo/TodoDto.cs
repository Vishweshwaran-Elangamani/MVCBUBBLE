namespace BubbleApp.Common.ViewModels.Todo;

public record TodoDto(
    string   Id,
    string   Workspace,
    string   UserId,
    string   Content,
    string   Priority,
    bool     Done,
    DateTime CreatedAt
);
