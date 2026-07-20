namespace Bridge.Host.Scanners;

public static class SystemChecks
{
    public static bool IsSecretConfigured()
    {
        var envSecret = Environment.GetEnvironmentVariable("VERIFICATION_SECRET");
        if (!string.IsNullOrWhiteSpace(envSecret))
            return true;

        var configPath = Path.Combine(AppContext.BaseDirectory, "bridge-secret.txt");
        return File.Exists(configPath);
    }

    public static bool IsDpSdkInstalled()
    {
        return ScannerFactory.Create() is DpSdkScannerService;
    }
}
