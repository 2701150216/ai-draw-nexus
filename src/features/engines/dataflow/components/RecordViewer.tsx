import React from 'react'
import { X, FileText } from 'lucide-react'
import type { ToolboxRecordRef } from '@/types/dataflow'
import { Button } from '@/components/ui'

interface RecordViewerProps {
  recordRef: ToolboxRecordRef
  onClose: () => void
  theme?: 'dark' | 'light'
}

export const RecordViewer: React.FC<RecordViewerProps> = ({ recordRef, onClose, theme = 'dark' }) => {
  const isLight = theme === 'light'
  const recordId = (recordRef as any).recordId || (recordRef as any).id || ''

  const renderValue = (value: any): React.ReactNode => {
    if (value === null || value === undefined) {
      return <span className={isLight ? "text-slate-400" : "text-white/60"}>-</span>
    }

    if (Array.isArray(value)) {
      return (
        <div className="space-y-1">
          {value.map((item, idx) => (
            <div key={idx} className={isLight ? "pl-4 border-l-2 border-slate-200" : "pl-4 border-l-2 border-white/10"}>
              {typeof item === 'object' ? (
                <pre className={isLight ? "text-xs bg-slate-50 p-2 rounded overflow-x-auto text-slate-800" : "text-xs bg-[#0f0f0f] p-2 rounded overflow-x-auto text-white"}>
                  {JSON.stringify(item, null, 2)}
                </pre>
              ) : (
                <span className={isLight ? "text-sm text-slate-800" : "text-sm"}>{String(item)}</span>
              )}
            </div>
          ))}
        </div>
      )
    }

    if (typeof value === 'object') {
      return (
        <pre className={isLight ? "text-xs bg-slate-50 p-3 rounded overflow-x-auto max-h-60 text-slate-800" : "text-xs bg-[#0f0f0f] p-3 rounded overflow-x-auto max-h-60 text-white"}>
          {JSON.stringify(value, null, 2)}
        </pre>
      )
    }

    const text = String(value)
    if (text.length > 200) {
      return (
        <div className={isLight ? "text-sm text-slate-700 whitespace-pre-wrap max-h-60 overflow-y-auto" : "text-sm text-white whitespace-pre-wrap max-h-60 overflow-y-auto"}>
          {text}
        </div>
      )
    }

    return <span className={isLight ? "text-sm text-slate-800" : "text-sm text-white"}>{text}</span>
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div className={isLight ? "bg-gradient-to-br from-white to-slate-50 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col border border-slate-200" : "bg-gradient-to-br from-[#0b0b0b] to-[#111827] rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col border border-white/10"}>
        {/* 头部 */}
        <div className={isLight ? "flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 to-purple-50 border-slate-200 rounded-t-2xl" : "flex items-center justify-between p-6 border-b bg-gradient-to-r from-[#0b1220] via-[#111827] to-[#0b1220] border-white/10 rounded-t-2xl"}>
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className={isLight ? "w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center text-white flex-shrink-0 shadow-md" : "w-12 h-12 rounded-xl bg-blue-500/80 flex items-center justify-center text-white flex-shrink-0 shadow-md"}>
              <FileText className="w-6 h-6 drop-shadow-sm" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className={isLight ? "text-xl font-semibold text-slate-900 truncate" : "text-xl font-semibold text-white truncate"}>
                记录详情
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                <span className={isLight ? "px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-medium" : "px-2 py-1 rounded-full bg-blue-500/20 text-blue-200 font-medium"}>
                  文档：{recordRef.documentTitle}
                </span>
                {recordId && (
                  <span className={isLight ? "px-2 py-1 rounded-full bg-slate-100 text-slate-700" : "px-2 py-1 rounded-full bg-white/10 text-white/80"}>
                    记录 ID：{recordId}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className={isLight ? "p-2 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0" : "p-2 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"}
          >
            <X className={isLight ? "w-5 h-5 text-slate-500" : "w-5 h-5 text-white/80"} />
          </button>
        </div>

        {/* 内容区 */}
        <div className={isLight ? "flex-1 overflow-y-auto p-6 bg-transparent text-slate-900" : "flex-1 overflow-y-auto p-6 bg-transparent text-white"}>
          <div className={isLight ? "space-y-3" : "space-y-3"}>
            {Object.entries(recordRef.recordData)
              .filter(([key]) => !(key.startsWith('_') || key === 'id'))
              .map(([key, value]) => (
                <div
                  key={key}
                  className={
                    isLight
                      ? "group rounded-2xl border border-slate-200 bg-white/90 shadow-sm hover:shadow-md hover:border-blue-200 transition-all px-4 py-3"
                      : "group rounded-2xl border border-white/10 bg-[#0f0f0f]/80 backdrop-blur-sm shadow-sm hover:shadow-lg hover:border-blue-400/40 transition-all px-4 py-3"
                  }
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-32">
                      <label className={isLight ? "text-sm font-semibold text-slate-800" : "text-sm font-semibold text-white"}>
                        {key}
                      </label>
                    </div>
                    <div className="flex-1 min-w-0">
                      {renderValue(value)}
                    </div>
                  </div>
                </div>
              ))}

            {Object.keys(recordRef.recordData || {}).filter(k => !(k.startsWith('_') || k === 'id')).length === 0 && (
              <div className={isLight ? "text-center text-slate-400 py-10 border border-dashed border-slate-200 rounded-2xl bg-white/60" : "text-center text-white/60 py-10 border border-dashed border-white/10 rounded-2xl bg-[#0f0f0f]/60"}>
                暂无可展示的字段
              </div>
            )}
          </div>
        </div>

        {/* 底部 */}
        <div className={isLight ? "flex items-center justify-end p-6 border-t bg-slate-50 border-slate-200" : "flex items-center justify-end p-6 border-t bg-[#0f0f0f] border-white/10"}>
          <Button onClick={onClose}>
            关闭
          </Button>
        </div>
      </div>
    </div>
  )
}
