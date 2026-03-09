using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using BubbleApp.Core.IService;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace BubbleApp.Api.Security;

public sealed class ValidateWorkspaceKeyAttribute : TypeFilterAttribute
{
    public ValidateWorkspaceKeyAttribute() : base(typeof(Filter)) { }

    private sealed class Filter : IAsyncActionFilter
    {
        private readonly IWorkspaceAuthService _auth;
        public Filter(IWorkspaceAuthService auth) => _auth = auth;

        public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
        {
            var http = context.HttpContext;
            var req  = http.Request;
            string? slug = null;
            string? key  = null;

            // 0. X-Workspace-Key header — preferred, never logged by browser
            key = req.Headers["X-Workspace-Key"].FirstOrDefault();

            // 1. Bound DTO arguments
            if (context.ActionArguments.Count > 0)
            {
                foreach (var arg in context.ActionArguments.Values)
                {
                    if (arg is null) continue;
                    var t          = arg.GetType();
                    var pWorkspace = t.GetProperty("workspace") ?? t.GetProperty("Workspace");
                    var pKey       = t.GetProperty("key")       ?? t.GetProperty("Key");
                    if (pWorkspace != null && slug is null) slug = pWorkspace.GetValue(arg)?.ToString();
                    if (pKey       != null && key  is null) key  = pKey.GetValue(arg)?.ToString();
                }
            }

            // 2. Query string fallback
            if (string.IsNullOrWhiteSpace(slug)) slug = req.Query["workspace"];
            if (string.IsNullOrWhiteSpace(key))  key  = req.Query["key"];

            // 3. JSON body fallback
            if (string.IsNullOrWhiteSpace(key) &&
                !string.IsNullOrWhiteSpace(req.ContentType) &&
                req.ContentType.Contains("application/json"))
            {
                req.EnableBuffering();
                using var reader = new StreamReader(
                    req.Body, Encoding.UTF8,
                    detectEncodingFromByteOrderMarks: false,
                    leaveOpen: true);
                var body = await reader.ReadToEndAsync();
                req.Body.Position = 0;
                if (!string.IsNullOrWhiteSpace(body))
                {
                    try
                    {
                        using var doc = JsonDocument.Parse(body);
                        var root      = doc.RootElement;
                        if (string.IsNullOrWhiteSpace(slug) &&
                            root.TryGetProperty("workspace", out var wProp))
                            slug = wProp.GetString();
                        if (string.IsNullOrWhiteSpace(key) &&
                            root.TryGetProperty("key", out var kProp))
                            key = kProp.GetString();
                    }
                    catch { /* ignore parse errors */ }
                }
            }

            try
            {
                var workspaceId = await _auth.ResolveWorkspaceIdOrThrowAsync(slug, key);
                http.Items["WorkspaceId"] = workspaceId;
                await next();
            }
            catch (UnauthorizedAccessException ex)
            {
                context.Result = new ObjectResult(new { error = ex.Message })
                    { StatusCode = StatusCodes.Status401Unauthorized };
            }
        }
    }
}
