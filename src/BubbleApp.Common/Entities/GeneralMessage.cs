namespace BubbleApp.Common.Entities;

public class GeneralMessage
{
    public string   Id        { get; set; } = default!;
    public string   Workspace { get; set; } = default!;
    public string   UserId    { get; set; } = default!;
    public string   UserEmail { get; set; } = "";
    public string   Content   { get; set; } = default!;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
