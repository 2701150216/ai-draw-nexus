import React, { useState, useEffect } from 'react'
import { Search, X, FileText, Database, ExternalLink, Check } from 'lucide-react'
import { toolboxService } from '@/services/toolboxService'
import type { ToolboxDocument, ToolboxDocumentRef } from '@/types/dataflow'
import { Button, Input, Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui'

interface DocumentSelectorProps {
  open: boolean
  onClose: () => void
  onSelect: (docs: ToolboxDocumentRef[]) => void
  selectedDocIds?: string[]
  multiple?: boolean
}

export const DocumentSelector: React.FC<DocumentSelectorProps> = ({
  open,
  onClose,
  onSelect,
  selectedDocIds = [],
  multiple = true,
}) => {
  const [documents, setDocuments] = useState<ToolboxDocument[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(selectedDocIds))

  useEffect(() => {
    if (open) {
      loadDocuments()
      setSelectedIds(new Set(selectedDocIds))
    }
  }, [open, selectedDocIds])

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

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    if (!query.trim()) {
      loadDocuments()
      return
    }
    
    setLoading(true)
    try {
      const docs = await toolboxService.searchDocuments(query)
      setDocuments(docs)
    } catch (error) {
      console.error('Failed to search documents:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleSelection = (doc: ToolboxDocument) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(doc.id)) {
      newSelected.delete(doc.id)
    } else {
      if (!multiple) {
        newSelected.clear()
      }
      newSelected.add(doc.id)
    }
    setSelectedIds(newSelected)
  }

  const handleConfirm = () => {
    const selectedDocs: ToolboxDocumentRef[] = documents
      .filter(doc => selectedIds.has(doc.id))
      .map(doc => ({
        id: doc.id,
        title: doc.title,
        description: doc.description,
        url: `/km/data/view/${doc.id}`,
        addedAt: new Date(),
      }))
    
    onSelect(selectedDocs)
    onClose()
  }

  const filteredDocuments = documents.filter(doc =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            选择关联文档
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          {/* 搜索框 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="搜索文档标题或描述..."
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <button
                onClick={() => handleSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* 文档列表 */}
          <div className="flex-1 overflow-y-auto border rounded-lg">
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                <FileText className="w-12 h-12 mb-2" />
                <p>未找到文档</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredDocuments.map((doc) => {
                  const isSelected = selectedIds.has(doc.id)
                  return (
                    <div
                      key={doc.id}
                      onClick={() => toggleSelection(doc)}
                      className={`p-4 cursor-pointer transition-colors hover:bg-gray-50 ${
                        isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`flex-shrink-0 w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center ${
                          isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <h3 className="font-medium text-gray-900 truncate">
                              {doc.title}
                            </h3>
                          </div>
                          
                          {doc.description && (
                            <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                              {doc.description}
                            </p>
                          )}
                          
                          <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
                            {doc.recordCount !== undefined && (
                              <span>{doc.recordCount} 条记录</span>
                            )}
                            <span>更新于 {new Date(doc.updatedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* 底部操作栏 */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-gray-500">
              已选择 {selectedIds.size} 个文档
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                取消
              </Button>
              <Button onClick={handleConfirm} disabled={selectedIds.size === 0}>
                确认选择
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
