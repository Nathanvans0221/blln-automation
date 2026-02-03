# BLN Database Data Analysis

## Summary Statistics

| Table | Rows | Key Observations |
|-------|------|------------------|
| Locations | 55 | Sites: MD03, MD05, VA07, NC04, KY01, etc. |
| RecipeGroups | 29 | Legacy location codes (VA05, OH08, etc.) |
| Categories | 1001+ | Both simple names AND full scheme codes |
| Catalogs | 1001+ | Genus = actual genus OR scheme code |
| Recipes | 1001+ | Many wildcards (NULL weeks, GrowWeeks=0) |
| RecipeMixes | 1001+ | Some split 50/50 or 25/25/25/25 |
| BLNVariantMixes | 951 | BLN-specific mix table |
| SpaceCategories | 1001+ | Scheme codes |
| SpaceSpecs | 1001+ | Width/Length ~8.66 (sqrt formula) |
| SpaceEvents | 1001+ | Named with scheme codes |
| SpaceEventDetails | 1001+ | Links events to triggers/categories |
| Triggers | 50 | LHN-2, MHN-4, SHD-52 patterns |
| ProductionItems | 710 | Maps to 4MM numbers |
| RecipeSpaceEvents | 1001+ | Recipe ↔ Event links |

---

## Key Data Patterns

### Locations (dbo.Locations)
```
ID=28 appears frequently (likely a main production facility)
ID=29 appears frequently
Sites: MD03, MD05, VA05, VA06, VA07, NC03, NC04, OH08, KY01, NJ00
```

### Categories Pattern
Two types exist in same table:
1. **Simple category**: `45INVIG`, `10HBCLA`, `306PANN`
2. **Full scheme code**: `BN-45INVIG-FUC-LSP-0.172`

The full scheme codes include SQ FT at the end (0.172, 1.786, etc.)

### Catalogs Pattern
**Genus field dual usage:**
1. Actual genus: `LEUCANTHEMUM`, `CALLA LILY`, `AQUILEGIA`
2. Scheme code: `BN-10INMUM-NSLN-SP`

**Series** = Production Code (4MM number): `4000084`, `4000075`
**Color** = Variant: `000084BO01`, `000075B530`, `*`

### Recipes Pattern
```
ID        StartWeek  EndWeek  CategoryID  CatalogID  GrowWeeks  Notes
135762    NULL       NULL     4392        17943      0          BN-06INPLT-BAS-LSP
135766    NULL       NULL     4045        27824      0          BN-406PANN-ZIN-MSP
```

- **Wildcard recipes**: StartWeek=NULL, EndWeek=NULL, GrowWeeks=0
- **Notes** = Production Scheme Code (NOT a FK, can repeat)
- **LocationID** = FK to dbo.Locations (28, 29 common)

### Recipe Mixes Pattern
```
RecipeID  CatalogID  MixPct
135772    30111      50      ← Split mix
135772    30112      50      ← Same recipe, two catalogs
135779    30133      25      ← 4-way split
135779    30135      25
135779    30968      25
135779    30969      25
```

### Space Specs Pattern
```
SpaceWidth = 8.660254038  (= sqrt(75) or similar formula)
SpaceLength = 8.660254038
```
This confirms the `SQRT(1/Qty_per_Area)` formula from Arc Flow.

### Triggers Pattern
```
Description    UnitOffset
LHN-2          3          (Long Hang Nail, 3 weeks)
MHN-4          4          (Mid Hang Nail, 4 weeks)
SHN-3          3          (Short Hang Nail, 3 weeks)
SHD-52         52         (Shade, 52 weeks)
LHN-7          7
```
Pattern: `{TimeProfile}-{WeekOffset}`

### Space Event Details
```
EventID  Description          TriggerID  SpaceCategoryID  SpaceTypeID  Duration
812      BN-06HBFOL-FOL-LHN   13         12117            2            5
815      BN-10INSEL-CAL-LPT   13         15064            1            6
```
- SpaceTypeID 1 = Floor
- SpaceTypeID 2 = Hang

---

## Edge Cases Identified

### 1. Notes Field Not a Primary Key
Multiple recipes can share the same Production Scheme Code in Notes:
- Recipe 135765 and 135787 both have `BN-06INVEG-TOM-LSP`
- This allows different locations/catalogs to use same scheme

### 2. Dual-Purpose Genus Field
The Genus field in Catalogs serves two purposes:
- Actual botanical genus for standard items
- Full scheme code for scheme-specific catalogs

### 3. Category Duplication
Categories table has both:
- Parent category (`45INVIG`)
- Child categories with full scheme codes (`BN-45INVIG-FUC-LSP-0.172`)

### 4. Two Mix Tables
- `Setup.RecipeMixes` - Standard PRODUCE table (MixPct as float)
- `dbo.BLNVariantMixes` - BLN-specific (MixPct as tinyint)

Both appear to be used; need to clarify which is authoritative.

---

## Location ID Mapping

| LocationID | Site Code | Notes |
|------------|-----------|-------|
| 28 | **KY01** | Main facility, heavily used |
| 29 | **VA06** | Main facility, heavily used |
| 30 | OH08 | |
| 31 | VA05 | |
| 5 | MD05 | |
| 6 | VA07 | |
| 10 | NC04 | |
| 11 | NC03 | |
| 4 | MD03 | |
| 7 | NJ00 | |

---

## The Notes Edge Case (Critical)

### Why Production Scheme Code Must Be in Notes

**BLN Requirement:**
- 7+ locations with different grow times for the same item
- Time profiles in scheme code: LSP (Long), MSP (Medium), SSP (Short)
- Hang variants: LHN, MHN, SHN

**PRODUCE Constraint:**
- Primary key = Location + Category + Genus + Series + Color
- Must be GENERIC across locations for "move" functionality

**Solution:**
- Production Scheme Code → Notes field (NOT a primary key)
- Same item at different locations:
  - KY01: `BN-06INPLT-BAS-LSP` (Long = 7 weeks)
  - VA06: `BN-06INPLT-BAS-MSP` (Medium = 6 weeks)
- PRODUCE sees same Category/Genus/Series/Color
- But applies correct GrowWeeks per location via Notes lookup

**Why It Works:**
- Items can move between locations
- PRODUCE recognizes it's the "same item"
- Correct grow weeks applied based on destination's scheme code
- Notes preserves Arc Flow linkage without breaking primary keys

---

## Import Tables

| Table | Purpose | Import Method |
|-------|---------|---------------|
| `Setup.RecipeMixes` | What PRODUCE uses | Via backend |
| `dbo.BLNVariantMixes` | Staging table | Direct SQL import |

**Note:** No front-end import exists for recipe mixes. Automation must output in `BLNVariantMixes` format for backend import into `RecipeMixes`.
