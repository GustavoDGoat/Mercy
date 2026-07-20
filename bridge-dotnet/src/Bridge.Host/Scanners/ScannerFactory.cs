using Microsoft.Win32;

namespace Bridge.Host.Scanners;

public static class ScannerFactory
{
    private static bool _sdkCheckDone;
    private static bool _sdkAvailable;

    public static IScannerService Create()
    {
        if (!_sdkCheckDone)
        {
            _sdkAvailable = CheckForDpSdk();
            _sdkCheckDone = true;
        }

        if (_sdkAvailable)
        {
            return new DpSdkScannerService();
        }

        return new MockScannerService();
    }

    private static bool CheckForDpSdk()
    {
        try
        {
            var installed = false;

            var comType = Type.GetTypeFromProgID("DPFP.Capture");
            if (comType != null)
            {
                installed = true;
            }

            if (!installed)
            {
                var paths = new[]
                {
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles),
                        @"DigitalPersona\Bin\DotNet\DPFPCtlX.dll"),
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86),
                        @"DigitalPersona\Bin\DotNet\DPFPCtlX.dll"),
                };

                foreach (var p in paths)
                {
                    if (File.Exists(p)) { installed = true; break; }
                }
            }

            if (!installed)
            {
                try
                {
                    using var key = Registry.ClassesRoot.OpenSubKey(@"CLSID");
                    if (key != null) { }
                }
                catch
                { }
            }

            return installed;
        }
        catch
        {
            return false;
        }
    }
}

internal sealed class DpSdkScannerService : IScannerService
{
    public ScannerStatus GetStatus()
    {
        throw new NotImplementedException(
            "DP SDK assemblies are registered. Real scanner integration is available in the full build. " +
            "Contact the project maintainer to enable DpSdkScannerService.");
    }

    public Task<EnrollResult> EnrollAsync(CancellationToken ct)
    {
        throw new NotImplementedException(
            "DP SDK assemblies are registered. Real scanner enrollment is available in the full build.");
    }

    public Task<VerifyResult> VerifyAsync(string templateBase64, string platformTag, CancellationToken ct)
    {
        throw new NotImplementedException(
            "DP SDK assemblies are registered. Real scanner verification is available in the full build.");
    }

    public void Cancel() { }
    public void Restart() { }
    public HealthReport GetHealth()
    {
        return new HealthReport
        {
            Mode = ScannerMode.Real,
            SdkInstalled = true,
            ScannerConnected = false,
            SecretConfigured = SystemChecks.IsSecretConfigured()
        };
    }
}
