import { Image as ImageIcon, Palette } from "lucide-react";

export type FileWorkspaceView = "assets" | "brand-guidelines";
export type FileWorkspacePageView = FileWorkspaceView;

export const FILE_WORKSPACE_ITEMS = [
  { id: "assets", label: "Assets", icon: ImageIcon },
  { id: "brand-guidelines", label: "Brand", icon: Palette },
] as const;

export const FILE_WORKSPACE_TITLES: Record<FileWorkspacePageView, string> = {
  assets: "Files",
  "brand-guidelines": "Files",
};

export function isClientFileHubView(value: string): value is "files" | "brand" {
  return value === "files" || value === "brand";
}
