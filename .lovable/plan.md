

## Problem

On mobile (single column), the CSS `order` classes cause Step 3 (QR preview, `order-1`) to render first, then Steps 1 and 2 (`order-2`). The user wants: Step 1 → Step 2 (collapsed) → Step 3.

## Plan

### File: `src/components/landing/QRCreatorPublic.tsx`

1. **Remove the CSS order trick** — remove `order-2 lg:order-1` and `order-1 lg:order-2` classes. Restructure the layout so on mobile everything flows naturally: Step 1, Step 2, Step 3. On desktop (`lg:`), keep the current two-column layout with the QR preview on the right.

2. **Make Step 2 collapsible on mobile** — Add a `showDesign` state (default `false`). On mobile, Step 2's header becomes a clickable toggle that expands/collapses the color picker and dot style options (using ChevronDown/ChevronUp). On desktop (`lg:`) the content is always visible.

3. **Restructure the grid layout** for mobile:
   - Single column: Step 1 (URL input) → Step 2 (collapsed design options) → Step 3 (QR preview + download button)
   - Desktop (`lg:`): Left column has Steps 1 and 2 (both expanded), right column has Step 3 — same as current desktop layout

### Technical details

- Add `const [showDesign, setShowDesign] = useState(false)` state
- Use `useIsMobile()` hook (already exists in the project) to determine if Step 2 content should be collapsible
- Step 2 header: wrap in a `button` on mobile with chevron icon; on desktop keep as static heading
- Step 2 content: conditionally render based on `showDesign || !isMobile`
- Remove the `order-*` classes from both panels
- Keep the UTM builder inside Step 2's collapsible area (or move after Step 2, before Step 3)

