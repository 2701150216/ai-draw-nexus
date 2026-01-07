import { useCallback, useRef, useImperativeHandle, forwardRef, useEffect } from 'react'
import { useEditorStore, selectEngineType } from '@/stores/editorStore'
import { MermaidRenderer, type MermaidRendererRef } from '@/features/engines/mermaid/MermaidRenderer'
import { ExcalidrawEditor, type ExcalidrawEditorRef } from '@/features/engines/excalidraw/ExcalidrawEditor'
import { DrawioEditor, type DrawioEditorRef } from '@/features/engines/drawio/DrawioEditor'
import DataflowEditor from '@/features/engines/dataflow/DataflowEditor'

export interface CanvasAreaRef {
  exportAsSvg: () => void
  exportAsPng: () => void
  exportAsSource: () => void
  showSourceCode: () => void
  hideSourceCode: () => void
  toggleSourceCode: () => void
  getThumbnail: () => Promise<string>
}

interface CanvasAreaProps {
  onReady?: () => void
  dataflowTheme?: 'dark' | 'light'
}

export const CanvasArea = forwardRef<CanvasAreaRef, CanvasAreaProps>(function CanvasArea({ onReady, dataflowTheme }, ref) {
  const currentContent = useEditorStore((s) => s.currentContent)
  const currentProject = useEditorStore((s) => s.currentProject)
  const engineType = useEditorStore(selectEngineType)
  const isLoading = useEditorStore((s) => s.isLoading)
  const setContent = useEditorStore((s) => s.setContent)
  const setThumbnailGetter = useEditorStore((s) => s.setThumbnailGetter)

  // Use projectId as key to force remount when switching projects
  // This prevents Excalidraw from using its internal localStorage cache
  const projectKey = currentProject?.id || 'no-project'

  // Refs for each engine
  const mermaidRef = useRef<MermaidRendererRef>(null)
  const excalidrawRef = useRef<ExcalidrawEditorRef>(null)
  const drawioRef = useRef<DrawioEditorRef>(null)
  const dataflowRef = useRef<HTMLDivElement>(null)

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    exportAsSvg: () => {
      switch (engineType) {
        case 'mermaid':
          mermaidRef.current?.exportAsSvg()
          break
        case 'excalidraw':
          excalidrawRef.current?.exportAsSvg()
          break
        case 'drawio':
          drawioRef.current?.exportAsSvg()
          break
      }
    },
    exportAsPng: () => {
      switch (engineType) {
        case 'mermaid':
          mermaidRef.current?.exportAsPng()
          break
        case 'excalidraw':
          excalidrawRef.current?.exportAsPng()
          break
        case 'drawio':
          drawioRef.current?.exportAsPng()
          break
      }
    },
    exportAsSource: () => {
      switch (engineType) {
        case 'mermaid':
          mermaidRef.current?.exportAsSource()
          break
        case 'excalidraw':
          excalidrawRef.current?.exportAsSource()
          break
        case 'drawio':
          drawioRef.current?.exportAsSource()
          break
      }
    },
    showSourceCode: () => {
      switch (engineType) {
        case 'mermaid':
          mermaidRef.current?.showSourceCode()
          break
        case 'excalidraw':
          excalidrawRef.current?.showSourceCode()
          break
        case 'drawio':
          drawioRef.current?.showSourceCode()
          break
      }
    },
    hideSourceCode: () => {
      switch (engineType) {
        case 'mermaid':
          mermaidRef.current?.hideSourceCode()
          break
        case 'excalidraw':
          excalidrawRef.current?.hideSourceCode()
          break
        case 'drawio':
          drawioRef.current?.hideSourceCode()
          break
      }
    },
    toggleSourceCode: () => {
      switch (engineType) {
        case 'mermaid':
          mermaidRef.current?.toggleSourceCode()
          break
        case 'excalidraw':
          excalidrawRef.current?.toggleSourceCode()
          break
        case 'drawio':
          drawioRef.current?.toggleSourceCode()
          break
      }
    },
    getThumbnail: async () => {
      if (engineType === 'drawio' && drawioRef.current) {
        return drawioRef.current.getThumbnail()
      }
      if (engineType === 'dataflow' && dataflowRef.current) {
        // Generate thumbnail from dataflow canvas
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) return ''
        
        canvas.width = 400
        canvas.height = 300
        
        // Fill with dark background
        ctx.fillStyle = '#0a0a0a'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        
        // Add simple text indicating it's a dataflow
        ctx.fillStyle = '#ffffff'
        ctx.font = '20px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('Data Flow Diagram', canvas.width / 2, canvas.height / 2)
        
        return canvas.toDataURL('image/png')
      }
      return ''
    },
  }), [engineType])

  // Register thumbnail getter for drawio and dataflow engines
  useEffect(() => {
    if (engineType === 'drawio') {
      setThumbnailGetter(async () => {
        if (drawioRef.current) {
          return drawioRef.current.getThumbnail()
        }
        return ''
      })
    } else if (engineType === 'dataflow') {
      setThumbnailGetter(async () => {
        if (dataflowRef.current) {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          if (!ctx) return ''
          
          canvas.width = 400
          canvas.height = 300
          
          ctx.fillStyle = '#0a0a0a'
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          
          ctx.fillStyle = '#ffffff'
          ctx.font = '20px sans-serif'
          ctx.textAlign = 'center'
          ctx.fillText('Data Flow Diagram', canvas.width / 2, canvas.height / 2)
          
          return canvas.toDataURL('image/png')
        }
        return ''
      })
    } else {
      setThumbnailGetter(null)
    }

    return () => {
      setThumbnailGetter(null)
    }
  }, [engineType, setThumbnailGetter])

  // Trigger onReady when content is first rendered
  const hasCalledOnReady = useRef(false)
  useEffect(() => {
    if (currentContent && !hasCalledOnReady.current && onReady) {
      // Delay to ensure the engine has rendered
      const timer = setTimeout(() => {
        onReady()
        hasCalledOnReady.current = true
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [currentContent, onReady])

  // Reset onReady flag when project changes
  useEffect(() => {
    hasCalledOnReady.current = false
  }, [projectKey])

  if (!engineType) {
    return (
      <div className="flex h-full items-center justify-center bg-background text-muted">
        Loading...
      </div>
    )
  }

  // Handle content change from editors - only update store, no auto-save to database
  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent)
  }, [setContent])

  // Render based on engine type
  const renderEngine = () => {
    switch (engineType) {
      case 'mermaid':
        return <MermaidRenderer ref={mermaidRef} code={currentContent} />
      case 'excalidraw':
        return (
          <ExcalidrawEditor
            ref={excalidrawRef}
            key={projectKey}
            data={currentContent}
            onChange={handleContentChange}
          />
        )
      case 'drawio':
        return (
          <DrawioEditor
            ref={drawioRef}
            key={projectKey}
            data={currentContent}
            onChange={handleContentChange}
          />
        )
      case 'dataflow':
        return (
          <div ref={dataflowRef} className="h-full w-full">
            <DataflowEditor theme={dataflowTheme} />
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="relative h-full w-full bg-background">
      {renderEngine()}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80">
          <div className="text-center">
            <div className="mb-2 h-8 w-8 animate-spin rounded-full border-2 border-primary border-r-transparent mx-auto" />
            <p className="text-sm text-muted">Generating diagram...</p>
          </div>
        </div>
      )}
    </div>
  )
})
