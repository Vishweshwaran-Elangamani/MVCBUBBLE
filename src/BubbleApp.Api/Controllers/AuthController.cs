using BubbleApp.Core.IService;
using BubbleApp.Common.ViewModels.Auth;
using Microsoft.AspNetCore.Mvc;

namespace BubbleApp.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _svc;
    public AuthController(IAuthService svc) => _svc = svc;

    [HttpPost("register")]
    public async Task<IActionResult> Register(
        [FromBody] AdminRegisterRequest req,
        CancellationToken ct)
    {
        try
        {
            var res = await _svc.RegisterAsync(req, ct);
            return Ok(res);
        }
        catch (InvalidOperationException ex)
            when (ex.Message.Contains("already exists", StringComparison.OrdinalIgnoreCase))
        {
            return Conflict(new { message = "Email already registered." }); // 409
        }
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(
        [FromBody] AdminLoginRequest req,
        CancellationToken ct)
    {
        try
        {
            var res = await _svc.LoginAsync(req, ct);
            return Ok(res);
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized(new { message = "Invalid email or password." }); // 401
        }
    }
}
