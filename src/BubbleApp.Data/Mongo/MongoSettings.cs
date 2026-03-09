namespace BubbleApp.Data.Mongo;

public class MongoSettings
{
    public string ConnectionString     { get; set; } = default!;
    public string Database             { get; set; } = default!;
    public string AdminsCollection     { get; set; } = "admins";
    public string WorkspacesCollection { get; set; } = "workspaces";
    public string NotesCollection      { get; set; } = "notes";
    public string TodosCollection      { get; set; } = "todos";       // NEW
    public string GeneralCollection    { get; set; } = "general";     // NEW
    public string RemindersCollection  { get; set; } = "reminders";   // NEW
}
