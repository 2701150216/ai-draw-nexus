import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  FileText, ExternalLink, Trash2, Plus, Edit3, X, Tag,
  AlertCircle, ChevronDown, ChevronRight, Database, Eye
} from 'lucide-react'
import type { DataflowNodeData, ToolboxRecordRef } from '@/types/dataflow'
import { Button } from '@/components/ui'
import { RecordSelector } from './RecordSelector'
import { RecordViewer } from './RecordViewer'

interface NodeDetailPanelProps {
  node: { id: string; data: DataflowNodeData } | null
  isEditMode: boolean
  onUpdateNode: (nodeId: string, data: Partial<DataflowNodeData>) => void
  onClose: () => void
  theme?: 'dark' | 'light'
}

export const NodeDetailPanel: React.FC<NodeDetailPanelProps> = ({
  node,
  isEditMode,
  onUpdateNode,
  onClose,
  theme = 'dark',
}) => {
  const isLight = theme === 'light'
  const [showRecordSelector, setShowRecordSelector] = useState(false)
  const [viewingRecord, setViewingRecord] = useState<ToolboxRecordRef | null>(null)
  const [editingDescription, setEditingDescription] = useState(false)
  const [descriptionValue, setDescriptionValue] = useState('')
  const [expandedSections, setExpandedSections] = useState({
    description: true,
    records: true,
    tags: true,
  })

  if (!node) return null

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const handleAddRecords = (records: ToolboxRecordRef[]) => {
    const existing = node.data.linkedRecords || []
    const newRecords = records.filter(rec => 
      !existing.some(e => e.documentId === rec.documentId && e.recordId === rec.recordId)
    )
    onUpdateNode(node.id, {
      linkedRecords: [...existing, ...newRecords],
    })
  }

  const handleRemoveRecord = (documentId: string, recordId: string) => {
    const updated = (node.data.linkedRecords || []).filter(
      rec => !(rec.documentId === documentId && rec.recordId === recordId)
    )
    onUpdateNode(node.id, { linkedRecords: updated })
  }

  const handleSaveDescription = () => {
    onUpdateNode(node.id, { description: descriptionValue })
    setEditingDescription(false)
  }

  const handleStartEditDescription = () => {
    setDescriptionValue(node.data.description || '')
    setEditingDescription(true)
  }

  const handleAddTag = () => {
    const tag = prompt('输入标签名称:')
    if (tag && tag.trim()) {
      const existing = node.data.tags || []
      if (!existing.includes(tag.trim())) {
        onUpdateNode(node.id, { tags: [...existing, tag.trim()] })
      }
    }
  }

  const handleRemoveTag = (tag: string) => {
    const updated = (node.data.tags || []).filter(t => t !== tag)
    onUpdateNode(node.id, { tags: updated })
  }

  return (
    <>
      <motion.div
        initial={{ width: 0, opacity: 0, x: 50 }}
        animate={{ width: 420, opacity: 1, x: 0 }}
        exit={{ width: 0, opacity: 0, x: 50 }}
        className={
          isLight
            ? "absolute right-0 top-0 bottom-0 bg-white text-slate-900 shadow-2xl z-50 flex flex-col overflow-hidden border-l border-slate-200"
            : "absolute right-0 top-0 bottom-0 bg-[#111] text-white shadow-2xl z-50 flex flex-col overflow-hidden border-l border-white/10"
        }
      >
        <div className="w-[420px] flex flex-col h-full">
          {/* 头部 */}
          <div className={isLight ? "flex items-center justify-between p-5 bg-slate-50 border-b border-slate-200 flex-shrink-0" : "flex items-center justify-between p-5 bg-[#161616] border-b border-white/10 flex-shrink-0"}>
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white flex-shrink-0 shadow-sm"
                style={{ backgroundColor: node.data.color }}
              >
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className={isLight ? "text-base font-semibold text-slate-900 truncate" : "text-base font-semibold text-white truncate"}>
                  {node.data.label}
                </h2>
                {node.data.subLabel && (
                  <p className={isLight ? "text-xs text-slate-500 truncate mt-0.5" : "text-xs text-white/70 truncate mt-0.5"}>{node.data.subLabel}</p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className={isLight ? "p-1.5 hover:bg-slate-100 rounded-md transition-colors flex-shrink-0" : "p-1.5 hover:bg-white/10 rounded-md transition-colors flex-shrink-0"}
            >
              <X className={isLight ? "w-4 h-4 text-slate-500" : "w-4 h-4 text-white/80"} />
            </button>
          </div>

          {/* 内容区 */}
          <div className={isLight ? "flex-1 overflow-y-auto p-4 space-y-3 bg-white text-slate-900" : "flex-1 overflow-y-auto p-4 space-y-3 bg-[#0d0d0d] text-white"}>
            {/* 节点说明 */}
            <div className={isLight ? "bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden" : "bg-[#151515] rounded-lg border border-white/10 overflow-hidden"}>
              <button
                onClick={() => toggleSection('description')}
                className={isLight ? "w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors" : "w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"}
              >
                <div className="flex items-center gap-2">
                  <FileText className={isLight ? "w-4 h-4 text-blue-600" : "w-4 h-4 text-blue-400"} />
                  <span className={isLight ? "font-medium text-sm text-slate-800" : "font-medium text-sm text-white"}>节点说明</span>
                </div>
                {expandedSections.description ? (
                  <ChevronDown className={isLight ? "w-4 h-4 text-slate-400" : "w-4 h-4 text-white/60"} />
                ) : (
                  <ChevronRight className={isLight ? "w-4 h-4 text-slate-400" : "w-4 h-4 text-white/60"} />
                )}
              </button>

              {expandedSections.description && (
                <div className={isLight ? "px-4 py-3 border-t border-slate-100 bg-slate-50" : "px-4 py-3 border-t border-white/5 bg-[#101010]"}>
                  {editingDescription ? (
                    <div className="space-y-3">
                      <textarea
                        value={descriptionValue}
                        onChange={(e) => setDescriptionValue(e.target.value)}
                        className={isLight ? "w-full px-3 py-2 border border-slate-200 rounded-md text-sm min-h-[120px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-800" : "w-full px-3 py-2 border border-white/10 rounded-md text-sm min-h-[120px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-[#0d0d0d] text-white"}
                        placeholder="输入节点说明..."
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveDescription}
                          className={isLight ? "px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors" : "px-3 py-1.5 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 transition-colors"}
                        >
                          保存
                        </button>
                        <button
                          onClick={() => setEditingDescription(false)}
                          className={isLight ? "px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-sm rounded-md hover:bg-slate-50 transition-colors" : "px-3 py-1.5 bg-[#0d0d0d] border border-white/10 text-white text-sm rounded-md hover:bg-white/5 transition-colors"}
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {node.data.description ? (
                        <div className="space-y-3">
                          <p className={isLight ? "text-sm text-slate-700 whitespace-pre-wrap leading-relaxed" : "text-sm text-white/80 whitespace-pre-wrap leading-relaxed"}>
                            {node.data.description}
                          </p>
                          {isEditMode && (
                            <button
                              onClick={handleStartEditDescription}
                              className={isLight ? "inline-flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors" : "inline-flex items-center gap-1 px-3 py-1.5 text-sm text-blue-400 hover:bg-white/5 rounded-md transition-colors"}
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              编辑
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <p className={isLight ? "text-sm text-slate-400 mb-3" : "text-sm text-white/50 mb-3"}>暂无说明</p>
                          {isEditMode && (
                            <button
                              onClick={handleStartEditDescription}
                              className={isLight ? "inline-flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors" : "inline-flex items-center gap-1 px-3 py-1.5 text-sm text-blue-400 hover:bg-white/5 rounded-md transition-colors"}
                            >
                              <Plus className="w-3.5 h-3.5" />
                              添加说明
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 关联记录 */}
            <div className={isLight ? "bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden" : "bg-[#151515] rounded-lg border border-white/10 overflow-hidden"}>
              <button
                onClick={() => toggleSection('records')}
                className={isLight ? "w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors" : "w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"}
              >
                <div className="flex items-center gap-2">
                  <Database className={isLight ? "w-4 h-4 text-green-600" : "w-4 h-4 text-green-400"} />
                  <span className={isLight ? "font-medium text-sm text-slate-800" : "font-medium text-sm text-white"}>关联数据记录</span>
                  {node.data.linkedRecords && node.data.linkedRecords.length > 0 && (
                    <span className={isLight ? "px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium" : "px-2 py-0.5 bg-green-500/20 text-green-200 text-xs rounded-full font-medium"}>
                      {node.data.linkedRecords.length}
                    </span>
                  )}
                </div>
                {expandedSections.records ? (
                  <ChevronDown className={isLight ? "w-4 h-4 text-slate-400" : "w-4 h-4 text-white/60"} />
                ) : (
                  <ChevronRight className={isLight ? "w-4 h-4 text-slate-400" : "w-4 h-4 text-white/60"} />
                )}
              </button>

              {expandedSections.records && (
                <div className={isLight ? "px-4 py-3 border-t border-slate-100 bg-slate-50 space-y-2" : "px-4 py-3 border-t border-white/5 bg-[#101010] space-y-2"}>
                  {node.data.linkedRecords && node.data.linkedRecords.length > 0 ? (
                    <div className="space-y-2">
                      {node.data.linkedRecords.map((record) => (
                        <div
                          key={`${record.documentId}-${record.recordId}`}
                          className={isLight ? "bg-white p-3 rounded-md border border-slate-200 hover:border-green-300 hover:shadow-sm transition-all" : "bg-[#0f0f0f] p-3 rounded-md border border-white/10 hover:border-green-400/60 hover:shadow-lg hover:shadow-green-500/10 transition-all"}
                        >
                          <div className="flex items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <Database className={isLight ? "w-3.5 h-3.5 text-green-600 flex-shrink-0" : "w-3.5 h-3.5 text-green-400 flex-shrink-0"} />
                                <span className={isLight ? "text-xs text-slate-500 truncate" : "text-xs text-white/60 truncate"}>
                                  {record.documentTitle}
                                </span>
                              </div>
                              <div className="space-y-1.5">
                                {Object.entries(record.recordData).slice(0, 2).map(([key, value]) => (
                                  <div key={key} className="text-xs">
                                    <span className={isLight ? "text-slate-500" : "text-white/60"}>{key}:</span>{' '}
                                    <span className={isLight ? "text-slate-800 font-medium" : "text-white font-medium"}>
                                      {typeof value === 'object' 
                                        ? JSON.stringify(value).substring(0, 40) + '...'
                                        : String(value).substring(0, 40)
                                      }
                                    </span>
                                  </div>
                                ))}
                              </div>
                              <div className={isLight ? "flex items-center gap-3 mt-3 pt-2 border-t border-slate-100" : "flex items-center gap-3 mt-3 pt-2 border-t border-white/10"}>
                                <button
                                  onClick={() => setViewingRecord(record)}
                                  className={isLight ? "text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium" : "text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"}
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  查看
                                </button>
                                {isEditMode && (
                                  <button
                                    onClick={() => handleRemoveRecord(record.documentId, record.recordId)}
                                    className={isLight ? "text-xs text-red-600 hover:text-red-700 flex items-center gap-1 ml-auto font-medium" : "text-xs text-red-400 hover:text-red-300 flex items-center gap-1 ml-auto font-medium"}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    移除
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <Database className={isLight ? "w-8 h-8 text-slate-300 mx-auto mb-2" : "w-8 h-8 text-white/40 mx-auto mb-2"} />
                      <p className={isLight ? "text-sm text-slate-400" : "text-sm text-white/60"}>暂无关联记录</p>
                    </div>
                  )}

                  {isEditMode && (
                    <button
                      onClick={() => setShowRecordSelector(true)}
                      className={isLight ? "w-full mt-2 px-3 py-2 bg-white border border-slate-200 text-slate-700 text-sm rounded-md hover:bg-slate-50 hover:border-green-400 transition-colors flex items-center justify-center gap-1.5" : "w-full mt-2 px-3 py-2 bg-[#0d0d0d] border border-white/10 text-white text-sm rounded-md hover:bg-white/5 hover:border-green-400/60 transition-colors flex items-center justify-center gap-1.5"}
                    >
                      <Plus className="w-4 h-4" />
                      添加记录
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* 记录选择器 */}
      <RecordSelector
        open={showRecordSelector}
        onClose={() => setShowRecordSelector(false)}
        onSelect={handleAddRecords}
        selectedRecordIds={node.data.linkedRecords?.map(r => `${r.documentId}-${r.recordId}`) || []}
        theme={theme}
      />

      {/* 记录查看器 */}
      {viewingRecord && (
        <RecordViewer
          recordRef={viewingRecord}
          onClose={() => setViewingRecord(null)}
          theme={theme}
        />
      )}
    </>
  )
}
