import React, { useState } from 'react'
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
}

export const NodeDetailPanel: React.FC<NodeDetailPanelProps> = ({
  node,
  isEditMode,
  onUpdateNode,
  onClose,
}) => {
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
      <div className="fixed right-0 top-0 h-full w-[420px] bg-gray-50 shadow-2xl z-50 flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-5 bg-white border-b border-gray-200">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white flex-shrink-0 shadow-sm"
              style={{ backgroundColor: node.data.color }}
            >
              <FileText className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold text-gray-800 truncate">
                {node.data.label}
              </h2>
              {node.data.subLabel && (
                <p className="text-xs text-gray-500 truncate mt-0.5">{node.data.subLabel}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-md transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* 节点说明 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <button
              onClick={() => toggleSection('description')}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-sm text-gray-700">节点说明</span>
              </div>
              {expandedSections.description ? (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-400" />
              )}
            </button>

            {expandedSections.description && (
              <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
                {editingDescription ? (
                  <div className="space-y-3">
                    <textarea
                      value={descriptionValue}
                      onChange={(e) => setDescriptionValue(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm min-h-[120px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      placeholder="输入节点说明..."
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveDescription}
                        className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                      >
                        保存
                      </button>
                      <button
                        onClick={() => setEditingDescription(false)}
                        className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50 transition-colors"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {node.data.description ? (
                      <div className="space-y-3">
                        <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                          {node.data.description}
                        </p>
                        {isEditMode && (
                          <button
                            onClick={handleStartEditDescription}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            编辑
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <p className="text-sm text-gray-400 mb-3">暂无说明</p>
                        {isEditMode && (
                          <button
                            onClick={handleStartEditDescription}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
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
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <button
              onClick={() => toggleSection('records')}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-green-600" />
                <span className="font-medium text-sm text-gray-700">关联数据记录</span>
                {node.data.linkedRecords && node.data.linkedRecords.length > 0 && (
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                    {node.data.linkedRecords.length}
                  </span>
                )}
              </div>
              {expandedSections.records ? (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-400" />
              )}
            </button>

            {expandedSections.records && (
              <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 space-y-2">
                {node.data.linkedRecords && node.data.linkedRecords.length > 0 ? (
                  <div className="space-y-2">
                    {node.data.linkedRecords.map((record) => (
                      <div
                        key={`${record.documentId}-${record.recordId}`}
                        className="bg-white p-3 rounded-md border border-gray-200 hover:border-green-300 hover:shadow-sm transition-all"
                      >
                        <div className="flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <Database className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                              <span className="text-xs text-gray-500 truncate">
                                {record.documentTitle}
                              </span>
                            </div>
                            <div className="space-y-1.5">
                              {Object.entries(record.recordData).slice(0, 2).map(([key, value]) => (
                                <div key={key} className="text-xs">
                                  <span className="text-gray-500">{key}:</span>{' '}
                                  <span className="text-gray-700 font-medium">
                                    {typeof value === 'object' 
                                      ? JSON.stringify(value).substring(0, 40) + '...'
                                      : String(value).substring(0, 40)
                                    }
                                  </span>
                                </div>
                              ))}
                            </div>
                            <div className="flex items-center gap-3 mt-3 pt-2 border-t border-gray-100">
                              <button
                                onClick={() => setViewingRecord(record)}
                                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                查看
                              </button>
                              {isEditMode && (
                                <button
                                  onClick={() => handleRemoveRecord(record.documentId, record.recordId)}
                                  className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1 ml-auto font-medium"
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
                    <Database className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">暂无关联记录</p>
                  </div>
                )}

                {isEditMode && (
                  <button
                    onClick={() => setShowRecordSelector(true)}
                    className="w-full mt-2 px-3 py-2 bg-white border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50 hover:border-green-400 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    添加记录
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 标签 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <button
              onClick={() => toggleSection('tags')}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-purple-600" />
                <span className="font-medium text-sm text-gray-700">标签</span>
                {node.data.tags && node.data.tags.length > 0 && (
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
                    {node.data.tags.length}
                  </span>
                )}
              </div>
              {expandedSections.tags ? (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-400" />
              )}
            </button>

            {expandedSections.tags && (
              <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 space-y-2">
                {node.data.tags && node.data.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {node.data.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-100 text-purple-700 text-xs rounded-md font-medium"
                      >
                        {tag}
                        {isEditMode && (
                          <button
                            onClick={() => handleRemoveTag(tag)}
                            className="hover:bg-purple-200 rounded p-0.5 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Tag className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">暂无标签</p>
                  </div>
                )}

                {isEditMode && (
                  <button
                    onClick={handleAddTag}
                    className="w-full mt-2 px-3 py-2 bg-white border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50 hover:border-purple-400 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    添加标签
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 记录选择器 */}
      <RecordSelector
        open={showRecordSelector}
        onClose={() => setShowRecordSelector(false)}
        onSelect={handleAddRecords}
        selectedRecordIds={node.data.linkedRecords?.map(r => `${r.documentId}-${r.recordId}`) || []}
      />

      {/* 记录查看器 */}
      {viewingRecord && (
        <RecordViewer
          recordRef={viewingRecord}
          onClose={() => setViewingRecord(null)}
        />
      )}
    </>
  )
}
