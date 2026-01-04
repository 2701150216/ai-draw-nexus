import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import {
    MessageSquare, Search, Layers, Database, Cpu, Code,
    FileText, Zap, Brain, Server, ArrowUp, RefreshCw,
    Settings2, Move, MousePointer2, Link as LinkIcon, Trash2, X, Plus,
    Palette, Type, Activity
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useEditorStore } from '@/stores/editorStore';
// --- 工具函数 ---
function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
// --- 图标映射表 ---
const ICON_MAP: Record<string, React.ElementType> = {
    MessageSquare, Search, Layers, Database, Cpu, Code,
    FileText, Zap, Brain, Server, ArrowUp
};
// --- 常量定义 ---
const PRESET_COLORS = ['#3b82f6', '#8b5cf6', '#a855f7', '#06b6d4', '#f59e0b', '#10b981', '#ef4444', '#ec4899', '#ffffff'];
// --- 类型定义 ---
interface NodeData {
    id: string;
    x: number;
    y: number;
    iconKey: string;
    label: string;
    subLabel?: string;
    color: string;
    type?: 'input' | 'process' | 'storage' | 'output' | 'model';
}
interface ConnectionData {
    id: string;
    start: string;
    end: string;
    color: string;
    dashed?: boolean;
    speed?: number; // 动画时长，单位秒
}
// --- 初始数据 ---
const INITIAL_NODES: NodeData[] = [
    { id: 'user', x: 100, y: 300, iconKey: 'MessageSquare', label: '用户输入', color: '#3b82f6' },
    { id: 'search', x: 300, y: 150, iconKey: 'Search', label: '搜索', subLabel: '任意向量', color: '#8b5cf6' },
    { id: 'embedding', x: 500, y: 150, iconKey: 'Layers', label: '向量嵌入', subLabel: '生成', color: '#8b5cf6' },
    { id: 'vectorDB', x: 700, y: 150, iconKey: 'Database', label: '向量存储', color: '#a855f7', type: 'storage' },
    { id: 'rerank', x: 900, y: 150, iconKey: 'ArrowUp', label: '重排序', subLabel: '结果', color: '#8b5cf6' },
    { id: 'plan', x: 300, y: 380, iconKey: 'Brain', label: '计划模型', subLabel: '自选模型', color: '#06b6d4' },
    { id: 'task', x: 500, y: 380, iconKey: 'Zap', label: '任务系统', color: '#f59e0b', type: 'process' },
    { id: 'output', x: 900, y: 500, iconKey: 'Server', label: '最终输出', color: '#10b981', type: 'output' },
];
const INITIAL_CONNECTIONS: ConnectionData[] = [
    { id: 'c1', start: 'user', end: 'search', color: '#3b82f6', speed: 1.5 },
    { id: 'c2', start: 'user', end: 'plan', color: '#3b82f6', speed: 1.5 },
    { id: 'c3', start: 'search', end: 'embedding', color: '#8b5cf6', speed: 1.2 },
    { id: 'c4', start: 'embedding', end: 'vectorDB', color: '#8b5cf6', speed: 1.2 },
    { id: 'c5', start: 'vectorDB', end: 'rerank', color: '#a855f7', speed: 1.2 },
    { id: 'c7', start: 'plan', end: 'task', color: '#06b6d4', speed: 1.5 },
    { id: 'c18', start: 'rerank', end: 'output', color: '#10b981', speed: 1.0 },
    { id: 'c19', start: 'task', end: 'output', color: '#f59e0b', speed: 1.0 },
];
// --- 核心修复：独立的流动引擎类 ---
// 这个类完全独立于 React 组件生命周期，确保逻辑绝对连续
class FlowEngine {
    private connections: ConnectionData[] = [];
    private nodes: NodeData[] = [];
    private activeFlows: Map<string, number> = new Map();
    private timeouts: ReturnType<typeof setTimeout>[] = [];
    private onUpdate: (flows: Map<string, number>) => void;
    private isRunning: boolean = false;
    
    constructor(onUpdate: (flows: Map<string, number>) => void) {
        this.onUpdate = onUpdate;
    }
    
    public updateData(nodes: NodeData[], connections: ConnectionData[]) {
        this.nodes = nodes;
        this.connections = connections;
    }
    
    public start(startNodeIds: string[], isAutoLoop: boolean) {
        this.stop();
        this.isRunning = true;
        this.flowFromNodes(startNodeIds, isAutoLoop);
    }
    
    public stop() {
        this.isRunning = false;
        this.timeouts.forEach(clearTimeout);
        this.timeouts = [];
        this.activeFlows.clear();
        this.onUpdate(new Map());
    }
    
