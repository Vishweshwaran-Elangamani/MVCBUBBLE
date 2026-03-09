namespace BubbleApp.Common.ViewModels.General;

public record GeneralMessageDto(
    string   Id,
    string   Workspace,
    string   UserId,
    string   UserEmail,
    string   Content,
    DateTime CreatedAt
);
