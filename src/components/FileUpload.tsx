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
        className={`
          relative border-2 border-dashed rounded-2xl p-12 cursor-pointer
          transition-all duration-200 ease-out
          ${
            dragActive
              ? 'border-slate-900 bg-slate-50 scale-[1.01]'
              : 'border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50/50'
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
              transition-colors duration-200
              ${dragActive ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}
            `}
          >
            <Upload className="w-6 h-6" strokeWidth={2} />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-1">
            {dragActive ? 'Drop your CSVs here' : 'Drag and drop CSV files'}
          </h3>
          <p className="text-sm text-slate-500">
            or <span className="text-slate-900 font-medium underline underline-offset-2">browse</span> to upload. Multiple files supported.
          </p>
        </div>
      </div>

      {files.length > 0 && (
        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              {files.length} file{files.length > 1 ? 's' : ''} selected
            </span>
            <button
              onClick={() => onFilesChange([])}
              className="text-xs text-slate-500 hover:text-slate-900 transition-colors"
            >
              Clear all
            </button>
          </div>
          <ul className="space-y-1.5">
            {files.map((file, i) => (
              <li
                key={`${file.name}-${i}`}
                className="flex items-center gap-3 px-4 py-3 bg-white border border-slate-200 rounded-lg group hover:border-slate-300 transition-colors"
              >
                <FileSpreadsheet className="w-5 h-5 text-emerald-600 flex-shrink-0" strokeWidth={1.75} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-900 truncate">
                    {file.name}
                  </div>
                  <div className="text-xs text-slate-500">{formatSize(file.size)}</div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(i);
                  }}
                  className="p-1.5 rounded-md text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
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
            inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm
            transition-all duration-150
            ${
              files.length === 0 || processing
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-slate-900 text-white hover:bg-slate-800 active:scale-[0.98] shadow-sm'
            }
          `}
        >
          {processing ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
