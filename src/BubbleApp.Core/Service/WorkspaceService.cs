using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using BubbleApp.Common.Entities;
using BubbleApp.Common.ViewModels.Workspace;
using BubbleApp.Core.IService;
using BubbleApp.Core.Security;
using BubbleApp.Data.IRepository;
using BubbleApp.Data.Mongo;
using MongoDB.Driver;

namespace BubbleApp.Core.Service
{
    public class WorkspaceService : IWorkspaceService
    {
        private readonly IWorkspaceRepository _repo;
        private readonly MongoContext         _ctx;

        public WorkspaceService(IWorkspaceRepository repo, MongoContext ctx)
        {
            _repo = repo;
            _ctx  = ctx;
        }

        /* ══════════════════════════════════════════════════════
           CREATE
        ══════════════════════════════════════════════════════ */
        public async Task<WorkspaceDto> CreateAsync(
            string adminId,
            WorkspaceCreateRequest req,
            CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(req.Name))
                throw new ArgumentException("Workspace name is required.");

            var slug = Slugify(req.Name);

            var existing = await _repo.GetBySlugAsync(slug, ct);
            if (existing != null)
                throw new InvalidOperationException(
                    $"A workspace named \"{req.Name}\" already exists.");

            var plainKey = WorkspaceKeyUtil.NewKey();
            var keyHash  = WorkspaceKeyUtil.Sha256Base64Url(plainKey);

            var ws = new Workspace
            {
                Id               = Guid.NewGuid().ToString(),
                Name             = req.Name.Trim(),
                Slug             = slug,
                AdminId          = adminId,
                CreatedAt        = DateTime.UtcNow,
                WorkspaceKey     = plainKey,
                WorkspaceKeyHash = keyHash,
                IsDeleted        = false,
                DeletedAt        = null
            };

            ws = await _repo.CreateAsync(ws, ct);
            return ToDto(ws);
        }

        /* ══════════════════════════════════════════════════════
           LIST
        ══════════════════════════════════════════════════════ */
        public async Task<IReadOnlyList<WorkspaceDto>> ListAsync(
            string adminId,
            CancellationToken ct = default)
        {
            var list = await _repo.ListByAdminAsync(adminId, ct);
            return list.Select(ToDto).ToList();
        }

        /* ══════════════════════════════════════════════════════
           GET BY SLUG
        ══════════════════════════════════════════════════════ */
        public async Task<WorkspaceDto?> GetBySlugAsync(
            string slug,
            CancellationToken ct = default)
        {
            var ws = await _repo.GetBySlugAsync(slug, ct);
            return ws is null ? null : ToDto(ws);
        }

        /* ══════════════════════════════════════════════════════
           ROTATE KEY
        ══════════════════════════════════════════════════════ */
        public async Task<WorkspaceDto> RotateKeyAsync(
            string workspaceId,
            CancellationToken ct = default)
        {
            var newPlainKey = WorkspaceKeyUtil.NewKey();
            var newKeyHash  = WorkspaceKeyUtil.Sha256Base64Url(newPlainKey);

            await _repo.RotateKeyAsync(workspaceId, newPlainKey, newKeyHash, ct);

            var updated = await _repo.GetByIdAsync(workspaceId, ct)
                ?? throw new InvalidOperationException("Workspace not found after rotation.");

            return ToDto(updated);
        }

        /* ══════════════════════════════════════════════════════
           GET KEY PREVIEW
        ══════════════════════════════════════════════════════ */
        public async Task<string> GetKeyPreviewAsync(
            string workspaceId,
            CancellationToken ct = default)
        {
            var ws = await _repo.GetByIdAsync(workspaceId, ct)
                ?? throw new InvalidOperationException("Workspace not found.");

            return MaskKey(ws.WorkspaceKey);
        }

        /* ══════════════════════════════════════════════════════
           APPEARANCE — GET
        ══════════════════════════════════════════════════════ */
        public async Task<WorkspaceAppearanceDto> GetAppearanceAsync(
            string workspaceId,
            CancellationToken ct = default)
        {
            var ws = await _repo.GetByIdAsync(workspaceId, ct)
                ?? throw new InvalidOperationException("Workspace not found.");

            var color = string.IsNullOrWhiteSpace(ws.BubbleColor) ? "#5b8def" : ws.BubbleColor;
            var text  = string.IsNullOrWhiteSpace(ws.BubbleText)  ? ""        : ws.BubbleText;

            return new WorkspaceAppearanceDto(color, text);
        }

        /* ══════════════════════════════════════════════════════
           APPEARANCE — UPDATE
        ══════════════════════════════════════════════════════ */
        public async Task UpdateAppearanceAsync(
            string workspaceId,
            UpdateAppearanceRequest req,
            CancellationToken ct = default)
        {
            var color = string.IsNullOrWhiteSpace(req.Color) ? "#5b8def" : req.Color.Trim();
            var text  = string.IsNullOrWhiteSpace(req.Text)  ? ""        : req.Text.Trim();

            await _repo.UpdateAppearanceAsync(workspaceId, color, text, ct);
        }

