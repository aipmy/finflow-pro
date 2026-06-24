import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Camera, X, RefreshCw } from "lucide-react";

interface WebcamCaptureProps {
  onCapture: (file: File) => void;
  onCancel: () => void;
}

export function WebcamCapture({ onCapture, onCancel }: WebcamCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>("");

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      setError("Gagal mengakses kamera. Pastikan izin kamera telah diberikan.");
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      // Cleanup stream when component unmounts
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Cleanup on stream change
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const handleCapture = () => {
    if (!videoRef.current) return;
    
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" });
        onCapture(file);
      }
    }, "image/jpeg", 0.9);
  };

  if (error) {
    return (
      <div className="p-4 bg-destructive/10 text-destructive text-sm rounded-md flex flex-col items-center gap-2">
        <p>{error}</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={startCamera}>Coba Lagi</Button>
          <Button variant="outline" size="sm" onClick={onCancel}>Batal</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative rounded-md overflow-hidden bg-black/5 aspect-video flex items-center justify-center border border-border">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className="w-full h-full object-contain"
        />
        {!stream && <div className="absolute flex items-center justify-center"><RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" /></div>}
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" type="button" onClick={onCancel}>
          Batal
        </Button>
        <Button size="sm" type="button" onClick={handleCapture} className="gap-2" disabled={!stream}>
          <Camera className="h-4 w-4" /> Ambil Foto
        </Button>
      </div>
    </div>
  );
}
