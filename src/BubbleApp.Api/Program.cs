using System.Text;
using BubbleApp.Api.BackgroundServices;
using BubbleApp.Api.OpenApi;
using BubbleApp.Core.IService;
using BubbleApp.Core.Service;
using BubbleApp.Data.Config;
using BubbleApp.Data.IRepository;
using BubbleApp.Data.Repositories;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Serilog;

// ══════════════════════════════════════════════
// SERILOG — bootstrap logger (before builder)
// ══════════════════════════════════════════════
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .WriteTo.File("logs/bubble-.log", rollingInterval: RollingInterval.Day)
    .CreateBootstrapLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);

    // ── Serilog ──────────────────────────────────
    builder.Host.UseSerilog((ctx, cfg) =>
        cfg.ReadFrom.Configuration(ctx.Configuration)
           .WriteTo.Console()
           .WriteTo.File("logs/bubble-.log", rollingInterval: RollingInterval.Day));

    // ── Controllers & OpenAPI ────────────────────
    builder.Services.AddControllers();
    builder.Services.AddOpenApi(options =>
    {
        options.AddDocumentTransformer<BearerSecurityDocumentTransformer>();
    });

    // ── CORS ─────────────────────────────────────
    var allowedOrigins = builder.Configuration
        .GetSection("AllowedOrigins")
        .Get<string[]>() ?? Array.Empty<string>();

    builder.Services.AddCors(opt =>
    {
        opt.AddPolicy("Widget", p =>
            p.WithOrigins(allowedOrigins)
             .AllowAnyHeader()
             .AllowAnyMethod());
    });

    // ── Data layer (MongoDB base setup) ──────────
    builder.Services.AddDataLayer(builder.Configuration);

    // ══════════════════════════════════════════════
    // REPOSITORIES
    // ══════════════════════════════════════════════

    // General
    builder.Services.AddSingleton<IGeneralRepository,  GeneralRepository>();

    // Reminders
    builder.Services.AddSingleton<IReminderRepository, ReminderRepository>();

    // ══════════════════════════════════════════════
    // CORE SERVICES
    // ══════════════════════════════════════════════

    // Auth
    builder.Services.AddSingleton<IAuthService,         AuthService>();

    // Workspace
    builder.Services.AddSingleton<IWorkspaceService,    WorkspaceService>();

    // Snippet
    builder.Services.AddSingleton<ISnippetService,      SnippetService>();

    // Notes
    builder.Services.AddSingleton<INotesService,        NotesService>();

    // To-Do
    builder.Services.AddSingleton<ITodoService,         TodoService>();

    // General chat
    builder.Services.AddSingleton<IGeneralService,      GeneralService>();

    // Reminders
    builder.Services.AddSingleton<IReminderService,     ReminderService>();

    // Workspace key validation filter
    builder.Services.AddScoped<IWorkspaceAuthService,   WorkspaceAuthService>();

    // ── Background Services ───────────────────────
    // Purges workspaces that have been soft-deleted for more than 24 hours
    builder.Services.AddHostedService<WorkspaceCleanupService>();

    // ── JWT Authentication ────────────────────────
    var jwtKey      = builder.Configuration["Jwt:Key"]
                      ?? throw new InvalidOperationException("Jwt:Key is missing from configuration.");
    var jwtIssuer   = builder.Configuration["Jwt:Issuer"];
    var jwtAudience = builder.Configuration["Jwt:Audience"];
    var signingKey  = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));

    builder.Services.AddAuthentication(o =>
    {
        o.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        o.DefaultChallengeScheme    = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(o =>
    {
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer           = true,
            ValidateAudience         = true,
            ValidateLifetime         = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer              = jwtIssuer,
            ValidAudience            = jwtAudience,
            IssuerSigningKey         = signingKey,
            ClockSkew                = TimeSpan.FromMinutes(2)
        };
    });

    builder.Services.AddAuthorization();

    // ══════════════════════════════════════════════
    // BUILD
    // ══════════════════════════════════════════════
    var app = builder.Build();

    // ── Middleware pipeline ───────────────────────
    app.UseSerilogRequestLogging();

    app.UseCors("Widget");

    app.UseAuthentication();
    app.UseAuthorization();

    // ── Swagger / OpenAPI (dev only) ──────────────
    if (app.Environment.IsDevelopment())
    {
        app.MapOpenApi();
        app.UseSwaggerUI(c =>
        {
            c.SwaggerEndpoint("/openapi/v1.json", "Bubble API v1");
            c.DocumentTitle = "Bubble API Docs";
            c.RoutePrefix   = "swagger";
        });
    }

    app.MapControllers();

    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application failed to start.");
}
finally
{
    Log.CloseAndFlush();
}
