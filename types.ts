export enum Role {
  USER = 'user',
  MODEL = 'model',
}

export interface Attachment {
  name: string;
  mimeType: string;
  data: string; // Base64 encoded data
}

export interface Message {
  id: string;
  role: Role;
  text: string;
  timestamp: number;
  attachments?: Attachment[];
  generatedFiles?: Attachment[]; // Files created by the agent
}

export interface Folder {
  id: string;
  name: string;
  createdAt: number;
  messages: Message[];
  // Stored instructions for context, specifically for this folder
  currentInstruction: string;
  draftAttachments?: Attachment[];
}

export type OutputMode = 'text_only' | 'file_only' | 'text_and_file';
export type FileType = 'doc' | 'xlsx' | 'txt' | 'auto';

export interface Theme {
  id: string;
  name: string;
  primaryColor: string; // Hex
  backgroundImage?: string; // Data URI
  isCustom?: boolean;
}

export interface AppState {
  folders: Folder[];
  currentFolderId: string | null;
  isLoading: boolean;
  theme?: Theme;
}