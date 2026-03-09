using BubbleApp.Data.IRepository;
using BubbleApp.Data.Mongo;
using BubbleApp.Data.Repository;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace BubbleApp.Data.Config;

public static class DataLayerExtensions
{
    public static IServiceCollection AddDataLayer(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // Mongo settings + context
        services.Configure<MongoSettings>(configuration.GetSection("Mongo"));
        services.AddSingleton<MongoContext>();

        // ── Existing repositories ──────────────────
        services.AddSingleton<IAdminRepository,     AdminRepository>();
        services.AddSingleton<IWorkspaceRepository, WorkspaceRepository>();
        services.AddSingleton<INoteRepository,      NoteRepository>();

        // ── New repositories ───────────────────────
        services.AddSingleton<ITodoRepository,      TodoRepository>();
        services.AddSingleton<IGeneralRepository,   GeneralRepository>();
        services.AddSingleton<IReminderRepository,  ReminderRepository>();

        return services;
    }
}
