import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  Download, 
  Search, 
  History, 
  Link as LinkIcon, 
  Play, 
  CheckCircle2, 
  AlertCircle, 
  X,
  ChevronRight,
  Monitor,
  Music,
  Trash2
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

interface VideoMetadata {
  title: string;
  thumbnail: string;
  duration?: string;
  author?: string;
  videoQualities: string[];
  audioFormats: string[];
}

interface HistoryItem {
  id: string;
  url: string;
  title: string;
  timestamp: number;
}

const MediaDownloader: React.FC = () => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [selectedFormat, setSelectedFormat] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load history from localStorage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('downloader_history');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);

  const saveToHistory = (title: string, videoUrl: string) => {
    const newItem: HistoryItem = {
      id: Math.random().toString(36).substr(2, 9),
      url: videoUrl,
      title: title,
      timestamp: Date.now(),
    };
    const updatedHistory = [newItem, ...history.filter(h => h.url !== videoUrl)].slice(0, 20); // Keep last 20, prevent duplicates
    setHistory(updatedHistory);
    localStorage.setItem('downloader_history', JSON.stringify(updatedHistory));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('downloader_history');
  };

  const fetchQualities = async () => {
    if (!url.trim()) {
      setError("Please paste a valid media link first.");
      return;
    }
    setLoading(true);
    setError(null);
    setMetadata(null);

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Fetch basic media information for this URL: ${url}. 
        Return details in a JSON format with keys: title, author, duration, thumbnail_url, video_qualities (array of standard strings like '720p HD'), audio_formats (array of standard strings like 'MP3 320kbps').
        Suggest common resolutions (360p, 720p, 1080p) and audio formats (MP3, AAC, M4A) based on platform capabilities.`,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: 'application/json'
        }
      });

      const data = JSON.parse(response.text || '{}');
      
      const videoInfo: VideoMetadata = {
        title: data.title || "Unknown Media Content",
        author: data.author || "Content Creator",
        thumbnail: data.thumbnail_url || "https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&q=80&w=300&h=200",
        duration: data.duration || "N/A",
        videoQualities: data.video_qualities || ["360p (SD)", "720p (HD)", "1080p (Full HD)"],
        audioFormats: data.audio_formats || ["MP3 128kbps", "MP3 320kbps", "AAC (Original)"]
      };

      setMetadata(videoInfo);
      setSelectedFormat(videoInfo.videoQualities[1] || videoInfo.videoQualities[0]); // Default to second video quality
      saveToHistory(videoInfo.title, url);
    } catch (err) {
      console.error(err);
      setError("Could not fetch media info. Please check the URL and try again.");
    } finally {
      setLoading(false);
    }
  };

  const startDownload = () => {
    if (!selectedFormat) return;
    
    setDownloading(true);
    setProgress(0);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setDownloading(false);
            setProgress(0);
            alert(`Download Complete: ${metadata?.title} [${selectedFormat}] (Simulated)`);
          }, 500);
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 200);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text);
    } catch (err) {
      setError("Failed to access clipboard.");
    }
  };

  return (
    <div className="min-h-screen max-w-md mx-auto flex flex-col p-4 space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between py-4">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Download className="text-white w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">MediaDownloader</h1>
        </div>
        <button 
          onClick={() => setShowHistory(!showHistory)}
          className="p-2 rounded-full hover:bg-slate-800 transition-colors relative"
        >
          <History className="w-6 h-6 text-slate-400" />
          {history.length > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full"></span>
          )}
        </button>
      </header>

      {/* Input Section */}
      <section className="glass rounded-3xl p-6 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-400 ml-1">Paste Link</label>
          <div className="relative group">
            <input 
              type="text" 
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full bg-slate-900/50 border border-slate-700 rounded-2xl py-4 pl-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-600 text-slate-100"
            />
            <button 
              onClick={handlePaste}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg"
            >
              <LinkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        <button 
          onClick={fetchQualities}
          disabled={loading || !url}
          className={`w-full py-4 rounded-2xl font-semibold flex items-center justify-center space-x-2 transition-all shadow-lg
            ${loading ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white active:scale-[0.98] shadow-blue-500/20'}
          `}
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-slate-500 border-t-white rounded-full animate-spin"></div>
          ) : (
            <>
              <Search className="w-5 h-5" />
              <span>Fetch Qualities</span>
            </>
          )}
        </button>

        {error && (
          <div className="flex items-center space-x-2 text-red-400 text-xs px-2 py-1 bg-red-400/10 rounded-lg">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}
      </section>

      {/* Results Section */}
      {metadata && !loading && (
        <section className="glass rounded-3xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 pb-4">
          <div className="relative aspect-video">
            <img src={metadata.thumbnail} alt="Thumbnail" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-4">
              <div className="space-y-1">
                <h2 className="font-bold text-lg leading-tight line-clamp-2">{metadata.title}</h2>
                <p className="text-xs text-slate-400">{metadata.author} • {metadata.duration}</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Video Qualities */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2 opacity-60">
                <Monitor className="w-4 h-4" />
                <label className="text-xs font-semibold uppercase tracking-wider">Video Qualities</label>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {metadata.videoQualities.map((q) => (
                  <button 
                    key={q}
                    onClick={() => setSelectedFormat(q)}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all text-sm
                      ${selectedFormat === q 
                        ? 'bg-blue-600/10 border-blue-500 text-blue-400 ring-1 ring-blue-500/50' 
                        : 'bg-slate-800/40 border-slate-700 text-slate-300 hover:border-slate-600'}
                    `}
                  >
                    <span>{q}</span>
                    {selectedFormat === q && <CheckCircle2 className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Audio Qualities */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2 opacity-60">
                <Music className="w-4 h-4" />
                <label className="text-xs font-semibold uppercase tracking-wider">Audio-only Formats</label>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {metadata.audioFormats.map((a) => (
                  <button 
                    key={a}
                    onClick={() => setSelectedFormat(a)}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all text-sm
                      ${selectedFormat === a 
                        ? 'bg-blue-600/10 border-blue-500 text-blue-400 ring-1 ring-blue-500/50' 
                        : 'bg-slate-800/40 border-slate-700 text-slate-300 hover:border-slate-600'}
                    `}
                  >
                    <span>{a}</span>
                    {selectedFormat === a && <CheckCircle2 className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <button 
                onClick={startDownload}
                disabled={downloading}
                className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center space-x-2 transition-all
                  ${downloading ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-white text-slate-900 hover:bg-slate-100 active:scale-[0.98]'}
                `}
              >
                {downloading ? (
                  <span>Downloading...</span>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    <span>Download {selectedFormat}</span>
                  </>
                )}
              </button>

              {downloading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-blue-400">Processing file...</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 progress-bar-fill shadow-[0_0_8px_rgba(59,130,246,0.5)]" 
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Empty State */}
      {!metadata && !loading && (
        <div className="flex-1 flex flex-col items-center justify-center opacity-30 px-12 text-center space-y-4">
          <div className="p-6 bg-slate-800 rounded-full">
            <Play className="w-12 h-12 text-slate-400" />
          </div>
          <p className="text-sm font-medium">Enter a video link from YouTube, Vimeo, or Twitter to get started.</p>
        </div>
      )}

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowHistory(false)}></div>
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-t-[32px] sm:rounded-[32px] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10 duration-500">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold">Download History</h3>
              <div className="flex space-x-2">
                <button 
                  onClick={clearHistory}
                  className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setShowHistory(false)}
                  className="p-2 text-slate-400 bg-slate-800 rounded-full hover:bg-slate-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="max-h-[60vh] overflow-y-auto p-4 space-y-2">
              {history.length === 0 ? (
                <div className="py-12 text-center text-slate-500 space-y-2">
                  <History className="w-12 h-12 mx-auto opacity-20" />
                  <p>No downloads yet.</p>
                </div>
              ) : (
                history.map((item) => (
                  <button 
                    key={item.id}
                    onClick={() => {
                      setUrl(item.url);
                      setShowHistory(false);
                      // Auto-trigger fetch when selecting from history
                      setTimeout(() => {
                        const btn = document.querySelector('button[onClick*="fetchQualities"]') as HTMLButtonElement;
                        btn?.click();
                      }, 100);
                    }}
                    className="w-full flex items-center p-3 rounded-2xl hover:bg-slate-800 transition-all text-left group"
                  >
                    <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-blue-600/20 transition-colors">
                      <Play className="w-5 h-5 text-slate-500 group-hover:text-blue-400" />
                    </div>
                    <div className="ml-4 flex-1 min-w-0 text-slate-100">
                      <p className="font-semibold text-sm truncate">{item.title}</p>
                      <p className="text-[10px] text-slate-500 mt-1 truncate">{item.url}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-700 group-hover:text-slate-400" />
                  </button>
                ))
              )}
            </div>
            
            <div className="p-6 bg-slate-950/50">
              <p className="text-[10px] text-center text-slate-600 uppercase tracking-widest font-bold">Showing last {history.length} items</p>
            </div>
          </div>
        </div>
      )}

      {/* Footer Info */}
      <footer className="text-center py-4 opacity-40 mt-auto">
        <p className="text-[10px] font-medium tracking-tight">V3.2 PRO • PRIVATE & SECURE</p>
      </footer>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<MediaDownloader />);