    private flowFromNodes(nodeIds: string[], isAutoLoop: boolean) {
        if (!this.isRunning || nodeIds.length === 0) return;
        
        // 找到从这些节点出发的所有连接
        const outgoingConns = this.connections.filter(c => nodeIds.includes(c.start));
        
        if (outgoingConns.length === 0) {
            // 没有出站连接，如果是自动循环模式，重新开始
            if (isAutoLoop) {
                const restartId = setTimeout(() => {
                    if (!this.isRunning) return;
                    const rootIds = this.getRootNodeIds();
                    this.flowFromNodes(rootIds, true);
                }, 800);
                this.timeouts.push(restartId);
            }
            return;
        }
        
        // 激活所有出站连接的流动动画
        const now = Date.now();
        outgoingConns.forEach(conn => {
            this.activeFlows.set(conn.id, now);
        });
        this.onUpdate(new Map(this.activeFlows));
        
        // 为每个连接设置完成后的处理
        const nextNodeSet = new Set<string>();
        let completedCount = 0;
        
        outgoingConns.forEach(conn => {
            const duration = (conn.speed || 2) * 1000;
            
            // 动画完成时的回调
            const completeId = setTimeout(() => {
                if (!this.isRunning) return;
                
                nextNodeSet.add(conn.end);
                completedCount++;
                
                // 所有并行连接都完成后
                if (completedCount === outgoingConns.length) {
                    // 延迟后清除当前流动状态并继续下一步
                    const continueId = setTimeout(() => {
                        if (!this.isRunning) return;
                        
                        // 清除当前批次的流动状态
                        outgoingConns.forEach(c => this.activeFlows.delete(c.id));
                        this.onUpdate(new Map(this.activeFlows));
                        
                        // 继续流向下一批节点
                        const nextNodes = Array.from(nextNodeSet);
                        this.flowFromNodes(nextNodes, isAutoLoop);
                    }, 200);
                    this.timeouts.push(continueId);
                }
            }, duration);
            
            this.timeouts.push(completeId);
        });
    }
    
