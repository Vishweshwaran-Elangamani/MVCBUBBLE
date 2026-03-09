using BubbleApp.Api.Controllers;
using BubbleApp.Common.ViewModels.Notes;
using BubbleApp.Core.IService;
using Microsoft.AspNetCore.Mvc;
using Moq;
using NUnit.Framework;

namespace BubbleApp.Tests;

[TestFixture]
public class NotesControllerTests
{
    private Mock<INotesService> _svc = null!;
    private NotesController     _sut = null!;

    [SetUp]
    public void SetUp()
    {
        _svc = new Mock<INotesService>();
        _sut = new NotesController(_svc.Object);
    }

    private static NoteDto FakeNote() =>
        new("id1", "ws1", "user1", "content", DateTime.UtcNow);

    private static IReadOnlyList<NoteDto> FakeNoteList() =>
        new List<NoteDto> { FakeNote() };

    // ── GET ───────────────────────────────────────────────
    [Test]
    public async Task Get_ReturnsOk_WithValidParams()
    {
        _svc.Setup(s => s.GetAsync("ws1", "user1", default))
            .ReturnsAsync(FakeNoteList());

        var result = await _sut.Get("ws1", "user1", default);

        Assert.That(result, Is.TypeOf<OkObjectResult>());
    }

    [Test]
    public async Task Get_ReturnsBadRequest_WhenWorkspaceMissing()
    {
        var result = await _sut.Get("", "user1", default);

        Assert.That(result, Is.TypeOf<BadRequestObjectResult>());
    }

    [Test]
    public async Task Get_ReturnsBadRequest_WhenUserIdMissing()
    {
        var result = await _sut.Get("ws1", "", default);

        Assert.That(result, Is.TypeOf<BadRequestObjectResult>());
    }

    // ── POST ──────────────────────────────────────────────
    [Test]
    public async Task Create_ReturnsOk_WithValidDto()
    {
        var dto = new NotesController.AddNoteDto("ws1", "user1", "my note");
        _svc.Setup(s => s.CreateAsync(It.IsAny<CreateNoteRequest>(), default))
            .ReturnsAsync(FakeNote());

        var result = await _sut.Create(dto, default);

        Assert.That(result, Is.TypeOf<OkObjectResult>());
    }

    [TestCase("",    "user1", "content")]
    [TestCase("ws1", "",      "content")]
    [TestCase("ws1", "user1", ""       )]
    public async Task Create_ReturnsBadRequest_WhenAnyFieldMissing(
        string ws, string userId, string content)
    {
        var dto = new NotesController.AddNoteDto(ws, userId, content);

        var result = await _sut.Create(dto, default);

        Assert.That(result, Is.TypeOf<BadRequestObjectResult>());
    }

    // ── PUT ───────────────────────────────────────────────
    [Test]
    public async Task Edit_ReturnsNoContent_WhenFound()
    {
        var dto = new NotesController.EditNoteDto("ws1", "user1", "updated content");
        _svc.Setup(s => s.EditAsync("id1", "ws1", "user1", "updated content", default))
            .ReturnsAsync(true);

        var result = await _sut.Edit("id1", dto, default);

        Assert.That(result, Is.TypeOf<NoContentResult>());
    }

    [Test]
    public async Task Edit_ReturnsNotFound_WhenNoteDoesNotExist()
    {
        var dto = new NotesController.EditNoteDto("ws1", "user1", "updated content");
        _svc.Setup(s => s.EditAsync("id1", "ws1", "user1", "updated content", default))
            .ReturnsAsync(false);

        var result = await _sut.Edit("id1", dto, default);

        Assert.That(result, Is.TypeOf<NotFoundResult>());
    }

    // ── DELETE ────────────────────────────────────────────
    [Test]
    public async Task Delete_ReturnsNoContent_WhenDeleted()
    {
        _svc.Setup(s => s.DeleteAsync("id1", "ws1", "user1", default))
            .ReturnsAsync(true);

        var result = await _sut.Delete("id1", "ws1", "user1", default);

        Assert.That(result, Is.TypeOf<NoContentResult>());
    }

    [Test]
    public async Task Delete_ReturnsNotFound_WhenNoteDoesNotExist()
    {
        _svc.Setup(s => s.DeleteAsync("id1", "ws1", "user1", default))
            .ReturnsAsync(false);

        var result = await _sut.Delete("id1", "ws1", "user1", default);

        Assert.That(result, Is.TypeOf<NotFoundResult>());
    }
}
