# Search & Filters - QA Checklist

Essential user journeys for PR reviewers and internal QA testing.

## Core User Journeys

### 1. Search Flow

-   [ ] Type in search box → suggestions appear
-   [ ] Arrow keys navigate suggestions
-   [ ] Click/Enter on suggestion → executes search
-   [ ] "Results from '[term]'" text displays

### 2. Basic Filter Usage

-   [ ] Click filter pills → dropdowns open
-   [ ] Select options → pill text updates with selection
-   [ ] Active filters show dark borders
-   [ ] Multiple selections show count (e.g., "Red + 2")

### 3. Sort Functionality

-   [ ] Sort pill only appears when API provides sort options
-   [ ] Default sort shows "Sort" (not "Best Match")
-   [ ] Non-default selections show specific option name
-   [ ] Sort pill highlights only for non-default selections

### 4. All Filters Modal

-   [ ] "All Filters" button opens modal from left
-   [ ] Only one accordion section open at a time
-   [ ] Availability filters appear as checkboxes at bottom (not in accordion) (Available in store, Available online)
-   [ ] "Clear All" resets everything including availability filters
-   [ ] Modal closes via X, background click, or Escape

### 5. Availability Filters

-   [ ] "In stock at [Store Name]" shows dynamic store name
-   [ ] Active availability filters show as clickable pills
-   [ ] Clicking availability pills immediately removes filter
-   [ ] Changes apply instantly (no counts shown)

## Focus Behavior (Key Accessibility Feature)

### Mouse Interactions

-   [ ] Clicking filter pills shows **no visual focus** in dropdown options
-   [ ] Sort dropdown shows **no focus** on options when opened via click

### Keyboard Interactions

-   [ ] Tab/Enter/arrows show **appropriate focus indicators**
-   [ ] Sort dropdown shows focus on selected option when opened via keyboard
-   [ ] Consistent focus ring styling (white inner + black outer)

## Pill Dropdown Behavior Testing

### Multi-Select Dropdowns (Color, Size, etc.)

-   [ ] Clicking on filter options keeps dropdown open
-   [ ] Clicking on whitespace/padding inside dropdown keeps dropdown open
-   [ ] Can select multiple options without dropdown closing
-   [ ] Dropdown only closes via: Esc, click outside, or clicking pill again

### Single-Select Dropdowns (Sort)

-   [ ] Clicking on sort option immediately closes dropdown
-   [ ] Only one option can be selected at a time
-   [ ] Selection updates pill text and closes dropdown automatically

## Critical Edge Cases

### Sort Edge Cases

-   [ ] Different sort options work across different product searches

### Filter Edge Cases

-   [ ] Empty filter states handled appropriately
-   [ ] Disabled filter options visible but non-interactive (unless it is already checked/applied)
-   [ ] No results state displays properly

### Availability Filter Edge Cases

-   [ ] Clear All includes availability filters in scope
-   [ ] Availability pills disappear when filters are removed

## Quick Smoke Test (5 mins)

1. **Search**: Type "chair" → click suggestion → verify results
2. **Filter**: Click "Color" → select color → verify pill updates
3. **Sort**: Click "Sort" → select non-default option → verify pill shows option name
4. **Modal**: Click "All Filters" → test one accordion → verify "Clear All"
5. **Availability**: Check "In stock at store" → verify pill appears → click pill to remove
6. **Keyboard**: Tab through pills → open dropdown with Enter → navigate with arrows

## Browser/Device Testing

-   [ ] Chrome, Firefox, Safari (latest versions)
-   [ ] Mobile responsive behavior
-   [ ] Keyboard-only navigation works completely
-   [ ] Screen reader compatibility (basic test)

---

**Pass Criteria**: All checkboxes complete without blocking issues. Minor cosmetic issues can be noted but shouldn't block the PR.

**Focus Areas for Reviewers**:

-   Sort functionality (dynamic behavior)
-   Availability filter integration
-   Focus-visible behavior (mouse vs keyboard)
-   Modal accordion behavior
