# Plan: Centralized Media Library Implementation (WordPress Style)

Implement a centralized media management system to replace manual URL inputs across the system, especially within the Page Builder.

## User Review Required

> [!IMPORTANT]
> The current storage strategy uses **Base64** strings in the database because of historical issues with Supabase storage buckets in this sandbox. We will continue this pattern by storing media as Base64 in the new `media_library` table to ensure reliability, while implementing a clear UI for managing these assets.

## Proposed Changes

### Database & Backend
- Create `public.media_library` table to store metadata and Base64 content/URLs.
- Enable RLS with full access for the hardcoded admin bypass mode.

### New Components
- **`MediaPickerModal.tsx`**: A reusable dialog with two tabs:
  - **Upload**: Dropzone for multi-file processing with image optimization (resizing/compression).
  - **Library**: Searchable gallery of existing assets with selection logic.
- **`AdminMidias.tsx`**: Full-page management interface for the media library.

### Admin Integration
- Add "Mídias" to the `AdminSidebar.tsx` navigation under "Marketing / Site".
- Register the `/admin/midias` route in `App.tsx`.
- Add a new tab in `Admin.tsx` to display the media library.

### Page Builder & CRM Integration
- Update `Inspector.tsx` to replace `Input` fields for images/backgrounds with a button that opens the `MediaPickerModal`.
- Update `AdminUnidadeDetalhe.tsx` and `AdminSalaDetalhe.tsx` to use the new picker.

## Technical Details

### Database Schema
```sql
CREATE TABLE public.media_library (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    filename text NOT NULL,
    file_type text NOT NULL, -- 'image' | 'video' | 'audio'
    mime_type text,
    url text NOT NULL, -- Base64 data URL or external link
    size_bytes bigint,
    created_at timestamptz DEFAULT now()
);
GRANT ALL ON public.media_library TO authenticated;
GRANT ALL ON public.media_library TO anon;
```

### Media Processing
- Use HTML5 Canvas to resize large images before converting to Base64 to save database space (targeting ~200KB per high-quality image).
- Support for `jpg`, `png`, `webp`, and `svg`.
