"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImageUp, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { updateSiteImage } from "@/app/admin/hinh-anh/actions";

export type SiteImage = { key: string; url: string; label: string | null };

function Row({ img }: { img: SiteImage }) {
  const router = useRouter();
  const [url, setUrl] = useState(img.url);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();

  async function upload(file: File) {
    setUploading(true);
    setErr("");
    try {
      const supabase = createClient();
      const path = `site/${img.key}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      setUrl(data.publicUrl);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Lỗi tải ảnh");
    } finally {
      setUploading(false);
    }
  }

  function save() {
    setSaved(false);
    setErr("");
    start(async () => {
      const res = await updateSiteImage(img.key, url);
      if (res.ok) {
        setSaved(true);
        router.refresh();
      } else setErr(res.error ?? "Lỗi");
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-paper p-4 sm:flex-row sm:items-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={img.label ?? img.key} className="h-24 w-32 flex-none rounded-lg object-cover" />
      <div className="flex-1">
        <div className="mb-1 text-sm font-medium">{img.label ?? img.key}</div>
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{img.key}</div>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="mt-2 w-full rounded-xl border border-border bg-paper px-3 py-2 text-sm outline-none focus:border-primary"
          placeholder="URL ảnh"
        />
        {err && <p className="mt-1 text-xs text-red-600">{err}</p>}
      </div>
      <div className="flex gap-2">
        <label className="cursor-pointer rounded-full border border-border px-4 py-2 text-[11px] uppercase tracking-wide">
          {uploading ? "Đang tải…" : <span className="flex items-center gap-1"><ImageUp className="h-4 w-4" /> Tải lên</span>}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        </label>
        <button onClick={save} disabled={pending} className="rounded-full bg-foreground px-4 py-2 text-[11px] uppercase tracking-wide text-background disabled:opacity-60">
          {saved ? <span className="flex items-center gap-1"><Check className="h-4 w-4" /> Đã lưu</span> : "Lưu"}
        </button>
      </div>
    </div>
  );
}

export function SiteImageManager({ images }: { images: SiteImage[] }) {
  return (
    <div className="space-y-4">
      {images.map((img) => (
        <Row key={img.key} img={img} />
      ))}
      {images.length === 0 && (
        <p className="text-sm text-muted-foreground">Chưa có ảnh — hãy chạy <code>extend3.sql</code>.</p>
      )}
    </div>
  );
}
