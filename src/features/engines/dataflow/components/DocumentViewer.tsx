import React, { useState, useEffect } from 'react'
import { X, FileText, Calendar, User, Search, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { toolboxService } from '@/services/toolboxService'
import type { ToolboxDocumentRef, ToolboxDocument, ToolboxRecord } from '@/types/dataflow'
import { Button, Input } from '@/components/ui'

interface DocumentViewerProps {
  documentRef: ToolboxDocumentRef
  onClose: () => void
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({ documentRef, onClose }) => {
  const [document, setDocument] = useState<ToolboxDocument | null>(null)
  const [records, setRecords] = useState<ToolboxRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalRecords, setTotalRecords] = useState(0)
  const pageSize = 20

  useEffect(() => {
    loadDocument()
  }, [documentRef.id])

  useEffect(() => {
    if (document) {
      loadRecords()
    }
  }, [document, currentPage, searchQuery])

  const loadDocument = async () => {
    setLoading(true)
    try {
      const doc = await toolboxService.getDocument(documentRef.id)
      setDocument(doc)
    } catch (error) {
      console.error('Failed to load document:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadRecords = async () => {
    if (!document) return
    
    try {
      const result = await toolboxService.getDocumentRecords(document.id, {
        page: currentPage,
        pageSize,
        search: searchQuery,
      })
      setRecords(result.records)
      setTotalRecords(result.total)
    } catch (error) {
      console.error('Failed to load records:', error)
    }
  }

  const totalPages = Math.ceil(totalRecords / pageSize)

  const renderFieldValue = (value: any, fieldType: string) => {
    if (value === null || value === undefined) {
      return <span className="text-gray-400">-</span>
    }

    if (fieldType === 'array' && Array.isArray(value)) {
      return (
        <div className="flex flex-wrap gap-1">
          {value.slice(0, 3).map((item, idx) => (
            <span key={idx} className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">
              {typeof item === 'object' ? JSON.stringify(item) : String(item)}
            </span>
          ))}
          {value.length > 3 && (
            <span className="text-xs text-gray-400">+{value.length - 3} more</span>
          )}
        </div>
      )
    }

    if (fieldType === 'object' && typeof value === 'object') {
      return (
        <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto max-w-full">
          {JSON.stringify(value, null, 2)}
        </pre>
      )
    }

    if (fieldType === 'longtext' || fieldType === 'richtext') {
      const text = String(value)
      return (
        <div className="text-sm text-gray-700 line-clamp-3" title={text}>
          {text}
        </div>
      )
    }

    return <span className="text-sm text-gray-700">{String(value)}</span>
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-12 h-12 rounded-lg bg-blue-500 flex items-center justify-center text-white flex-shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold text-gray-900 truncate">
                {documentRef.title}
              </h2>
              {documentRef.description && (
                <p className="text-sm text-gray-500 truncate mt-1">
                  {documentRef.description}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : !document ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>无法加载文档</p>
            </div>
          </div>
        ) : (
          <>
            {/* 文档信息 */}
            <div className="p-6 border-b bg-gray-50">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">记录数:</span>
                  <span className="font-medium">{totalRecords}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">更新:</span>
                  <span className="font-medium">
                    {new Date(document.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                {document.ownerId && (
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">所有者ID:</span>
                    <span className="font-medium">{document.ownerId}</span>
                  </div>
                )}
              </div>

              {/* 搜索框 */}
              <div className="mt-4 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索记录..."
                  className="pl-10"
                />
              </div>
            </div>

            {/* 数据表格 */}
            <div className="flex-1 overflow-auto p-6">
              {records.length === 0 ? (
                <div className="flex items-center justify-center h-40 text-gray-400">
                  <div className="text-center">
                    <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>暂无数据记录</p>
                  </div>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        {document.fields.slice(0, 5).map((field) => (
                          <th
                            key={field.name}
                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            {field.name}
                            {field.required && (
                              <span className="text-red-500 ml-1">*</span>
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {records.map((record, idx) => (
                        <tr key={record.id || record._id || idx} className="hover:bg-gray-50">
                          {document.fields.slice(0, 5).map((field) => (
                            <td key={field.name} className="px-4 py-3">
                              {renderFieldValue(record[field.name], field.type)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
                <div className="text-sm text-gray-600">
                  显示 {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, totalRecords)} 条，
                  共 {totalRecords} 条
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-gray-600">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
