# Search & Filters - Architecture Guide

Quick reference for engineers working on the search and filters system.

## Overview

The Search & Filters system provides search, filtering, and sorting for product discovery. Key features include dynamic sort options from API, client-side availability filters, focus-visible accessibility patterns, and smart dropdown positioning.

## Core Architecture

```
search-filters/
├── components/           # UI components
│   ├── pills/           # Filter pills and dropdowns
│   ├── modals/          # All Filters modal
│   └── shared/          # Reusable components
├── hooks/               # Business logic and state management
├── types/               # TypeScript definitions
├── utils/               # Helper functions
└── constants.ts         # Static configuration
```

## Key Components

### Pills System

-   **PillsContainer**: Main container for filter pills
-   **FilterPillSwitch**: Routes filter types to appropriate pill components
-   **Individual Pills**: ColorFilterPill, SortPill, StandardFilterPill, BooleanFilterPill, MeasurementBucketsFilterPill, AvailabilityPills
-   **Dropdown System**: Manages pill dropdown positioning and behavior

### All Filters Modal

-   **AllFiltersModal**: Left-side modal with comprehensive filtering
-   **Accordion Filters**: Expandable sections for each filter type
-   **AvailabilityFilters**: Client-side "In stock" and "Available online" filters

## State Management

### Primary Hooks

-   **useProductSearch**: Main orchestrator - combines search, filters, sorting
-   **useProductSearchState**: Manages search query and pagination
-   **useProductFilters**: Handles filter selections and API integration
-   **useProductSort**: Manages dynamic sort options from API

### Redux Integration

-   **Furniture Model**: Core state (`src/models/furniture/`)
-   **Filter State**: `selectedFilterOptions`, `rawFilters`, `sortState`
-   **Availability Filters**: `inStockStore`, `availableOnline`

## Data Flow

1. **Search**: User types → `useSearchCompletions` → API suggestions → Results
2. **Filters**: User selects → Redux dispatch → API call → Results update
3. **Sort**: User selects → Redux dispatch → Re-fetch with sort params
4. **Availability**: Client-side filtering on existing results

## Filter Types

| Type         | Component                                          | Behavior                             | API Source     |
| ------------ | -------------------------------------------------- | ------------------------------------ | -------------- |
| Color        | ColorFilterPill                                    | Multi-select, color swatches         | API filters    |
| Size         | MeasurementBucketsFilterPill or StandardFilterPill | Multi-select, varies by product type | API filters    |
| Sort         | SortPill                                           | Single-select, radio options         | API sortOrders |
| Boolean      | BooleanFilterPill                                  | Toggle, immediate close              | API filters    |
| Standard     | StandardFilterPill                                 | Multi-select, checkbox list          | API filters    |
| Availability | AvailabilityPills                                  | Client-side, immediate apply         | Redux state    |

**Note**: Size filters adapt based on product type - some show measurement buckets (grouped by width/height/length), others show standard checkbox lists.

### Availability Filters vs Boolean Filters

**API Boolean Filters** (e.g., "Last Chance", "New Products"):
- Come from API `filters` response with `type: 'BOOLEAN'`
- Show result counts and can be disabled when count is 0
- Selections sent back to API as filter parameters
- Managed through `selectedFilterOptions` state

**Availability Filters** (special client-side filters):
- **"In stock at store"** → `inStockStore` → API query param `f-available-in-store`  
- **"Available online"** → `availableOnline` → API query param `online_sellable`
- Stored directly in Redux `furniture.filter` state (not in `selectedFilterOptions`)
- Always enabled with no counts shown (not dependent on API filter response)
- Styled to look like boolean filters but are actually query parameters
- Create synthetic `RawFilter` objects for consistent pill rendering

## Accessibility Patterns

### Pills (Dropdown Navigation)

-   **Tab**: Navigate between pills
-   **Enter/Space**: Open dropdown
-   **Arrow keys**: Navigate within dropdown options
-   **Space/Enter**: Select focused option
-   **Esc**: Close dropdown

### All Filters Modal

