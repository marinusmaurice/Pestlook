namespace Pestlook.WebAPI.Domain.Entities;

public sealed class ObservationPest
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ObservationId { get; set; }
    public Observation Observation { get; set; } = null!;
    public Guid? PestId { get; set; }
    public Pest? Pest { get; set; }
    public string? PestName { get; set; }
    public int? Count { get; set; }
    public bool? IsPresent { get; set; }
}
