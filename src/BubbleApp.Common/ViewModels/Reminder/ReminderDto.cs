namespace BubbleApp.Common.ViewModels.Reminder;

public record ReminderDto(
    string   Id,
    string   Workspace,
    string   UserId,
    string   Content,
    DateTime RemindAt,
    bool     Acknowledged,
    DateTime CreatedAt
);
