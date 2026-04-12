import React, { useState, useEffect } from 'react';
import { useDownloads, DownloadItem } from '../contexts/DownloadContext';
import { Download, X, FileText, FileSpreadsheet, Database, Image as ImageIcon, Trash2, ExternalLink, CheckCircle2, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const DownloadManager: React.FC = () => {
  const { downloads, removeDownload, clearDownloads } = useDownloads();
  const [isOpen, setIsOpen] = useState(false);
  const [activeNotification, setActiveNotification] = useState<DownloadItem | null>(null);
  const [viewingItem, setViewingItem] = useState<DownloadItem | null>(null);

  // Watch for new downloads to show notification
  useEffect(() => {
    if (downloads.length > 0) {
      const latest = downloads[0];
      // Only show notification if it's very recent (within last 2 seconds)
      if (Date.now() - latest.timestamp < 2000) {
        setActiveNotification(latest);
        const timer = setTimeout(() => {
          setActiveNotification(null);
        }, 5000); // Hide after 5 seconds
        return () => clearTimeout(timer);
      }
    }
  }, [downloads]);

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

  const handleOpen = (item: DownloadItem) => {
    setViewingItem(item);
    setActiveNotification(null);
  };

  const triggerDownload = (url: string, name: string) => {
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
    <>
      {/* Top Notification Popup */}
      <div className="fixed top-4 left-0 right-0 flex justify-center z-[10000] px-4 pointer-events-none no-print">
        <AnimatePresence>
          {activeNotification && (
            <motion.div
              initial={{ opacity: 0, y: -50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="pointer-events-auto bg-white rounded-2xl shadow-2xl border border-emerald-100 p-4 flex items-center gap-4 max-w-md w-full"
              onClick={() => handleOpen(activeNotification)}
            >
              <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600">
                <CheckCircle2 size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Download Ready</p>
                <p className="text-sm font-bold text-slate-800 truncate">{activeNotification.name}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpen(activeNotification);
                  }}
                  className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors shadow-sm"
                >
                  View
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveNotification(null);
                  }}
                  className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

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
                    onClick={() => handleOpen(download)}
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
                          handleOpen(download);
                        }}
                        className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors"
                        title="Open/View"
                      >
                        <Maximize2 size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerDownload(download.url, download.name);
                        }}
                        className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                        title="Download"
                      >
                        <Download size={14} />
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

      {/* File Viewer Modal */}
      <AnimatePresence>
        {viewingItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10001] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 md:p-8 no-print"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-5xl h-full max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-xl shadow-sm">
                    {getIcon(viewingItem.type)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm md:text-base truncate max-w-[200px] md:max-w-md">
                      {viewingItem.name}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                      {viewingItem.type} File • {new Date(viewingItem.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => triggerDownload(viewingItem.url, viewingItem.name)}
                    className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors flex items-center gap-2 text-xs font-bold"
                  >
                    <Download size={18} />
                    <span className="hidden sm:inline">Download</span>
                  </button>
                  <button
                    onClick={() => setViewingItem(null)}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              {/* Content Viewer */}
              <div className="flex-1 bg-slate-100 overflow-auto flex items-center justify-center relative">
                {viewingItem.type.toLowerCase().match(/image|png|jpg|jpeg/) ? (
                  <img
                    src={viewingItem.url}
                    alt={viewingItem.name}
                    className="max-w-full max-h-full object-contain shadow-lg"
                    referrerPolicy="no-referrer"
                  />
                ) : viewingItem.type.toLowerCase() === 'pdf' ? (
                  <iframe
                    src={`${viewingItem.url}#toolbar=0`}
                    className="w-full h-full border-none bg-white"
                    title={viewingItem.name}
                  />
                ) : (
                  <div className="text-center p-8 bg-white rounded-3xl shadow-xl max-w-sm mx-4">
                    <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
                      {getIcon(viewingItem.type)}
                    </div>
                    <h4 className="font-bold text-slate-800 mb-2">Preview Not Available</h4>
                    <p className="text-sm text-slate-500 mb-6">
                      This file type ({viewingItem.type}) cannot be previewed directly in the browser.
                    </p>
                    <button
                      onClick={() => triggerDownload(viewingItem.url, viewingItem.name)}
                      className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
                    >
                      Download to View
                    </button>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-center">
                <button
                  onClick={() => setViewingItem(null)}
                  className="px-8 py-2 bg-slate-800 text-white rounded-xl font-bold text-sm hover:bg-slate-900 transition-all shadow-lg"
                >
                  Close Viewer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
