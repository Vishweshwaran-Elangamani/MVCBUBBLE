namespace BubbleApp.Common.Entities;

public class Reminder
{
    public string   Id           { get; set; } = default!;
    public string   Workspace    { get; set; } = default!;
    public string   UserId       { get; set; } = default!;
    public string   Content      { get; set; } = default!;
    public DateTime RemindAt     { get; set; }
    public bool     Acknowledged { get; set; } = false;
    public DateTime CreatedAt    { get; set; } = DateTime.UtcNow;
}
