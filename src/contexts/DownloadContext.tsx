import React, { createContext, useContext, useState, useCallback } from 'react';

export interface DownloadItem {
  id: string;
  name: string;
  type: string;
  timestamp: number;
  status: 'completed' | 'failed';
  url: string;
  blob?: Blob;
}

interface DownloadContextType {
  downloads: DownloadItem[];
  addDownload: (item: Omit<DownloadItem, 'id' | 'timestamp' | 'status'>) => void;
  removeDownload: (id: string) => void;
  clearDownloads: () => void;
}

const DownloadContext = createContext<DownloadContextType | undefined>(undefined);

export const DownloadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);

  const addDownload = useCallback((item: Omit<DownloadItem, 'id' | 'timestamp' | 'status'>) => {
    const newDownload: DownloadItem = {
      ...item,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      status: 'completed',
    };
    setDownloads(prev => [newDownload, ...prev]);
  }, []);

  const removeDownload = useCallback((id: string) => {
    setDownloads(prev => {
      const item = prev.find(d => d.id === id);
      if (item && item.url.startsWith('blob:')) {
        URL.revokeObjectURL(item.url);
      }
      return prev.filter(d => d.id !== id);
    });
  }, []);

  const clearDownloads = useCallback(() => {
    setDownloads(prev => {
      prev.forEach(item => {
        if (item.url.startsWith('blob:')) {
          URL.revokeObjectURL(item.url);
        }
      });
      return [];
    });
  }, []);

  return (
    <DownloadContext.Provider value={{ downloads, addDownload, removeDownload, clearDownloads }}>
      {children}
    </DownloadContext.Provider>
  );
};

export const useDownloads = () => {
  const context = useContext(DownloadContext);
  if (context === undefined) {
    throw new Error('useDownloads must be used within a DownloadProvider');
  }
  return context;
};
