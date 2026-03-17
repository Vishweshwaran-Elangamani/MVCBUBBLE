namespace BubbleApp.Common.ViewModels.General;

public record EditGeneralRequest(
    string Workspace,
    string UserId,
    string Content
);
