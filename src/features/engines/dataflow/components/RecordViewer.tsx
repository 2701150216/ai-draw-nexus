import React from 'react'
import { X, FileText } from 'lucide-react'
import type { ToolboxRecordRef } from '@/types/dataflow'
import { Button } from '@/components/ui'

interface RecordViewerProps {
  recordRef: ToolboxRecordRef
  onClose: () => void
}

export const RecordViewer: React.FC<RecordViewerProps> = ({ recordRef, onClose }) => {
  const renderValue = (value: any): React.ReactNode => {
    if (value === null || value === undefined) {
      return <span className="text-gray-400">-</span>
    }

    if (Array.isArray(value)) {
      return (
        <div className="space-y-1">
          {value.map((item, idx) => (
            <div key={idx} className="pl-4 border-l-2 border-gray-200">
              {typeof item === 'object' ? (
                <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                  {JSON.stringify(item, null, 2)}
                </pre>
              ) : (
                <span className="text-sm">{String(item)}</span>
              )}
            </div>
          ))}
        </div>
      )
    }

    if (typeof value === 'object') {
      return (
        <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto max-h-60">
          {JSON.stringify(value, null, 2)}
        </pre>
      )
    }

    const text = String(value)
    if (text.length > 200) {
      return (
        <div className="text-sm text-gray-700 whitespace-pre-wrap max-h-60 overflow-y-auto">
          {text}
        </div>
      )
    }

    return <span className="text-sm text-gray-700">{text}</span>
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-12 h-12 rounded-lg bg-blue-500 flex items-center justify-center text-white flex-shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold text-gray-900 truncate">
                记录详情
              </h2>
              <p className="text-sm text-gray-500 truncate mt-1">
                来自: {recordRef.documentTitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {Object.entries(recordRef.recordData).map(([key, value]) => {
              // 跳过内部字段
              if (key.startsWith('_') || key === 'id') return null

              return (
                <div key={key} className="border-b pb-4 last:border-b-0">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-32">
                      <label className="text-sm font-medium text-gray-700">
                        {key}
                      </label>
                    </div>
                    <div className="flex-1 min-w-0">
                      {renderValue(value)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 底部 */}
        <div className="flex items-center justify-end p-6 border-t bg-gray-50">
          <Button onClick={onClose}>
            关闭
          </Button>
        </div>
      </div>
    </div>
  )
}
