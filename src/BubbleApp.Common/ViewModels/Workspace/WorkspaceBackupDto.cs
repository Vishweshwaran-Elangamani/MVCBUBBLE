using System;
using System.Collections.Generic;

using NoteEntity           = BubbleApp.Common.Entities.Note;
using TodoEntity           = BubbleApp.Common.Entities.Todo;
using ReminderEntity       = BubbleApp.Common.Entities.Reminder;
using GeneralMessageEntity = BubbleApp.Common.Entities.GeneralMessage;

namespace BubbleApp.Common.ViewModels.Workspace
{
    public sealed class WorkspaceBackupDto
    {
        public string                    WorkspaceName { get; set; } = "";
        public string                    Slug          { get; set; } = "";
        public DateTime                  ExportedAt    { get; set; }
        public List<NoteEntity>          Notes         { get; set; } = new();
        public List<TodoEntity>          Todos         { get; set; } = new();
        public List<ReminderEntity>      Reminders     { get; set; } = new();
        public List<GeneralMessageEntity> General      { get; set; } = new();
    }
}
