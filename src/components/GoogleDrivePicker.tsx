import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, FileImage, FileType, Search, Check } from "lucide-react";
import { toast } from "sonner";

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedAt: string;
  size: string;
}

// Mock "My Drive" contents — in a real integration these come from
// the Google Drive API (drive.files.list) after OAuth.
const MOCK_DRIVE: DriveFile[] = [
  { id: "1", name: "Essay - Final Draft.pdf", mimeType: "application/pdf", modifiedAt: "2025-04-12", size: "248 KB" },
  { id: "2", name: "Lab Report 3.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", modifiedAt: "2025-04-10", size: "82 KB" },
  { id: "3", name: "Diagram.png", mimeType: "image/png", modifiedAt: "2025-04-08", size: "1.4 MB" },
  { id: "4", name: "Research Notes.pdf", mimeType: "application/pdf", modifiedAt: "2025-04-05", size: "512 KB" },
  { id: "5", name: "Presentation.pptx", mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation", modifiedAt: "2025-04-02", size: "3.1 MB" },
  { id: "6", name: "Group Project Outline.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", modifiedAt: "2025-03-29", size: "44 KB" },
];

function getIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return FileImage;
  if (mimeType === "application/pdf") return FileType;
  return FileText;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (file: DriveFile) => void;
}

export function GoogleDrivePicker({ open, onOpenChange, onPick }: Props) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = MOCK_DRIVE.filter((f) =>
    f.name.toLowerCase().includes(query.toLowerCase())
  );

  const handleConfirm = () => {
    const file = MOCK_DRIVE.find((f) => f.id === selected);
    if (!file) return;
    onPick(file);
    toast.success(`Selected "${file.name}" from Google Drive`);
    setSelected(null);
    setQuery("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
              <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3L27.5 53H0c0 1.55.4 3.1 1.2 4.5z" fill="#0066da" />
              <path d="M43.65 25L29.9 1.2C28.55 2 27.4 3.1 26.6 4.5L1.2 48.4c-.8 1.4-1.2 2.95-1.2 4.5h27.5z" fill="#00ac47" />
              <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.8l5.85 11.5z" fill="#ea4335" />
              <path d="M43.65 25L57.4 1.2C56.05.4 54.5 0 52.9 0H34.4c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d" />
              <path d="M59.8 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc" />
              <path d="M73.4 26.5L60.7 4.5c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25l16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00" />
            </svg>
            Choose from Google Drive
          </DialogTitle>
          <DialogDescription>
            Select a file from your Drive to submit. You can search by name.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search Drive..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="max-h-72 overflow-y-auto border rounded-lg divide-y">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No files found.</p>
            ) : (
              filtered.map((file) => {
                const Icon = getIcon(file.mimeType);
                const isSelected = selected === file.id;
                return (
                  <button
                    key={file.id}
                    onClick={() => setSelected(file.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors ${
                      isSelected ? "bg-primary/5" : ""
                    }`}
                  >
                    <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {file.size} • Modified {file.modifiedAt}
                      </p>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                  </button>
                );
              })
            )}
          </div>

          <Button onClick={handleConfirm} disabled={!selected} className="w-full">
            Submit selected file
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
