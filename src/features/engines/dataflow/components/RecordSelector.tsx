import React, { useState, useEffect } from 'react'
import { Search, X, FileText, Database, Check, ChevronRight, Loader2 } from 'lucide-react'
import { toolboxService } from '@/services/toolboxService'
import type { ToolboxDocument, ToolboxRecord, ToolboxRecordRef } from '@/types/dataflow'

interface RecordSelectorProps {
  open: boolean
  onClose: () => void
  onSelect: (records: ToolboxRecordRef[]) => void
  selectedRecordIds?: string[]
  multiple?: boolean
  theme?: 'dark' | 'light'
}

export const RecordSelector: React.FC<RecordSelectorProps> = ({
  open,
  onClose,
  onSelect,
  selectedRecordIds = [],
  multiple = true,
  theme = 'dark',
}) => {
  const isLight = theme === 'light'
  const [documents, setDocuments] = useState<ToolboxDocument[]>([])
  const [selectedDocument, setSelectedDocument] = useState<ToolboxDocument | null>(null)
  const [records, setRecords] = useState<ToolboxRecord[]>([])
  const [documentFields, setDocumentFields] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingRecords, setLoadingRecords] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [recordSearchQuery, setRecordSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(selectedRecordIds))
  const [currentPage, setCurrentPage] = useState(1)
  const [totalRecords, setTotalRecords] = useState(0)
  const pageSize = 20

  useEffect(() => {
    if (open) {
      loadDocuments()
      setSelectedIds(new Set(selectedRecordIds))
      setSelectedDocument(null)
      setRecords([])
      setDocumentFields([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const loadDocuments = async () => {
    setLoading(true)
    try {
      const docs = await toolboxService.listDocuments()
      setDocuments(docs)
    } catch (error) {
      console.error('Failed to load documents:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadRecords = async (document: ToolboxDocument, page: number = 1) => {
    setLoadingRecords(true)
    try {
      const result = await toolboxService.getDocumentRecords(document.id, {
        page,
        pageSize,
        search: recordSearchQuery,
      })
      setRecords(result.records)
      setTotalRecords(result.total)
      setCurrentPage(page)
      if (result.fields) {
        setDocumentFields(result.fields)
      }
    } catch (error) {
      console.error('Failed to load records:', error)
    } finally {
      setLoadingRecords(false)
    }
  }

  const handleDocumentClick = async (doc: ToolboxDocument) => {
    setSelectedDocument(doc)
    setRecordSearchQuery('')
    await loadRecords(doc, 1)
  }

  const handleRecordSearch = async () => {
    if (selectedDocument) {
      await loadRecords(selectedDocument, 1)
    }
  }

  const toggleRecordSelection = (record: ToolboxRecord) => {
    const recordId = record._id || record.id || JSON.stringify(record)
    const newSelected = new Set(selectedIds)
    
    if (newSelected.has(recordId)) {
      newSelected.delete(recordId)
    } else {
      if (!multiple) {
        newSelected.clear()
      }
      newSelected.add(recordId)
    }
    setSelectedIds(newSelected)
  }

  const handleConfirm = () => {
    if (!selectedDocument) return
    
    const selectedRecords: ToolboxRecordRef[] = records
      .filter(record => {
        const recordId = record._id || record.id || JSON.stringify(record)
        return selectedIds.has(recordId)
      })
      .map(record => ({
        documentId: selectedDocument.id,
        documentTitle: selectedDocument.title,
        recordId: record._id || record.id || JSON.stringify(record),
        recordData: record,
        addedAt: new Date(),
      }))
    
    onSelect(selectedRecords)
    onClose()
  }

  const handleBackToDocuments = () => {
    setSelectedDocument(null)
    setRecords([])
    setRecordSearchQuery('')
  }

  const filteredDocuments = documents.filter(doc =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const renderFieldValue = (value: any, maxLength: number = 40): string => {
    if (value === null || value === undefined) return '-'
    if (typeof value === 'object') {
      const str = JSON.stringify(value)
      return str.length > maxLength ? str.substring(0, maxLength) + '...' : str
    }
    const str = String(value)
    return str.length > maxLength ? str.substring(0, maxLength) + '...' : str
  }

  const totalPages = Math.ceil(totalRecords / pageSize)

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className={
          isLight
            ? "bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col border border-slate-200"
            : "bg-[#0f0f0f] rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col border border-white/10"
        }
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className={isLight ? "flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-green-50" : "flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gradient-to-r from-[#0b1220] via-[#0e1a2c] to-[#0b1220]"}>
          <div className="flex items-center gap-3">
            {selectedDocument ? (
              <>
                <button
                  onClick={handleBackToDocuments}
                  className={isLight ? "p-1.5 hover:bg-white/80 rounded-lg transition-colors" : "p-1.5 hover:bg-white/10 rounded-lg transition-colors"}
                >
                  <ChevronRight className={isLight ? "w-5 h-5 rotate-180 text-slate-700" : "w-5 h-5 rotate-180 text-white/80"} />
                </button>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center text-white shadow-sm">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className={isLight ? "text-lg font-semibold text-slate-900" : "text-lg font-semibold text-white"}>
                      {selectedDocument.title}
                    </h2>
                    <p className={isLight ? "text-xs text-slate-600 mt-0.5" : "text-xs text-white/70 mt-0.5"}>
                      选择需要关联的记录
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center text-white shadow-sm">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className={isLight ? "text-lg font-semibold text-slate-900" : "text-lg font-semibold text-white"}>选择数据文档</h2>
                  <p className={isLight ? "text-xs text-slate-600 mt-0.5" : "text-xs text-white/70 mt-0.5"}>选择包含数据记录的文档</p>
                </div>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className={isLight ? "p-1.5 hover:bg-white/80 rounded-lg transition-colors" : "p-1.5 hover:bg-white/10 rounded-lg transition-colors"}
          >
            <X className={isLight ? "w-5 h-5 text-slate-600" : "w-5 h-5 text-white/80"} />
          </button>
        </div>

        {/* 搜索栏 */}
        <div className={isLight ? "px-6 py-4 bg-slate-50 border-b border-slate-200" : "px-6 py-4 bg-[#0b0b0b] border-b border-white/10"}>
          <div className="relative">
            <Search className={isLight ? "absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" : "absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/50"} />
            <input
              type="text"
              value={selectedDocument ? recordSearchQuery : searchQuery}
              onChange={(e) => {
                if (selectedDocument) {
                  setRecordSearchQuery(e.target.value)
                } else {
                  setSearchQuery(e.target.value)
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && selectedDocument) {
                  handleRecordSearch()
                }
              }}
              placeholder={selectedDocument ? '搜索记录内容...' : '搜索文档标题...'}
              className={isLight ? "w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm text-slate-800" : "w-full pl-10 pr-10 py-2.5 border border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-[#0f0f0f] text-sm text-white"}
            />
            {((selectedDocument && recordSearchQuery) || (!selectedDocument && searchQuery)) && (
              <button
                onClick={() => {
                  if (selectedDocument) {
                    setRecordSearchQuery('')
                    handleRecordSearch()
                  } else {
                    setSearchQuery('')
                  }
                }}
                className={isLight ? "absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" : "absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80"}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* 内容区 */}
        <div className={isLight ? "flex-1 overflow-y-auto p-6 bg-slate-50 text-slate-900" : "flex-1 overflow-y-auto p-6 bg-[#0b0b0b] text-white"}>
          {!selectedDocument ? (
            // 文档列表
            loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className={isLight ? "flex flex-col items-center justify-center h-64 text-slate-400" : "flex flex-col items-center justify-center h-64 text-white/50"}>
                <FileText className="w-16 h-16 mb-3" />
                <p className="text-sm">未找到文档</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => handleDocumentClick(doc)}
                    className={isLight ? "bg-white p-4 rounded-lg border border-slate-200 cursor-pointer transition-all hover:border-blue-300 hover:shadow-sm" : "bg-[#101010] p-4 rounded-lg border border-white/10 cursor-pointer transition-all hover:border-blue-400/60 hover:shadow-lg hover:shadow-blue-500/10"}
                  >
                    <div className="flex items-start gap-3">
                      <div className={isLight ? "w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0" : "w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0"}>
                        <FileText className={isLight ? "w-5 h-5 text-blue-600" : "w-5 h-5 text-blue-300"} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={isLight ? "font-medium text-slate-900 truncate" : "font-medium text-white truncate"}>{doc.title}</h3>
                        {doc.description && (
                          <p className={isLight ? "mt-1 text-sm text-slate-500 line-clamp-2" : "mt-1 text-sm text-white/70 line-clamp-2"}>{doc.description}</p>
                        )}
                        <div className={isLight ? "mt-2 flex items-center gap-4 text-xs text-slate-400" : "mt-2 flex items-center gap-4 text-xs text-white/50"}>
                          {doc.recordCount !== undefined && (
                            <span className="flex items-center gap-1">
                              <Database className="w-3 h-3" />
                              {doc.recordCount} 条记录
                            </span>
                          )}
                          <span>更新于 {new Date(doc.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <ChevronRight className={isLight ? "w-5 h-5 text-slate-400 flex-shrink-0 mt-2" : "w-5 h-5 text-white/60 flex-shrink-0 mt-2"} />
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            // 记录列表
            <>
              {loadingRecords ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="w-8 h-8 animate-spin text-green-500" />
                </div>
              ) : records.length === 0 ? (
                <div className={isLight ? "flex flex-col items-center justify-center h-64 text-slate-400" : "flex flex-col items-center justify-center h-64 text-white/50"}>
                  <Database className="w-16 h-16 mb-3" />
                  <p className="text-sm">暂无记录</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {records.map((record) => {
                    const recordId = record._id || record.id || JSON.stringify(record)
                    const isSelected = selectedIds.has(recordId)
                    const fields = documentFields.length > 0 ? documentFields : (selectedDocument?.fields || [])
                    const displayFields = fields
                      .filter((f: any) => f.showInCard !== false)
                      .slice(0, 3)

                    return (
                      <div
                        key={recordId}
                        onClick={() => toggleRecordSelection(record)}
                        className={
                          isLight
                            ? `bg-white p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                isSelected
                                  ? 'border-green-500 bg-green-50'
                                  : 'border-slate-200 hover:border-green-300 hover:shadow-sm'
                              }`
                            : `bg-[#101010] p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                isSelected
                                  ? 'border-green-400 bg-green-900/20'
                                  : 'border-white/10 hover:border-green-400/60 hover:shadow-lg hover:shadow-green-500/10'
                              }`
                        }
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={
                              isLight
                                ? `flex-shrink-0 w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center ${
                                    isSelected ? 'bg-green-500 border-green-500' : 'border-slate-300'
                                  }`
                                : `flex-shrink-0 w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center ${
                                    isSelected ? 'bg-green-500 border-green-500' : 'border-white/20'
                                  }`
                            }
                          >
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>

                          <div className="flex-1 min-w-0">
                            {displayFields.length > 0 ? (
                              <div className="grid grid-cols-3 gap-3">
                                {displayFields.map((field: any) => (
                                  <div key={field.name} className="min-w-0">
                                    <div className={isLight ? "text-xs text-slate-500 truncate font-medium" : "text-xs text-white/60 truncate font-medium"}>{field.name}</div>
                                    <div className={isLight ? "text-sm text-slate-900 truncate mt-0.5" : "text-sm text-white truncate mt-0.5"}>
                                      {renderFieldValue(record[field.name])}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className={isLight ? "text-sm text-slate-500" : "text-sm text-white/60"}>
                                {JSON.stringify(record).substring(0, 100)}...
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* 分页 */}
              {totalPages > 1 && (
                <div className={isLight ? "mt-4 flex items-center justify-between px-4 py-3 bg-white rounded-lg border border-slate-200" : "mt-4 flex items-center justify-between px-4 py-3 bg-[#101010] rounded-lg border border-white/10"}>
                  <div className={isLight ? "text-sm text-slate-600" : "text-sm text-white/70"}>
                    显示 {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, totalRecords)} 条，
                    共 {totalRecords} 条
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => loadRecords(selectedDocument, currentPage - 1)}
                      disabled={currentPage === 1}
                      className={isLight ? "px-3 py-1.5 text-sm border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed" : "px-3 py-1.5 text-sm border border-white/10 rounded-md hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"}
                    >
                      上一页
                    </button>
                    <span className={isLight ? "text-sm text-slate-600" : "text-sm text-white/70"}>
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => loadRecords(selectedDocument, currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className={isLight ? "px-3 py-1.5 text-sm border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed" : "px-3 py-1.5 text-sm border border-white/10 rounded-md hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"}
                    >
                      下一页
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* 底部操作栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-white">
          <div className="text-sm text-gray-600">
            {selectedDocument && `已选择 ${selectedIds.size} 条记录`}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            {selectedDocument && (
              <button
                onClick={handleConfirm}
                disabled={selectedIds.size === 0}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                确认选择
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
