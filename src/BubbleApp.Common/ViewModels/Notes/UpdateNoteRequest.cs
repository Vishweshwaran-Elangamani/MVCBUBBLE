namespace BubbleApp.Common.ViewModels.Notes;

public record UpdateNoteRequest(
    string Workspace,
    string Key,
    string UserId,
    string Content
);
