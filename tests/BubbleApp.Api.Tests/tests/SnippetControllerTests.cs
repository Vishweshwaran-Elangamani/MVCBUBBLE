using BubbleApp.Api.Controllers;
using BubbleApp.Common.ViewModels.Snippet;
using BubbleApp.Core.IService;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Moq;
using NUnit.Framework;

namespace BubbleApp.Tests;

[TestFixture]
public class SnippetControllerTests
{
    private Mock<ISnippetService> _svc = null!;

    [SetUp]
    public void SetUp()
    {
        _svc = new Mock<ISnippetService>();
    }

    private SnippetController Sut(string? cdnUrl = "https://cdn.example.com")
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                { "Widget:CdnUrl", cdnUrl }
            })
            .Build();

        var controller = new SnippetController(_svc.Object, config);

        // ── Provide Scheme + Host so Request.Scheme/Request.Host work ──
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Scheme = "https";
        httpContext.Request.Host   = new HostString("api.example.com");

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = httpContext
        };

        return controller;
    }

    private static SnippetResponse FakeSnippet() =>
        new("my-ws", "<script>/* bubble */</script>");

    [Test]
    public void Get_ReturnsOk_WithValidSlug()
    {
        // ── 3 params now: slug, cdnUri, apiBaseUri ──
        _svc.Setup(s => s.Generate("my-ws", It.IsAny<Uri>(), It.IsAny<Uri>()))
            .Returns(FakeSnippet());

        var result = Sut().Get("my-ws");

        Assert.That(result, Is.TypeOf<OkObjectResult>());
    }

    [Test]
    public void Get_ReturnsCorrectSnippetPayload()
    {
        _svc.Setup(s => s.Generate("my-ws", It.IsAny<Uri>(), It.IsAny<Uri>()))
            .Returns(FakeSnippet());

        var result  = (OkObjectResult)Sut().Get("my-ws");
        var payload = (SnippetResponse)result.Value!;

        Assert.That(payload.Workspace, Is.EqualTo("my-ws"));
        Assert.That(payload.Snippet,   Does.Contain("<script>"));
    }

    [Test]
    public void GetRaw_ReturnsContentResult_WithCorrectContentType()
    {
        _svc.Setup(s => s.Generate("my-ws", It.IsAny<Uri>(), It.IsAny<Uri>()))
            .Returns(FakeSnippet());

        var result = Sut().GetRaw("my-ws");

        Assert.That(result, Is.TypeOf<ContentResult>());
        Assert.That(((ContentResult)result).ContentType,
            Is.EqualTo("text/plain; charset=utf-8"));
    }

    [Test]
    public void GetRaw_SetsContentDispositionHeader()
    {
        _svc.Setup(s => s.Generate("my-ws", It.IsAny<Uri>(), It.IsAny<Uri>()))
            .Returns(FakeSnippet());

        var ctx = Sut();
        ctx.GetRaw("my-ws");

        var header = ctx.HttpContext.Response.Headers["Content-Disposition"].ToString();
        Assert.That(header, Does.Contain("bubble-snippet-my-ws.html"));
    }

    [Test]
    public void Get_PassesCdnUrlToService()
    {
        Uri? capturedCdn = null;

        _svc.Setup(s => s.Generate("my-ws", It.IsAny<Uri>(), It.IsAny<Uri>()))
            .Callback<string, Uri, Uri>((_, cdn, _2) => capturedCdn = cdn)
            .Returns(FakeSnippet());

        Sut("https://cdn.example.com").Get("my-ws");

        Assert.That(capturedCdn?.ToString(), Is.EqualTo("https://cdn.example.com/"));
    }

    [Test]
    public void Get_PassesApiBaseUrlToService()
    {
        Uri? capturedApi = null;

        _svc.Setup(s => s.Generate("my-ws", It.IsAny<Uri>(), It.IsAny<Uri>()))
            .Callback<string, Uri, Uri>((_, _2, api) => capturedApi = api)
            .Returns(FakeSnippet());

        Sut().Get("my-ws");

        // Should be built from Request.Scheme + Request.Host set in Sut()
        Assert.That(capturedApi?.Host, Is.EqualTo("api.example.com"));
    }

    [Test]
    public void Get_Throws_WhenCdnUrlMissing()
    {
        Assert.Throws<InvalidOperationException>(() => Sut(null).Get("my-ws"));
    }

    [Test]
    public void GetRaw_Throws_WhenCdnUrlMissing()
    {
        Assert.Throws<InvalidOperationException>(() => Sut(null).GetRaw("my-ws"));
    }
}
