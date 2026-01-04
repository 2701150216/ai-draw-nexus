// Engine Types
export type EngineType = 'mermaid' | 'excalidraw' | 'drawio' | 'dataflow'

// Project
export interface Project {
  id: string
  /**
   * 后端持久化 ID（Mongo ObjectId 或其他），用于判断是否已同步
   */
  remoteId?: string
  /**
   * 最近一次成功同步到后端的时间，用于判断“有远端但本地有未同步变更”
   */
  remoteSyncedAt?: Date
  title: string
  engineType: EngineType
  thumbnail: string // Base64 string for preview
  createdAt: Date
  updatedAt: Date
}

// Version History
export interface VersionHistory {
  id: string
  projectId: string
  content: string // Source Code / JSON / XML
  changeSummary: string // "Initial" | "AI Edit" | "Manual"
  timestamp: Date
}

// Attachment types for chat messages
export interface ImageAttachment {
  type: 'image'
  dataUrl: string // Base64 data URL
  fileName: string
}

export interface DocumentAttachment {
  type: 'document'
  content: string // Extracted text content
  fileName: string
}

export interface UrlAttachment {
  type: 'url'
  content: string // Extracted markdown content
  url: string
  title: string
}

export type Attachment = ImageAttachment | DocumentAttachment | UrlAttachment

// Chat Message (UI Content Store)
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  status: 'pending' | 'streaming' | 'complete' | 'error'
  avatar?: string
  attachments?: Attachment[]
}

// Payload Message (Message Payload Store - OpenAI compatible)
export interface ContentPart {
  type: 'text' | 'image_url'
  text?: string
  image_url?: {
    url: string
  }
}

export interface PayloadMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | ContentPart[]
}

// API Request
export interface ChatRequest {
  messages: PayloadMessage[]
  stream?: boolean
}
