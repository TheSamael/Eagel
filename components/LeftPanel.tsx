import React, { useRef } from 'react';
import { Attachment, OutputMode, FileType, Theme } from '../types';
import { processFiles } from '../utils';

interface LeftPanelProps {
  instruction: string;
  setInstruction: (val: string) => void;
  pendingAttachments: Attachment[];
  setPendingAttachments: (files: Attachment[]) => void;
  outputMode: OutputMode;
  setOutputMode: (mode: OutputMode) => void;
  fileType: FileType;
  setFileType: (type: FileType) => void;
  onSubmit: () => void;
  isLoading: boolean;
  theme?: Theme | null;
}

const LeftPanel: React.FC<LeftPanelProps> = ({
  instruction,
  setInstruction,
  pendingAttachments,
  setPendingAttachments,
  outputMode,
  setOutputMode,
  fileType,
  setFileType,
  onSubmit,
  isLoading,
  theme,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const processed = await processFiles(files);
      setPendingAttachments([...pendingAttachments, ...processed]);
      e.target.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    const newAttachments = [...pendingAttachments];
    newAttachments.splice(index, 1);
    setPendingAttachments(newAttachments);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'Enter') {
        onSubmit();
    }
  }

  // Calculate background with fixed opacity
  const bgStyle = {
    backgroundColor: 'rgba(255, 255, 255, 0.95)'
  };

  return (
    <div className="flex flex-col h-full border-r border-gray-200" style={bgStyle}>
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-xl font-bold text-teal-900 mb-1">Input Context</h2>
        <p className="text-sm text-gray-500">Upload documents and set review parameters.</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* File Upload Section */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-gray-700">
            Documents
          </label>
          
          <div className="grid gap-3">
            {pendingAttachments.map((file, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-teal-50 border border-teal-100 rounded-md">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="p-2 bg-teal-100 rounded text-teal-600">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                    </svg>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium text-gray-900 truncate">{file.name}</span>
                    <span className="text-xs text-gray-500 truncate">{file.mimeType}</span>
                  </div>
                </div>
                <button 
                  onClick={() => removeAttachment(idx)}
                  className="text-gray-400 hover:text-red-500 p-1"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                        <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                    </svg>
                </button>
              </div>
            ))}
          </div>

          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 hover:border-teal-500 hover:bg-teal-50/50 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition-colors group"
          >
            <div className="p-3 bg-gray-100 group-hover:bg-white rounded-full mb-2 transition-colors">
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-gray-500 group-hover:text-teal-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3.75m-3-3.75-3 3.75M12 9.75V9A3 3 0 0 0 9 9h-.75A2.25 2.25 0 0 0 6 11.25v3.375m12-11.25c.621 0 1.125.504 1.125 1.125v17.25c0 .621-.504 1.125-1.125 1.125h-3.75a1.125 1.125 0 0 1-1.125-1.125V20.25m-3.75 0H9.75m3.75 0H9.75m0-13.5L12.75 3" />
                </svg>
            </div>
            <p className="text-sm font-medium text-gray-700">Click to upload documents</p>
            <p className="text-xs text-gray-400 mt-1">PDF, DOCX, TXT, JSON, XLSX</p>
            <input 
              ref={fileInputRef}
              type="file" 
              multiple 
              className="hidden" 
              accept=".pdf,.txt,.docx,.md,.csv,.json,.xlsx,.xls" 
              onChange={handleFileChange}
            />
          </div>
        </div>

        {/* Output Options */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-gray-700">
            Output Format
          </label>
          <div className="grid grid-cols-1 gap-2">
            <label className={`flex items-center p-3 border rounded-md cursor-pointer transition-colors ${outputMode === 'text_only' ? 'bg-teal-50 border-teal-500' : 'bg-white border-gray-200 hover:border-teal-300'}`}>
                <input 
                    type="radio" 
                    name="outputMode" 
                    value="text_only" 
                    checked={outputMode === 'text_only'}
                    onChange={() => setOutputMode('text_only')}
                    className="w-4 h-4 text-teal-600 focus:ring-teal-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">Text Output Only</span>
            </label>

            <label className={`flex flex-col p-3 border rounded-md cursor-pointer transition-colors ${outputMode === 'file_only' ? 'bg-teal-50 border-teal-500' : 'bg-white border-gray-200 hover:border-teal-300'}`}>
                <div className="flex items-center">
                    <input 
                        type="radio" 
                        name="outputMode" 
                        value="file_only" 
                        checked={outputMode === 'file_only'}
                        onChange={() => setOutputMode('file_only')}
                        className="w-4 h-4 text-teal-600 focus:ring-teal-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">File Output Only</span>
                </div>
                {outputMode === 'file_only' && (
                    <div className="ml-6 mt-2 flex flex-wrap gap-2">
                         {(['txt', 'doc', 'xlsx'] as FileType[]).map(type => (
                             <button
                                key={type}
                                onClick={(e) => { e.preventDefault(); setFileType(type); }}
                                className={`text-xs px-2 py-1 rounded border ${fileType === type ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-600 border-gray-300 hover:border-teal-400'}`}
                             >
                                {type.toUpperCase()}
                             </button>
                         ))}
                    </div>
                )}
            </label>

            <label className={`flex items-center p-3 border rounded-md cursor-pointer transition-colors ${outputMode === 'text_and_file' ? 'bg-teal-50 border-teal-500' : 'bg-white border-gray-200 hover:border-teal-300'}`}>
                <input 
                    type="radio" 
                    name="outputMode" 
                    value="text_and_file" 
                    checked={outputMode === 'text_and_file'}
                    onChange={() => setOutputMode('text_and_file')}
                    className="w-4 h-4 text-teal-600 focus:ring-teal-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">Text + File (Auto-detect)</span>
            </label>
          </div>
        </div>

        {/* Instruction Section */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-gray-700">
            Review Instructions
          </label>
          <div className="relative">
            <textarea
              className="w-full h-48 p-4 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none text-sm resize-none"
              placeholder="e.g., Summarize this contract, highlighting any liability clauses. Check for compliant tone..."
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              onKeyDown={handleKeyDown}
            ></textarea>
            <div className="absolute bottom-2 right-2 text-xs text-gray-400 pointer-events-none">
                Ctrl + Enter to run
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 border-t border-gray-200 bg-gray-50/50">
        <button
          onClick={onSubmit}
          disabled={isLoading || (!instruction && pendingAttachments.length === 0)}
          className={`w-full py-3 px-4 rounded-lg flex items-center justify-center gap-2 text-white font-medium shadow-sm transition-all
            ${isLoading || (!instruction && pendingAttachments.length === 0)
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-teal-600 hover:bg-teal-700 hover:shadow-md'
            }`}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
              Start Review
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default LeftPanel;