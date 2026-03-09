using BubbleApp.Api.Controllers;
using BubbleApp.Common.ViewModels.Auth;
using BubbleApp.Core.IService;
using Microsoft.AspNetCore.Mvc;
using Moq;
using NUnit.Framework;

namespace BubbleApp.Tests;

[TestFixture]
public class AuthControllerTests
{
    private Mock<IAuthService> _svc = null!;
    private AuthController     _sut = null!;

    [SetUp]
    public void SetUp()
    {
        _svc = new Mock<IAuthService>();
        _sut = new AuthController(_svc.Object);
    }

    private static AuthResponse FakeAuth() => new("fake-token", "a@b.com");

    // ── Register ──────────────────────────────────────────
    [Test]
    public async Task Register_ReturnsOk_WhenSuccessful()
    {
        var req = new AdminRegisterRequest("a@b.com", "pass123");
        _svc.Setup(s => s.RegisterAsync(req, default)).ReturnsAsync(FakeAuth());

        var result = await _sut.Register(req, default);

        Assert.That(result, Is.TypeOf<OkObjectResult>());
    }

    [Test]
    public async Task Register_ReturnsConflict_WhenEmailAlreadyExists()
    {
        var req = new AdminRegisterRequest("a@b.com", "pass123");
        _svc.Setup(s => s.RegisterAsync(req, default))
            .ThrowsAsync(new InvalidOperationException("Email already exists"));

        var result = await _sut.Register(req, default);

        Assert.That(result, Is.TypeOf<ConflictObjectResult>());
    }

    [Test]
    public void Register_Throws_WhenExceptionMessageIsUnrelated()
    {
        var req = new AdminRegisterRequest("a@b.com", "pass123");
        _svc.Setup(s => s.RegisterAsync(req, default))
            .ThrowsAsync(new InvalidOperationException("DB connection failed"));

        Assert.ThrowsAsync<InvalidOperationException>(() => _sut.Register(req, default));
    }

    // ── Login ─────────────────────────────────────────────
    [Test]
    public async Task Login_ReturnsOk_WhenCredentialsValid()
    {
        var req = new AdminLoginRequest("a@b.com", "pass123");
        _svc.Setup(s => s.LoginAsync(req, default)).ReturnsAsync(FakeAuth());

        var result = await _sut.Login(req, default);

        Assert.That(result, Is.TypeOf<OkObjectResult>());
    }

    [Test]
    public async Task Login_ReturnsUnauthorized_WhenCredentialsInvalid()
    {
        var req = new AdminLoginRequest("a@b.com", "wrong");
        _svc.Setup(s => s.LoginAsync(req, default))
            .ThrowsAsync(new UnauthorizedAccessException());

        var result = await _sut.Login(req, default);

        Assert.That(result, Is.TypeOf<UnauthorizedObjectResult>());
    }
}
