import React from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Download, FileImage, AlignLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title?: string;
  details?: {
    icon?: React.ReactNode;
    label: string;
    value: string | React.ReactNode;
  }[];
}

export function ImagePreviewModal({ isOpen, onClose, imageUrl, title = "Preview Lampiran", details = [] }: ImagePreviewModalProps) {
  const handleDownload = async () => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = imageUrl.split('/').pop() || 'lampiran';
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (e) {
      window.open(imageUrl, '_blank');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl bg-transparent border-none shadow-none p-0 overflow-hidden flex flex-col md:flex-row gap-4 w-[95vw]">
        
        {/* Main Image Area */}
        <div className="relative flex-1 bg-background/80 dark:bg-background/40 backdrop-blur-xl rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col h-[60vh] md:h-[80vh]">
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-b from-background/90 to-transparent absolute top-0 left-0 right-0 z-10">
            <div className="flex items-center gap-2 text-foreground drop-shadow-sm">
              <FileImage className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
            </div>
            {/* The built-in shadcn/ui close button handles the close action, and we removed the duplicate download button here */}
          </div>
          
          {/* Image */}
          <div className="flex-1 p-4 mt-14 flex items-center justify-center overflow-hidden">
            <img 
              src={imageUrl} 
              alt={title} 
              className="max-w-full max-h-full object-contain drop-shadow-2xl rounded-lg"
            />
          </div>
        </div>

        {/* Details Sidebar (Optional but shown if details provided) */}
        {details.length > 0 && (
          <div className="w-full md:w-80 bg-card rounded-2xl shadow-xl border border-border p-5 flex flex-col gap-4 animate-in slide-in-from-right-4 duration-300 md:h-[80vh] overflow-y-auto relative">
            <div>
              <h3 className="text-lg font-bold">Informasi Detail</h3>
              <p className="text-xs text-muted-foreground">Detail dokumen atau transaksi terkait.</p>
            </div>
            <div className="w-full h-px bg-border/50" />
            <div className="space-y-4 flex-1">
              {details.map((detail, idx) => (
                <div key={idx} className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
                    {detail.icon || <AlignLeft className="h-4 w-4" />}
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground font-medium mb-0.5">{detail.label}</div>
                    <div className="text-sm font-semibold leading-tight text-foreground">{detail.value || "-"}</div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Download Button in sidebar */}
            <div className="pt-4 border-t border-border/50">
              <Button onClick={handleDownload} className="w-full gap-2 gradient-primary text-primary-foreground shadow-lg shadow-primary/20">
                <Download className="h-4 w-4" /> Unduh Dokumen
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
