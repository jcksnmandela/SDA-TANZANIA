import React, { useState } from 'react';
import { useDownloads } from '../contexts/DownloadContext';
import { Download, X, FileText, FileSpreadsheet, Database, Image as ImageIcon, Trash2, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const DownloadManager: React.FC = () => {
  const { downloads, removeDownload, clearDownloads } = useDownloads();
  const [isOpen, setIsOpen] = useState(false);

  const getIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'pdf': return <FileText className="text-red-500" size={20} />;
      case 'excel':
      case 'xlsx': return <FileSpreadsheet className="text-green-600" size={20} />;
      case 'csv': return <Database className="text-blue-500" size={20} />;
      case 'image':
      case 'png':
      case 'jpg':
      case 'jpeg': return <ImageIcon className="text-purple-500" size={20} />;
      default: return <Download className="text-slate-400" size={20} />;
    }
  };

  const handleOpen = (url: string, name: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (downloads.length === 0 && !isOpen) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] no-print">
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative bg-emerald-600 text-white p-4 rounded-full shadow-2xl hover:bg-emerald-700 transition-all group"
      >
        <Download size={24} className={isOpen ? 'rotate-180 transition-transform' : ''} />
        {downloads.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
            {downloads.length}
          </span>
        )}
      </button>

      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="absolute bottom-16 right-0 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[500px]"
          >
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Download size={18} className="text-emerald-600" />
                Recent Downloads
              </h3>
              <div className="flex gap-2">
                {downloads.length > 0 && (
                  <button
                    onClick={clearDownloads}
                    className="text-slate-400 hover:text-red-500 transition-colors p-1"
                    title="Clear all"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 p-2 space-y-2">
              {downloads.length === 0 ? (
                <div className="p-8 text-center text-slate-400 italic text-sm">
                  No recent downloads
                </div>
              ) : (
                downloads.map((download) => (
                  <div
                    key={download.id}
                    onClick={() => handleOpen(download.url, download.name)}
                    className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all group cursor-pointer"
                  >
                    <div className="p-2 bg-white rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                      {getIcon(download.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-700 truncate group-hover:text-emerald-700 transition-colors" title={download.name}>
                        {download.name}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {new Date(download.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpen(download.url, download.name);
                        }}
                        className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors"
                        title="Open/View"
                      >
                        <ExternalLink size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeDownload(download.id);
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                        title="Remove"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
              <p className="text-[10px] text-slate-400">
                Downloads are stored temporarily for this session
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
