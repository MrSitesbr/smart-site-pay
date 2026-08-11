# Plan: Corporate Client Document Management

Enable administrators to upload and manage optimized document photos for corporate clients.

## User Review Required

> [!IMPORTANT]
> The document upload will use a canvas-based optimization process to reduce image weight while maintaining quality, storing them as Base64 strings in the database.

- Do you have a specific maximum file size or resolution for these optimized document photos?
- Should these documents be visible to anyone other than administrators (e.g., the client themselves in a future portal)?

## Proposed Changes

### Database
- Add `documentos` (text array) column to `clientes_corp` table.
- Ensure RLS grants for `documentos` are permissive for admin access.

### Components
- Create `DocumentUpload.tsx`: A specialized version of the image upload component that includes client-side optimization (resizing/compression) via HTML5 Canvas.
- Update `AdminClienteCorpDetalhe.tsx`: Add a new "Documentos" section in the "Dados Gerais" tab or as a separate tab.

### Features
- Implement `optimizeImage` utility: Resizes images to a maximum dimension (e.g., 1200px) and applies JPEG compression (e.g., 0.7 quality) before conversion to Base64.

## Technical Details

- **Optimization Logic**:
  - Load File into `Image` object.
  - Draw to `HTMLCanvasElement` maintaining aspect ratio.
  - Export via `canvas.toDataURL('image/jpeg', 0.7)`.
- **Storage**: Append resulting strings to the `documentos` array in the `clientes_corp` table.
