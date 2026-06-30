import { ImportTool } from "@/components/admin/import-tool";

export default function ImportPage() {
  return (
    <div>
      <h2 className="mb-1 font-display text-xl font-semibold">Nhập liệu từ file</h2>
      <p className="mb-5 text-sm text-muted-foreground">
        Tải lên Excel/CSV để nhập nhanh nguyên liệu hoặc sản phẩm — đỡ phải gõ tay từng dòng.
      </p>
      <ImportTool />
    </div>
  );
}
