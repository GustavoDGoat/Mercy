using System.Text;
using Bridge.Host.Security;

namespace Bridge.Host.Tests;

public class VerificationSignerTests
{
    private const string TestSecret = "test-secret-key-32bytes-longgg";
    private const string TestUserId = "user-abc-123";

    public VerificationSignerTests()
    {
        Environment.SetEnvironmentVariable("VERIFICATION_SECRET", TestSecret);
    }

    [Fact]
    public void SignAndValidate_RoundTrip_Succeeds()
    {
        var timestamp = DateTime.UtcNow;
        var token = VerificationSigner.Sign(TestUserId, timestamp, true);

        Assert.NotNull(token);
        Assert.NotEmpty(token);

        var valid = VerificationSigner.Validate(TestUserId, timestamp, true, token);
        Assert.True(valid);
    }

    [Fact]
    public void Validate_WrongUserId_Fails()
    {
        var timestamp = DateTime.UtcNow;
        var token = VerificationSigner.Sign(TestUserId, timestamp, true);

        var valid = VerificationSigner.Validate("wrong-user-id", timestamp, true, token);
        Assert.False(valid);
    }

    [Fact]
    public void Validate_WrongTimestamp_Fails()
    {
        var timestamp = DateTime.UtcNow;
        var token = VerificationSigner.Sign(TestUserId, timestamp, true);

        var valid = VerificationSigner.Validate(TestUserId, timestamp.AddMinutes(1), true, token);
        Assert.False(valid);
    }

    [Fact]
    public void Validate_WrongMatchResult_Fails()
    {
        var timestamp = DateTime.UtcNow;
        var token = VerificationSigner.Sign(TestUserId, timestamp, true);

        var valid = VerificationSigner.Validate(TestUserId, timestamp, false, token);
        Assert.False(valid);
    }

    [Fact]
    public void Sign_ProducesDifferentTokens_ForDifferentInputs()
    {
        var t1 = DateTime.UtcNow;
        var t2 = t1.AddSeconds(1);

        var token1 = VerificationSigner.Sign(TestUserId, t1, true);
        var token2 = VerificationSigner.Sign(TestUserId, t2, true);

        Assert.NotEqual(token1, token2);
    }

    [Fact]
    public void Validate_TamperedToken_Fails()
    {
        var timestamp = DateTime.UtcNow;
        var token = VerificationSigner.Sign(TestUserId, timestamp, true);

        var tampered = token[..^4] + "XXXX";

        var valid = VerificationSigner.Validate(TestUserId, timestamp, true, tampered);
        Assert.False(valid);
    }
}
