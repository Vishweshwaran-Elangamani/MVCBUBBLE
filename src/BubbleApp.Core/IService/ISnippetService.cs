using BubbleApp.Common.ViewModels.Snippet;

namespace BubbleApp.Core.IService
{
    public interface ISnippetService
    {
        // Added apiBaseUrl so the snippet knows where to call /api/widget/config/long
        SnippetResponse Generate(string workspaceSlug, Uri widgetCdnUrl, Uri apiBaseUrl);
    }
}
