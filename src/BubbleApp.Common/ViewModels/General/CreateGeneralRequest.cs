namespace BubbleApp.Common.ViewModels.General;

public record CreateGeneralRequest(
    string Workspace,
    string Key,
    string UserId,
    string UserEmail,
    string Content
);
