import React from 'react';
import { EmbyItem, ServerConfig } from '../types';
import { getImageUrl } from '../services/embyService';
import { PlayCircle, Clock } from 'lucide-react';

interface VideoGridProps {
  videos: EmbyItem[];
  config: ServerConfig;
  onSelect: (index: number) => void;
  isLoading?: boolean;
}

const VideoGrid: React.FC<VideoGridProps> = ({ videos, config, onSelect, isLoading }) => {
  const formatTime = (ticks?: number) => {
    if (!ticks) return '';
    const minutes = Math.round(ticks / 10000000 / 60);
    return `${minutes}m`;
  };

  if (videos.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-500 pt-20">
        <p>暂无内容</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-y-auto bg-black p-2 pb-24">
      {/* Grid Layout: 2 cols on mobile, 3-4 cols on larger screens */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 pt-16">
        {videos.map((item, index) => {
          const posterSrc = item.ImageTags?.Primary
            ? getImageUrl(config.url, item.Id, item.ImageTags.Primary, 'Primary')
            : undefined;

          return (
            <div 
              key={item.Id} 
              onClick={() => onSelect(index)}
              className="relative aspect-[2/3] bg-zinc-900 rounded-lg overflow-hidden cursor-pointer active:opacity-80 transition-opacity group"
            >
              {/* Image */}
              {posterSrc ? (
                <img 
                  src={posterSrc} 
                  alt={item.Name} 
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-600">
                   Emby
                </div>
              )}

              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />

              {/* Play Icon (Shows on Hover/Focus) */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <PlayCircle className="w-10 h-10 text-white/80 fill-black/50" />
              </div>

              {/* Metadata Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-2">
                 <h3 className="text-white text-xs font-bold line-clamp-2 drop-shadow-md mb-1">
                    {item.Name}
                 </h3>
                 <div className="flex items-center gap-1 text-[10px] text-zinc-300">
                    {item.RunTimeTicks && (
                        <>
                            <Clock className="w-3 h-3" />
                            <span>{formatTime(item.RunTimeTicks)}</span>
                        </>
                    )}
                 </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Loading Skeleton for Grid */}
      {isLoading && (
         <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mt-2">
            {[...Array(6)].map((_, i) => (
                <div key={i} className="aspect-[2/3] bg-zinc-900 rounded-lg animate-pulse" />
            ))}
         </div>
      )}
    </div>
  );
};

export default VideoGrid;