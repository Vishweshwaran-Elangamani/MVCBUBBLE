namespace BubbleApp.Common.ViewModels.Auth;

// FIX: was broken across two lines as "AdminRegister\nRequest(...)"
public record AdminRegisterRequest(string Email, string Password);
