using System;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using System.Collections.Generic;
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
                WorkspaceKeyHash = keyHash
            };

            ws = await _repo.CreateAsync(ws, ct);
            return new WorkspaceDto(ws.Id, ws.Name, ws.Slug, ws.CreatedAt);
        }

        public async Task<IReadOnlyList<WorkspaceDto>> ListAsync(
            string adminId,
            CancellationToken ct = default)
        {
            var list = await _repo.ListByAdminAsync(adminId, ct);
            return list
                .Select(w => new WorkspaceDto(w.Id, w.Name, w.Slug, w.CreatedAt))
                .ToList();
        }

        public async Task<WorkspaceDto?> GetBySlugAsync(
            string slug,
            CancellationToken ct = default)
        {
            var ws = await _repo.GetBySlugAsync(slug, ct);
            return ws is null ? null : new WorkspaceDto(ws.Id, ws.Name, ws.Slug, ws.CreatedAt);
        }

        public async Task<WorkspaceDto> RotateKeyAsync(
            string workspaceId,
            CancellationToken ct = default)
        {
            var newPlainKey = WorkspaceKeyUtil.NewKey();
            var newKeyHash  = WorkspaceKeyUtil.Sha256Base64Url(newPlainKey);

            await _repo.RotateKeyAsync(workspaceId, newPlainKey, newKeyHash, ct);

            var updated = await _repo.GetByIdAsync(workspaceId, ct)
                ?? throw new InvalidOperationException("Workspace not found after rotation.");

            return new WorkspaceDto(updated.Id, updated.Name, updated.Slug, updated.CreatedAt);
        }

        public async Task<string> GetKeyPreviewAsync(
            string workspaceId,
            CancellationToken ct = default)
        {
            var ws = await _repo.GetByIdAsync(workspaceId, ct)
                ?? throw new InvalidOperationException("Workspace not found.");

            return MaskKey(ws.WorkspaceKey);
        }

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

        public async Task UpdateAppearanceAsync(
            string workspaceId,
            UpdateAppearanceRequest req,
            CancellationToken ct = default)
        {
            var color = string.IsNullOrWhiteSpace(req.Color) ? "#5b8def" : req.Color.Trim();
            var text  = string.IsNullOrWhiteSpace(req.Text)  ? ""        : req.Text.Trim();

            await _repo.UpdateAppearanceAsync(workspaceId, color, text, ct);
        }

        // ── ✅ FIX: Cascade delete all workspace data before deleting workspace ──
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

            // Delete all data scoped to this workspace slug in parallel
            await Task.WhenAll(
                _ctx.Notes.DeleteManyAsync(
                    Builders<Note>.Filter.Eq(n => n.Workspace, ws.Slug), ct),
                _ctx.Todos.DeleteManyAsync(
                    Builders<Todo>.Filter.Eq(t => t.Workspace, ws.Slug), ct),
                _ctx.Reminders.DeleteManyAsync(
                    Builders<Reminder>.Filter.Eq(r => r.Workspace, ws.Slug), ct),
                _ctx.GeneralMessages.DeleteManyAsync(
                    Builders<GeneralMessage>.Filter.Eq(g => g.Workspace, ws.Slug), ct)
            );

            // Now delete the workspace itself
            await _repo.DeleteAsync(workspaceId, ct);
        }

        // ── Helpers ─────────────────────────────────────────────────────────────

        private static string Slugify(string s)
        {
            s = s.ToLowerInvariant().Trim();
            s = Regex.Replace(s, @"[^a-z0-9\-]", "-");
            s = Regex.Replace(s, @"-{2,}", "-").Trim('-');
            return string.IsNullOrWhiteSpace(s) ? "ws-" + Guid.NewGuid().ToString("N") : s;
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
