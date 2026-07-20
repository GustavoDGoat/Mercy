using System.Security.Cryptography;
using Bridge.Host.Scanners;
using Bridge.Host.Models;

namespace Bridge.Host.Tests;

public class MockScannerServiceTests
{
    [Fact]
    public async Task Enroll_ReturnsTemplateWithCorrectPrefix()
    {
        var scanner = new MockScannerService();
        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(30));

        var result = await scanner.EnrollAsync(cts.Token);

        Assert.NotNull(result.Template);
        Assert.StartsWith("MOCK:v2:", result.Template);
        Assert.Equal("win_dpsdk", result.Platform);
        Assert.True(result.QualityScore >= 80 && result.QualityScore <= 96);
        Assert.Equal(4, result.CaptureCount);
    }

    [Fact]
    public async Task EnrollThenVerify_SameFinger_Matches()
    {
        var scanner = new MockScannerService();
        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(30));

        var enrollResult = await scanner.EnrollAsync(cts.Token);

        var verifyResult = await scanner.VerifyAsync(enrollResult.Template, "win_dpsdk", cts.Token);

        Assert.True(verifyResult.Match);
        Assert.True(verifyResult.Score >= 92 && verifyResult.Score <= 100);
        Assert.Equal(812, verifyResult.LatencyMs);
    }

    [Fact]
    public async Task EnrollThenVerify_WrongFinger_DoesNotMatch()
    {
        var scanner = new MockScannerService();
        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(30));

        var enrollResult1 = await scanner.EnrollAsync(cts.Token);

        await scanner.EnrollAsync(cts.Token);

        var verifyResult = await scanner.VerifyAsync(enrollResult1.Template, "win_dpsdk", cts.Token);

        Assert.False(verifyResult.Match);
        Assert.True(verifyResult.Score >= 5 && verifyResult.Score <= 25);
    }

    [Fact]
    public async Task Verify_PlatformMismatch_ReturnsError()
    {
        var scanner = new MockScannerService();
        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(30));

        var enrollResult = await scanner.EnrollAsync(cts.Token);

        var verifyResult = await scanner.VerifyAsync(enrollResult.Template, "linux_libfprint", cts.Token);

        Assert.False(verifyResult.Match);
        Assert.NotNull(verifyResult.Error);
        Assert.Contains("Platform mismatch", verifyResult.Error);
    }

    [Fact]
    public async Task Verify_NonMockTemplate_ReturnsError()
    {
        var scanner = new MockScannerService();
        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(30));

        var verifyResult = await scanner.VerifyAsync("REAL_TEMPLATE_DATA_HERE", "win_dpsdk", cts.Token);

        Assert.False(verifyResult.Match);
        Assert.NotNull(verifyResult.Error);
        Assert.Contains("Cannot verify non-mock template", verifyResult.Error);
    }

    [Fact]
    public async Task Cancel_DuringEnroll_ThrowsCancellation()
    {
        var scanner = new MockScannerService();

        var enrollTask = scanner.EnrollAsync(CancellationToken.None);
        await Task.Delay(100);
        scanner.Cancel();

        await Assert.ThrowsAsync<OperationCanceledException>(() => enrollTask);
    }

    [Fact]
    public void Restart_ChangesFingerId()
    {
        var scanner = new MockScannerService();
        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(30));

        var result1 = scanner.EnrollAsync(cts.Token).GetAwaiter().GetResult();

        scanner.Restart();
        cts = new CancellationTokenSource(TimeSpan.FromSeconds(30));
        var result2 = scanner.EnrollAsync(cts.Token).GetAwaiter().GetResult();

        Assert.NotEqual(result1.Template, result2.Template);
    }

    [Fact]
    public void GetStatus_ReturnsCorrectShape()
    {
        var scanner = new MockScannerService();
        var status = scanner.GetStatus();

        Assert.True(status.Connected);
        Assert.Equal("mock", status.Mode);
        Assert.Equal("05ba", status.Device.VendorId);
        Assert.Equal("000a", status.Device.ProductId);
        Assert.True(status.UptimeSeconds >= 0);
    }
}
