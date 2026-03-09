namespace BubbleApp.Common.ViewModels.Reminder;

public record CreateReminderRequest(
    string   Workspace,
    string   Key,
    string   UserId,
    string   Content,
    DateTime RemindAt
);
