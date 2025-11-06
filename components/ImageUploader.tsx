import React, { useCallback, useState, useRef, useEffect } from 'react';
import { UploadIcon, CameraIcon, ResetIcon } from './IconComponents';
import { soundService } from '../services/soundService';

interface ImageUploaderProps {
  onImageSelect: (file: File) => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageSelect }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Function to stop the camera stream and release resources
  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Effect to handle camera stream activation and cleanup
  useEffect(() => {
    if (isCameraOpen) {
      setCameraError(null);
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch(err => {
          console.error("Camera access denied:", err);
          setCameraError("Could not access the camera. Please check your browser permissions.");
          setIsCameraOpen(false); // Go back to uploader view on error
        });
    } else {
      stopCameraStream();
    }
    // Ensure stream is stopped on component unmount
    return () => stopCameraStream();
  }, [isCameraOpen, stopCameraStream]);

  // Handler for file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImageSelect(e.target.files[0]);
      soundService.play('capture');
    }
  };

  // Drag and drop handlers
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onImageSelect(e.dataTransfer.files[0]);
      soundService.play('capture');
    }
  }, [onImageSelect]);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  // Handler for capturing photo from video stream
  const handleCapture = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(blob => {
          if (blob) {
            const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
            onImageSelect(file);
            soundService.play('capture');
          }
        }, 'image/jpeg');
      }
      setIsCameraOpen(false); // Close camera after capture
    }
  };

  // Camera View UI
  if (isCameraOpen) {
    return (
      <div className="animate-fade-in">
        <h2 className="text-4xl md:text-5xl font-bold text-center mb-2">Capture Your Meal</h2>
        <p className="text-center text-slate-400 mb-6 max-w-xl mx-auto">Position your meal in the frame and press the capture button.</p>
        <div className="corner-box p-2 relative">
            <video ref={videoRef} autoPlay playsInline className="w-full h-auto rounded-lg aspect-video object-cover" />
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center justify-center w-full">
                <button
                    onClick={handleCapture}
                    className="w-16 h-16 rounded-full bg-white flex items-center justify-center ring-4 ring-white/30 hover:scale-105 transition-transform"
                    aria-label="Capture photo"
                >
                    <div className="w-14 h-14 rounded-full bg-white ring-2 ring-slate-900"></div>
                </button>
            </div>
             <button 
                onClick={() => {
                    setIsCameraOpen(false);
                    soundService.play('click');
                }} 
                className="absolute top-4 right-4 bg-slate-900/50 backdrop-blur-sm text-slate-200 p-2 rounded-full hover:bg-slate-800 hover:scale-110 transition-all" 
                aria-label="Close camera"
            >
                <ResetIcon className="w-5 h-5" />
            </button>
        </div>
      </div>
    );
  }

  // File Uploader View UI
  return (
    <div className="animate-fade-in">
        <h2 className="text-4xl md:text-5xl font-bold text-center mb-2">Analyze Your Meal</h2>
        <p className="text-center text-slate-400 mb-6 max-w-xl mx-auto">Upload a photo of your food to instantly get a detailed nutritional analysis from our AI.</p>
        
        {cameraError && <p className="text-center text-red-400 mb-4 bg-red-500/10 p-3 rounded-lg">{cameraError}</p>}

        <div 
            className={`corner-box transition-all duration-300 ${isDragging ? 'border-cyan-400 scale-[1.02]' : 'border-transparent'}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
        >
            <div
                onClick={() => document.getElementById('file-upload')?.click()}
                className="flex flex-col items-center justify-center space-y-4 text-slate-400 py-8 cursor-pointer"
            >
                <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    accept="image/png, image/jpeg, image/webp"
                    onChange={handleFileChange}
                />
                <UploadIcon className="w-12 h-12 text-slate-500" />
                <p className="font-semibold text-lg">
                    <span className="text-cyan-400">Click to upload</span> or drag and drop
                </p>
                <p className="text-sm">PNG, JPG, or WEBP</p>
            </div>

            <div className="flex items-center my-2">
                <div className="flex-grow border-t border-slate-700/50"></div>
                <span className="flex-shrink mx-4 text-slate-500 text-xs font-semibold">OR</span>
                <div className="flex-grow border-t border-slate-700/50"></div>
            </div>

            <div className="text-center pb-2">
                 <button
                    onClick={() => {
                        setIsCameraOpen(true);
                        soundService.play('click');
                    }}
                    className="inline-flex items-center gap-3 px-6 py-3 bg-slate-800 border border-slate-700 text-slate-200 font-semibold rounded-full hover:bg-slate-700 hover:border-slate-600 transition-all active:scale-95"
                    aria-label="Use camera to take a photo"
                >
                    <CameraIcon className="w-5 h-5" />
                    Use Camera
                </button>
            </div>
        </div>
    </div>
  );
};