    private getRootNodeIds(): string[] {
        const targetIds = new Set(this.connections.map(c => c.end));
        return this.nodes.filter(n => !targetIds.has(n.id)).map(n => n.id);
    }
}
// --- 主组件 ---
export default function KnoxEditorFinalFixV6() {
    const currentContent = useEditorStore((s) => s.currentContent);
    const setContent = useEditorStore((s) => s.setContent);
    
    // 从 currentContent 加载初始数据
    const initialData = useMemo(() => {
        if (currentContent) {
            try {
                const parsed = JSON.parse(currentContent);
                return {
                    nodes: parsed.nodes || INITIAL_NODES,
                    connections: parsed.connections || INITIAL_CONNECTIONS,
                };
            } catch {
                return { nodes: INITIAL_NODES, connections: INITIAL_CONNECTIONS };
            }
        }
        return { nodes: INITIAL_NODES, connections: INITIAL_CONNECTIONS };
    }, [currentContent]);
    
    const [nodes, setNodes] = useState<NodeData[]>(initialData.nodes);
    const [connections, setConnections] = useState<ConnectionData[]>(initialData.connections);
    const [mode, setMode] = useState<'view' | 'edit' | 'link'>('view');
    const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [selectionType, setSelectionType] = useState<'node' | 'connection' | null>(null);
    const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
    const [linkStartNodeId, setLinkStartNodeId] = useState<string | null>(null);

    // --- 核心修复：使用 State 接收引擎的更新 ---
    const [activeFlows, setActiveFlows] = useState<Map<string, number>>(new Map());
    const containerRef = useRef<HTMLDivElement>(null);
    // --- 核心修复：实例化引擎 ---
    // 使用 useRef 保持引擎实例的唯一性
    const engineRef = useRef<FlowEngine | null>(null);
    // 初始化引擎 (仅一次)
    if (!engineRef.current) {
        engineRef.current = new FlowEngine((flows) => {
            setActiveFlows(flows);
        });
    }
    // 实时同步数据给引擎
    useEffect(() => {
        engineRef.current?.updateData(nodes, connections);
    }, [nodes, connections]);
    
    // 自动保存数据到 editorStore
    useEffect(() => {
        const data = JSON.stringify({ nodes, connections });
        setContent(data);
    }, [nodes, connections, setContent]);
    // --- 启动控制器 ---
    useEffect(() => {
        const engine = engineRef.current;
        if (!engine) return;
        
        // 1. 如果不在预览模式，停止引擎
        if (mode !== 'view') {
            engine.stop();
            return;
        }
        // 2. 无论何时 activeNodeId 变化，先停止，再重新开始
        engine.stop();
        // 3. 延迟一帧启动，确保停止逻辑已生效
        const timer = setTimeout(() => {
            if (activeNodeId) {
                // 选中模式：单次运行
                engine.start([activeNodeId], false);
            } else {
                // 默认模式：循环运行
                const targetIds = new Set(connections.map(c => c.end));
                const rootIds = nodes.filter(n => !targetIds.has(n.id)).map(n => n.id);
                const startIds = rootIds.length > 0 ? rootIds : (nodes.length > 0 ? [nodes[0].id] : []);
                
                if (startIds.length > 0) {
                    engine.start(startIds, true);
                }
            }
        }, 50);
        return () => {
            clearTimeout(timer);
            engine.stop();
        };
    }, [mode, activeNodeId, nodes, connections]); // 依赖项包含 nodes/connections 以便结构变化时重启
    // --- 逻辑操作 (保持不变) ---
    const deleteItem = () => {
        if (selectionType === 'node') {
            setNodes(prev => prev.filter(n => n.id !== selectedId));
            setConnections(prev => prev.filter(c => c.start !== selectedId && c.end !== selectedId));
        } else if (selectionType === 'connection') {
            setConnections(prev => prev.filter(c => c.id !== selectedId));
        }
        setSelectedId(null);
        setSelectionType(null);
    };
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
            if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId && mode === 'edit') {
                deleteItem();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedId, mode, selectionType]);
    // --- 事件处理 (保持不变) ---
    const handlePointerMove = (e: React.PointerEvent) => {
        if (draggingNodeId && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width * 1000;
            const y = (e.clientY - rect.top) / rect.height * 600;
            const clampedX = Math.max(0, Math.min(1000, x));
            const clampedY = Math.max(0, Math.min(600, y));
            setNodes(prev => prev.map(n => n.id === draggingNodeId ? { ...n, x: clampedX, y: clampedY } : n));
        }
    };
    const handlePointerUp = () => {
        setDraggingNodeId(null);
    };
    const handleNodeClick = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (mode === 'link') {
            if (!linkStartNodeId) {
                setLinkStartNodeId(id);
            } else {
                if (linkStartNodeId !== id) {
                    const newConn: ConnectionData = {
                        id: `c-${crypto.randomUUID()}`,
                        start: linkStartNodeId,
                        end: id,
                        color: '#ffffff',
                        speed: 2
                    };
                    setConnections(prev => [...prev, newConn]);
                    setLinkStartNodeId(null);
                    setMode('edit');
                }
            }
            return;
        }
        if (mode === 'edit') {
            setSelectedId(id);
            setSelectionType('node');
            return;
        }
        // View mode: 切换选中状态
        setActiveNodeId(activeNodeId === id ? null : id);
    };
    const handleConnectionClick = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (mode === 'edit') {
            setSelectedId(id);
            setSelectionType('connection');
        }
    };
    const handleBgClick = () => {
        if (mode !== 'edit') {
            setActiveNodeId(null);
            setSelectedId(null);
            setSelectionType(null);
        }
        setLinkStartNodeId(null);
    };
    const updateNode = (id: string, data: Partial<NodeData>) => {
        setNodes(prev => prev.map(n => n.id === id ? { ...n, ...data } : n));
    };
    const updateConnection = (id: string, data: Partial<ConnectionData>) => {
        setConnections(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
    };
    // 辅助计算高亮路径
    const { activeNodes, activeConnections } = useMemo(() => {
        if (!activeNodeId) return { activeNodes: null, activeConnections: null };
        const activeN = new Set<string>([activeNodeId]);
        const activeC = new Set<string>();
        const queue = [activeNodeId];
        while (queue.length > 0) {
            const currentId = queue.shift()!;
            const outgoingConns = connections.filter(c => c.start === currentId);
            outgoingConns.forEach(conn => {
                activeC.add(conn.id);
                if (!activeN.has(conn.end)) {
                    activeN.add(conn.end);
                    queue.push(conn.end);
                }
            });
        }
        return { activeNodes: activeN, activeConnections: activeC };
    }, [activeNodeId, connections]);
    return (
        <div
            className="w-full h-full bg-[#050505] flex flex-col font-sans select-none overflow-hidden"
            onPointerUp={handlePointerUp}
        >
            {/* 内部工具栏 */}
            <div className="flex items-center gap-2 border-b border-white/10 bg-[#0a0a0a] px-4 py-2">
                <div className="flex items-center gap-2 p-1 bg-[#1a1a1a] rounded-lg border border-white/10">
                    <button
                        onClick={() => { setMode('view'); setSelectedId(null); }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                            mode === 'view' 
                                ? 'bg-blue-600 text-white' 
                                : 'text-white/70 hover:text-white hover:bg-white/10'
                        }`}
                    >
                        <MousePointer2 size={14} />
                        <span>预览</span>
                    </button>
                    <button
                        onClick={() => setMode('edit')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                            mode === 'edit' 
                                ? 'bg-blue-600 text-white' 
                                : 'text-white/70 hover:text-white hover:bg-white/10'
                        }`}
                    >
                        <Move size={14} />
                        <span>编辑</span>
                    </button>
                    <button
                        onClick={() => { setMode('link'); setSelectedId(null); }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                            mode === 'link' 
                                ? 'bg-blue-600 text-white' 
                                : 'text-white/70 hover:text-white hover:bg-white/10'
                        }`}
                    >
                        <LinkIcon size={14} />
                        <span>连线</span>
                    </button>
                </div>

                <div className="w-px h-6 bg-white/10" />
                
                <button
                    onClick={() => {
                        const newNode: NodeData = {
                            id: `n-${Date.now()}`,
                            x: 500, y: 300,
                            iconKey: 'Cpu',
                            label: '新节点',
                            color: '#ffffff'
                        };
                        setNodes([...nodes, newNode]);
                        setMode('edit');
                        setSelectedId(newNode.id);
                        setSelectionType('node');
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-[#222] hover:bg-[#333] border border-white/20 text-white rounded-md text-xs font-medium transition-all hover:border-white/40"
                >
                    <Plus size={14} /> 添加节点
                </button>

                <div className="ml-auto px-3 py-1 rounded-full bg-white/10 border border-white/10 text-[10px] font-mono text-white font-bold tracking-wider">
                    {mode === 'view' && "预览模式"}
                    {mode === 'edit' && "编辑模式"}
                    {mode === 'link' && "连线模式"}
                </div>
            </div>
            {/* 主体区域 */}
            <div className="flex-1 flex overflow-hidden relative">
                <div
                    className="flex-1 relative bg-[#050505] overflow-hidden"
                    onClick={handleBgClick}
                >
                    <div
                        ref={containerRef}
                        className={cn(
                            "w-full h-full relative touch-none",
                            mode !== 'view' ? "cursor-crosshair" : ""
                        )}
                        onPointerMove={handlePointerMove}
                    >
                        <div className="absolute inset-0 opacity-[0.15] pointer-events-none"
                             style={{ backgroundImage: 'radial-gradient(#888 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

                        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" viewBox="0 0 1000 600" preserveAspectRatio="none">
                            {connections.map((conn) => {
                                const isDimmed = !!(mode === 'view' && activeNodeId && !activeConnections?.has(conn.id));
                                const isPathActive = !!(mode === 'view' && activeNodeId && activeConnections?.has(conn.id));
                                const isSelected = selectionType === 'connection' && selectedId === conn.id;
                                const flowTimestamp = activeFlows.get(conn.id);
                                const isFlowing = flowTimestamp !== undefined;
                                
                                return (
                                    <Connection
                                        key={`${conn.id}-${flowTimestamp || 'static'}`}
                                        conn={conn}
                                        nodes={nodes}
                                        isDimmed={isDimmed}
                                        isPathActive={isPathActive}
                                        isSelected={isSelected}
                                        isFlowing={isFlowing}
                                        flowTimestamp={flowTimestamp}
                                        mode={mode}
                                        onClick={(e) => handleConnectionClick(conn.id, e)}
                                    />
                                );
                            })}
                        </svg>
                        <div className="absolute inset-0 w-full h-full z-10 pointer-events-none">
                            {nodes.map((node) => {
                                const isDimmed = mode === 'view' && activeNodeId && !activeNodes?.has(node.id);
                                const isClicked = activeNodeId === node.id || selectedId === node.id;
                                const isLinkStart = linkStartNodeId === node.id;

                                // 关键：从 State (activeFlows) 中读取
                                const isNodeActiveInFlow = Array.from(activeFlows.keys()).some(cid => {
                                    const c = connections.find(x => x.id === cid);
                                    return c && (c.start === node.id || c.end === node.id);
                                });
                                return (
                                    <Node
                                        key={node.id}
                                        node={node}
                                        isDimmed={!!isDimmed}
                                        isClicked={isClicked}
                                        isFlowing={isNodeActiveInFlow}
                                        isLinkStart={isLinkStart}
                                        mode={mode}
                                        onPointerDown={(e) => {
                                            if (mode === 'edit') {
                                                e.stopPropagation();
                                                setDraggingNodeId(node.id);
                                                setSelectedId(node.id);
                                                setSelectionType('node');
                                            }
                                        }}
                                        onClick={(e) => handleNodeClick(node.id, e)}
                                    />
                                );
                            })}
                        </div>
                        <AnimatePresence>
                            {activeNodeId && mode === 'view' && (
                                <motion.button
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 20 }}
                                    onClick={() => setActiveNodeId(null)}
                                    className="absolute bottom-6 right-6 z-30 flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] hover:bg-[#2a2a2a] text-white text-xs font-bold transition-colors border border-white/20 rounded-full shadow-xl cursor-pointer pointer-events-auto"
                                >
                                    <RefreshCw size={14} /> 重置视图
                                </motion.button>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* 右侧属性面板 */}
                <AnimatePresence mode='popLayout'>
                    {selectedId && mode === 'edit' && (
                        <motion.div
                            initial={{ width: 0, opacity: 0, x: 50 }}
                            animate={{ width: 340, opacity: 1, x: 0 }}
                            exit={{ width: 0, opacity: 0, x: 50 }}
                            transition={{ 
                                type: "spring", 
                                stiffness: 200, 
                                damping: 25,
                                opacity: { duration: 0.35 }
                            }}
                            className="h-full bg-[#111] border-l border-white/10 flex flex-col z-40 shadow-2xl overflow-hidden flex-none"
                        >
                            <div className="w-[340px] flex flex-col h-full">
                                {/* 面板头部 */}
                                <div className="h-14 px-5 border-b border-white/10 flex justify-between items-center bg-[#161616]">
                                    <div className="flex items-center gap-2.5">
                                        <div className="p-1.5 rounded bg-blue-500/20 border border-blue-500/30">
                                            <Settings2 size={16} className="text-blue-400" />
                                        </div>
                                        <span className="text-sm font-bold text-white tracking-wide">
                                            {selectionType === 'node' ? '节点配置' : '连线配置'}
                                        </span>
                                    </div>
                                    <motion.button
                                        onClick={() => setSelectedId(null)}
                                        className="text-white hover:bg-white/10 transition-colors p-1.5 rounded-md"
                                        whileHover={{ scale: 1.1, rotate: 90 }}
                                        whileTap={{ scale: 0.9 }}
                                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                                    >
                                        <X size={18} />
                                    </motion.button>
                                </div>
                                {/* 面板内容区 */}
                                <div className="flex-1 overflow-y-auto p-5 space-y-8 custom-scrollbar">
                                    {selectionType === 'node' && (() => {
                                        const node = nodes.find(n => n.id === selectedId);
                                        if (!node) return null;
                                        return (
                                            <>
                                                {/* 基础信息组 */}
                                                <div className="space-y-4">
                                                    <SectionHeader icon={Type} title="基础信息" />
                                                    <div className="space-y-4">
                                                        <InputGroup label="节点名称">
                                                            <input
                                                                value={node.label}
                                                                onChange={(e) => updateNode(node.id, { label: e.target.value })}
                                                                className="w-full bg-[#050505] border border-white/20 rounded-lg px-3 py-2.5 text-sm text-white font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-zinc-600"
                                                                placeholder="输入节点名称..."
                                                            />
                                                        </InputGroup>

                                                        <InputGroup label="副标题说明">
                                                            <input
                                                                value={node.subLabel || ''}
                                                                onChange={(e) => updateNode(node.id, { subLabel: e.target.value })}
                                                                className="w-full bg-[#050505] border border-white/20 rounded-lg px-3 py-2.5 text-sm text-white font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-zinc-600"
                                                                placeholder="输入副标题..."
                                                            />
                                                        </InputGroup>
                                                    </div>
                                                </div>
                                                <div className="h-px bg-white/10" />
                                                {/* 外观样式组 */}
                                                <div className="space-y-4">
                                                    <SectionHeader icon={Palette} title="外观样式" />
                                                    <div className="space-y-5">
                                                        <div className="space-y-2.5">
                                                            <label className="text-[11px] font-bold text-white uppercase tracking-wider">主题颜色</label>
                                                            <div className="flex gap-2.5 flex-wrap">
                                                                {PRESET_COLORS.map(c => (
                                                                    <button
                                                                        key={c}
                                                                        onClick={() => updateNode(node.id, { color: c })}
                                                                        className={cn(
                                                                            "w-6 h-6 rounded-full transition-all duration-200 relative",
                                                                            node.color === c ? "scale-110 ring-2 ring-white ring-offset-2 ring-offset-[#111]" : "hover:scale-110 opacity-80 hover:opacity-100"
                                                                        )}
                                                                        style={{ backgroundColor: c, boxShadow: node.color === c ? `0 0 10px ${c}` : 'none' }}
                                                                    />
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div className="space-y-2.5">
                                                            <label className="text-[11px] font-bold text-white uppercase tracking-wider">图标选择</label>
                                                            <div className="grid grid-cols-5 gap-2">
                                                                {Object.keys(ICON_MAP).map(key => {
                                                                    const Icon = ICON_MAP[key];
                                                                    const isSelected = node.iconKey === key;
                                                                    return (
                                                                        <button
                                                                            key={key}
                                                                            onClick={() => updateNode(node.id, { iconKey: key })}
                                                                            className={cn(
                                                                                "aspect-square rounded-lg flex items-center justify-center transition-all duration-200",
                                                                                isSelected
                                                                                    ? "bg-blue-600 border-2 border-white text-white shadow-lg shadow-blue-900/50 scale-105"
                                                                                    : "bg-[#222] border-transparent text-white hover:bg-[#333]"
                                                                            )}
                                                                        >
                                                                            <Icon size={18} />
                                                                        </button>
                                                                    )
                                                                })}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </>
                                        );
                                    })()}
                                    {selectionType === 'connection' && (() => {
                                        const conn = connections.find(c => c.id === selectedId);
                                        if (!conn) return null;
                                        return (
                                            <>
                                                <div className="space-y-5">
                                                    <SectionHeader icon={Activity} title="连线属性" />
                                                    <div className="p-4 bg-[#1a1a1a] rounded-xl border border-white/10 space-y-5">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-sm font-medium text-white">虚线样式</span>
                                                            <label className="relative inline-flex items-center cursor-pointer">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={conn.dashed}
                                                                    onChange={(e) => updateConnection(conn.id, { dashed: e.target.checked })}
                                                                    className="sr-only peer"
                                                                />
                                                                <div className="w-10 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                                            </label>
                                                        </div>
                                                        <div className="space-y-3 pt-3 border-t border-white/10">
                                                            <div className="flex justify-between text-xs">
                                                                <span className="text-white font-medium">流动时长</span>
                                                                <span className="text-blue-400 font-mono font-bold">{conn.speed || 2}s</span>
                                                            </div>
                                                            <input
                                                                type="range" min="0.5" max="5" step="0.1"
                                                                value={conn.speed || 2}
                                                                onChange={(e) => updateConnection(conn.id, { speed: parseFloat(e.target.value) })}
                                                                className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                                            />
                                                            <div className="flex justify-between text-[10px] text-zinc-400 font-bold">
                                                                <span>快 (0.5s)</span>
                                                                <span>慢 (5s)</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2.5">
                                                        <label className="text-[11px] font-bold text-white uppercase tracking-wider">连线颜色</label>
                                                        <div className="flex gap-2.5 flex-wrap mb-3">
                                                            {PRESET_COLORS.map(c => (
                                                                <button
                                                                    key={c}
                                                                    onClick={() => updateConnection(conn.id, { color: c })}
                                                                    className={cn(
                                                                        "w-5 h-5 rounded-full transition-all duration-200 relative",
                                                                        conn.color === c ? "scale-110 ring-2 ring-white ring-offset-1 ring-offset-[#111]" : "hover:scale-110 opacity-80 hover:opacity-100"
                                                                    )}
                                                                    style={{ backgroundColor: c, boxShadow: conn.color === c ? `0 0 8px ${c}` : 'none' }}
                                                                />
                                                            ))}
                                                        </div>
                                                        <div className="flex items-center gap-3 p-2.5 bg-[#1a1a1a] rounded-lg border border-white/10">
                                                            <input
                                                                type="color"
                                                                value={conn.color}
                                                                onChange={(e) => updateConnection(conn.id, { color: e.target.value })}
                                                                className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0"
                                                            />
                                                            <span className="text-xs text-white font-mono font-bold uppercase flex-1">自定义颜色</span>
                                                            <span className="text-xs text-zinc-400 font-mono uppercase">{conn.color}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                                <div className="p-5 border-t border-white/10 bg-[#161616] mt-auto">
                                    <button
                                        onClick={deleteItem}
                                        className="w-full group flex items-center justify-center gap-2 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-lg transition-all border border-red-500/20 hover:border-red-500/40"
                                    >
                                        <Trash2 size={16} className="group-hover:scale-110 transition-transform" />
                                        <span className="text-xs font-bold">删除当前{selectionType === 'node' ? '节点' : '连线'}</span>
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
// --- 辅助组件 ---
const ToolBtn = ({ active, onClick, icon: Icon, label }: { active: boolean, onClick: () => void, icon: React.ElementType, label: string }) => (
    <button
        onClick={onClick}
        className={cn(
            "relative flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 overflow-hidden",
            active
                ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)] border border-blue-400 ring-1 ring-blue-400/50 z-10"
                : "text-white hover:bg-white/10 border border-transparent"
        )}
    >
        <Icon size={16} strokeWidth={active ? 2.5 : 2} className={cn("transition-transform", active && "scale-110")} />
        <span>{label}</span>
        {active && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />}
    </button>
);
const SectionHeader = ({ icon: Icon, title }: { icon: React.ElementType, title: string }) => (
    <div className="flex items-center gap-2 text-white mb-2">
        <Icon size={14} className="text-blue-400" />
        <span className="text-xs font-bold uppercase tracking-wider">{title}</span>
    </div>
);
const InputGroup = ({ label, children }: { label: string, children: React.ReactNode }) => (
    <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-white uppercase tracking-wider ml-1">{label}</label>
        {children}
    </div>
);

// --- 数据点动画组件 ---
const AnimatedDataPoint = ({ pathD, color, duration }: { pathD: string; color: string; duration: number }) => {
    const progress = useMotionValue(0);
    
    useEffect(() => {
        const controls = animate(progress, 1, {
            duration: duration / 1000,
            ease: "linear",
        });
        return () => controls.stop();
    }, [progress, duration]);
    
    // 计算路径上的点位置
    const getPointAtLength = (path: string, t: number) => {
        // 解析贝塞尔曲线路径: M x1 y1 C cx1 cy1, cx2 cy2, x2 y2
        const match = path.match(/M\s*([\d.]+)\s+([\d.]+)\s+C\s*([\d.]+)\s+([\d.]+),\s*([\d.]+)\s+([\d.]+),\s*([\d.]+)\s+([\d.]+)/);
        if (!match) return { x: 0, y: 0 };
        
        const [, x1, y1, cx1, cy1, cx2, cy2, x2, y2] = match.map(Number);
        
        // 三次贝塞尔曲线公式
        const x = Math.pow(1 - t, 3) * x1 + 
                  3 * Math.pow(1 - t, 2) * t * cx1 + 
                  3 * (1 - t) * Math.pow(t, 2) * cx2 + 
                  Math.pow(t, 3) * x2;
        const y = Math.pow(1 - t, 3) * y1 + 
                  3 * Math.pow(1 - t, 2) * t * cy1 + 
                  3 * (1 - t) * Math.pow(t, 2) * cy2 + 
                  Math.pow(t, 3) * y2;
        
        return { x, y };
    };
    
    const cx = useTransform(progress, (t) => getPointAtLength(pathD, t).x);
    const cy = useTransform(progress, (t) => getPointAtLength(pathD, t).y);
    
    return (
        <g>
            {/* 外层光晕 */}
            <motion.circle
                r="6"
                fill={color}
                fillOpacity="0.15"
                cx={cx}
                cy={cy}
            />
            
            {/* 中层发光圈 */}
            <motion.circle
                r="4"
                fill={color}
                fillOpacity="0.4"
                cx={cx}
                cy={cy}
                style={{ filter: `blur(2px)` }}
            />
            
            {/* 主数据点 - 脉冲动画 */}
            <motion.circle
                fill={color}
                cx={cx}
                cy={cy}
                initial={{ r: 3, fillOpacity: 0.9 }}
                animate={{
                    r: [3, 3.5, 3],
                    fillOpacity: [0.9, 1, 0.9],
                }}
                transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
                style={{ filter: `drop-shadow(0 0 6px ${color})` }}
            />
            
            {/* 核心白点 */}
            <motion.circle
                r="1.5"
                fill="white"
                fillOpacity="1"
                cx={cx}
                cy={cy}
            />
        </g>
    );
};

// --- 连线组件 ---
const Connection = ({
                        conn, nodes, isDimmed, isPathActive, isSelected, isFlowing, flowTimestamp, mode, onClick
                    }: {
    conn: ConnectionData, nodes: NodeData[], isDimmed: boolean, isPathActive: boolean, isSelected: boolean, isFlowing: boolean, flowTimestamp?: number, mode: string, onClick: (e: React.MouseEvent) => void
}) => {
    const startNode = nodes.find(n => n.id === conn.start);
    const endNode = nodes.find(n => n.id === conn.end);
    if (!startNode || !endNode) return null;
    const dist = Math.abs(endNode.x - startNode.x);
    const pathD = `M ${startNode.x} ${startNode.y} C ${startNode.x + dist * 0.5} ${startNode.y}, ${endNode.x - dist * 0.5} ${endNode.y}, ${endNode.x} ${endNode.y}`;
    
    return (
        <g
            className={cn("transition-all duration-500", isDimmed ? "opacity-5" : "opacity-100")}
            onClick={onClick}
            style={{ cursor: mode === 'edit' ? 'pointer' : 'default' }}
        >
            <path d={pathD} fill="none" stroke="transparent" strokeWidth={20} className="pointer-events-auto" />

            <path
                d={pathD}
                fill="none"
                stroke={isSelected ? '#fff' : conn.color}
                strokeWidth={isPathActive || isSelected ? 2.5 : 1.5}
                strokeOpacity={isPathActive ? 0.6 : 0.3}
                strokeDasharray={conn.dashed ? "6,6" : "none"}
                className="pointer-events-none transition-all duration-300"
                style={{ filter: isSelected ? 'drop-shadow(0 0 5px white)' : 'none' }}
            />
            {isFlowing && (
                <AnimatedDataPoint
                    key={flowTimestamp}
                    pathD={pathD}
                    color={conn.color}
                    duration={(conn.speed || 2) * 1000}
                />
            )}
        </g>
    );
};
// --- 节点组件 ---
const Node = ({
                  node, isDimmed, isClicked, isFlowing, isLinkStart, mode, onPointerDown, onClick
              }: {
    node: NodeData, isDimmed: boolean, isClicked: boolean, isFlowing: boolean, isLinkStart: boolean, mode: string, onPointerDown: (e: React.PointerEvent) => void, onClick: (e: React.MouseEvent) => void
}) => {
    const Icon = ICON_MAP[node.iconKey] || Cpu;
    const isLarge = ['storage', 'process', 'output'].includes(node.type || '');
    const sizeClass = isLarge ? "w-16 h-16" : "w-12 h-12";
    const iconSize = isLarge ? 28 : 20;
    const isHighlighted = isClicked;
    return (
        <div
            className={cn("absolute pointer-events-auto", mode === 'edit' ? "cursor-grab active:cursor-grabbing" : "cursor-pointer")}
            style={{
                left: `${(node.x / 1000) * 100}%`,
                top: `${(node.y / 600) * 100}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: isClicked ? 50 : 10
            }}
            onPointerDown={onPointerDown}
            onClick={onClick}
        >
            <div className={cn(
                "flex flex-col items-center justify-center transition-all duration-300",
                isDimmed ? "opacity-20 grayscale scale-90 blur-[1px]" : "opacity-100 grayscale-0",
                isHighlighted || isFlowing ? "scale-110" : "scale-100"
            )}>
                <div className={cn("relative flex items-center justify-center rounded-2xl transition-all duration-300", sizeClass)}>
                    <div className="absolute inset-0 bg-[#0a0a0a] rounded-2xl z-0" />

                    {isLinkStart && (
                        <div className="absolute inset-0 rounded-2xl border-2 border-dashed border-white z-50 animate-pulse" />
                    )}

                    {isFlowing && !isDimmed && (
                        <>
                            {/* 外层发光光晕 */}
                            <div 
                                className="absolute inset-[-4px] rounded-2xl z-5"
                                style={{
                                    background: `radial-gradient(circle at center, ${node.color}20, transparent 70%)`,
                                    filter: 'blur(8px)'
                                }}
                            />
                            
                            {/* 发光边框 */}
                            <div
                                className="absolute inset-0 rounded-2xl z-10"
                                style={{
                                    border: `2px solid ${node.color}`,
                                    boxShadow: `
                                        0 0 10px ${node.color}80,
                                        0 0 20px ${node.color}60,
                                        inset 0 0 10px ${node.color}30
                                    `,
                                }}
                            />
                        </>
                    )}
                    <div
                        className={cn(
                            "absolute inset-0 rounded-2xl z-20 transition-all duration-300 border",
                            isHighlighted ? "opacity-100 border-opacity-100" : "opacity-0 border-opacity-0"
                        )}
                        style={{
                            borderColor: node.color,
                            backgroundColor: `${node.color}15`,
                            boxShadow: isHighlighted ? `0 0 15px ${node.color}40, inset 0 0 10px ${node.color}20` : 'none'
                        }}
                    />
                    {!isHighlighted && (
                        <div className="absolute inset-0 rounded-2xl border z-10 transition-colors duration-300" style={{ borderColor: `${node.color}30` }} />
                    )}
                    <Icon
                        size={iconSize}
                        color={isDimmed ? '#555' : node.color}
                        strokeWidth={isHighlighted ? 2.5 : 1.5}
                        className="relative z-30 transition-all duration-300"
                        style={{ filter: isHighlighted ? `drop-shadow(0 0 8px ${node.color})` : 'none' }}
                    />
                </div>
                <div className="mt-3 text-center w-32 pointer-events-none absolute top-full left-1/2 -translate-x-1/2">
                    <p
                        className="text-[11px] font-bold transition-all duration-300 tracking-wide px-2 py-0.5 rounded text-white"
                        style={{ textShadow: '0 2px 4px rgba(0,0,0,1)' }}
                    >
                        {node.label}
                    </p>
                    {node.subLabel && (
                        <p className="text-[9px] mt-0.5 font-medium text-zinc-300 opacity-100" style={{ textShadow: '0 1px 3px rgba(0,0,0,1)' }}>
                            {node.subLabel}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};



