# Plan - Rename Page Builder to "Dev" and Add JSON Import/Export

The user wants to rename the Page Builder from "Elementor" to "Dev" and implement functionality to import and export entire pages or sections as JSON files.

## User Review Required

> [!IMPORTANT]
> The "Import/Export" feature for "Complete Sections" will be added to the Inspector panel (when a section is selected) and to the global Editor Toolbar (for the entire page).

## Proposed Changes

### 1. Rename Branding
- **src/components/admin/AdminPaginas.tsx**: Update text from "estilo Elementor" to "estilo Dev".
- **src/components/admin/PageBuilder.tsx**: Rename internal references if they exist (branding-wise).

### 2. Add Export Functionality
- Implement `downloadJSON` utility to trigger a browser download of the current `layout` state.
- Add an "Exportar JSON" button in the `PageBuilder` top bar.
- Add an "Exportar Seção" button in the `Inspector` when a section is selected.

### 3. Add Import Functionality
- Implement a file picker that reads `.json` files and validates the schema.
- Add an "Importar JSON" button in the `PageBuilder` top bar (replaces current layout).
- Add an "Importar Seção" button in the `PageBuilder` empty state or section list.

### 4. UI Updates
- Add `Download` and `Upload` icons from `lucide-react`.
- Update the `AdminPaginas` description text.

## Technical Details
- Files to modify:
    - `src/components/admin/AdminPaginas.tsx` (Description update)
    - `src/components/admin/PageBuilder.tsx` (Buttons and logic for page-level JSON)
    - `src/components/admin/Inspector.tsx` (Buttons for section-level JSON)
- Schema validation will be basic (checking for `id` and `columns` or `widgets` arrays) to prevent crashes.
