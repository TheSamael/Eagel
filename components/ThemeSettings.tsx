import React, { useRef, useState } from 'react';
import { Theme } from '../types';
import { fileToDataUri, extractColorFromImage, generateId } from '../utils';

interface ThemeSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyTheme: (theme: Theme) => void;
  currentThemeId?: string;
}

const PRESETS: Theme[] = [
  { id: 'teal', name: 'Default Teal', primaryColor: '#14b8a6' },
  { id: 'blue', name: 'Ocean Blue', primaryColor: '#3b82f6' },
  { id: 'purple', name: 'Royal Purple', primaryColor: '#a855f7' },
  { id: 'rose', name: 'Rose Red', primaryColor: '#f43f5e' },
  { id: 'amber', name: 'Warm Amber', primaryColor: '#f59e0b' },
];

const ThemeSettings: React.FC<ThemeSettingsProps> = ({ isOpen, onClose, onApplyTheme, currentThemeId }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsProcessing(true);
      try {
        const dataUri = await fileToDataUri(file);
        const dominantColor = await extractColorFromImage(dataUri);
        
        const newTheme: Theme = {
          id: generateId(),
          name: 'Custom Image Theme',
          primaryColor: dominantColor,
          backgroundImage: dataUri,
          isCustom: true
        };
        
        onApplyTheme(newTheme);
      } catch (err) {
        console.error("Failed to process theme image", err);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">Customize Theme</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Presets */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">Preset Colors</label>
            <div className="grid grid-cols-5 gap-3">
              {PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => onApplyTheme(preset)}
                  className={`w-full aspect-square rounded-full flex items-center justify-center transition-transform hover:scale-110 ${currentThemeId === preset.id ? 'ring-2 ring-offset-2 ring-gray-400' : ''}`}
                  style={{ backgroundColor: preset.primaryColor }}
                  title={preset.name}
                >
                  {currentThemeId === preset.id && (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-white">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-100 pt-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
                Background Image
                <span className="block text-xs font-normal text-gray-500">
                    Upload an image to set as background. The app will automatically adapt colors to match.
                </span>
            </label>
            
            <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 hover:border-teal-500 hover:bg-teal-50/30 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition-all h-32"
            >
                {isProcessing ? (
                     <div className="flex flex-col items-center text-teal-600">
                        <svg className="animate-spin h-6 w-6 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="text-xs font-medium">Analyzing colors...</span>
                     </div>
                ) : (
                    <>
                         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-gray-400 mb-2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                        </svg>
                        <span className="text-sm font-medium text-gray-600">Click to upload image</span>
                    </>
                )}
                <input 
                    ref={fileInputRef}
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleImageUpload}
                />
            </div>
          </div>
        </div>
        
        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end">
            <button 
                onClick={onClose}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 mr-2"
            >
                Close
            </button>
        </div>
      </div>
    </div>
  );
};

export default ThemeSettings;