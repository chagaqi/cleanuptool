import { useCallback, useRef, useState } from 'react';
import { Upload, FileSpreadsheet, X, Play } from 'lucide-react';

type Props = {
  files: File[];
  onFilesChange: (files: File[]) => void;
  onProcess: () => void;
  processing: boolean;
};

export function FileUpload({ files, onFilesChange, onProcess, processing }: Props) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(
    (incoming: FileList | File[]) => {
      const arr = Array.from(incoming).filter((f) =>
        f.name.toLowerCase().endsWith('.csv')
      );
      const existingKeys = new Set(files.map((f) => `${f.name}:${f.size}`));
      const unique = arr.filter((f) => !existingKeys.has(`${f.name}:${f.size}`));
      onFilesChange([...files, ...unique]);
    },
    [files, onFilesChange]
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const removeFile = (index: number) => {
    const next = [...files];
    next.splice(index, 1);
    onFilesChange(next);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="w-full">
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        style={dragActive ? { boxShadow: '0 0 20px rgba(110,231,183,0.08)' } : undefined}
        className={`
          relative border-2 border-dashed rounded-2xl p-12 cursor-pointer
          transition-all duration-200 ease-out
          ${
            dragActive
              ? 'border-[#6EE7B7] bg-[rgba(110,231,183,0.04)] scale-[1.01]'
              : 'border-[#2A2A3A] bg-[#111118] hover:border-[#3D3D55]'
          }
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          multiple
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = '';
          }}
          className="hidden"
        />
        <div className="flex flex-col items-center text-center">
          <div
            className={`
              w-14 h-14 rounded-full flex items-center justify-center mb-4
              transition-colors duration-200 text-[#6EE7B7]
              ${dragActive ? '' : 'mint-pulse'}
            `}
          >
            <Upload className="w-6 h-6" strokeWidth={2} />
          </div>
          <h3 className="font-['Syne'] text-lg font-semibold text-[#F0F0F5] mb-1">
            {dragActive ? 'Drop your CSVs here' : 'Drag and drop CSV files'}
          </h3>
          <p className="text-sm text-[#8B8BA8]">
            or <span className="text-[#6EE7B7] font-medium underline underline-offset-2 decoration-[#6EE7B7]/50">browse</span> to upload. Multiple files supported.
          </p>
        </div>
      </div>

      {files.length > 0 && (
        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#8B8BA8] uppercase tracking-[0.08em]">
              {files.length} file{files.length > 1 ? 's' : ''} selected
            </span>
            <button
              onClick={() => onFilesChange([])}
              className="text-xs text-[#8B8BA8] hover:text-[#F0F0F5] transition-colors duration-150"
            >
              Clear all
            </button>
          </div>
          <ul className="space-y-1.5">
            {files.map((file, i) => (
              <li
                key={`${file.name}-${i}`}
                className="flex items-center gap-3 px-4 py-3 bg-[#111118] border border-[#2A2A3A] rounded-lg group hover:border-[#3D3D55] transition-colors duration-150"
              >
                <FileSpreadsheet className="w-5 h-5 text-[#6EE7B7] flex-shrink-0" strokeWidth={1.75} />
                <div className="flex-1 min-w-0">
                  <div className="font-['JetBrains_Mono'] text-xs text-[#8B8BA8] truncate">
                    {file.name}
                  </div>
                  <div className="font-['JetBrains_Mono'] text-[11px] text-[#4A4A60] mt-0.5">{formatSize(file.size)}</div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(i);
                  }}
                  className="p-1.5 rounded-md text-[#4A4A60] hover:text-[#F87171] hover:bg-[rgba(248,113,113,0.1)] transition-colors duration-150"
                  aria-label={`Remove ${file.name}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8 flex justify-end">
        <button
          onClick={onProcess}
          disabled={files.length === 0 || processing}
          className={`
            inline-flex items-center gap-2 px-6 py-3 rounded-lg font-['Syne'] font-bold text-sm tracking-[0.04em]
            transition-all duration-150
            ${
              files.length === 0 || processing
                ? 'bg-[#1A1A24] text-[#4A4A60] cursor-not-allowed'
                : 'bg-[#6EE7B7] text-[#0A0A0F] hover:brightness-110 hover:scale-[1.02] active:scale-[0.98]'
            }
          `}
        >
          {processing ? (
            <>
              <span className="w-4 h-4 border-2 border-[#0A0A0F]/30 border-t-[#0A0A0F] rounded-full animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" fill="currentColor" />
              Process {files.length > 0 ? `${files.length} file${files.length > 1 ? 's' : ''}` : ''}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
