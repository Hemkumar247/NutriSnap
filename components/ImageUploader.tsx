import React, { useCallback, useState, useRef, useEffect } from 'react';
import { UploadIcon, CameraIcon, ResetIcon, FoodIcon } from './IconComponents';
import { soundService } from '../services/soundService';

interface ImageUploaderProps {
  onImageSelect: (file: File) => void;
  onTextSubmit: () => void;
  textValue: string;
  onTextChange: (value: string) => void;
}

interface PhotoInputProps {
    isDragging: boolean;
    onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
    onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
    onDragEnter: (e: React.DragEvent<HTMLDivElement>) => void;
    onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onCameraClick: () => void;
}

const PhotoInput: React.FC<PhotoInputProps> = ({ isDragging, onDrop, onDragOver, onDragEnter, onDragLeave, onFileChange, onCameraClick }) => (
    <>
     <div 
       className={`transition-all duration-300 ${isDragging ? 'border-cyan-400 scale-[1.02]' : 'border-transparent'}`}
       onDrop={onDrop} onDragOver={onDragOver} onDragEnter={onDragEnter} onDragLeave={onDragLeave}
     >
       <div onClick={() => document.getElementById('file-upload')?.click()} className="flex flex-col items-center justify-center space-y-4 text-slate-400 py-8 cursor-pointer">
         <input type="file" id="file-upload" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={onFileChange} />
         <UploadIcon className="w-12 h-12 text-slate-500" />
         <p className="font-semibold text-lg"><span className="text-cyan-400">Click to upload</span> or drag and drop</p>
         <p className="text-sm">PNG, JPG, or WEBP</p>
       </div>
       <div className="flex items-center my-2">
         <div className="flex-grow border-t border-slate-700/50"></div>
         <span className="flex-shrink mx-4 text-slate-500 text-xs font-semibold">OR</span>
         <div className="flex-grow border-t border-slate-700/50"></div>
       </div>
       <div className="text-center pb-2">
         <button onClick={onCameraClick} className="inline-flex items-center gap-3 px-6 py-3 bg-slate-800 border border-slate-700 text-slate-200 font-semibold rounded-full hover:bg-slate-700 hover:border-slate-600 transition-all active:scale-95" aria-label="Use camera to take a photo">
           <CameraIcon className="w-5 h-5" />
           Use Camera
         </button>
       </div>
     </div>
   </>
 );
 
interface TextInputProps {
    value: string;
    onChange: (value: string) => void;
    onSubmit: () => void;
}

const TextInput: React.FC<TextInputProps> = ({ value, onChange, onSubmit }) => (
   <div className="p-4 flex flex-col flex-grow">
       <textarea
           value={value}
           onChange={(e) => onChange(e.target.value)}
           placeholder="e.g., 'A bowl of oatmeal with a handful of blueberries, a sprinkle of chia seeds, and a tablespoon of honey.'"
           className="w-full flex-grow px-3 py-2 border border-slate-600 rounded-md shadow-sm focus:ring-cyan-400 focus:border-cyan-400 bg-slate-800 text-slate-200 placeholder-slate-500 resize-none"
           aria-label="Meal description"
       />
       <button
           onClick={onSubmit}
           disabled={!value.trim()}
           className="w-full mt-4 px-8 py-3 bg-gradient-to-r from-purple-500 to-cyan-400 text-white font-bold rounded-full hover:shadow-lg hover:shadow-cyan-500/20 transition-all text-lg disabled:from-slate-600 disabled:to-slate-700 disabled:shadow-none disabled:cursor-not-allowed"
       >
           Analyze Description
       </button>
   </div>
 );

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageSelect, onTextSubmit, textValue, onTextChange }) => {
  const [mode, setMode] = useState<'photo' | 'text'>('photo');
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImageSelect(e.target.files[0]);
      soundService.play('capture');
    }
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onImageSelect(e.dataTransfer.files[0]);
      soundService.play('capture');
    }
  }, [onImageSelect]);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); };
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };

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
      setIsCameraOpen(false);
    }
  };

  if (isCameraOpen) {
    return (
      <div className="animate-fade-in">
        <h2 className="text-4xl md:text-5xl font-bold text-center mb-2">Capture Your Meal</h2>
        <p className="text-center text-slate-400 mb-6 max-w-xl mx-auto">Position your meal in the frame and press the capture button.</p>
        <div className="corner-box p-2 relative">
            <video ref={videoRef} autoPlay playsInline className="w-full h-auto rounded-lg aspect-video object-cover" />
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center justify-center w-full">
                <button onClick={handleCapture} className="w-16 h-16 rounded-full bg-white flex items-center justify-center ring-4 ring-white/30 hover:scale-105 transition-transform" aria-label="Capture photo">
                    <div className="w-14 h-14 rounded-full bg-white ring-2 ring-slate-900"></div>
                </button>
            </div>
             <button onClick={() => { setIsCameraOpen(false); soundService.play('click'); }} className="absolute top-4 right-4 bg-slate-900/50 backdrop-blur-sm text-slate-200 p-2 rounded-full hover:bg-slate-800 hover:scale-110 transition-all" aria-label="Close camera">
                <ResetIcon className="w-5 h-5" />
            </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
        <h2 className="text-4xl md:text-5xl font-bold text-center mb-2">Analyze Your Meal</h2>
        <p className="text-center text-slate-400 mb-6 max-w-xl mx-auto">
            {mode === 'photo'
                ? "Upload a photo to instantly get a detailed nutritional analysis."
                : "Describe a meal you've eaten to get a nutritional analysis."
            }
        </p>
        
        {cameraError && <p className="text-center text-red-400 mb-4 bg-red-500/10 p-3 rounded-lg">{cameraError}</p>}

        <div className="corner-box !p-0">
             <div className="p-2 bg-slate-900/30 rounded-t-xl flex">
                <button 
                    onClick={() => setMode('photo')} 
                    className={`w-1/2 py-2.5 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors ${mode === 'photo' ? 'bg-slate-700/80 text-cyan-300' : 'text-slate-400 hover:bg-slate-800/50'}`}
                >
                    <CameraIcon className="w-5 h-5"/> Use Photo
                </button>
                <button 
                    onClick={() => setMode('text')} 
                    className={`w-1/2 py-2.5 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors ${mode === 'text' ? 'bg-slate-700/80 text-cyan-300' : 'text-slate-400 hover:bg-slate-800/50'}`}
                >
                    <FoodIcon className="w-5 h-5"/> Describe Meal
                </button>
            </div>
            <div className="min-h-[350px] flex flex-col">
              {mode === 'photo' ? (
                <PhotoInput 
                    isDragging={isDragging}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onFileChange={handleFileChange}
                    onCameraClick={() => { setIsCameraOpen(true); soundService.play('click'); }}
                />
              ) : (
                <TextInput 
                    value={textValue}
                    onChange={onTextChange}
                    onSubmit={onTextSubmit}
                />
              )}
            </div>
        </div>
    </div>
  );
};
