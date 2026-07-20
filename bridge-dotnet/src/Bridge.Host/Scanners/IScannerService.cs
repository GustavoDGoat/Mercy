using Bridge.Host.Models;

namespace Bridge.Host.Scanners;

public interface IScannerService
{
    ScannerStatus GetStatus();
    Task<EnrollResult> EnrollAsync(CancellationToken ct);
    Task<VerifyResult> VerifyAsync(string templateBase64, string platformTag, CancellationToken ct);
    void Cancel();
    void Restart();
    HealthReport GetHealth();
}
