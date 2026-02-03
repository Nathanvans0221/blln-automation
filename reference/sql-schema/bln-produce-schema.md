# BLN PRODUCE Database Schema

## Key Tables for Automation

### Setup.Recipes (Master Recipe Definitions)
| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| ID | int | NO | Primary Key |
| StartWeek | int | YES | Rule start week |
| EndWeek | int | YES | Rule end week |
| CategoryID | int | NO | FK to Setup.Categories |
| CatalogID | int | NO | FK to Setup.Catalogs |
| GrowWeeks | int | NO | Grow duration |
| PlantsPerPot | int | NO | Always 1 for BLN |
| Yield | decimal(3) | NO | Always 1 for BLN |
| Trial | bit | NO | Trial flag |
| Substitution | bit | NO | Substitution flag |
| **Notes** | nvarchar(450) | YES | **Contains Production Scheme Code** |
| ValidFirstStep | bit | NO | Always true for BLN |
| CustomerID | int | YES | Customer FK |
| **LocationID** | int | YES | **Location FK (replaces RecipeGroup)** |

### Setup.Catalogs (Catalog Items)
| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| ID | int | NO | Primary Key |
| Genus | nvarchar(100) | NO | Genus name |
| Series | nvarchar(100) | NO | Series (Production Code) |
| Color | nvarchar(100) | NO | Variant code or `*` |

### Setup.Categories
| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| ID | int | NO | Primary Key |
| Category | nvarchar(100) | NO | Category name (parsed from scheme) |
| UnitOfMeasure | int | NO | Default 1 |
| SpaceCategoryID | int | YES | FK to SpacePlanning.Categories |

### Setup.RecipeMixes (Variant Mix Percentages)
| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| ID | int | NO | Primary Key |
| RecipeID | int | NO | FK to Setup.Recipes |
| CatalogID | int | NO | FK to Setup.Catalogs |
| MixPct | float | NO | Mix percentage |

### Setup.RecipeSpaceEvents (Recipe-Event Links)
| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| RecipeID | int | NO | FK to Setup.Recipes |
| EventID | int | NO | FK to Events.Spaces |
| IsExcluded | bit | NO | Exclusion flag |

### Setup.RecipeGroups (Location Codes - Legacy)
| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| ID | int | NO | Primary Key |
| RecipeGroup | nvarchar(100) | NO | Location code (KY01, VA05, etc.) |

### Setup.ProductionItems (Production Item Mapping)
| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| ID | int | NO | Primary Key |
| CategoryID | int | NO | FK to Setup.Categories |
| CatalogID | int | NO | FK to Setup.Catalogs |
| ProductionItemNum | nvarchar(64) | NO | 4MM Production Item Number |

---

## Events Schema

### Events.Spaces (Space Event Definitions)
| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| ID | int | NO | Primary Key |
| Event | nvarchar(100) | NO | Event name |

### Events.SpaceDetails (Space Event Details)
| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| ID | int | NO | Primary Key |
| EventID | int | NO | FK to Events.Spaces |
| Description | nvarchar(100) | NO | Detail description |
| TriggerID | int | NO | FK to Events.Triggers |
| SpaceCategoryID | int | NO | FK to SpacePlanning.Categories |
| SpaceTypeID | int | NO | FK to SpacePlanning.SpaceTypes |
| Duration | int | NO | Duration in weeks |

### Events.Triggers
| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| ID | int | NO | Primary Key |
| Description | nvarchar(25) | NO | Trigger description |
| TriggerSourceID | int | NO | FK to TriggerSources |
| TriggerUnitID | int | NO | FK to TriggerUnits |
| UnitOffset | int | NO | Offset value (weeks) |

---

## SpacePlanning Schema

### SpacePlanning.Categories (Space Categories)
| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| ID | int | NO | Primary Key |
| SpaceCategory | nvarchar(100) | NO | Category + SQ FT designation |

### SpacePlanning.Specs (Space Specifications)
| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| ID | int | NO | Primary Key |
| SpaceCategoryID | int | NO | FK to SpacePlanning.Categories |
| SpaceTypeID | int | NO | FK to SpacePlanning.SpaceTypes |
| SpaceWidth | float | NO | Width (default 12) |
| SpaceLength | float | NO | Length (default 12) |
| Stagger | bit | NO | Stagger flag |
| IsDefault | bit | NO | Default spec flag |
| CustomerID | int | YES | Customer FK |
| LocationID | int | YES | Location FK |

### SpacePlanning.SpaceTypes
| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| ID | int | NO | Primary Key |
| SpaceType | nvarchar(25) | NO | Floor, Hang, etc. |

---

## BLN-Specific Tables

### dbo.BLNVariantMixes
| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| RecipeID | int | NO | FK to Setup.Recipes |
| CatalogID | smallint | NO | FK to Setup.Catalogs |
| MixPct | tinyint | NO | Mix percentage (0-255) |

---

## Import Staging

### Import.recipes (Recipe Import Staging)
| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| RecipeGroup | nvarchar(50) | NO | Location code |
| StartWeek | int | NO | Start week |
| EndWeek | int | NO | End week |
| Category | nvarchar(50) | NO | Category name |
| Genus | nvarchar(50) | NO | Genus |
| Series | nvarchar(50) | NO | Production Code |
| Color | nvarchar(50) | NO | Variant or `*` |
| GrowWeeks | int | NO | Grow weeks |
| PlantsPerPot | int | NO | Plants per pot |
| Yield | float | NO | Yield |
| Trial | int | NO | Trial flag |
| Substitution | int | NO | Substitution flag |
| Notes | nvarchar(100) | YES | Production Scheme Code |
| ValidFirstStep | int | NO | Valid first step flag |

---

## Location Tables

### dbo.Locations
| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| ID | int | NO | Primary Key |
| ParentLocationID | int | YES | Parent FK |
| LocationType | varchar(20) | NO | Type |
| Location | nvarchar(100) | NO | Location name/code |

---

## Key Relationships

```
Setup.Recipes
    ├── CategoryID → Setup.Categories.ID
    ├── CatalogID → Setup.Catalogs.ID
    ├── LocationID → dbo.Locations.ID
    └── Notes = Production Scheme Code (not FK)

Setup.RecipeMixes
    ├── RecipeID → Setup.Recipes.ID
    └── CatalogID → Setup.Catalogs.ID

Setup.RecipeSpaceEvents
    ├── RecipeID → Setup.Recipes.ID
    └── EventID → Events.Spaces.ID

Events.SpaceDetails
    ├── EventID → Events.Spaces.ID
    ├── TriggerID → Events.Triggers.ID
    ├── SpaceCategoryID → SpacePlanning.Categories.ID
    └── SpaceTypeID → SpacePlanning.SpaceTypes.ID

SpacePlanning.Specs
    ├── SpaceCategoryID → SpacePlanning.Categories.ID
    ├── SpaceTypeID → SpacePlanning.SpaceTypes.ID
    └── LocationID → dbo.Locations.ID

Setup.Categories
    └── SpaceCategoryID → SpacePlanning.Categories.ID
```
