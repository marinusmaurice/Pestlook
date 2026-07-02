using Pestlook.WebAPI.Domain.Entities;
using Pestlook.WebAPI.Domain.Enums;

namespace Pestlook.WebAPI.Data.Seeding;

public static class SystemPestCatalogue
{
    private static readonly (string Common, string? Scientific, PestCategory Cat, CaptureMode Mode, int? Threshold)[] Entries =
    [
        // ── Insects ───────────────────────────────────────────────────────────
        // Africa-specific
        ("African Bollworm",       "Helicoverpa armigera",       PestCategory.Insect,   CaptureMode.Count,    5),
        ("Maize Stalk Borer",      "Busseola fusca",             PestCategory.Insect,   CaptureMode.Count,    5),
        ("False Codling Moth",     "Thaumatotibia leucotreta",   PestCategory.Insect,   CaptureMode.Count,    3),
        ("Citrus Psylla",          "Trioza erytreae",            PestCategory.Insect,   CaptureMode.Presence, null),
        ("Red Scale",              "Aonidiella aurantii",        PestCategory.Insect,   CaptureMode.Presence, null),
        ("Mealybug",               "Pseudococcidae",             PestCategory.Insect,   CaptureMode.Presence, null),
        ("Mediterranean Fruit Fly","Ceratitis capitata",         PestCategory.Insect,   CaptureMode.Count,    5),
        ("Natal Fruit Fly",        "Ceratitis rosa",             PestCategory.Insect,   CaptureMode.Count,    5),
        ("Tomato Leafminer",       "Tuta absoluta",              PestCategory.Insect,   CaptureMode.Count,    5),
        ("Cotton Stainer",         "Dysdercus fasciatus",        PestCategory.Insect,   CaptureMode.Count,    10),
        ("Green Stink Bug",        "Nezara viridula",            PestCategory.Insect,   CaptureMode.Count,    10),
        // Common/global (from original catalogue)
        ("Aphid",                  "Aphidoidea",                 PestCategory.Insect,   CaptureMode.Count,    50),
        ("Aphids",                 "Aphididae",                  PestCategory.Insect,   CaptureMode.Count,    25),
        ("Whitefly",               "Bemisia tabaci",             PestCategory.Insect,   CaptureMode.Count,    20),
        ("Thrips",                 "Thripidae",                  PestCategory.Insect,   CaptureMode.Count,    20),
        ("Spider Mite",            "Tetranychus urticae",        PestCategory.Insect,   CaptureMode.Count,    20),
        ("Leaf Miner",             "Liriomyza spp.",             PestCategory.Insect,   CaptureMode.Presence, null),
        ("Codling Moth",           "Cydia pomonella",            PestCategory.Insect,   CaptureMode.Count,    3),
        ("Fall Armyworm",          "Spodoptera frugiperda",      PestCategory.Insect,   CaptureMode.Count,    5),
        ("Corn Rootworm",          "Diabrotica virgifera",       PestCategory.Insect,   CaptureMode.Count,    15),
        ("Fruit Fly",              "Bactrocera dorsalis",        PestCategory.Insect,   CaptureMode.Count,    3),
        ("Cucumber Beetle",        "Diabrotica undecimpunctata", PestCategory.Insect,   CaptureMode.Count,    10),
        ("Cabbage Looper",         "Trichoplusia ni",            PestCategory.Insect,   CaptureMode.Count,    25),
        ("Colorado Potato Beetle", "Leptinotarsa decemlineata",  PestCategory.Insect,   CaptureMode.Count,    5),
        ("Stink Bug",              "Halyomorpha halys",          PestCategory.Insect,   CaptureMode.Presence, null),
        ("Grasshopper",            "Melanoplinae",               PestCategory.Insect,   CaptureMode.Count,    8),
        ("Cutworm",                "Agrotis ipsilon",            PestCategory.Insect,   CaptureMode.Count,    4),
        ("Earworm",                "Helicoverpa zea",            PestCategory.Insect,   CaptureMode.Count,    6),
        ("Squash Bug",             "Anasa tristis",              PestCategory.Insect,   CaptureMode.Presence, null),
        ("Diamondback Moth",       "Plutella xylostella",        PestCategory.Insect,   CaptureMode.Count,    20),
        ("Scale Insect",           "Coccoidea",                  PestCategory.Insect,   CaptureMode.Presence, null),
        ("Leafhopper",             "Cicadellidae",               PestCategory.Insect,   CaptureMode.Count,    35),

        // ── Diseases ──────────────────────────────────────────────────────────
        ("Anthracnose",            "Colletotrichum spp.",        PestCategory.Disease,  CaptureMode.Presence, null),
        ("Powdery Mildew",         "Erysiphe spp.",              PestCategory.Disease,  CaptureMode.Presence, null),
        ("Downy Mildew",           "Peronospora spp.",           PestCategory.Disease,  CaptureMode.Presence, null),
        ("Early Blight",           "Alternaria solani",          PestCategory.Disease,  CaptureMode.Presence, null),
        ("Late Blight",            "Phytophthora infestans",     PestCategory.Disease,  CaptureMode.Presence, null),
        ("Botrytis (Grey Mould)",  "Botrytis cinerea",           PestCategory.Disease,  CaptureMode.Presence, null),
        ("Grey Mould",             "Botrytis cinerea",           PestCategory.Disease,  CaptureMode.Presence, null),
        ("Fusarium Wilt",          "Fusarium oxysporum",         PestCategory.Disease,  CaptureMode.Presence, null),
        ("Root Rot",               "Phytophthora spp.",          PestCategory.Disease,  CaptureMode.Presence, null),
        ("Rust",                   "Puccinia spp.",              PestCategory.Disease,  CaptureMode.Presence, null),
        ("Bacterial Blight",       "Xanthomonas spp.",           PestCategory.Disease,  CaptureMode.Presence, null),
        ("Citrus Black Spot",      "Phyllosticta citricarpa",    PestCategory.Disease,  CaptureMode.Presence, null),
        ("Sooty Mould",            "Capnodium spp.",             PestCategory.Disease,  CaptureMode.Presence, null),

        // ── Weeds ─────────────────────────────────────────────────────────────
        // Africa-specific
        ("Blackjack",              "Bidens pilosa",              PestCategory.Weed,     CaptureMode.Presence, null),
        ("Khaki Weed",             "Alternanthera pungens",      PestCategory.Weed,     CaptureMode.Presence, null),
        ("Goosegrass",             "Eleusine indica",            PestCategory.Weed,     CaptureMode.Presence, null),
        ("Couch Grass",            "Cynodon dactylon",           PestCategory.Weed,     CaptureMode.Presence, null),
        ("Devil's Thorn",          "Tribulus terrestris",        PestCategory.Weed,     CaptureMode.Presence, null),
        ("Thorn Apple",            "Datura stramonium",          PestCategory.Weed,     CaptureMode.Presence, null),
        ("Cosmos",                 "Cosmos bipinnatus",          PestCategory.Weed,     CaptureMode.Presence, null),
        ("Mexican Marigold",       "Tagetes minuta",             PestCategory.Weed,     CaptureMode.Presence, null),
        ("Wild Oats",              "Avena fatua",                PestCategory.Weed,     CaptureMode.Presence, null),
        // Common/global
        ("Nutsedge",               "Cyperus esculentus",         PestCategory.Weed,     CaptureMode.Presence, null),
        ("Pigweed",                "Amaranthus spp.",            PestCategory.Weed,     CaptureMode.Presence, null),
        ("Common Ragweed",         "Ambrosia artemisiifolia",    PestCategory.Weed,     CaptureMode.Presence, null),
        ("Bindweed",               "Convolvulus arvensis",       PestCategory.Weed,     CaptureMode.Presence, null),
        ("Johnson Grass",          "Sorghum halepense",          PestCategory.Weed,     CaptureMode.Presence, null),
        ("Lambs Quarters",         "Chenopodium album",          PestCategory.Weed,     CaptureMode.Presence, null),
        ("Wild Mustard",           "Sinapis arvensis",           PestCategory.Weed,     CaptureMode.Presence, null),
        ("Canada Thistle",         "Cirsium arvense",            PestCategory.Weed,     CaptureMode.Presence, null),
        ("Velvetleaf",             "Abutilon theophrasti",       PestCategory.Weed,     CaptureMode.Presence, null),
        ("Cocklebur",              "Xanthium strumarium",        PestCategory.Weed,     CaptureMode.Presence, null),

        // ── Rodents ───────────────────────────────────────────────────────────
        ("House Mouse",            "Mus musculus",               PestCategory.Rodent,   CaptureMode.Count,    1),
        ("Black Rat",              "Rattus rattus",              PestCategory.Rodent,   CaptureMode.Count,    1),
        ("Multimammate Mouse",     "Mastomys natalensis",        PestCategory.Rodent,   CaptureMode.Count,    2),
        ("Mole Rat",               "Bathyergus suillus",         PestCategory.Rodent,   CaptureMode.Presence, null),
        ("Common Vole",            "Microtus arvalis",           PestCategory.Rodent,   CaptureMode.Count,    2),
        ("Mole",                   "Talpa europaea",             PestCategory.Rodent,   CaptureMode.Presence, null),
        ("Gopher",                 "Geomyidae",                  PestCategory.Rodent,   CaptureMode.Presence, null),

        // ── Birds ─────────────────────────────────────────────────────────────
        ("Red-billed Quelea",      "Quelea quelea",              PestCategory.Bird,     CaptureMode.Count,    20),

        // ── Mammals ───────────────────────────────────────────────────────────
        ("Vervet Monkey",          "Chlorocebus pygerythrus",    PestCategory.Mammal,   CaptureMode.Count,    1),
        ("Warthog",                "Phacochoerus africanus",     PestCategory.Mammal,   CaptureMode.Count,    1),
        ("Bushbuck",               "Tragelaphus scriptus",       PestCategory.Mammal,   CaptureMode.Count,    1),
        ("Elephant",               "Loxodonta africana",         PestCategory.Mammal,   CaptureMode.Count,    1),
        ("Deer",                   "Odocoileus virginianus",     PestCategory.Mammal,   CaptureMode.Presence, null),
        ("Wild Boar",              "Sus scrofa",                 PestCategory.Mammal,   CaptureMode.Presence, null),

        // ── Molluscs ──────────────────────────────────────────────────────────
        ("Snail",                  "Cornu aspersum",             PestCategory.Mollusc,  CaptureMode.Count,    10),
        ("Slug",                   "Deroceras reticulatum",      PestCategory.Mollusc,  CaptureMode.Count,    10),

        // ── Nematodes ─────────────────────────────────────────────────────────
        ("Root-knot Nematode",     "Meloidogyne spp.",           PestCategory.Nematode, CaptureMode.Presence, null),
        ("Nematode (Root-knot)",   "Meloidogyne spp.",           PestCategory.Nematode, CaptureMode.Presence, null),
    ];

    public static List<Pest> BuildForTenant(Guid tenantId, string? createdByUserId = null)
    {
        var now = DateTime.UtcNow;
        return Entries.Select(d => new Pest
        {
            Id                 = Guid.NewGuid(),
            TenantId           = tenantId,
            CommonName         = d.Common,
            ScientificName     = d.Scientific,
            Category           = d.Cat,
            DefaultCaptureMode = d.Mode,
            ThresholdCount     = d.Threshold,
            IsSystemPest       = true,
            CreatedAt          = now,
            CreatedByUserId    = createdByUserId
        }).ToList();
    }
}
