import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eye, FileText, Image, X } from "lucide-react";

interface FilePreviewProps {
  fileName: string;
  fileUrl: string;
  trigger?: React.ReactNode;
}

function getFileType(fileName: string): "pdf" | "image" | "unknown" {
  const ext = fileName.toLowerCase().split(".").pop() ?? "";
  if (ext === "pdf") return "pdf";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"].includes(ext)) return "image";
  return "unknown";
}

export function FilePreview({ fileName, fileUrl, trigger }: FilePreviewProps) {
  const [open, setOpen] = useState(false);
  const fileType = getFileType(fileName);

  const canPreview = fileType === "pdf" || fileType === "image";

  return (
    <>
      {trigger ? (
        <span onClick={() => canPreview && setOpen(true)} className={canPreview ? "cursor-pointer" : ""}>
          {trigger}
        </span>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={() => setOpen(true)}
          disabled={!canPreview}
          title={canPreview ? "Preview file" : "Preview not available for this file type"}
        >
          <Eye className="h-3.5 w-3.5" />
          Preview
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              {fileType === "image" ? (
                <Image className="h-4 w-4 text-primary" />
              ) : (
                <FileText className="h-4 w-4 text-primary" />
              )}
              {fileName}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto rounded-lg bg-muted/30 min-h-[300px]">
            {fileType === "image" ? (
              <img
                src={fileUrl}
                alt={fileName}
                className="max-w-full max-h-[70vh] mx-auto object-contain"
              />
            ) : fileType === "pdf" ? (
              <iframe
                src={fileUrl}
                className="w-full h-[70vh] rounded-lg border-0"
                title={fileName}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                <FileText className="h-12 w-12 mb-3" />
                <p className="text-sm">Preview not available for this file type.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
