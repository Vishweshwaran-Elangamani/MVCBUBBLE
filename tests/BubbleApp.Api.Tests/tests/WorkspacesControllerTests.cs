using System.Security.Claims;
using BubbleApp.Api.Controllers;
using BubbleApp.Common.Entities;
using BubbleApp.Common.ViewModels.Workspace;
using BubbleApp.Core.IService;
using BubbleApp.Data.IRepository;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using NUnit.Framework;

namespace BubbleApp.Tests;

[TestFixture]
public class WorkspacesControllerTests
{
    private Mock<IWorkspaceService>    _svc  = null!;
    private Mock<IWorkspaceRepository> _repo = null!;
    private WorkspacesController       _sut  = null!;

    [SetUp]
    public void SetUp()
    {
        _svc  = new Mock<IWorkspaceService>();
        _repo = new Mock<IWorkspaceRepository>();
        _sut  = new WorkspacesController(_svc.Object, _repo.Object);
        _sut.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, "admin1")
                }, "mock"))
            }
        };
    }

    private static WorkspaceDto FakeWs() =>
        new("id1", "Test WS", "test-ws", DateTime.UtcNow);

    private static WorkspaceAppearanceDto FakeAppearance() =>
        new("#5b8def", "●");

    // ── CREATE ────────────────────────────────────────────
    [Test]
    public async Task Create_ReturnsOk_WhenSuccessful()
    {
        var req = new WorkspaceCreateRequest("Test WS");
        _svc.Setup(s => s.CreateAsync("admin1", req, default))
            .ReturnsAsync(FakeWs());

        var result = await _sut.Create(req, default);

        Assert.That(result, Is.TypeOf<OkObjectResult>());
    }

    [Test]
    public async Task Create_ReturnsConflict_WhenAlreadyExists()
    {
        var req = new WorkspaceCreateRequest("Test WS");
        _svc.Setup(s => s.CreateAsync("admin1", req, default))
            .ThrowsAsync(new InvalidOperationException("Workspace already exists"));

        var result = await _sut.Create(req, default);

        Assert.That(result, Is.TypeOf<ConflictObjectResult>());
    }

    // ── LIST ──────────────────────────────────────────────
    [Test]
    public async Task List_ReturnsOk_WithWorkspaces()
    {
        _svc.Setup(s => s.ListAsync("admin1", default))
            .ReturnsAsync(new List<WorkspaceDto> { FakeWs() });

        var result = await _sut.List(default);

        Assert.That(result, Is.TypeOf<OkObjectResult>());
    }

    // ── GET BY SLUG ───────────────────────────────────────
    [Test]
    public async Task GetBySlug_ReturnsOk_WhenFound()
    {
        _svc.Setup(s => s.GetBySlugAsync("test-ws", default))
            .ReturnsAsync(FakeWs());

        var result = await _sut.GetBySlug("test-ws", default);

        Assert.That(result, Is.TypeOf<OkObjectResult>());
    }

    [Test]
    public async Task GetBySlug_ReturnsNotFound_WhenMissing()
    {
        _svc.Setup(s => s.GetBySlugAsync("missing", default))
            .ReturnsAsync((WorkspaceDto?)null);

        var result = await _sut.GetBySlug("missing", default);

        Assert.That(result, Is.TypeOf<NotFoundResult>());
    }

    // ── DELETE ────────────────────────────────────────────
    [Test]
    public async Task Delete_ReturnsNoContent_WhenDeleted()
    {
        _svc.Setup(s => s.DeleteAsync("id1", "admin1", default))
            .Returns(Task.CompletedTask);

        var result = await _sut.Delete("id1", default);

        Assert.That(result, Is.TypeOf<NoContentResult>());
    }

    // ── APPEARANCE ────────────────────────────────────────
    [Test]
    public async Task GetAppearance_ReturnsOk()
    {
        _svc.Setup(s => s.GetAppearanceAsync("id1", default))
            .ReturnsAsync(FakeAppearance());

        var result = await _sut.GetAppearance("id1", default);

        Assert.That(result, Is.TypeOf<OkObjectResult>());
    }

    [Test]
    public async Task UpdateAppearance_ReturnsNoContent_WhenSuccessful()
    {
        var req = new UpdateAppearanceRequest("#fff", "●");
        _svc.Setup(s => s.UpdateAppearanceAsync("id1", req, default))
            .Returns(Task.CompletedTask);
        _repo.Setup(r => r.GetByIdAsync("id1", default))
            .ReturnsAsync((Workspace?)null);

        var result = await _sut.UpdateAppearance("id1", req, default);

        Assert.That(result, Is.TypeOf<NoContentResult>());
    }
}
