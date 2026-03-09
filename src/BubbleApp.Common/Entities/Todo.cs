namespace BubbleApp.Common.Entities;

public class Todo
{
    public string   Id         { get; set; } = default!;
    public string   Workspace  { get; set; } = default!;
    public string   UserId     { get; set; } = default!;
    public string   Content    { get; set; } = default!;
    public string   Priority   { get; set; } = "medium"; // high | medium | low
    public bool     Done       { get; set; } = false;
    public DateTime CreatedAt  { get; set; } = DateTime.UtcNow;
}
