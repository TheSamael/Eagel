import React, { useState } from 'react';
import { Folder } from '../types';
import { formatDate } from '../utils';

interface SidebarProps {
  folders: Folder[];
  currentFolderId: string | null;
  onSelectFolder: (id: string) => void;
  onCreateFolder: (name: string) => void;
  onDeleteFolder: (id: string, e: React.MouseEvent) => void;
  onOpenThemeSettings: () => void;
  onGoHome: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  folders,
  currentFolderId,
  onSelectFolder,
  onCreateFolder,
  onDeleteFolder,
  onOpenThemeSettings,
  onGoHome,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim());
      setNewFolderName('');
      setIsCreating(false);
    }
  };

  return (
    <div className="w-64 bg-teal-900 text-teal-50 flex flex-col h-full shadow-xl border-r border-teal-800 z-10 backdrop-blur-sm bg-opacity-95">
      <div className="p-4 border-b border-teal-800 flex justify-between items-start">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2 cursor-pointer hover:text-teal-200 transition-colors" onClick={onGoHome}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
              Eagel Review
          </h1>
          <p className="text-xs text-teal-300 mt-1 opacity-80 italic">Eagel for the Eager.</p>
        </div>
        <button onClick={onGoHome} className="text-teal-400 hover:text-white" title="Go Home">
           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
        </button>
      </div>

      <div className="p-3">
        {!isCreating ? (
          <button
            onClick={() => setIsCreating(true)}
            className="w-full flex items-center justify-center gap-2 bg-teal-700 hover:bg-teal-600 text-white py-2 px-4 rounded-md transition-colors text-sm font-medium shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Project
          </button>
        ) : (
          <form onSubmit={handleCreateSubmit} className="bg-teal-800 p-2 rounded-md">
            <input
              type="text"
              autoFocus
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Project Name..."
              className="w-full bg-teal-900 text-white text-sm px-2 py-1 rounded border border-teal-600 focus:outline-none focus:border-teal-400 mb-2"
            />
            <div className="flex gap-2">
              <button type="submit" className="flex-1 bg-teal-600 text-xs py-1 rounded text-white">Create</button>
              <button 
                type="button" 
                onClick={() => setIsCreating(false)} 
                className="flex-1 bg-teal-900 border border-teal-700 text-xs py-1 rounded text-teal-300 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">
        {folders.length === 0 && (
            <div className="text-center mt-10 p-4 opacity-50 text-sm">
                No projects yet. Create one to get started.
            </div>
        )}
        {folders.map((folder) => (
          <div
            key={folder.id}
            onClick={() => onSelectFolder(folder.id)}
            className={`group relative flex flex-col p-3 rounded-md cursor-pointer transition-all border border-transparent ${
              currentFolderId === folder.id
                ? 'bg-teal-800 border-teal-700 shadow-sm'
                : 'hover:bg-teal-800/50 hover:border-teal-800'
            }`}
          >
            <div className="flex justify-between items-start">
              <span className={`text-sm font-medium truncate pr-6 ${currentFolderId === folder.id ? 'text-white' : 'text-teal-100'}`}>
                {folder.name}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); onDeleteFolder(folder.id, e); }}
                className="absolute right-2 top-3 opacity-0 group-hover:opacity-100 text-teal-400 hover:text-red-400 transition-opacity p-1 z-20"
                title="Delete Folder"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
              </button>
            </div>
            <span className="text-xs text-teal-400 mt-1">
              {formatDate(folder.createdAt)}
            </span>
          </div>
        ))}
      </div>

      {/* Theme Button Footer */}
      <div className="p-4 border-t border-teal-800">
        <button 
          onClick={onOpenThemeSettings}
          className="flex items-center gap-2 text-sm text-teal-200 hover:text-white transition-colors w-full"
        >
          <div className="p-1 rounded bg-teal-800">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
               <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42" />
            </svg>
          </div>
          Customize Theme
        </button>
      </div>
    </div>
  );
};

export default Sidebar;