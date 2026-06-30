import { Download, FileText, FolderPlus, LockKeyhole, MoreVertical, Plus, Send, Trash2, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { AssetFile, Project } from "../types";
import { Btn, Panel, StatusBadge } from "./shared";

type HubRole = "admin" | "client";
type AssetStatus = NonNullable<AssetFile["status"]>;
export type FileHubSectionId = "assets" | "brand-guidelines";

const FILE_HUB_SECTION_TO_FOLDER: Record<FileHubSectionId, string> = {
  assets: "Brand Assets",
  "brand-guidelines": "Brand Guidelines",
};

const statusMeta: Record<AssetStatus, { label: string; badge: string; icon: typeof FileText }> = {
  shared: { label: "Shared", badge: "is-success", icon: FileText },
  draft: { label: "Draft", badge: "is-progress", icon: FileText },
  requested: { label: "Requested", badge: "is-review", icon: Upload },
  internal: { label: "Internal", badge: "is-locked", icon: LockKeyhole },
  approved: { label: "Approved", badge: "is-success", icon: FileText },
};

function assetStatus(asset: AssetFile): AssetStatus {
  if (asset.status) return asset.status;
  return asset.sharedWithClient ? "shared" : "internal";
}

function assetVersion(asset: AssetFile): string {
  if (asset.version) return asset.version;
  const match = asset.name.match(/\bv\d+(\.\d+)?\b/i);
  return match?.[0] ?? "v1";
}

function consolidatedWorkspaceFiles(project: Project): AssetFile[] {
  return [
    {
      id: `${project.id}-brand-guidelines-file`,
      name: "Brand Guidelines.pdf",
      category: "Brand Guidelines",
      size: "Generated",
      uploadedAt: project.startDate,
      sharedWithClient: true,
      status: "shared",
      source: "studio",
      version: "v1",
      requestNote: "Consolidated brand colors, typography, and style direction.",
    },
    {
      id: `${project.id}-brand-assets-index`,
      name: "Brand Assets Index.pdf",
      category: "Brand Assets",
      size: `${project.brand.colors.length} colors · ${project.brand.fonts.length} fonts`,
      uploadedAt: project.startDate,
      sharedWithClient: true,
      status: "shared",
      source: "studio",
      version: "v1",
      requestNote: "Live brand asset reference generated from the current brand profile.",
    },
  ];
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileHubSection({
  title,
  role,
  files,
  isCustom = false,
  isSelected = false,
  sectionId,
  sectionRef,
  onSelect,
  onUpload,
  onDelete,
}: {
  title: string;
  role: HubRole;
  files: AssetFile[];
  isCustom?: boolean;
  isSelected?: boolean;
  sectionId?: FileHubSectionId;
  sectionRef?: (node: HTMLElement | null) => void;
  onSelect?: () => void;
  onUpload?: (fileList: FileList) => void;
  onDelete?: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const requested = title.toLowerCase().includes("request");
  const internal = title.toLowerCase().includes("internal");

  return (
    <section
      className="file-hub-section"
      id={sectionId ? `file-hub-section-${sectionId}` : undefined}
      ref={sectionRef}
      data-file-hub-section={sectionId}
    >
      <div className="file-hub-folder-grid">
        <button
          type="button"
          className={`file-hub-folder ${requested ? "is-requested" : ""} ${internal ? "is-internal" : ""} ${isSelected ? "is-selected" : ""}`}
          onClick={() => {
            onSelect?.();
            if (files.length > 0) setOpen(true);
          }}
          onDoubleClick={event => {
            event.preventDefault();
            if (files.length > 0) setOpen(true);
          }}
          disabled={files.length === 0 && !isCustom && !onSelect}
          title={onSelect ? "Click to select as upload target" : "Click to open folder"}
        >
          <span className="file-hub-folder-count">{files.length}</span>
          <span className="file-hub-folder-icon">
            <img src="/folder-3d.svg" alt="" aria-hidden="true" />
          </span>
          <span className="file-hub-folder-copy">
            <strong>{title}</strong>
          </span>
        </button>
      </div>

      {open && (
        <FileHubFolderModal
          title={title}
          role={role}
          files={files}
          requested={requested}
          onClose={() => setOpen(false)}
          onUpload={onUpload}
          onDelete={onDelete}
        />
      )}
    </section>
  );
}

function FileHubFolderModal({
  title,
  role,
  files,
  requested,
  onClose,
  onUpload,
  onDelete,
}: {
  title: string;
  role: HubRole;
  files: AssetFile[];
  requested: boolean;
  onClose: () => void;
  onUpload?: (fileList: FileList) => void;
  onDelete?: (id: string) => void;
}) {
  const modalFileRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <div className="file-hub-modal-backdrop" onClick={onClose} />
      <div className={`file-hub-modal ${requested ? "is-requested" : ""}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="file-hub-modal-head">
          <div>
            <span>{requested ? "Upload request folder" : "Folder"}</span>
            <h3>{title}</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Close folder">
            <X size={16} />
          </button>
        </div>
        {requested && (
          <div className="file-hub-request-callout">
            <strong>{role === "client" ? "The studio needs this from you" : "Client upload needed"}</strong>
            <span>Upload requests are kept separate from regular files so the next action is clear.</span>
          </div>
        )}
        <div className="file-hub-list is-modal-list">
          {files.map(file => <FileHubRow key={file.id} file={file} role={role} onDelete={onDelete} />)}
        </div>
        {onUpload && (
          <div className="file-hub-modal-upload">
            <input
              ref={modalFileRef}
              type="file"
              multiple
              style={{ display: "none" }}
              onChange={e => {
                if (e.currentTarget.files?.length) onUpload(e.currentTarget.files);
                e.currentTarget.value = "";
              }}
            />
            <button type="button" className="file-hub-modal-upload-btn" onClick={() => modalFileRef.current?.click()}>
              <Plus size={13} />
              Add files to this folder
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function FileRowMenu({ file, role, onDelete }: { file: AssetFile; role: HubRole; onDelete?: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const status = assetStatus(file);
  const isRequested = status === "requested";

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div className="file-hub-menu-wrap" ref={ref}>
      <button
        type="button"
        className="file-hub-menu-trigger"
        onClick={e => { e.stopPropagation(); setOpen(!open); }}
        aria-label="File actions"
      >
        <MoreVertical size={15} />
      </button>
      {open && (
        <div className="file-hub-menu-popover">
          <button type="button" onClick={e => { e.stopPropagation(); setOpen(false); }}>
            {isRequested ? (role === "client" ? <><Upload size={13} />Upload</> : <><Send size={13} />Nudge</>) : <><Download size={13} />Download</>}
          </button>
          {onDelete && (
            <button type="button" className="is-danger" onClick={e => { e.stopPropagation(); onDelete(file.id); setOpen(false); }}>
              <Trash2 size={13} />Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function FileHubRow({ file, role, onDelete }: { file: AssetFile; role: HubRole; onDelete?: (id: string) => void }) {
  const status = assetStatus(file);
  const meta = statusMeta[status];
  const Icon = meta.icon;

  return (
    <div className={`file-hub-row is-${status}`}>
      <span className="file-hub-rail" aria-hidden="true" />
      <span className="file-hub-icon">
        <Icon />
      </span>
      <div className="file-hub-copy">
        <div className="file-hub-title-line">
          <strong>{file.name}</strong>
          <span>{assetVersion(file)}</span>
        </div>
        <div className="file-hub-meta">
          <span>{file.category}</span>
          <span>{file.size}</span>
          <span>{file.uploadedAt}</span>
          {file.source && <span>{file.source === "client" ? "Client" : "Studio"}</span>}
        </div>
        {file.requestNote && <p>{file.requestNote}</p>}
      </div>
      <div className="file-hub-controls">
        <StatusBadge status={meta.badge} label={meta.label} />
        <FileRowMenu file={file} role={role} onDelete={onDelete} />
      </div>
    </div>
  );
}

function FileHubBrandReference({ project }: { project: Project }) {
  return (
    <Panel className="file-hub-brand-panel">
      <div className="file-hub-brand-head">
        <div>
          <span className="file-hub-kicker">Brand reference</span>
          <h2>Colors and typography</h2>
        </div>
        <p>Keep the visual system visible while organizing files and folders.</p>
      </div>
      <div className="file-hub-brand-grid">
        <section className="file-hub-brand-card">
          <div className="file-hub-brand-card-label">Colors</div>
          <div className="file-hub-brand-swatches">
            {project.brand.colors.map(color => (
              <div key={color.id} className="file-hub-brand-swatch">
                <span className="file-hub-brand-swatch-chip" style={{ backgroundColor: color.hex }} aria-hidden="true" />
                <div className="file-hub-brand-swatch-copy">
                  <strong>{color.name}</strong>
                  <span>{color.hex.toUpperCase()}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="file-hub-brand-card">
          <div className="file-hub-brand-card-label">Typography</div>
          <div className="file-hub-brand-fonts">
            {project.brand.fonts.map(font => (
              <div key={font.id} className="file-hub-brand-font">
                <div className="file-hub-brand-font-preview">Aa</div>
                <div className="file-hub-brand-font-copy">
                  <strong>{font.name}</strong>
                  <span>{font.style}{font.usage ? ` · ${font.usage}` : ""}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Panel>
  );
}

export function FileAssetHub({ project, role, onFilesAdded, focusSection }: {
  project: Project;
  role: HubRole;
  onFilesAdded?: (files: AssetFile[]) => void;
  focusSection?: FileHubSectionId;
}) {
  const [customFolders, setCustomFolders] = useState<string[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<AssetFile[]>([]);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const hubRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sectionRefs = useRef<Partial<Record<FileHubSectionId, HTMLElement | null>>>({});

  const coreFolders = ["Brand Assets", "Brand Guidelines"];
  const milestoneFolders = project.milestones.map(m => m.title);
  const allFolderNames = [...coreFolders, ...milestoneFolders, ...customFolders];

  const allFiles = [...consolidatedWorkspaceFiles(project), ...project.assets, ...uploadedFiles].filter(f => !deletedIds.has(f.id));
  const requested = allFiles.filter(asset => assetStatus(asset) === "requested");
  const shared = allFiles.filter(asset => assetStatus(asset) !== "requested" && asset.sharedWithClient);
  const internal = allFiles.filter(asset => assetStatus(asset) !== "requested" && !asset.sharedWithClient);

  function folderFiles(folderName: string): AssetFile[] {
    if (folderName === "Brand Assets") return allFiles.filter(a => a.category === "Brand Assets");
    if (folderName === "Brand Guidelines") return allFiles.filter(a => a.category === "Brand Guidelines");
    if (folderName === "Foundation") return allFiles.filter(a => a.category === "Brand Assets" || assetStatus(a) === "requested");
    if (folderName === "Design & Build") return allFiles.filter(a => a.category === "Design" || a.category === "Deliverables");
    if (folderName === "Launch") return allFiles.filter(a => a.category === "Launch Prep");
    return uploadedFiles.filter(f => f.category === folderName);
  }

  function processFilesTo(folder: string, fileList: FileList) {
    const newAssets: AssetFile[] = Array.from(fileList).map((file, i) => ({
      id: `upload-${Date.now()}-${i}`,
      name: file.name,
      category: folder,
      size: formatFileSize(file.size),
      uploadedAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      sharedWithClient: true,
      status: "shared" as AssetFile["status"],
      source: role === "admin" ? "studio" as const : "client" as const,
    }));
    setUploadedFiles(prev => [...prev, ...newAssets]);
    onFilesAdded?.(newAssets);
  }

  function processFiles(fileList: FileList) {
    if (!selectedFolder) return;
    processFilesTo(selectedFolder, fileList);
  }

  function deleteFile(id: string) {
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
    setDeletedIds(prev => new Set(prev).add(id));
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files.length > 0) processFiles(e.dataTransfer.files);
  };

  const addFolder = () => {
    const name = newFolderName.trim();
    if (!name || allFolderNames.some(f => f.toLowerCase() === name.toLowerCase())) return;
    setCustomFolders(prev => [...prev, name]);
    setSelectedFolder(name);
    setNewFolderName("");
    setShowNewFolder(false);
  };

  const summary = role === "admin"
    ? [
        ["Client-facing", shared.length],
        ["Requests", requested.length],
        ["Internal", internal.length],
      ]
    : [
        ["Ready", shared.length],
        ["Requests", requested.length],
        ["Latest", [...shared].reverse()[0]?.uploadedAt ?? "Not yet"],
      ];

  useEffect(() => {
    if (!focusSection) return;
    const nextFolder = FILE_HUB_SECTION_TO_FOLDER[focusSection];
    setSelectedFolder(nextFolder);
    const target = sectionRefs.current[focusSection] ?? hubRef.current;
    if (!target) return;
    requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [focusSection]);

  return (
    <div id="file-hub-assets-view" className="file-hub-stack" ref={hubRef}>
      <FileHubBrandReference project={project} />
      <Panel className="file-hub-panel">
        <div className="file-hub-top">
          <div>
            <span className="file-hub-kicker">File hub</span>
            <h2>Project files</h2>
          </div>
          <div className="file-hub-summary" aria-label="File summary">
            {summary.map(([label, value]) => (
              <div key={label}>
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="file-hub-layout">
          <div className="file-hub-upload-zone">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              style={{ display: "none" }}
              onChange={e => {
                if (e.currentTarget.files?.length) processFiles(e.currentTarget.files);
                e.currentTarget.value = "";
              }}
            />
            <div
              className={`file-hub-dropzone ${dragActive ? "is-active" : ""} ${!selectedFolder ? "is-disabled" : ""}`}
              role="button"
              tabIndex={selectedFolder ? 0 : -1}
              aria-disabled={!selectedFolder}
              onDragEnter={selectedFolder ? handleDrag : undefined}
              onDragLeave={selectedFolder ? handleDrag : undefined}
              onDragOver={selectedFolder ? handleDrag : undefined}
              onDrop={selectedFolder ? handleDrop : undefined}
              onClick={() => selectedFolder && fileInputRef.current?.click()}
              onKeyDown={event => {
                if (selectedFolder && (event.key === "Enter" || event.key === " ")) {
                  event.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
            >
              <div className="file-hub-dropzone-icon">
                <Plus size={16} />
              </div>
              <div>
                <div className="file-hub-dropzone-title">Upload files or drag here</div>
                <div className="file-hub-dropzone-hint">SVG, PDF, ZIP, images, documents</div>
              </div>
            </div>
            <div className="file-hub-upload-folder-row">
              <span className="file-hub-upload-folder-label">Save to</span>
              <select
                className="dashboard-select file-hub-folder-select"
                value={selectedFolder ?? ""}
                onChange={e => setSelectedFolder(e.target.value || null)}
              >
                <option value="" disabled>Choose folder</option>
                {coreFolders.map(name => <option key={name} value={name}>{name}</option>)}
                <option disabled>───</option>
                {milestoneFolders.map(name => <option key={name} value={name}>{name}</option>)}
                {customFolders.length > 0 && <option disabled>───</option>}
                {customFolders.map(name => <option key={name} value={name}>{name}</option>)}
              </select>
              <span className="file-hub-upload-folder-or">or</span>
              <button
                type="button"
                className="file-hub-upload-new-folder-btn"
                onClick={() => { setShowNewFolder(true); }}
              >
                <Plus size={10} /> New folder
              </button>
            </div>
          </div>

          <div className="file-hub-folders-panel">
            {milestoneFolders.map(name => (
              <FileHubSection
                key={name}
                title={name}
                role={role}
                files={folderFiles(name)}
                isSelected={selectedFolder === name}
                onSelect={() => setSelectedFolder(name)}
                onUpload={(fl) => processFilesTo(name, fl)}
                onDelete={deleteFile}
              />
            ))}

            <div className="file-hub-other-section">
              <div className="file-hub-other-heading">Other</div>
              <div className="file-hub-other-folders">
                {customFolders.map(name => (
                  <FileHubSection
                    key={name}
                    title={name}
                    role={role}
                    files={folderFiles(name)}
                    isCustom
                    isSelected={selectedFolder === name}
                    onSelect={() => setSelectedFolder(name)}
                    onUpload={(fl) => processFilesTo(name, fl)}
                    onDelete={deleteFile}
                  />
                ))}
                {showNewFolder ? (
                  <div className="file-hub-new-folder">
                    <input
                      className="file-hub-new-folder-input"
                      value={newFolderName}
                      onChange={e => setNewFolderName(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") addFolder(); if (e.key === "Escape") { setShowNewFolder(false); setNewFolderName(""); } }}
                      placeholder="Folder name"
                      autoFocus
                    />
                    <Btn size="sm" variant="primary" onClick={addFolder} disabled={!newFolderName.trim()}>Create</Btn>
                    <button type="button" className="file-hub-new-folder-cancel" onClick={() => { setShowNewFolder(false); setNewFolderName(""); }}>
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <button type="button" className="file-hub-add-folder" onClick={() => setShowNewFolder(true)}>
                    <FolderPlus size={13} />
                    New folder
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}
