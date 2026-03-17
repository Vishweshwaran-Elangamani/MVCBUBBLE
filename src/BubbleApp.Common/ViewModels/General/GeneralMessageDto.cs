namespace BubbleApp.Common.ViewModels.General;

public record GeneralMessageDto(
    string    Id,
    string    Workspace,
    string    UserId,
    string    UserEmail,
    string    Content,
    bool      IsEdited,
    DateTime  CreatedAt,
    DateTime? EditedAt,
    string?   ReplyToId,
    string?   ReplyToUserId,
    string?   ReplyToUserEmail,
    string?   ReplyToContent
);
