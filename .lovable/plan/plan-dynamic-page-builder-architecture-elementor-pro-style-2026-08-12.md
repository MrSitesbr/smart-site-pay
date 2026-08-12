# Plan - Dynamic Page Builder Architecture (Elementor Pro Style)

Implement a robust, JSON-driven page builder architecture replacing static section management. This system uses a recursive tree schema for Sections, Columns, and Widgets, providing full layout control and real-time synchronization between the Admin Canvas and Public Frontend.

## User Review Required

> [!IMPORTANT]
> The database table `site_sections` will be updated to use a recursive JSON structure in the `content` field. Existing static sections will be migrated to this new format to maintain content.

- Do you have specific "Widgets" in mind beyond the standard ones (Heading, Text, Image, Button, Form, Gallery)?
- Should the "Admin Bypass Mode" permissions also apply to the new Widget and Section creation tools? (Assumed yes for consistency).

## Proposed Changes

### Database & Schema
- Update `site_sections` usage to store a recursive layout JSON in the `content` field.
- JSON Schema includes:
  - **Sections**: Background (color/image/video), Width (Boxed/Full), Padding/Margin.
  - **Columns**: Width percentage, Background, Padding.
  - **Widgets**: Type, Content (text/media), Styles (typography/alignment).

### Frontend Architecture
#### `src/components/PageRenderer.tsx` (New)
- Core engine that recursively renders the JSON tree.
- Handles responsive layouts (CSS Grid/Flexbox) based on column percentages.
- Responsible for both the public site and the admin preview canvas.

#### `src/components/admin/PageBuilder.tsx` (New)
- The main editing interface.
- Sidebar with 3 tabs (Content, Style, Advanced) inspired by Elementor.
- Drag-and-drop or reorder capabilities for Sections and Widgets.
- "Structure" view vs "Visual" preview modes.

#### `src/components/admin/WidgetRegistry.tsx` (New)
- Defines available widgets and their properties.
- Map widget types (heading, image, form, etc.) to their respective UI components.

#### `src/components/admin/SectionEditor.tsx` (New)
- Dedicated controls for Section and Column layout settings (Full Width, Paddings, Backgrounds).

### Refactoring
#### `src/components/admin/AdminPaginas.tsx`
- Refactor to integrate the new `PageBuilder` and `PageRenderer`.
- Update the saving logic to handle the recursive JSON structure.

#### Global Layout
- Remove restrictive `container` or fixed padding wrappers in `Index.tsx` or global routes to allow true "Full Width" sections.

## Technical Details
- **JSON Tree**: Recursive structure allows nesting widgets inside columns inside sections.
- **Dynamic Forms**: The `form` widget will be dynamic, accepting a `formId` or `type` prop, allowing administrators to swap or remove forms without code changes.
- **Real-time Sync**: Use React state and Supabase updates to ensure changes in the Admin Inspector are immediately visible in the Canvas.
- **Tailwind Dynamic Classes**: Careful usage of Tailwind classes or inline styles for custom numeric values (padding/margin/z-index).

## Verification Plan
- **Layout Test**: Verify "Full Width" sections span 100% of the viewport without scrollbars.
- **Modular Test**: Add a section, split it into 3 columns, and add different widgets (Image, Text, Form) to verify rendering.
- **Persistence Test**: Edit a widget's text and color, save, and refresh the public page to verify the JSON persists correctly.
- **Form Swap**: Change a column's widget from "Contact Form" to "Image" and verify the change reflects instantly.
