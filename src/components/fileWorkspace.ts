import { FileSignature, FileText, Paperclip } from "lucide-react";

export type FileWorkspaceView = "assets" | "brand-guidelines" | "contract";
export type FileWorkspacePageView = Exclude<FileWorkspaceView, "contract">;

export const FILE_WORKSPACE_ITEMS = [
  { id: "assets", label: "Assets", icon: Paperclip },
  { id: "brand-guidelines", label: "Brand Guidelines", icon: FileText },
  { id: "contract", label: "Contract", icon: FileSignature },
] as const;

export const FILE_WORKSPACE_TITLES: Record<FileWorkspacePageView, string> = {
  assets: "Assets",
  "brand-guidelines": "Brand Guidelines",
};

export function isClientFileHubView(value: string): value is "files" | "brand" {
  return value === "files" || value === "brand";
}
