import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import LeftPanel from './components/LeftPanel';
import RightPanel from './components/RightPanel';
import ThemeSettings from './components/ThemeSettings';
import { Folder, Message, Role, Attachment, OutputMode, FileType, Theme } from './types';
import { generateId, generatePalette } from './utils';
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
    if (window.confirm('Are you sure you want to delete this project?')) {
      const newFolders = folders.filter(f => f.id !== id);
      setFolders(newFolders);
      
      if (currentFolderId === id) {
        const nextFolderId = newFolders.length > 0 ? newFolders[0].id : null;
        setCurrentFolderId(nextFolderId);
        
        if (nextFolderId) {
           const nextFolder = newFolders[0];
           setInstruction(nextFolder.currentInstruction || '');
           setPendingAttachments(nextFolder.draftAttachments || []);
        } else {
           setInstruction('');
           setPendingAttachments([]);
        }
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
        />

        {currentFolderId ? (
            <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden">
                <div className="w-full md:w-1/3 h-1/2 md:h-full flex-shrink-0 z-20 backdrop-blur-md bg-white/95">
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
                    />
                </div>

                <div className="w-full md:w-2/3 h-1/2 md:h-full flex-shrink-0 border-l border-gray-200 backdrop-blur-md bg-white/90">
                    <RightPanel 
                        messages={currentFolder ? currentFolder.messages : []}
                        isLoading={isLoading}
                    />
                </div>
            </div>
        ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-8 backdrop-blur-sm bg-white/60">
                <h2 className="text-2xl font-bold text-teal-800 mb-2 drop-shadow-sm">Welcome to Eagel Review</h2>
                <p className="max-w-md text-center">Create a project in the sidebar to start organizing and reviewing your documents.</p>
            </div>
        )}
      </div>

      <ThemeSettings 
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
        onApplyTheme={(newTheme) => {
            setTheme(newTheme);
            setIsThemeModalOpen(false);
        }}
        currentThemeId={theme?.id || 'teal'}
      />
    </div>
  );
};

export default App;