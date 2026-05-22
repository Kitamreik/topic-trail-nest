import { useState, useRef } from "react";
import { useLMS } from "@/context/LMSContext";
import { useAuth } from "@/context/AuthContext";
import { useSemester } from "@/context/SemesterContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import { Upload, Link as LinkIcon, Trash2, FileText, FolderOpen, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { FilePreview } from "@/components/FilePreview";

export default function FileVault() {
  const { vaultFiles, addVaultFile, deleteVaultFile, students } = useLMS();
  const { user, isAdmin, isStudent } = useAuth();
  const { activeSemester } = useSemester();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [addDialog, setAddDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const student = students.find(s => s.email === user?.email || s.name === user?.name);
  const studentId = student?.id;

  const semFiles = vaultFiles.filter(f => f.semesterId === activeSemester.id);
  const myFiles = isStudent
    ? semFiles.filter(f => f.studentId === studentId)
    : semFiles;

  const handleAddLink = () => {
    if (!linkUrl.trim() || !linkTitle.trim() || !studentId) return;
    addVaultFile({
      studentId,
      semesterId: activeSemester.id,
      fileName: linkTitle.trim(),
      fileUrl: linkUrl.trim(),
      fileType: "link",
    });
    toast.success("Link added to vault!");
    setLinkUrl("");
    setLinkTitle("");
    setAddDialog(false);
  };

  const handleUploadFile = () => {
    if (!selectedFile || !studentId) return;
    addVaultFile({
      studentId,
      semesterId: activeSemester.id,
      fileName: selectedFile.name,
      fileUrl: URL.createObjectURL(selectedFile),
      fileType: "upload",
    });
    toast.success("File uploaded to vault!");
    setSelectedFile(null);
    setAddDialog(false);
  };

  const handleDelete = (id: string) => {
    deleteVaultFile(id);
    toast.success("File removed from vault.");
  };

  const getStudentName = (id: string) =>
    students.find(s => s.id === id)?.name ?? "Unknown";

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">File Vault</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isStudent
              ? `Your personal file storage for ${activeSemester.name}.`
              : `All student files for ${activeSemester.name}.`}
          </p>
        </div>
        {isStudent && (
          <Button onClick={() => setAddDialog(true)} size="sm">
            <Upload className="h-4 w-4 mr-1" /> Add File
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-primary" />
            {isStudent ? "My Files" : "All Student Files"}
            <Badge variant="outline" className="ml-2 text-xs">{myFiles.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {isAdmin && <TableHead>Student</TableHead>}
                <TableHead>File Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Added</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {myFiles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 5 : 4} className="text-center text-muted-foreground py-8">
                    No files in the vault yet.
                  </TableCell>
                </TableRow>
              ) : (
                myFiles.map(file => (
                  <TableRow key={file.id}>
                    {isAdmin && (
                      <TableCell className="font-medium">{getStudentName(file.studentId)}</TableCell>
                    )}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {file.fileType === "link" ? (
                          <LinkIcon className="h-3.5 w-3.5 text-primary shrink-0" />
                        ) : (
                          <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        )}
                        <span className="text-sm">{file.fileName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {file.fileType === "link" ? "Link" : "Upload"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(file.addedAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {file.fileType === "link" ? (
                          <Button
                            variant="ghost" size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() => window.open(file.fileUrl, "_blank")}
                          >
                            <ExternalLink className="h-3.5 w-3.5" /> Open
                          </Button>
                        ) : (
                          <FilePreview fileName={file.fileName} fileUrl={file.fileUrl} />
                        )}
                        {isAdmin && (
                          <Button
                            variant="ghost" size="sm"
                            className="h-7 text-xs text-destructive hover:text-destructive gap-1"
                            onClick={() => handleDelete(file.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add File Dialog */}
      <Dialog open={addDialog} onOpenChange={(o) => { if (!o) { setAddDialog(false); setSelectedFile(null); setLinkUrl(""); setLinkTitle(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to File Vault</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="upload">
            <TabsList className="w-full">
              <TabsTrigger value="upload" className="flex-1">Upload File</TabsTrigger>
              <TabsTrigger value="link" className="flex-1">Add Link</TabsTrigger>
            </TabsList>
            <TabsContent value="upload" className="space-y-4 mt-4">
              <div
                className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium">{selectedFile.name}</span>
                  </div>
                ) : (
                  <div>
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Click to select a file</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
              </div>
              <Button onClick={handleUploadFile} disabled={!selectedFile} className="w-full">
                Upload to Vault
              </Button>
            </TabsContent>
            <TabsContent value="link" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="linkTitle">Title</Label>
                <Input
                  id="linkTitle"
                  placeholder="e.g., Research Paper Reference"
                  value={linkTitle}
                  onChange={e => setLinkTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="linkUrl">URL</Label>
                <Input
                  id="linkUrl"
                  placeholder="https://..."
                  value={linkUrl}
                  onChange={e => setLinkUrl(e.target.value)}
                />
              </div>
              <Button onClick={handleAddLink} disabled={!linkUrl.trim() || !linkTitle.trim()} className="w-full">
                Add Link to Vault
              </Button>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
