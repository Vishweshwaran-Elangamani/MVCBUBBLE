namespace BubbleApp.Common.ViewModels.Todo;

public record PatchTodoRequest(
    string Workspace,
    string Key,
    string UserId,
    bool   Done
);
