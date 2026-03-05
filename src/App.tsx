import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, FileType, Download, CheckCircle2, AlertCircle, X, Layers, Play, Eye, Maximize2, Archive, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import JSZip from 'jszip';
import { createLottieFromSvg, gzipLottie, LottieAnimation } from './utils/converter';
import PreviewModal from './components/PreviewModal';
import { translations, Language } from './utils/translations';

interface FileStatus {
  file: File;
  status: 'pending' | 'processing' | 'success' | 'error';
  error?: string;
  result?: Uint8Array;
  previewUrl?: string;
}

export default function App() {
  const [files, setFiles] = useState<FileStatus[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [mode, setMode] = useState<'batch' | 'sequence'>('batch');
  const [fps, setFps] = useState<30 | 60>(60);
  const [lang, setLang] = useState<Language>('en');
  const [previewFile, setPreviewFile] = useState<FileStatus | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = translations[lang];

  const handleFiles = useCallback(async (newFiles: File[]) => {
    const svgFiles = newFiles.filter(f => f.name.toLowerCase().endsWith('.svg'));
    const newStatuses = await Promise.all(svgFiles.map(async f => {
      const text = await f.text();
      const blob = new Blob([text], { type: 'image/svg+xml' });
      return { 
        file: f, 
        status: 'pending' as const,
        previewUrl: URL.createObjectURL(blob)
      };
    }));
    setFiles(prev => [...prev, ...newStatuses]);
  }, []);

  // Cleanup preview URLs on unmount
  const filesRef = useRef(files);
  filesRef.current = files;

  useEffect(() => {
    return () => {
      filesRef.current.forEach(f => {
        if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
      });
    };
  }, []);

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(Array.from(e.dataTransfer.files));
  };

  const removeFile = (index: number) => {
    if (files[index].previewUrl) URL.revokeObjectURL(files[index].previewUrl!);
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearFiles = () => {
    files.forEach(f => f.previewUrl && URL.revokeObjectURL(f.previewUrl));
    setFiles([]);
  };

  const convertBatch = async () => {
    const updatedFiles = [...files];
    for (let i = 0; i < updatedFiles.length; i++) {
      if (updatedFiles[i].status === 'success') continue;
      
      try {
        updatedFiles[i].status = 'processing';
        setFiles([...updatedFiles]);

        const content = await updatedFiles[i].file.text();
        const lottie = createLottieFromSvg(content, updatedFiles[i].file.name.replace('.svg', ''), fps);
        const gzipped = gzipLottie(lottie);

        if (gzipped.length > 64 * 1024) {
          throw new Error(t.fileSizeExceeds);
        }

        updatedFiles[i].status = 'success';
        updatedFiles[i].result = gzipped;
      } catch (err) {
        updatedFiles[i].status = 'error';
        updatedFiles[i].error = err instanceof Error ? err.message : t.unknownError;
      }
      setFiles([...updatedFiles]);
    }
  };

  const convertSequence = async () => {
    if (files.length === 0) return;

    try {
      setFiles(prev => prev.map(f => ({ ...f, status: 'processing' })));
      
      // Calculate frames per SVG to fit in 3 seconds
      const maxDuration = 3; // seconds
      const totalFramesNeeded = maxDuration * fps;
      const framesPerSvg = Math.max(1, Math.floor(totalFramesNeeded / files.length));
      const totalFrames = files.length * framesPerSvg;
      
      const firstContent = await files[0].file.text();
      const baseLottie = createLottieFromSvg(firstContent, 'AnimatedSticker', fps);
      
      baseLottie.op = totalFrames;
      baseLottie.layers = [];

      for (let i = 0; i < files.length; i++) {
        const content = await files[i].file.text();
        const frameLottie = createLottieFromSvg(content, 'Frame', fps);
        
        frameLottie.layers.forEach(layer => {
          layer.ip = i * framesPerSvg;
          layer.op = (i + 1) * framesPerSvg;
          layer.st = i * framesPerSvg;
          baseLottie.layers.push(layer);
        });
      }

      const gzipped = gzipLottie(baseLottie);
      
      if (gzipped.length > 64 * 1024) {
        throw new Error(t.totalSizeExceeds);
      }

      const resultBlob = new Blob([gzipped], { type: 'application/x-gzip' });
      const url = URL.createObjectURL(resultBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'animated_sticker.tgs';
      a.click();
      URL.revokeObjectURL(url);

      setFiles(prev => prev.map(f => ({ ...f, status: 'success' })));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : t.sequenceFailed;
      setFiles(prev => prev.map(f => ({ ...f, status: 'error', error: errorMsg })));
    }
  };

  const downloadFile = (fileStatus: FileStatus) => {
    if (!fileStatus.result) return;
    const blob = new Blob([fileStatus.result], { type: 'application/x-gzip' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileStatus.file.name.replace('.svg', '.tgs');
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAll = async () => {
    const successfulFiles = files.filter(f => f.status === 'success' && f.result);
    if (successfulFiles.length === 0) return;

    const zip = new JSZip();
    successfulFiles.forEach(f => {
      if (f.result) {
        zip.file(f.file.name.replace('.svg', '.tgs'), f.result);
      }
    });

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stickers.zip';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] font-sans p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <header className="mb-12 border-b border-[#141414] pb-6 flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-serif italic mb-2">{t.title}</h1>
            <p className="text-sm opacity-60 uppercase tracking-widest">{t.subtitle}</p>
          </div>
          <div className="flex flex-col items-end gap-4">
            <div className="flex gap-2 p-1 bg-[#141414]/5 border border-[#141414]/10 mb-2">
              <button 
                onClick={() => setLang('en')}
                className={`px-3 py-1 text-[10px] uppercase tracking-widest transition-colors ${lang === 'en' ? 'bg-[#141414] text-[#E4E3E0]' : 'hover:bg-[#141414]/10'}`}
              >
                EN
              </button>
              <button 
                onClick={() => setLang('ru')}
                className={`px-3 py-1 text-[10px] uppercase tracking-widest transition-colors ${lang === 'ru' ? 'bg-[#141414] text-[#E4E3E0]' : 'hover:bg-[#141414]/10'}`}
              >
                RU
              </button>
            </div>
            <div className="flex gap-2 p-1 bg-[#141414]/5 border border-[#141414]/10">
              <button 
                onClick={() => setFps(30)}
                className={`px-3 py-1 text-[10px] uppercase tracking-widest transition-colors ${fps === 30 ? 'bg-[#141414] text-[#E4E3E0]' : 'hover:bg-[#141414]/10'}`}
              >
                {t.fps30}
              </button>
              <button 
                onClick={() => setFps(60)}
                className={`px-3 py-1 text-[10px] uppercase tracking-widest transition-colors ${fps === 60 ? 'bg-[#141414] text-[#E4E3E0]' : 'hover:bg-[#141414]/10'}`}
              >
                {t.fps60}
              </button>
            </div>
            <div className="flex gap-4">
              <button 
                onClick={() => setMode('batch')}
                className={`px-4 py-2 text-xs uppercase tracking-tighter border border-[#141414] transition-colors ${mode === 'batch' ? 'bg-[#141414] text-[#E4E3E0]' : 'hover:bg-[#141414]/5'}`}
              >
                <Layers className="inline-block w-3 h-3 mr-2" />
                {t.batchMode}
              </button>
              <button 
                onClick={() => setMode('sequence')}
                className={`px-4 py-2 text-xs uppercase tracking-tighter border border-[#141414] transition-colors ${mode === 'sequence' ? 'bg-[#141414] text-[#E4E3E0]' : 'hover:bg-[#141414]/5'}`}
              >
                <Play className="inline-block w-3 h-3 mr-2" />
                {t.sequenceMode}
              </button>
            </div>
          </div>
        </header>

        <main>
          <div className="mb-6 flex gap-4 text-[10px] uppercase tracking-widest opacity-40">
            <div className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {t.fixedSize}</div>
            <div className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {t.maxDuration}</div>
            <div className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {t.maxSize}</div>
          </div>

          <div 
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed border-[#141414] p-12 text-center cursor-pointer transition-all ${isDragging ? 'bg-[#141414] text-[#E4E3E0]' : 'hover:bg-[#141414]/5'}`}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={(e) => handleFiles(Array.from(e.target.files || []))}
              multiple 
              accept=".svg" 
              className="hidden" 
            />
            <Upload className="w-12 h-12 mx-auto mb-4 opacity-40" />
            <p className="text-xl font-serif italic mb-2">{t.dropFiles}</p>
            <p className="text-xs opacity-60 uppercase tracking-widest">{t.clickBrowse}</p>
          </div>

          {files.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-12"
            >
              <div className="flex justify-between items-center mb-6 border-b border-[#141414] pb-2">
                <h2 className="text-xs uppercase tracking-widest opacity-60">{t.files} ({files.length})</h2>
                <div className="flex gap-4">
                  {files.some(f => f.status === 'error') && (
                    <button 
                      onClick={() => setFiles(prev => prev.map(f => f.status === 'error' ? { ...f, status: 'pending', error: undefined } : f))}
                      className="text-xs uppercase tracking-tighter hover:underline text-red-600"
                    >
                      {t.retryFailed}
                    </button>
                  )}
                  {files.some(f => f.status === 'success') && (
                    <button 
                      onClick={() => {
                        files.forEach(f => {
                          if (f.status === 'success' && f.previewUrl) URL.revokeObjectURL(f.previewUrl);
                        });
                        setFiles(prev => prev.filter(f => f.status !== 'success'));
                      }}
                      className="text-xs uppercase tracking-tighter hover:underline"
                    >
                      {t.clearCompleted}
                    </button>
                  )}
                  <button onClick={clearFiles} className="text-xs uppercase tracking-tighter hover:underline">{t.clearAll}</button>
                  {mode === 'batch' && files.some(f => f.status === 'success') && (
                    <button onClick={downloadAll} className="text-xs uppercase tracking-tighter hover:underline flex items-center gap-1">
                      <Archive className="w-3 h-3" /> {t.downloadAll}
                    </button>
                  )}
                  <button 
                    onClick={mode === 'batch' ? convertBatch : convertSequence}
                    className="text-xs uppercase tracking-tighter font-bold hover:underline"
                  >
                    {mode === 'batch' ? t.convertAll : t.createAnimation}
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              {files.some(f => f.status === 'processing' || f.status === 'success' || f.status === 'error') && (
                <div className="w-full h-1 bg-[#141414]/10 mb-6 relative overflow-hidden">
                  <motion.div 
                    className="absolute top-0 left-0 h-full bg-[#141414]"
                    initial={{ width: 0 }}
                    animate={{ width: `${(files.filter(f => f.status === 'success' || f.status === 'error').length / files.length) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              )}

              <div className="space-y-2">
                <AnimatePresence>
                  {files.map((f, i) => (
                    <motion.div 
                      key={f.file.name + i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="group flex items-center justify-between p-4 border border-[#141414]/10 hover:border-[#141414] transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white border border-[#141414]/5 flex items-center justify-center overflow-hidden">
                          {f.previewUrl ? (
                            <img src={f.previewUrl} alt="preview" className="max-w-full max-h-full object-contain" />
                          ) : (
                            <FileType className="w-5 h-5 opacity-40" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-mono">{f.file.name}</p>
                          <div className="flex gap-2">
                            <p className="text-[10px] opacity-40 uppercase tracking-tighter">{t.svg}: {(f.file.size / 1024).toFixed(1)} KB</p>
                            {f.result && (
                              <p className={`text-[10px] uppercase tracking-tighter font-bold ${f.result.length > 64 * 1024 ? 'text-red-600' : 'text-emerald-600'}`}>
                                {t.tgs}: {(f.result.length / 1024).toFixed(1)} KB
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <button 
                          onClick={() => setPreviewFile(f)}
                          className="p-1 hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors"
                          title={t.preview}
                        >
                          <Maximize2 className="w-4 h-4" />
                        </button>
                        {f.status === 'processing' && (
                          <div className="w-4 h-4 border-2 border-[#141414] border-t-transparent rounded-full animate-spin" />
                        )}
                        {f.status === 'success' && (
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            {mode === 'batch' && (
                              <button 
                                onClick={() => downloadFile(f)}
                                className="p-1 hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        )}
                        {f.status === 'error' && (
                          <div title={f.error}>
                            <AlertCircle className="w-4 h-4 text-red-600" />
                          </div>
                        )}
                        <button 
                          onClick={() => removeFile(i)}
                          className="p-1 opacity-0 group-hover:opacity-100 hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </main>

        <footer className="mt-24 pt-12 border-t border-[#141414] opacity-60 text-[10px] uppercase tracking-widest flex flex-col gap-4">
          <div className="flex justify-between">
            <p>{t.footerTitle}</p>
            <p>{t.footerSubtitle}</p>
          </div>
          <p className="opacity-60 max-w-2xl">
            {t.footerDesc}
          </p>
        </footer>
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewFile && (
          <PreviewModal 
            file={previewFile} 
            onClose={() => setPreviewFile(null)} 
            lang={lang}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
