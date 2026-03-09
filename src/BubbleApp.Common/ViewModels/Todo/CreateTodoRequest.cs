namespace BubbleApp.Common.ViewModels.Todo;

public record CreateTodoRequest(
    string Workspace,
    string UserId,
    string Content,
    string Priority,
    bool   Done
);
