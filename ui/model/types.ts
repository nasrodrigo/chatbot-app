export type AttachmentKind = 'image' | 'video' | 'audio' | 'file';
export type AttachmentSource = 'camera' | 'library' | 'file-picker' | 'audio-recorder' | 'video-recorder';

export type ChatAttachment = {
  id: string;
  kind: AttachmentKind;
  uri: string;
  name: string;
  mimeType?: string | null;
  size?: number | null;
  durationMs?: number;
  width?: number;
  height?: number;
  source: AttachmentSource;
  createdAt: string;
};

export type ChatDraft = { text: string; attachments: ChatAttachment[] };

export type ChatMessage = {
  id: string;
  text: string;
  attachments: ChatAttachment[];
  createdAt: Date;
};
