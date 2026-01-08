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
            ? "bg-gradient-to-br from-white via-[#f8fafc] to-white rounded-2xl shadow-[0_16px_48px_rgba(15,23,42,0.12)] w-full max-w-4xl max-h-[85vh] flex flex-col border border-slate-200"
            : "bg-gradient-to-br from-[#1e1e1e] via-[#1b1b1b] to-[#252525] rounded-2xl shadow-[0_18px_52px_rgba(0,0,0,0.38)] w-full max-w-4xl max-h-[85vh] flex flex-col border border-[#2f2f2f]"
        }
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className={isLight ? "flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 via-blue-100 to-blue-50" : "flex items-center justify-between px-6 py-4 border-b border-[#2f2f2f] bg-gradient-to-r from-[#1b2333] via-[#1f2a3d] to-[#202b3f]"}>
          <div className="flex items-center gap-3">
            {selectedDocument ? (
              <>
                <button
                  onClick={handleBackToDocuments}
                  className={isLight ? "p-1.5 hover:bg-white/80 rounded-lg transition-colors" : "p-1.5 hover:bg-[#2a2a2a] rounded-lg transition-colors"}
                >
                  <ChevronRight className={isLight ? "w-5 h-5 rotate-180 text-slate-700" : "w-5 h-5 rotate-180 text-gray-300"} />
                </button>
                <div className="flex items-center gap-3">
                  <div className={isLight ? "w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center text-white shadow-md" : "w-12 h-12 rounded-xl bg-blue-500/85 flex items-center justify-center text-white shadow-md border border-[#2f2f2f]"}>
                    <Database className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className={isLight ? "text-lg font-semibold text-slate-900" : "text-lg font-semibold text-gray-100"}>
                      {selectedDocument.title}
                    </h2>
                    <p className={isLight ? "text-xs text-slate-600 mt-0.5" : "text-xs text-gray-300 mt-0.5"}>
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
                  <h2 className={isLight ? "text-lg font-semibold text-slate-900" : "text-lg font-semibold text-gray-100"}>选择数据文档</h2>
                  <p className={isLight ? "text-xs text-slate-600 mt-0.5" : "text-xs text-gray-300 mt-0.5"}>选择包含数据记录的文档</p>
                </div>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className={isLight ? "p-1.5 hover:bg-white/80 rounded-lg transition-colors" : "p-1.5 hover:bg-[#2a2a2a] rounded-lg transition-colors"}
          >
            <X className={isLight ? "w-5 h-5 text-slate-600" : "w-5 h-5 text-gray-300"} />
          </button>
        </div>

        {/* 搜索栏 */}
        <div className={isLight ? "px-6 py-4 bg-slate-50 border-b border-slate-200" : "px-6 py-4 bg-[#1e1e1e] border-b border-[#2f2f2f] backdrop-blur-sm"}>
          <div className="relative">
            <Search className={isLight ? "absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" : "absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"} />
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
              className={isLight ? "w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm text-slate-800" : "w-full pl-10 pr-10 py-2.5 border border-[#2f2f2f] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-[#252525] text-sm text-gray-200"}
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
                className={isLight ? "absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" : "absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* 内容区 */}
        <div className={isLight ? "flex-1 overflow-y-auto p-6 bg-slate-50 text-slate-900" : "flex-1 overflow-y-auto p-6 bg-[#121416] text-gray-100"}>
          {!selectedDocument ? (
            // 文档列表
            loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className={isLight ? "flex flex-col items-center justify-center h-64 text-slate-400" : "flex flex-col items-center justify-center h-64 text-gray-500"}>
                <FileText className="w-16 h-16 mb-3" />
                <p className="text-sm">未找到文档</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => handleDocumentClick(doc)}
                    className={isLight ? "bg-white p-4 rounded-lg border border-slate-200 cursor-pointer transition-all hover:border-blue-300 hover:shadow-sm" : "bg-[#252525] p-4 rounded-lg border border-[#2f2f2f] cursor-pointer transition-all hover:border-blue-300/60 hover:shadow-lg hover:shadow-blue-500/10"}
                  >
                    <div className="flex items-start gap-3">
                      <div className={isLight ? "w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0" : "w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0 border border-[#2f2f2f]"}>
                        <FileText className={isLight ? "w-5 h-5 text-blue-600" : "w-5 h-5 text-blue-200"} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={isLight ? "font-medium text-slate-900 truncate" : "font-medium text-gray-100 truncate"}>{doc.title}</h3>
                        {doc.description && (
                          <p className={isLight ? "mt-1 text-sm text-slate-500 line-clamp-2" : "mt-1 text-sm text-gray-300 line-clamp-2"}>{doc.description}</p>
                        )}
                        <div className={isLight ? "mt-2 flex items-center gap-4 text-xs text-slate-400" : "mt-2 flex items-center gap-4 text-xs text-gray-400"}>
                          {doc.recordCount !== undefined && (
                            <span className="flex items-center gap-1">
                              <Database className="w-3 h-3" />
                              {doc.recordCount} 条记录
                            </span>
                          )}
                          <span>更新于 {new Date(doc.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <ChevronRight className={isLight ? "w-5 h-5 text-slate-400 flex-shrink-0 mt-2" : "w-5 h-5 text-gray-400 flex-shrink-0 mt-2"} />
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
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                </div>
              ) : records.length === 0 ? (
                <div className={isLight ? "flex flex-col items-center justify-center h-64 text-slate-400" : "flex flex-col items-center justify-center h-64 text-gray-500"}>
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
                            ? `bg-white p-4 rounded-lg border cursor-pointer transition-all ${
                                isSelected
                                  ? 'border-blue-500 bg-blue-50 shadow-sm'
                                  : 'border-slate-200 hover:border-blue-300 hover:shadow-sm'
                              }`
                            : `bg-[#252525] p-4 rounded-lg border cursor-pointer transition-all ${
                                isSelected
                                  ? 'border-blue-400 bg-[#1a2433] shadow-sm'
                                  : 'border-[#2f2f2f] hover:border-blue-400/60 hover:shadow-lg hover:shadow-blue-500/10'
                              }`
                        }
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={
                              isLight
                                ? `flex-shrink-0 w-5 h-5 mt-0.5 rounded border flex items-center justify-center ${
                                    isSelected ? 'bg-blue-500 border-blue-500' : 'border-slate-300 bg-white'
                                  }`
                                : `flex-shrink-0 w-5 h-5 mt-0.5 rounded border flex items-center justify-center ${
                                    isSelected ? 'bg-blue-500 border-blue-500' : 'border-[#3a3a3a] bg-[#1a1a1a]'
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
                                    <div className={isLight ? "text-xs text-slate-500 truncate font-medium" : "text-xs text-gray-300 truncate font-medium"}>{field.name}</div>
                                    <div className={isLight ? "text-sm text-slate-900 truncate mt-0.5" : "text-sm text-gray-100 truncate mt-0.5"}>
                                      {renderFieldValue(record[field.name])}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className={isLight ? "text-sm text-slate-500" : "text-sm text-gray-300"}>
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
                <div className={isLight ? "mt-4 flex items-center justify-between px-4 py-3 bg-white rounded-lg border border-slate-200" : "mt-4 flex items-center justify-between px-4 py-3 bg-[#252525] rounded-lg border border-[#2f2f2f]"}>
                  <div className={isLight ? "text-sm text-slate-600" : "text-sm text-gray-300"}>
                    显示 {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, totalRecords)} 条，
                    共 {totalRecords} 条
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => loadRecords(selectedDocument, currentPage - 1)}
                      disabled={currentPage === 1}
                      className={isLight ? "px-3 py-1.5 text-sm border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed" : "px-3 py-1.5 text-sm border border-[#2f2f2f] rounded-md hover:bg-[#2a2a2a] disabled:opacity-50 disabled:cursor-not-allowed text-gray-200"}
                    >
                      上一页
                    </button>
                    <span className={isLight ? "text-sm text-slate-600" : "text-sm text-gray-300"}>
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => loadRecords(selectedDocument, currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className={isLight ? "px-3 py-1.5 text-sm border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed" : "px-3 py-1.5 text-sm border border-[#2f2f2f] rounded-md hover:bg-[#2a2a2a] disabled:opacity-50 disabled:cursor-not-allowed text-gray-200"}
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
        <div className={isLight ? "flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-white" : "flex items-center justify-between px-6 py-4 border-t border-[#2f2f2f] bg-[#1e1e1e]"}>
          <div className={isLight ? "text-sm text-gray-600" : "text-sm text-gray-300"}>
            {selectedDocument && `已选择 ${selectedIds.size} 条记录`}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className={isLight ? "px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors" : "px-4 py-2 text-sm border border-[#2f2f2f] rounded-md hover:bg-[#2a2a2a] text-gray-200 transition-colors"}
            >
              取消
            </button>
            {selectedDocument && (
              <button
                onClick={handleConfirm}
                disabled={selectedIds.size === 0}
                className={isLight ? "px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" : "px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-500/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"}
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
