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

  const escapeHtml = (str: string) =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')

  const renderMarkdownLike = (text: string) => {
    let html = escapeHtml(text)
    // 代码块 ``` ```
    html = html.replace(/```([\s\S]*?)```/g, (_, code) => `<pre class="rv-code"><code>${code.trim()}</code></pre>`)
    // 行内代码
    html = html.replace(/`([^`]+)`/g, '<code class="rv-inline">$1</code>')
    // 粗体/斜体
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>')
    // 标题
    html = html.replace(/^###### (.*)$/gm, '<h6>$1</h6>')
    html = html.replace(/^##### (.*)$/gm, '<h5>$1</h5>')
    html = html.replace(/^#### (.*)$/gm, '<h4>$1</h4>')
    html = html.replace(/^### (.*)$/gm, '<h3>$1</h3>')
    html = html.replace(/^## (.*)$/gm, '<h2>$1</h2>')
    html = html.replace(/^# (.*)$/gm, '<h1>$1</h1>')
    // 列表
    html = html.replace(/^(?:-|\*) (.*)$/gm, '<li>$1</li>')
    html = html.replace(/(<li>.*<\/li>)/gs, '<ul class="rv-list">$1</ul>')
    // 段落
    html = html.replace(/^(?!<h\d|<ul|<pre|<li|<code)(.+)$/gm, '<p>$1</p>')
    return (
      <div
        className={isLight ? "rv-markdown text-slate-800" : "rv-markdown text-gray-100"}
        style={{ lineHeight: 1.65, wordBreak: 'break-word' }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    )
  }

  const sanitizeHtml = (html: string) => {
    // 移除 script/style
    html = html.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '')
    // 移除事件处理器
    html = html.replace(/\son\w+="[^"]*"/gi, '')
    // 阻断 javascript: 协议
    html = html.replace(/(href|src)\s*=\s*"(javascript:[^"]*)"/gi, '$1="#"')
    return html
  }

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
    const hasHtmlTag = /<[^>]+>/m.test(text)
    const looksLikeMarkdown = /(^#\s|```|\*{1,2}.+\*{1,2}|^- |^\* |`.+`)/m.test(text)

    if (hasHtmlTag) {
      const safe = sanitizeHtml(text)
      return (
        <div
          className={isLight ? "rv-markdown text-slate-800" : "rv-markdown text-gray-100"}
          style={{ lineHeight: 1.65, wordBreak: 'break-word' }}
          dangerouslySetInnerHTML={{ __html: safe }}
        />
      )
    }

    if (looksLikeMarkdown) {
      return renderMarkdownLike(text)
    }

    if (text.length > 200) {
      return (
        <div className={isLight ? "text-sm text-slate-700 whitespace-pre-wrap max-h-60 overflow-y-auto" : "text-sm text-gray-200 whitespace-pre-wrap max-h-60 overflow-y-auto"}>
          {text}
        </div>
      )
    }

    return <span className={isLight ? "text-sm text-slate-800" : "text-sm text-gray-200"}>{text}</span>
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div className={isLight ? "bg-gradient-to-br from-white via-[#f8fafc] to-white rounded-2xl shadow-[0_16px_48px_rgba(15,23,42,0.12)] w-full max-w-3xl max-h-[85vh] flex flex-col border border-slate-200" : "bg-gradient-to-br from-[#1e1e1e] via-[#1b1b1b] to-[#252525] rounded-2xl shadow-[0_18px_52px_rgba(0,0,0,0.38)] w-full max-w-3xl max-h-[85vh] flex flex-col border border-[#2f2f2f]"}>
        {/* 头部 */}
        <div className={isLight ? "flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 to-purple-50/70 border-slate-200 rounded-t-2xl" : "flex items-center justify-between p-6 border-b bg-gradient-to-r from-[#202020] via-[#242424] to-[#2a2a2a] border-[#2f2f2f] rounded-t-2xl"}>
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className={isLight ? "w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center text-white flex-shrink-0 shadow-md" : "w-12 h-12 rounded-xl bg-blue-500/80 flex items-center justify-center text-white flex-shrink-0 shadow-md border border-[#2f2f2f]"}>
              <FileText className="w-6 h-6 drop-shadow-sm" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className={isLight ? "text-xl font-semibold text-slate-900 truncate" : "text-xl font-semibold text-gray-100 truncate"}>
                记录详情
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                <span className={isLight ? "px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-medium" : "px-2 py-1 rounded-full bg-[#2a2a2a] text-blue-200 font-medium border border-[#2f2f2f]"}>
                  文档：{recordRef.documentTitle}
                </span>
                {recordId && (
                  <span className={isLight ? "px-2 py-1 rounded-full bg-slate-100 text-slate-700" : "px-2 py-1 rounded-full bg-[#2a2a2a] text-gray-300 border border-[#2f2f2f]"}>
                    记录 ID：{recordId}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className={isLight ? "p-2 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0" : "p-2 hover:bg-[#2a2a2a] rounded-lg transition-colors flex-shrink-0 border border-transparent hover:border-[#3a3a3a]"}
          >
            <X className={isLight ? "w-5 h-5 text-slate-500" : "w-5 h-5 text-gray-300"} />
          </button>
        </div>

        {/* 内容区 */}
        <div className={isLight ? "flex-1 overflow-y-auto p-6 bg-slate-50 text-slate-900" : "flex-1 overflow-y-auto p-6 bg-[#121416] text-gray-200"}>
          <div className="space-y-3">
            {Object.entries(recordRef.recordData)
              .filter(([key]) => !(key.startsWith('_') || key === 'id'))
              .map(([key, value]) => (
                <div
                  key={key}
                  className={
                    isLight
                      ? "group rounded-2xl border border-slate-200 bg-white/90 shadow-sm hover:shadow-md hover:border-blue-200 transition-all px-4 py-3"
                      : "group rounded-2xl border border-[#2f2f2f] bg-[#252525]/90 backdrop-blur-sm shadow-sm hover:shadow-lg hover:border-blue-400/30 transition-all px-4 py-3"
                  }
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-32">
                      <label className={isLight ? "text-sm font-semibold text-slate-800" : "text-sm font-semibold text-gray-200"}>
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
              <div className={isLight ? "text-center text-slate-400 py-10 border border-dashed border-slate-200 rounded-2xl bg-white/70" : "text-center text-gray-400 py-10 border border-dashed border-[#2f2f2f] rounded-2xl bg-[#1e1e1e]/70"}>
                暂无可展示的字段
              </div>
            )}
          </div>
        </div>

        {/* 底部 */}
        <div className={isLight ? "flex items-center justify-end p-6 border-t bg-slate-50 border-slate-200" : "flex items-center justify-end p-6 border-t bg-[#1e1e1e] border-[#2f2f2f]"}>
          <Button onClick={onClose}>
            关闭
          </Button>
        </div>
      </div>
    </div>
  )
}
