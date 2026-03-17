using System;
using System.Threading;
using System.Threading.Tasks;
using BubbleApp.Common.Entities;
using BubbleApp.Data.Mongo;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;

namespace BubbleApp.Api.BackgroundServices
{
    /// <summary>
    /// Runs every hour. Permanently deletes workspaces (and all their data)
    /// that were soft-deleted more than 24 hours ago.
    /// </summary>
    public sealed class WorkspaceCleanupService : BackgroundService
    {
        private readonly IServiceProvider _services;
        private readonly ILogger<WorkspaceCleanupService> _logger;

        public WorkspaceCleanupService(
            IServiceProvider services,
            ILogger<WorkspaceCleanupService> logger)
        {
            _services = services;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await PurgeExpiredAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "WorkspaceCleanupService encountered an error.");
                }

                // Wait 1 hour before next check
                await Task.Delay(TimeSpan.FromHours(1), stoppingToken);
            }
        }

        private async Task PurgeExpiredAsync(CancellationToken ct)
        {
            using var scope = _services.CreateScope();
            var ctx = scope.ServiceProvider.GetRequiredService<MongoContext>();
            var cutoff = DateTime.UtcNow.AddDays(-1); // 24-hour grace window

            // Find all workspaces past their grace period
            var expired = await ctx.Workspaces
                .Find(w => w.IsDeleted && w.DeletedAt < cutoff)
                .ToListAsync(ct);

            if (expired.Count == 0) return;

            _logger.LogInformation(
                "WorkspaceCleanupService: found {Count} expired workspace(s) to purge.",
                expired.Count);

            foreach (var ws in expired)
            {
                _logger.LogInformation(
                    "Purging workspace '{Slug}' (deleted at {DeletedAt})…",
                    ws.Slug, ws.DeletedAt);

                // Delete all user data first (in parallel)
                await Task.WhenAll(
                    ctx.Notes.DeleteManyAsync(
                        Builders<Note>.Filter.Eq(n => n.Workspace, ws.Slug), ct),
                    ctx.Todos.DeleteManyAsync(
                        Builders<Todo>.Filter.Eq(t => t.Workspace, ws.Slug), ct),
                    ctx.Reminders.DeleteManyAsync(
                        Builders<Reminder>.Filter.Eq(r => r.Workspace, ws.Slug), ct),
                    ctx.GeneralMessages.DeleteManyAsync(
                        Builders<GeneralMessage>.Filter.Eq(g => g.Workspace, ws.Slug), ct)
                );

                // Then permanently delete the workspace itself
                await ctx.Workspaces.DeleteOneAsync(
                    Builders<Workspace>.Filter.Eq(w => w.Id, ws.Id), ct);

                _logger.LogInformation(
                    "Workspace '{Slug}' permanently purged.", ws.Slug);
            }
        }
    }
}
// }
// using System;
// using System.Threading;
// using System.Threading.Tasks;
// using BubbleApp.Common.Entities;
// using BubbleApp.Data.Mongo;
// using Microsoft.Extensions.DependencyInjection;
// using Microsoft.Extensions.Hosting;
// using Microsoft.Extensions.Logging;
// using MongoDB.Driver;

// namespace BubbleApp.Api.BackgroundServices
// {
//     /// <summary>
//     /// Permanently deletes workspaces (and all their data)
//     /// that were soft-deleted past the grace window.
//     /// </summary>
//     public sealed class WorkspaceCleanupService : BackgroundService
//     {
//         private readonly IServiceProvider                  _services;
//         private readonly ILogger<WorkspaceCleanupService> _logger;

//         // ── 🔧 TESTING VALUES — revert before production ──────────
//         private static readonly TimeSpan GraceWindow  = TimeSpan.FromSeconds(10); // was: TimeSpan.FromHours(24)
//         private static readonly TimeSpan PollInterval = TimeSpan.FromSeconds(5);  // was: TimeSpan.FromHours(1)
//         // ──────────────────────────────────────────────────────────

//         public WorkspaceCleanupService(
//             IServiceProvider services,
//             ILogger<WorkspaceCleanupService> logger)
//         {
//             _services = services;
//             _logger   = logger;
//         }

//         protected override async Task ExecuteAsync(CancellationToken stoppingToken)
//         {
//             while (!stoppingToken.IsCancellationRequested)
//             {
//                 try
//                 {
//                     await PurgeExpiredAsync(stoppingToken);
//                 }
//                 catch (Exception ex)
//                 {
//                     _logger.LogError(ex, "WorkspaceCleanupService encountered an error.");
//                 }

//                 await Task.Delay(PollInterval, stoppingToken);
//             }
//         }

//         private async Task PurgeExpiredAsync(CancellationToken ct)
//         {
//             using var scope = _services.CreateScope();
//             var ctx         = scope.ServiceProvider.GetRequiredService<MongoContext>();
//             var cutoff      = DateTime.UtcNow - GraceWindow;

//             var expired = await ctx.Workspaces
//                 .Find(w => w.IsDeleted && w.DeletedAt < cutoff)
//                 .ToListAsync(ct);

//             if (expired.Count == 0) return;

//             _logger.LogInformation(
//                 "WorkspaceCleanupService: found {Count} expired workspace(s) to purge.",
//                 expired.Count);

//             foreach (var ws in expired)
//             {
//                 _logger.LogInformation(
//                     "Purging workspace '{Slug}' (deleted at {DeletedAt})…",
//                     ws.Slug, ws.DeletedAt);

//                 // Delete all user data first (in parallel)
//                 await Task.WhenAll(
//                     ctx.Notes.DeleteManyAsync(
//                         Builders<Note>.Filter.Eq(n => n.Workspace, ws.Slug), ct),
//                     ctx.Todos.DeleteManyAsync(
//                         Builders<Todo>.Filter.Eq(t => t.Workspace, ws.Slug), ct),
//                     ctx.Reminders.DeleteManyAsync(
//                         Builders<Reminder>.Filter.Eq(r => r.Workspace, ws.Slug), ct),
//                     ctx.GeneralMessages.DeleteManyAsync(
//                         Builders<GeneralMessage>.Filter.Eq(g => g.Workspace, ws.Slug), ct)
//                 );

//                 // Then permanently delete the workspace itself
//                 await ctx.Workspaces.DeleteOneAsync(
//                     Builders<Workspace>.Filter.Eq(w => w.Id, ws.Id), ct);

//                 _logger.LogInformation(
//                     "Workspace '{Slug}' permanently purged.", ws.Slug);
//             }
//         }
//     }
// }