-   **Tab**: Navigate through modal elements
-   **Enter/Space**: Expand accordions, select options
-   **Arrow keys**: Not used for navigation
-   **Focus trap**: Keeps focus within modal

### Focus-Visible Pattern

-   **Mouse interactions**: No visual focus rings
-   **Keyboard interactions**: Clear focus indicators with white inner + black outer rings

## Key Patterns

### Dropdown Behavior

-   **Multi-select**: Stay open until Esc/outside click
-   **Single-select** (Sort): Close immediately on selection
-   **Whitespace clicks**: Don't close multi-select dropdowns
-   Smart positioning prevents viewport overflow

### Filter State

```typescript
// Selected options stored as Record<filterId, valueIds[]>
selectedFilterOptions: {
  "color": ["red", "blue"],
  "size": ["large"]
}
```

## Important Files

### Entry Points

-   `components/pills/PillsContainer.tsx` - Main pills UI
-   `components/modals/AllFiltersModal.tsx` - Modal UI
-   `hooks/useProductSearch.ts` - Main business logic

### Configuration

-   `constants.ts` - Default filter IDs, behavior constants
-   `types/core.ts` - Core TypeScript definitions

### State Management

-   `src/models/furniture/reducers.js` - Redux state structure
-   `hooks/useProductSearchState.ts` - Search query management

## Common Tasks

### Adding New Filter Type

1. Create pill component in `components/pills/filters/`
2. Create modal component in `components/modals/filters/`
3. Add case to `FilterPillSwitch` and `ModalFilterSwitch`
4. Update type definitions in `types/core.ts`

### Modifying Filter Behavior

-   **Dropdown behavior**: `hooks/useDropdownPillBehavior.ts`
-   **Filter processing**: `utils/filters.ts`
-   **Display logic**: `utils/display.ts`

### Debugging

-   **Redux DevTools**: Monitor furniture model state changes
-   **Network Tab**: Check API calls for filters/search
-   **Focus behavior**: Test with Tab navigation vs mouse clicks

## Analytics & Tracking

### Two Main Tracking Events

#### 1. Search Result Event (API Response)

Fired when search/filter API response arrives with these context properties:

-   **SearchTermDetails**: Full filter state (e.g., `search:chair,color:red,size:large`)
-   **SearchQueryDetails**: URL-style query params with default values filtered out (e.g., `q=chair&f-color=red&f-size=large`)
-   **ResultCount**: Number of results returned
-   **ProductIds**: First 20 product IDs from results
-   **APIResponseTime**: Search API response time

**Default Value Filtering**: SearchQueryDetails excludes default/empty values to keep tracking clean:

-   Skipped values: `'*'`, `''`, `'DEFAULT'`, `DEFAULT_SORT_OPTION_ID`, `false`, `null`, `undefined`, empty arrays
-   Filter params get `f-` prefix (e.g., `f-color=red`)
-   Only non-default, user-specified values are included

#### 2. Product Addition Event (Add to Composition)

Fired when user adds product from search results with these additional properties:

-   **SearchQueryDetails**: Same query params from search context
-   **SearchResultPosition**: Product's position in search results (calculated)

### Tracking Implementation

-   **useSearchTracking**: Manages both events via Redux tracking model
-   **Search context storage**: Context stored in Redux when search executes, attached when product added
-   **Filter tracking**: All filter changes tracked with `type: 'filter'`, `value`, and `filterId`
-   **Sort tracking**: Dynamic `eventAction` values from API for experimentation

### Search Types

-   **SEARCH_TYPES.QUICK_FILTER**: Pills/dropdown interactions
-   **SEARCH_TYPES.FILTER**: Modal filter interactions  
-   **SEARCH_TYPES.TEXT_BOX**: Search query changes

### Key Tracking Data Flow

1. User action → `trackSearchResult()` → Redux tracking state
2. API response → Search Result event with full context
3. Product addition → Product event with search context attached

### Implementation Notes

-   Tracking always active
-   Uses existing `models/tracking/` infrastructure
-   Boolean filters tracked as `'true'` or `REMOVE(filterId:true)`
