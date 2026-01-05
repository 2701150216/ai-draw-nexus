// 数据流图节点关联的类型定义

// Toolbox 数据记录引用
export interface ToolboxRecordRef {
  documentId: string // 所属文档 ID
  documentTitle: string // 所属文档标题
  recordId: string // 记录 ID (_id 或 id)
  recordData: Record<string, any> // 记录数据（用于显示）
  addedAt: Date // 添加时间
}

// Toolbox 数据文档引用（已废弃，保留用于兼容）
export interface ToolboxDocumentRef {
  id: string // 文档 ID
  title: string // 文档标题
  description?: string // 文档描述
  url?: string // 文档访问链接
  addedAt: Date // 添加时间
}

// 扩展的节点数据类型
export interface DataflowNodeData {
  label: string
  subLabel?: string
  iconKey: string
  color: string
  isHighlight?: boolean
  isDimmed?: boolean
  
  // 新增：节点说明
  description?: string
  
  // 新增：关联的 toolbox 数据记录列表
  linkedRecords?: ToolboxRecordRef[]
  
  // 已废弃：关联的 toolbox 文档列表（保留用于兼容旧数据）
  linkedDocuments?: ToolboxDocumentRef[]
  
  // 新增：节点备注/标签
  tags?: string[]
  
  // 新增：节点状态
  status?: 'draft' | 'active' | 'deprecated'
}

// Toolbox 数据文档完整信息（用于查看器）
export interface ToolboxDocument {
  id: string
  title: string
  description: string
  fields: ToolboxField[]
  data?: any[]
  createdAt: string
  updatedAt: string
  ownerId?: number
  recordCount?: number
}

// Toolbox 字段定义
export interface ToolboxField {
  name: string
  type: string
  required?: boolean
  defaultValue?: any
}

// Toolbox 数据记录
export interface ToolboxRecord {
  id?: string
  _id?: string
  [key: string]: any
}