        /* ══════════════════════════════════════════════════════
           HARD DELETE — immediate cascade wipe
        ══════════════════════════════════════════════════════ */
        public async Task DeleteAsync(
            string workspaceId,
            string adminId,
            CancellationToken ct = default)
        {
            var ws = await _repo.GetByIdAsync(workspaceId, ct);

            if (ws is null)
                throw new InvalidOperationException("Workspace not found.");

            if (ws.AdminId != adminId)
                throw new UnauthorizedAccessException("Not allowed.");

            await PurgeWorkspaceDataAsync(ws.Slug, ct);
            await _repo.DeleteAsync(workspaceId, ct);
        }

        /* ══════════════════════════════════════════════════════
           SOFT DELETE — 24-hour grace period
        ══════════════════════════════════════════════════════ */
        public async Task SoftDeleteAsync(
            string id,
            string adminId,
            CancellationToken ct = default)
        {
            var ws = await _repo.GetByIdAsync(id, ct);

            if (ws is null || ws.AdminId != adminId)
                throw new InvalidOperationException("Workspace not found.");

            await _repo.SoftDeleteAsync(id, ct);
        }

        /* ══════════════════════════════════════════════════════
           RESTORE — cancel a pending soft-deletion
        ══════════════════════════════════════════════════════ */
        public async Task RestoreAsync(
            string id,
            string adminId,
            CancellationToken ct = default)
        {
            var ws = await _repo.GetByIdAsync(id, ct);

            if (ws is null || ws.AdminId != adminId)
                throw new InvalidOperationException("Workspace not found.");

            await _repo.RestoreAsync(id, ct);
        }

        /* ══════════════════════════════════════════════════════
           BACKUP — export all workspace data
        ══════════════════════════════════════════════════════ */
        public async Task<WorkspaceBackupDto?> GetBackupAsync(
            string id,
            string adminId,
            CancellationToken ct = default)
        {
            var ws = await _repo.GetByIdAsync(id, ct);

            if (ws is null || ws.AdminId != adminId)
                return null;

            var notesTask = _ctx.Notes
                .Find(n => n.Workspace == ws.Slug)
                .SortBy(n => n.CreatedAt)
                .ToListAsync(ct);

            var todosTask = _ctx.Todos
                .Find(t => t.Workspace == ws.Slug)
                .SortBy(t => t.CreatedAt)
                .ToListAsync(ct);

            var remTask = _ctx.Reminders
                .Find(r => r.Workspace == ws.Slug)
                .SortBy(r => r.RemindAt)
                .ToListAsync(ct);

            var genTask = _ctx.GeneralMessages
                .Find(g => g.Workspace == ws.Slug)
                .SortBy(g => g.CreatedAt)
                .ToListAsync(ct);

            await Task.WhenAll(notesTask, todosTask, remTask, genTask);

            return new WorkspaceBackupDto
            {
                WorkspaceName = ws.Name,
                Slug          = ws.Slug,
                ExportedAt    = DateTime.UtcNow,
                Notes         = notesTask.Result,
                Todos         = todosTask.Result,
                Reminders     = remTask.Result,
                General       = genTask.Result,
            };
        }

        /* ══════════════════════════════════════════════════════
           PRIVATE HELPERS
        ══════════════════════════════════════════════════════ */

        /// <summary>
        /// Purges all user data tied to a workspace slug.
        /// Called by DeleteAsync (immediate) and WorkspaceCleanupService (after 24h grace).
        /// </summary>
        private async Task PurgeWorkspaceDataAsync(string slug, CancellationToken ct)
        {
            await Task.WhenAll(
                _ctx.Notes.DeleteManyAsync(
                    Builders<Note>.Filter.Eq(n => n.Workspace, slug), ct),
                _ctx.Todos.DeleteManyAsync(
                    Builders<Todo>.Filter.Eq(t => t.Workspace, slug), ct),
                _ctx.Reminders.DeleteManyAsync(
                    Builders<Reminder>.Filter.Eq(r => r.Workspace, slug), ct),
                _ctx.GeneralMessages.DeleteManyAsync(
                    Builders<GeneralMessage>.Filter.Eq(g => g.Workspace, slug), ct)
            );
        }

        /// <summary>Maps a Workspace entity to its DTO, including soft-delete fields.</summary>
        private static WorkspaceDto ToDto(Workspace ws) =>
            new WorkspaceDto(
                ws.Id,
                ws.Name,
                ws.Slug,
                ws.CreatedAt,
                ws.IsDeleted,
                ws.DeletedAt
            );

        private static string Slugify(string s)
        {
            s = s.ToLowerInvariant().Trim();
            s = Regex.Replace(s, @"[^a-z0-9\-]", "-");
            s = Regex.Replace(s, @"-{2,}", "-").Trim('-');
            return string.IsNullOrWhiteSpace(s)
                ? "ws-" + Guid.NewGuid().ToString("N")
                : s;
        }

        private static string MaskKey(string key)
        {
            if (string.IsNullOrEmpty(key)) return "---";
            var visible = Math.Min(6, key.Length);
            var tail    = key.Substring(key.Length - visible, visible);
            return $"••••••{tail}";
        }
    }
}
