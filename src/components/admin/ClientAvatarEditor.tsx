import { useRef, useState } from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import EventAvatar from "./EventAvatar";

type Props = {
  clientId: string;
  name: string;
  value?: string | null;
  onChange: (url: string | null) => void;
  size?: number;
};

async function createAvatarBlob(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = 150;
  canvas.height = 150;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Não foi possível preparar a imagem.");
  }

  const cropSize = Math.min(bitmap.width, bitmap.height);
  const cropX = (bitmap.width - cropSize) / 2;
  const cropY = (bitmap.height - cropSize) / 2;
  context.drawImage(bitmap, cropX, cropY, cropSize, cropSize, 0, 0, 150, 150);
  bitmap.close();

  const canvasBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
  if (!canvasBlob) throw new Error("Não foi possível converter a imagem.");

  const jpeg = new Uint8Array(await canvasBlob.arrayBuffer());
  const hasJfifHeader = jpeg.length > 18
    && jpeg[0] === 0xff && jpeg[1] === 0xd8
    && jpeg[2] === 0xff && jpeg[3] === 0xe0
    && jpeg[6] === 0x4a && jpeg[7] === 0x46 && jpeg[8] === 0x49 && jpeg[9] === 0x46;
  if (!hasJfifHeader) throw new Error("O navegador não gerou um JPEG compatível.");

  jpeg[13] = 1;
  jpeg[14] = 0;
  jpeg[15] = 72;
  jpeg[16] = 0;
  jpeg[17] = 72;
  return new Blob([jpeg], { type: "image/jpeg" });
}

function getStoredAvatarPath(url?: string | null): string | null {
  if (!url) return null;
  const marker = "/storage/v1/object/public/client-avatars/";
  const markerIndex = url.indexOf(marker);
  if (markerIndex < 0) return null;
  return decodeURIComponent(url.slice(markerIndex + marker.length).split("?")[0]);
}

export default function ClientAvatarEditor({ clientId, name, value, onChange, size = 64 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);

  async function updateAvatar(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem.");
      return;
    }

    setSaving(true);
    let uploadedPath: string | null = null;
    try {
      const blob = await createAvatarBlob(file);
      if (blob.size > 100_000) throw new Error("A imagem otimizada excedeu o limite de 100 KB.");

      uploadedPath = `${clientId}/${crypto.randomUUID()}.jpg`;
      const { error: uploadError } = await supabase.storage.from("client-avatars").upload(uploadedPath, blob, {
        contentType: "image/jpeg",
        cacheControl: "31536000",
        upsert: false,
      });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("client-avatars").getPublicUrl(uploadedPath);
      const { error: updateError } = await supabase.from("clientes_corp").update({ avatar_url: data.publicUrl }).eq("id", clientId);
      if (updateError) throw updateError;

      const previousPath = getStoredAvatarPath(value);
      if (previousPath) await supabase.storage.from("client-avatars").remove([previousPath]);
      onChange(data.publicUrl);
      toast.success("Avatar atualizado.");
    } catch (error) {
      if (uploadedPath) await supabase.storage.from("client-avatars").remove([uploadedPath]);
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar o avatar.");
    } finally {
      setSaving(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function removeAvatar() {
    if (!value) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("clientes_corp").update({ avatar_url: null }).eq("id", clientId);
      if (error) throw error;
      const storedPath = getStoredAvatarPath(value);
      if (storedPath) await supabase.storage.from("client-avatars").remove([storedPath]);
      onChange(null);
      toast.success("Avatar removido.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível remover o avatar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <EventAvatar name={name} photoUrl={value} size={size} className="ring-1 ring-border" />
      <div className="flex flex-wrap gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          aria-label="Selecionar imagem de avatar"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void updateAvatar(file);
          }}
        />
        <Button type="button" size="sm" variant="outline" disabled={saving} onClick={() => inputRef.current?.click()}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
          {value ? "Alterar avatar" : "Adicionar avatar"}
        </Button>
        {value && (
          <Button type="button" size="icon" variant="ghost" className="h-9 w-9" disabled={saving} onClick={() => void removeAvatar()} aria-label="Remover avatar" title="Remover avatar">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        )}
      </div>
    </div>
  );
}
