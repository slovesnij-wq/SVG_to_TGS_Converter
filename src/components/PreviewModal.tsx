import React, { useMemo } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import Lottie from 'lottie-react';
import { ungzipLottie } from '../utils/converter';

export interface PreviewFile {
  file: File;
  status: 'pending' | 'processing' | 'success' | 'error';
  error?: string;
  result?: Uint8Array;
  previewUrl?: string;
}

interface PreviewModalProps {
  file: PreviewFile;
  onClose: () => void;
}

function PreviewPane({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="text-[10px] uppercase tracking-widest opacity-60 text-center font-mono">{title}</div>
      <div className="relative aspect-square w-full bg-white border border-[#141414] overflow-hidden flex items-center justify-center shadow-inner">
        {/* Grid Lines */}
        <div className="absolute inset-0 pointer-events-none opacity-5" 
             style={{ backgroundImage: 'linear-gradient(#141414 1px, transparent 1px), linear-gradient(90deg, #141414 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        
        {/* Center Cross */}
        <div className="absolute top-1/2 left-0 w-full h-[1px] bg-[#141414]/10 pointer-events-none" />
        <div className="absolute top-0 left-1/2 w-[1px] h-full bg-[#141414]/10 pointer-events-none" />

        {/* Rulers */}
        <div className="absolute top-0 left-0 w-full h-4 border-b border-[#141414]/10 flex justify-between px-1 text-[8px] font-mono opacity-30 pointer-events-none z-10">
          <span>0</span><span>128</span><span>256</span><span>384</span><span>512</span>
        </div>
        <div className="absolute top-0 left-0 h-full w-4 border-r border-[#141414]/10 flex flex-col justify-between py-1 text-[8px] font-mono opacity-30 pointer-events-none z-10" style={{ writingMode: 'vertical-rl' }}>
          <span>0</span><span>128</span><span>256</span><span>384</span><span>512</span>
        </div>

        {/* Content */}
        <div className="w-full h-full flex items-center justify-center p-8 relative z-0">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function PreviewModal({ file, onClose }: PreviewModalProps) {
  const lottieData = useMemo(() => {
    if (file.result) {
      try {
        return ungzipLottie(file.result);
      } catch (e) {
        console.error('Failed to unzip lottie data:', e);
        return null;
      }
    }
    return null;
  }, [file.result]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-[#141414]/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-[#E4E3E0] p-6 md:p-8 max-w-6xl w-full relative shadow-2xl flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors z-20"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="mb-8 text-center">
          <h3 className="text-2xl font-serif italic mb-1">{file.file.name}</h3>
          <p className="text-[10px] uppercase tracking-widest opacity-60">Sticker Frame Preview (512x512)</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1 overflow-y-auto min-h-0">
          <PreviewPane title="SVG Source">
            {file.previewUrl ? (
              <img src={file.previewUrl} alt="preview" className="max-w-full max-h-full object-contain" />
            ) : (
              <div className="text-red-500 flex flex-col items-center gap-2">
                <AlertCircle className="w-8 h-8" />
                <span className="text-xs uppercase tracking-widest">Preview Unavailable</span>
              </div>
            )}
          </PreviewPane>

          <PreviewPane title="Lottie Result">
            {file.status === 'success' ? (
              lottieData ? (
                <Lottie animationData={lottieData} loop={true} className="w-full h-full" />
              ) : (
                <div className="text-red-500 flex flex-col items-center gap-2">
                  <AlertCircle className="w-8 h-8" />
                  <span className="text-xs uppercase tracking-widest">Error loading Lottie data</span>
                </div>
              )
            ) : (
              <div className="text-[#141414]/40 flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span className="text-xs uppercase tracking-widest">Processing...</span>
              </div>
            )}
          </PreviewPane>
        </div>

        <div className="mt-8 flex justify-center">
          <button 
            onClick={onClose}
            className="px-8 py-3 bg-[#141414] text-[#E4E3E0] text-xs uppercase tracking-widest hover:bg-[#141414]/90 transition-colors"
          >
            Close Preview
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
