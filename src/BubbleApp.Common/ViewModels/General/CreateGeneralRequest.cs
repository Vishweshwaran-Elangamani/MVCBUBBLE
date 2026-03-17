namespace BubbleApp.Common.ViewModels.General;

public record CreateGeneralRequest(
    string  Workspace,
    string  Key,
    string  UserId,
    string  UserEmail,
    string  Content,
    string? ReplyToId        = null,
    string? ReplyToUserId    = null,
    string? ReplyToUserEmail = null,
    string? ReplyToContent   = null
);
