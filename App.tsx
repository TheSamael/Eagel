import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import LeftPanel from './components/LeftPanel';
import RightPanel from './components/RightPanel';
import ThemeSettings from './components/ThemeSettings';
import { Folder, Message, Role, Attachment, OutputMode, FileType, Theme } from './types';
import { generateId, generatePalette, formatDate } from './utils';
import { sendMessageToGemini } from './services/geminiService';

const STORAGE_KEY = 'tealaudit_data_v1'; // Keeping legacy key for data retention
const THEME_STORAGE_KEY = 'eagel_theme_v1';

const App: React.FC = () => {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  
  // Input State
  const [instruction, setInstruction] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [outputMode, setOutputMode] = useState<OutputMode>('text_only');
  const [fileType, setFileType] = useState<FileType>('txt');
  
  const [isLoading, setIsLoading] = useState(false);
  
  // Theme State
  const [theme, setTheme] = useState<Theme | null>(null);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);

  // Load data
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setFolders(parsed);
        if (parsed.length > 0) {
          const firstFolder = parsed[0];
          setCurrentFolderId(firstFolder.id);
          setInstruction(firstFolder.currentInstruction || '');
          setPendingAttachments(firstFolder.draftAttachments || []);
        }
      } catch (e) {
        console.error("Failed to load folders", e);
      }
    }

    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (storedTheme) {
      try {
        setTheme(JSON.parse(storedTheme));
      } catch (e) { console.error("Failed to load theme", e); }
    }
  }, []);

  // Persist data
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(folders));
  }, [folders]);

  useEffect(() => {
    if (theme) {
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(theme));
      
      // Apply CSS Variables
      const palette = generatePalette(theme.primaryColor);
      const root = document.documentElement;
      
      Object.entries(palette).forEach(([shade, value]) => {
        root.style.setProperty(`--color-primary-${shade}`, value);
      });
    }
  }, [theme]);

  // Auto-save Drafts
  useEffect(() => {
    if (!currentFolderId) return;
    const handler = setTimeout(() => {
      setFolders(prev => prev.map(f => {
        if (f.id === currentFolderId) {
          if (f.currentInstruction !== instruction || f.draftAttachments !== pendingAttachments) {
             return { 
               ...f, 
               currentInstruction: instruction, 
               draftAttachments: pendingAttachments 
             };
          }
        }
        return f;
      }));
    }, 500);
    return () => clearTimeout(handler);
  }, [instruction, pendingAttachments, currentFolderId]);

  const currentFolder = folders.find(f => f.id === currentFolderId);

  // Actions
  const handleCreateFolder = (name: string) => {
    let currentList = folders;
    if (currentFolderId) {
       currentList = folders.map(f => {
         if (f.id === currentFolderId) {
            return { 
                ...f, 
                currentInstruction: instruction, 
                draftAttachments: pendingAttachments 
            };
         }
         return f;
       });
    }

    const newFolder: Folder = {
      id: generateId(),
      name,
      createdAt: Date.now(),
      messages: [],
      currentInstruction: '',
      draftAttachments: []
    };
    
    setFolders([newFolder, ...currentList]);
    setCurrentFolderId(newFolder.id);
    setInstruction('');
    setPendingAttachments([]);
    setOutputMode('text_only');
  };

  const handleDeleteFolder = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (window.confirm('Are you sure you want to delete this project?')) {
      // Use functional update to ensure we filter from the latest state and avoid closure staleness
      setFolders(prevFolders => {
          const newFolders = prevFolders.filter(f => f.id !== id);
          return newFolders;
      });
      
      if (currentFolderId === id) {
        // If deleted current folder, go home
        setCurrentFolderId(null);
        setInstruction('');
        setPendingAttachments([]);
      }
    }
  };

  const handleSelectFolder = (id: string) => {
    if (id === currentFolderId) return;

    let updatedFolders = folders;
    if (currentFolderId) {
        updatedFolders = folders.map(f => {
            if (f.id === currentFolderId) {
                return { 
                    ...f, 
                    currentInstruction: instruction, 
                    draftAttachments: pendingAttachments 
                };
            }
            return f;
        });
    }

    setFolders(updatedFolders);
    setCurrentFolderId(id);

    const nextFolder = updatedFolders.find(f => f.id === id);
    if (nextFolder) {
        setInstruction(nextFolder.currentInstruction || '');
        setPendingAttachments(nextFolder.draftAttachments || []);
    } else {
        setInstruction('');
        setPendingAttachments([]);
    }
  };

  const handleGoHome = () => {
    if (currentFolderId) {
       // Save state before leaving
       setFolders(prev => prev.map(f => {
         if (f.id === currentFolderId) {
             return { 
                 ...f, 
                 currentInstruction: instruction, 
                 draftAttachments: pendingAttachments 
             };
         }
         return f;
       }));
    }
    setCurrentFolderId(null);
    setInstruction('');
    setPendingAttachments([]);
  };

  const handleSubmit = async () => {
    if (!currentFolderId || (!instruction && pendingAttachments.length === 0)) return;

    setIsLoading(true);

    const userMessage: Message = {
      id: generateId(),
      role: Role.USER,
      text: instruction,
      timestamp: Date.now(),
      attachments: pendingAttachments
    };

    const updatedFolders = folders.map(f => {
      if (f.id === currentFolderId) {
        return { 
            ...f, 
            messages: [...f.messages, userMessage],
            currentInstruction: '', 
            draftAttachments: []    
        };
      }
      return f;
    });
    setFolders(updatedFolders);
    
    setInstruction('');
    setPendingAttachments([]);

    const currentHistory = updatedFolders.find(f => f.id === currentFolderId)?.messages || [];

    const result = await sendMessageToGemini(
        currentHistory.slice(0, -1), 
        userMessage.text, 
        userMessage.attachments || [],
        outputMode,
        fileType
    );

    const modelMessage: Message = {
      id: generateId(),
      role: Role.MODEL,
      text: result.text,
      timestamp: Date.now(),
      generatedFiles: result.generatedFiles
    };

    setFolders(prev => prev.map(f => {
      if (f.id === currentFolderId) {
        return { ...f, messages: [...f.messages, modelMessage] };
      }
      return f;
    }));

    setIsLoading(false);
  };

  // Background Style for Theme
  const appStyle: React.CSSProperties = theme?.backgroundImage ? {
    backgroundImage: `url(${theme.backgroundImage})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  } : {};

  // Welcome Screen Component for cleanliness
  const WelcomeScreen = () => {
      const [quickName, setQuickName] = useState('');
      
      const onQuickCreate = (e: React.FormEvent) => {
          e.preventDefault();
          if(quickName.trim()) {
              handleCreateFolder(quickName.trim());
          }
      };

      return (
        <div 
            className="flex-1 flex flex-col items-center justify-center text-gray-800 p-8 backdrop-blur-sm transition-colors"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.8)' }}
        >
            <div className="w-full max-w-2xl">
                <div className="text-center mb-10">
                    <h2 className="text-3xl font-bold text-teal-900 mb-2 drop-shadow-sm">Welcome to Eagel Review</h2>
                    <p className="text-gray-600">Select a project to continue or start a new review.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Create New Card */}
                    <div className="bg-white/80 p-6 rounded-xl shadow-lg border border-teal-100 flex flex-col items-center text-center">
                        <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center text-teal-600 mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">New Project</h3>
                        <form onSubmit={onQuickCreate} className="w-full mt-2">
                             <input 
                                type="text" 
                                placeholder="Project Name..." 
                                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 mb-3 text-sm bg-white text-gray-900 placeholder-gray-500"
                                value={quickName}
                                onChange={e => setQuickName(e.target.value)}
                             />
                             <button type="submit" className="w-full bg-teal-600 text-white py-2 rounded-md hover:bg-teal-700 transition-colors font-medium text-sm">Create Project</button>
                        </form>
                    </div>

                    {/* Recent Projects List */}
                    <div className="bg-white/80 p-6 rounded-xl shadow-lg border border-teal-100 flex flex-col">
                         <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-500">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                             </svg>
                             Recent Projects
                         </h3>
                         <div className="flex-1 overflow-y-auto max-h-48 space-y-2 pr-1 custom-scrollbar">
                             {folders.length === 0 ? (
                                 <p className="text-sm text-gray-500 italic text-center py-4">No recent projects.</p>
                             ) : (
                                 folders.slice(0, 5).map(f => (
                                     <button 
                                        key={f.id}
                                        onClick={() => handleSelectFolder(f.id)}
                                        className="w-full text-left px-3 py-2 rounded hover:bg-teal-50 flex justify-between items-center group transition-colors"
                                     >
                                         <span className="font-medium text-gray-700 truncate">{f.name}</span>
                                         <span className="text-xs text-gray-400 group-hover:text-teal-600">{formatDate(f.createdAt).split(',')[0]}</span>
                                     </button>
                                 ))
                             )}
                         </div>
                    </div>
                </div>
            </div>
        </div>
      );
  };

  return (
    <div 
      className="flex h-screen w-screen overflow-hidden bg-gray-50 text-gray-800 transition-colors duration-500"
      style={appStyle}
    >
      {/* Background Overlay if image exists to ensure text contrast if needed, though panels are opaque/blurry */}
      {theme?.backgroundImage && (
        <div className="absolute inset-0 bg-white/30 pointer-events-none z-0"></div>
      )}

      {/* Container must have z-index to sit on top of bg */}
      <div className="relative z-10 flex h-full w-full">
        <Sidebar 
            folders={folders}
            currentFolderId={currentFolderId}
            onSelectFolder={handleSelectFolder}
            onCreateFolder={handleCreateFolder}
            onDeleteFolder={handleDeleteFolder}
            onOpenThemeSettings={() => setIsThemeModalOpen(true)}
            onGoHome={handleGoHome}
        />

        {currentFolderId ? (
            <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden">
                <div className="w-full md:w-1/3 h-1/2 md:h-full flex-shrink-0 z-20 backdrop-blur-md">
                    <LeftPanel 
                        instruction={instruction}
                        setInstruction={setInstruction}
                        pendingAttachments={pendingAttachments}
                        setPendingAttachments={setPendingAttachments}
                        outputMode={outputMode}
                        setOutputMode={setOutputMode}
                        fileType={fileType}
                        setFileType={setFileType}
                        onSubmit={handleSubmit}
                        isLoading={isLoading}
                        theme={theme}
                    />
                </div>

                <div className="w-full md:w-2/3 h-1/2 md:h-full flex-shrink-0 border-l border-gray-200 backdrop-blur-md">
                    <RightPanel 
                        messages={currentFolder ? currentFolder.messages : []}
                        isLoading={isLoading}
                        theme={theme}
                    />
                </div>
            </div>
        ) : (
            <WelcomeScreen />
        )}
      </div>

      <ThemeSettings 
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
        onApplyTheme={(newTheme) => {
            setTheme(newTheme);
        }}
        currentThemeId={theme?.id || 'teal'}
      />
    </div>
  );
};

export default App;