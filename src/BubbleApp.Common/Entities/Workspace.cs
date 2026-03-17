using System;

namespace BubbleApp.Common.Entities
{
    public class Workspace
    {
        public string Id             { get; set; } = default!;
        public string Name           { get; set; } = default!;
        public string Slug           { get; set; } = default!;
        public string AdminId        { get; set; } = default!;
        public DateTime CreatedAt    { get; set; } = DateTime.UtcNow;

        // Key-based partition
        public string WorkspaceKey     { get; set; } = default!;
        public string WorkspaceKeyHash { get; set; } = default!;

        // Appearance
        public string BubbleColor { get; set; } = "5b8def";
        public string BubbleText  { get; set; } = "";

        // Soft-delete
        public bool      IsDeleted { get; set; } = false;
        public DateTime? DeletedAt { get; set; } = null;
    }
}
