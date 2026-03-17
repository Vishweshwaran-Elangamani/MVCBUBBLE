namespace BubbleApp.Common.ViewModels.Reminder;

public record CreateReminderRequest(
    string   Workspace,
    string   UserId,
    string   Content,
    DateTime RemindAt
);
