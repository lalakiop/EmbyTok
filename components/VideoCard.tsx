import React, { useRef, useEffect, useState } from 'react';
import { EmbyItem, ServerConfig } from '../types';
import { getVideoUrl, getImageUrl } from '../services/embyService';
import { Play, AlertCircle, Heart, Info, Disc } from 'lucide-react';

interface VideoCardProps {
  item: EmbyItem;
  config: ServerConfig;
  isActive: boolean;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

const VideoCard: React.FC<VideoCardProps> = ({ item, config, isActive, isFavorite, onToggleFavorite }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);

  const videoSrc = getVideoUrl(config.url, item.Id, config.token);
  const posterSrc = item.ImageTags?.Primary 
    ? getImageUrl(config.url, item.Id, item.ImageTags.Primary, 'Primary') 
    : undefined;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive) {
      setError(null);
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch((err) => {
            console.warn("Autoplay failed", err);
            setIsPlaying(false);
            // Try muted if failed
            video.muted = true;
            video.play().then(() => setIsPlaying(true)).catch(e => console.error("Muted play failed", e));
          });
      }
    } else {
      video.pause();
      video.currentTime = 0;
      setIsPlaying(false);
    }
  }, [isActive]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const handleFavorite = (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleFavorite();
  };

  const formatTime = (ticks?: number) => {
      if (!ticks) return '';
      const minutes = Math.round(ticks / 10000000 / 60);
      return `${minutes} 分钟`;
  }

  return (
    <div className="relative w-full h-full bg-black snap-start shrink-0 flex items-center justify-center overflow-hidden">
      {/* Video Element */}
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        src={videoSrc}
        poster={posterSrc}
        loop
        playsInline
        onError={() => setError("无法加载视频")}
        onClick={togglePlay}
      />

      {/* Play Icon Overlay (only when paused and no error) */}
      {!isPlaying && !error && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Play className="w-16 h-16 text-white/50 fill-white/50" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-white p-4">
          <AlertCircle className="w-12 h-12 text-red-500 mb-2" />
          <p className="text-center">{error}</p>
        </div>
      )}

      {/* RIGHT SIDEBAR ACTION BAR (TikTok Style) */}
      <div className="absolute right-2 bottom-24 flex flex-col items-center gap-6 z-20">
          {/* Avatar / Poster Circle */}
          <div className="relative w-12 h-12 mb-2">
              <div className="w-12 h-12 rounded-full border-2 border-white overflow-hidden bg-zinc-800">
                  {posterSrc ? (
                      <img src={posterSrc} alt="Poster" className="w-full h-full object-cover" />
                  ) : (
                      <div className="w-full h-full flex items-center justify-center bg-indigo-600 text-xs">Emby</div>
                  )}
              </div>
          </div>

          {/* Heart / Favorite */}
          <div className="flex flex-col items-center gap-1">
              <button 
                onClick={handleFavorite}
                className="p-2 rounded-full transition-transform active:scale-75"
              >
                  <Heart 
                    className={`w-8 h-8 drop-shadow-md transition-colors duration-300 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-white fill-transparent'}`} 
                    strokeWidth={isFavorite ? 0 : 2}
                  />
              </button>
              <span className="text-white text-xs font-bold shadow-black drop-shadow-md">
                {isFavorite ? '已赞' : '点赞'}
              </span>
          </div>

          {/* Info / More Details */}
          <div className="flex flex-col items-center gap-1">
              <button 
                onClick={(e) => { e.stopPropagation(); setShowInfo(!showInfo); }}
                className="p-2 rounded-full bg-white/10 backdrop-blur-sm active:bg-white/20"
              >
                  <Info className="w-7 h-7 text-white drop-shadow-md" />
              </button>
              <span className="text-white text-xs font-bold shadow-black drop-shadow-md">信息</span>
          </div>

           {/* Spinning Disc (Visual Flair) */}
           <div className={`mt-4 w-10 h-10 rounded-full bg-zinc-900 border-4 border-zinc-800 flex items-center justify-center overflow-hidden ${isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''}`}>
                {posterSrc ? (
                    <img src={posterSrc} className="w-full h-full object-cover opacity-70" />
                ) : (
                    <Disc className="w-6 h-6 text-zinc-500" />
                )}
           </div>
      </div>

      {/* BOTTOM TEXT OVERLAY */}
      <div className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/40 to-transparent transition-all duration-300 ${showInfo ? 'h-2/3 from-black/95' : 'pt-24'}`}>
        <div className="flex flex-col items-start max-w-[80%]">
            <h3 className="text-white font-bold text-lg drop-shadow-md mb-2 leading-tight">
              {item.Name}
            </h3>
            
            {/* Metadata Row */}
            <div className="flex items-center gap-3 text-xs text-white/90 mb-2 font-medium drop-shadow-md">
               {item.ProductionYear && <span className="bg-white/20 px-1.5 py-0.5 rounded">{item.ProductionYear}</span>}
               <span>{formatTime(item.RunTimeTicks)}</span>
               <span className="uppercase border border-white/30 px-1 rounded text-[10px]">{item.MediaType || '视频'}</span>
            </div>

            {/* Description - Expandable */}
            <div 
                onClick={(e) => { e.stopPropagation(); setShowInfo(!showInfo); }}
                className={`text-white/80 text-sm drop-shadow-md transition-all duration-300 cursor-pointer ${showInfo ? 'line-clamp-none overflow-y-auto max-h-[40vh]' : 'line-clamp-2'}`}
            >
                {item.Overview || '暂无简介'}
            </div>
            
            {!showInfo && item.Overview && (
                <button 
                    onClick={(e) => { e.stopPropagation(); setShowInfo(true); }}
                    className="text-white/60 text-xs font-semibold mt-1"
                >
                    更多
                </button>
            )}
        </div>
      </div>
    </div>
  );
};

export default VideoCard;