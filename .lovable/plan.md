# Plan: Page Builder Optimization & Content Restoration

The user is reporting that when clicking "Sair" (Exit) in the admin, they see the old form of page editing instead of the new Page Builder, and that the requested 5 sections per page are missing.

## Technical Details

1.  **Issue 1: "Sair" redirecting to old editing view.**
    *   In `AdminPaginas.tsx`, the "Sair" button in the section view (when `selectedPage` is set) calls `setSelectedPage(null)`.
    *   The `AdminPaginas` component has two states: list view and section view. The section view (`if (selectedPage)`) currently shows a grid of sections with an "EDITAR NO BUILDER" button. This is likely what the user means by "old form of page editing".
    *   **Fix:** When a page is selected in the list view, immediately open the `PageBuilder` (Visual Editor) instead of showing the section list.

2.  **Issue 2: Missing 5 sections per page.**
    *   The migration `20260813160224_cd5e5602-4a5a-4e0d-89e0-4739145af12a.sql` only added 3 sections for Home and 1-2 for others.
    *   **Fix:** Execute a new migration to enrich these pages with at least 5 structured sections each (Hero, About, Services/Rooms, Stats/Benefits, Testimonials/FAQ, Contact).

## Proposed Changes

### Database (SQL Migration)
- Update `site_sections` for Home, Salas, Unidades, and Contato with 5+ sections each in the dynamic layout JSON.

### Admin Components
- **src/components/admin/AdminPaginas.tsx**:
    - Modify `loadPage` to set `setIsBuilding(true)` immediately.
    - Remove the middle "section grid" view entirely or make it inaccessible, ensuring clicking a page from the list goes straight to the Visual Editor.

### Page Builder
- **src/components/admin/PageBuilder.tsx**:
    - Ensure the "Sair/Voltar" button correctly returns to the page list.

## Verification Plan
1.  Verify the new migration adds 5+ sections to each page in the database.
2.  Navigate to Admin > Marketing / Site > Páginas.
3.  Click on "Home" and verify it opens the Visual Editor directly.
4.  Verify the Home page now has at least 5 sections visible in the editor.
5.  Click "Sair" and verify it returns to the page list.
