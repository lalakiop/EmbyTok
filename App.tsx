import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import VideoFeed from './components/VideoFeed';
import VideoGrid from './components/VideoGrid';
import LibrarySelect from './components/LibrarySelect';
import { ServerConfig, EmbyLibrary, EmbyItem, FeedType } from './types';
import { getLibraries, getVerticalVideos, getTokPlaylistItems, addToTokPlaylist, removeFromTokPlaylist } from './services/embyService';
import { Menu, LayoutGrid, Smartphone } from 'lucide-react';

type ViewMode = 'feed' | 'grid';

function App() {
  const [config, setConfig] = useState<ServerConfig | null>(() => {
    const saved = localStorage.getItem('embyConfig');
    return saved ? JSON.parse(saved) : null;
  });

  const [libraries, setLibraries] = useState<EmbyLibrary[]>([]);
  const [selectedLib, setSelectedLib] = useState<EmbyLibrary | null>(null);
  const [videos, setVideos] = useState<EmbyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Favorites State
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  
  // Feed/Grid State
  const [feedType, setFeedType] = useState<FeedType>('latest');
  const [viewMode, setViewMode] = useState<ViewMode>('feed');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (config) {
      localStorage.setItem('embyConfig', JSON.stringify(config));
    } else {
      localStorage.removeItem('embyConfig');
    }
  }, [config]);

  useEffect(() => {
    if (config) {
      fetchLibraries();
      // Initial load
      refreshContent(null, 'latest');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  const fetchLibraries = async () => {
    if (!config) return;
    try {
      const libs = await getLibraries(config.url, config.userId, config.token);
      setLibraries(libs);
    } catch (e) {
      console.error("Error fetching libs", e);
    }
  };

  const getCurrentLibraryName = (lib: EmbyLibrary | null) => {
      return lib ? lib.Name : "收藏"; // Default global name if no library selected
  };

  const refreshContent = async (lib: EmbyLibrary | null, type: FeedType) => {
      if (!config) return;
      setLoading(true);
      setCurrentIndex(0); // Reset scroll index on refresh
      
      const libName = getCurrentLibraryName(lib);

      // 1. Fetch Favorites IDs for this context
      try {
          const favItems = await getTokPlaylistItems(config.url, config.userId, config.token, libName);
          const ids = new Set(favItems.map(i => i.Id));
          setFavoriteIds(ids);
      } catch (e) {
          console.error("Failed to load favorites list", e);
      }

      // 2. Fetch Videos for the feed
      try {
          const vids = await getVerticalVideos(
            config.url, 
            config.userId, 
            config.token, 
            lib ? lib.Id : undefined,
            libName,
            type
          );
          setVideos(vids);
      } catch (e) {
          console.error("Error fetching videos", e);
          setVideos([]);
      } finally {
          setLoading(false);
      }
  };

  const handleLibrarySelect = (lib: EmbyLibrary | null) => {
    setSelectedLib(lib);
    refreshContent(lib, feedType);
  };

  const handleFeedTypeChange = (type: FeedType) => {
      if (type === feedType) return;
      setFeedType(type);
      refreshContent(selectedLib, type);
  };

  const handleToggleFavorite = async (itemId: string, isCurrentlyFavorite: boolean) => {
      if (!config) return;
      
      // Optimistic UI update
      const nextFavIds = new Set(favoriteIds);
      if (isCurrentlyFavorite) {
          nextFavIds.delete(itemId);
      } else {
          nextFavIds.add(itemId);
      }
      setFavoriteIds(nextFavIds);

      const libName = getCurrentLibraryName(selectedLib);
      
      try {
          if (isCurrentlyFavorite) {
              await removeFromTokPlaylist(config.url, config.userId, config.token, libName, itemId);
          } else {
              await addToTokPlaylist(config.url, config.userId, config.token, libName, itemId);
          }
      } catch (e) {
          console.error("Failed to toggle favorite playlist", e);
          setFavoriteIds(favoriteIds);
      }
  };

  // Switch to Feed view starting at specific video
  const handleGridSelect = (index: number) => {
      setCurrentIndex(index);
      setViewMode('feed');
  };

  if (!config) {
    return <Login onLogin={setConfig} />;
  }

  return (
    <div className="relative h-[100dvh] w-full bg-black overflow-hidden font-sans text-white">
      
      {/* TOP NAVIGATION BAR */}
      <div className="absolute top-0 left-0 right-0 z-40 h-16 bg-gradient-to-b from-black/90 to-transparent flex items-center justify-between px-4 pt-2">
        
        {/* Left: Hamburger */}
        <button 
            onClick={() => setIsMenuOpen(true)}
            className="p-2 text-white/80 hover:text-white transition-colors"
        >
             <Menu className="w-6 h-6 drop-shadow-md" />
        </button>

        {/* Center: Tabs */}
        <div className="flex items-center gap-4 font-bold text-md drop-shadow-md transform translate-x-1">
             <button 
                onClick={() => handleFeedTypeChange('favorites')}
                className={`transition-colors ${feedType === 'favorites' ? 'text-white scale-105' : 'text-white/50 hover:text-white/80'}`}
             >
                 收藏
             </button>
             <div className="w-[1px] h-3 bg-white/20"></div>
             <button 
                onClick={() => handleFeedTypeChange('random')}
                className={`transition-colors ${feedType === 'random' ? 'text-white scale-105' : 'text-white/50 hover:text-white/80'}`}
             >
                 随机
             </button>
             <div className="w-[1px] h-3 bg-white/20"></div>
             <button 
                onClick={() => handleFeedTypeChange('latest')}
                className={`transition-colors ${feedType === 'latest' ? 'text-white scale-105' : 'text-white/50 hover:text-white/80'}`}
             >
                 最新
             </button>
        </div>
        
        {/* Right: View Toggle (Grid vs Feed) */}
        <button 
            onClick={() => setViewMode(viewMode === 'feed' ? 'grid' : 'feed')}
            className="p-2 text-white/80 hover:text-white transition-colors"
            title={viewMode === 'feed' ? "切换到列表视图" : "切换到播放视图"}
        >
            {viewMode === 'feed' ? (
                <LayoutGrid className="w-6 h-6 drop-shadow-md" />
            ) : (
                <Smartphone className="w-6 h-6 drop-shadow-md" />
            )}
        </button>
      </div>

      {/* LIBRARY INDICATOR */}
      {selectedLib && (
          <div className="absolute top-16 left-0 right-0 z-30 flex justify-center pointer-events-none">
              <span className="bg-black/30 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] text-white/70 border border-white/10 uppercase tracking-widest">
                  {selectedLib.Name}
              </span>
          </div>
      )}

      {/* MAIN CONTENT AREA */}
      <div className="w-full h-full bg-black">
        {viewMode === 'grid' ? (
            <VideoGrid 
                videos={videos} 
                config={config} 
                onSelect={handleGridSelect} 
                isLoading={loading}
            />
        ) : (
            // Using a key forces re-mount when config/lib changes to ensure clean state
            <VideoFeed 
                key={`${selectedLib?.Id}-${feedType}`}
                videos={videos} 
                serverUrl={config.url} 
                token={config.token} 
                onRefresh={() => refreshContent(selectedLib, feedType)}
                isLoading={loading}
                favoriteIds={favoriteIds}
                onToggleFavorite={handleToggleFavorite}
                initialIndex={currentIndex}
                onIndexChange={setCurrentIndex}
            />
        )}
      </div>

      {/* LIBRARY DRAWER */}
      <LibrarySelect 
        isOpen={isMenuOpen} 
        onClose={() => setIsMenuOpen(false)}
        libraries={libraries}
        selectedId={selectedLib?.Id || null}
        onSelect={handleLibrarySelect}
      />
    </div>
  );
}

export default App;