import React from 'react';
import { EmbyLibrary } from '../types';
import { X, Folder } from 'lucide-react';

interface LibrarySelectProps {
  libraries: EmbyLibrary[];
  onSelect: (lib: EmbyLibrary | null) => void;
  selectedId: string | null;
  onClose: () => void;
  isOpen: boolean;
}

const LibrarySelect: React.FC<LibrarySelectProps> = ({ libraries, onSelect, selectedId, onClose, isOpen }) => {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end">
      <div className="w-3/4 max-w-sm h-full bg-zinc-900 border-l border-zinc-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
          <h2 className="text-white font-bold text-xl">媒体库</h2>
          <button onClick={onClose} className="text-white/70 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          <button
            onClick={() => {
                onSelect(null);
                onClose();
            }}
             className={`w-full text-left p-4 rounded-xl mb-2 flex items-center gap-3 transition-colors ${
              selectedId === null ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            <Folder className="w-5 h-5" />
            <span className="font-medium">所有媒体</span>
          </button>
          
          {libraries.map((lib) => (
            <button
              key={lib.Id}
              onClick={() => {
                onSelect(lib);
                onClose();
              }}
              className={`w-full text-left p-4 rounded-xl mb-2 flex items-center gap-3 transition-colors ${
                selectedId === lib.Id ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              <Folder className="w-5 h-5" />
              <span className="font-medium">{lib.Name}</span>
            </button>
          ))}
        </div>
      </div>
       {/* Click outside to close */}
       <div className="flex-grow h-full cursor-pointer" onClick={onClose}></div>
    </div>
  );
};

export default LibrarySelect;