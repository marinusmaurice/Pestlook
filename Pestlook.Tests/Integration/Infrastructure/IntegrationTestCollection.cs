namespace Pestlook.Tests.Integration.Infrastructure;

[CollectionDefinition("Integration", DisableParallelization = true)]
public sealed class IntegrationTestCollection : ICollectionFixture<TestWebApplicationFactory>
{
}
