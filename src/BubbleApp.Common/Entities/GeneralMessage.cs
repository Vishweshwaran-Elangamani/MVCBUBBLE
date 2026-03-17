namespace BubbleApp.Common.Entities;

public class GeneralMessage
{
    public string   Id            { get; set; } = default!;
    public string   Workspace     { get; set; } = default!;
    public string   UserId        { get; set; } = default!;
    public string   UserEmail     { get; set; } = string.Empty;
    public string   Content       { get; set; } = default!;
    public bool     IsEdited      { get; set; } = false;
    public DateTime CreatedAt     { get; set; } = DateTime.UtcNow;
    public DateTime? EditedAt     { get; set; } = null;

    // Reply support
    public string?  ReplyToId        { get; set; } = null;
    public string?  ReplyToUserId    { get; set; } = null;
    public string?  ReplyToUserEmail { get; set; } = null;
    public string?  ReplyToContent   { get; set; } = null; // snapshot of replied message
}
