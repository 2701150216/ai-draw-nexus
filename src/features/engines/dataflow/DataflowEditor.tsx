import React, { useCallback, useMemo, useEffect, useState, useRef } from 'react';
import ReactFlow, {
    addEdge,
    ConnectionLineType,
    Panel,
    useNodesState,
    useEdgesState,
    Background,
    Controls,
    Handle,
    Position,
    ReactFlowProvider,
    useReactFlow,
    getSmoothStepPath,
    getBezierPath,
    getStraightPath,
    BaseEdge,
    useStore
} from 'reactflow';

import type {
    Connection,
    Edge,
    Node,
    EdgeProps,
    ReactFlowState
} from 'reactflow';

import dagre from 'dagre';
import { motion, useMotionValue, animate, AnimatePresence } from "framer-motion";
import 'reactflow/dist/style.css';
import {
    MessageSquare, Search, Layers, Database, Cpu, Code,
    FileText, Zap, Brain, Server, ArrowUp, Sparkles,
    Layout, Settings2, X, Palette, Type, Activity, Trash2,
    Spline, Minus, CornerDownRight, Pencil, Check, MoreVertical
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useEditorStore } from '@/stores/editorStore';
import { NodeDetailPanel } from './components/NodeDetailPanel';

// --- 工具函数 ---
function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// --- 常量 ---
const ICON_MAP: Record<string, React.ElementType> = {
    MessageSquare, Search, Layers, Database, Cpu, Code,
    FileText, Zap, Brain, Server, ArrowUp
};
const PRESET_COLORS = ['#3b82f6', '#8b5cf6', '#a855f7', '#06b6d4', '#f59e0b', '#10b981', '#ef4444', '#ec4899', '#ffffff'];

// 选择器
const connectionNodeIdSelector = (state: ReactFlowState) => state.connectionNodeId;

// --- 类型定义 ---
import type { DataflowNodeData, ToolboxDocumentRef } from '@/types/dataflow';

interface CustomNodeData extends DataflowNodeData {
    isHighlight?: boolean;
    isDimmed?: boolean;
    isAnimating?: boolean;
}

// --- 核心引擎类 ---
class FlowEngine {
    private edges: Edge[] = [];
    private nodes: Node[] = [];
    private activeFlows: Set<string> = new Set();
    private timer: ReturnType<typeof setTimeout> | null = null;
    private onUpdate: (activeEdgeIds: Set<string>) => void;
    private onNodeAnimate: ((nodeId: string) => void) | null = null;
    private isRunning: boolean = false;

    constructor(onUpdate: (activeEdgeIds: Set<string>) => void, onNodeAnimate?: (nodeId: string) => void) {
        this.onUpdate = onUpdate;
        this.onNodeAnimate = onNodeAnimate || null;
    }

    public updateData(nodes: Node[], edges: Edge[]) {
        this.nodes = nodes;
        this.edges = edges;
    }

    public start(startNodeIds: string[], isAutoLoop: boolean) {
        this.stop();
        this.isRunning = true;
        this.processStep(startNodeIds, isAutoLoop);
    }

    public stop() {
        this.isRunning = false;
        if (this.timer) clearTimeout(this.timer);
        this.timer = null;
        this.activeFlows.clear();
        this.onUpdate(new Set());
    }

    private processStep(currentNodeIds: string[], isAutoLoop: boolean) {
        if (!this.isRunning) return;

        const outgoingEdges = this.edges.filter(e => currentNodeIds.includes(e.source));

        if (outgoingEdges.length === 0) {
            if (isAutoLoop) {
                this.timer = setTimeout(() => {
                    if (!this.isRunning) return;
                    const rootIds = this.getRootNodeIds();
                    this.processStep(rootIds, true);
                }, 1000);
            }
            return;
        }

        outgoingEdges.forEach(edge => this.activeFlows.add(edge.id));
        this.onUpdate(new Set(this.activeFlows));

        let maxDuration = 0;
        outgoingEdges.forEach(edge => {
            const speed = edge.data?.speed || 2;
            if (speed > maxDuration) maxDuration = speed;
        });

        this.timer = setTimeout(() => {
            if (!this.isRunning) return;

            outgoingEdges.forEach(e => this.activeFlows.delete(e.id));
            this.onUpdate(new Set(this.activeFlows));

            const nextNodeIds = Array.from(new Set(outgoingEdges.map(e => e.target)));
            
            // 触发到达节点的动画特效
            if (this.onNodeAnimate) {
                nextNodeIds.forEach(nodeId => this.onNodeAnimate!(nodeId));
            }
            
            this.processStep(nextNodeIds, isAutoLoop);

        }, maxDuration * 1000);
    }

    private getRootNodeIds(): string[] {
        const targetIds = new Set(this.edges.map(e => e.target));
        const roots = this.nodes.filter(n => !targetIds.has(n.id)).map(n => n.id);
        return roots.length > 0 ? roots : (this.nodes.length > 0 ? [this.nodes[0].id] : []);
    }
}

// --- 1. 自定义节点组件 ---
const CustomNode = React.memo(({ data, selected, id }: { data: CustomNodeData; selected: boolean; id: string }) => {
    const [showMenu, setShowMenu] = useState(false);
    const Icon = ICON_MAP[data.iconKey] || Cpu;
    const color = data.color || '#fff';
    const opacityClass = data.isDimmed ? 'opacity-20 grayscale' : 'opacity-100';
    const highlightClass = data.isHighlight ? 'ring-2 ring-white ring-offset-2 ring-offset-black' : '';
    const animatingClass = data.isAnimating ? 'animate-pulse scale-110' : '';

    const connectionNodeId = useStore(connectionNodeIdSelector);
    const isConnecting = !!connectionNodeId;

    const sourceZ = isConnecting ? 0 : 10;
    const targetZ = isConnecting ? 10 : 0;
    const handleBaseStyle = { width: 12, height: 12, background: 'transparent', border: 'none' };

    return (
        <div 
            className={cn("relative group transition-all duration-300", opacityClass)}
            onMouseEnter={() => setShowMenu(true)}
            onMouseLeave={() => setShowMenu(false)}
        >
            <Handle type="target" position={Position.Left} id="l-t" style={{ ...handleBaseStyle, zIndex: targetZ }} />
            <Handle type="source" position={Position.Left} id="l-s" style={{ ...handleBaseStyle, zIndex: sourceZ }} />
            <Handle type="source" position={Position.Right} id="r-s" style={{ ...handleBaseStyle, zIndex: sourceZ }} />
            <Handle type="target" position={Position.Right} id="r-t" style={{ ...handleBaseStyle, zIndex: targetZ }} />
            <Handle type="target" position={Position.Top} id="t-t" style={{ ...handleBaseStyle, zIndex: targetZ }} />
            <Handle type="source" position={Position.Top} id="t-s" style={{ ...handleBaseStyle, zIndex: sourceZ }} />
            <Handle type="source" position={Position.Bottom} id="b-s" style={{ ...handleBaseStyle, zIndex: sourceZ }} />
            <Handle type="target" position={Position.Bottom} id="b-t" style={{ ...handleBaseStyle, zIndex: targetZ }} />

            <div
                className={cn("absolute inset-0 rounded-2xl transition-all duration-300 pointer-events-none", (selected || data.isHighlight) ? 'opacity-100' : 'opacity-0')}
                style={{
                    background: `radial-gradient(circle at center, ${color}40, transparent 70%)`,
                    filter: 'blur(12px)',
                    transform: 'scale(1.5)'
                }}
            />

            <div
                className={cn(
                    "relative w-16 h-16 rounded-2xl flex items-center justify-center bg-[#0a0a0a] border-2 transition-all duration-300 z-10",
                    highlightClass,
                    animatingClass
                )}
                style={{
                    borderColor: (selected || data.isHighlight || data.isAnimating) ? color : `${color}30`,
                    boxShadow: (selected || data.isHighlight || data.isAnimating) ? `0 0 15px ${color}40` : 'none'
                }}
            >
                <Icon size={28} color={color} style={{ filter: (selected || data.isHighlight || data.isAnimating) ? `drop-shadow(0 0 8px ${color})` : 'none' }} />
            </div>
            
            {/* 三点菜单图标 */}
            <AnimatePresence>
                {showMenu && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center shadow-lg z-20 cursor-pointer transition-all hover:scale-110"
                        style={{
                            background: `linear-gradient(135deg, ${color}dd 0%, ${color}ff 100%)`,
                            boxShadow: `0 4px 12px ${color}40, 0 0 0 2px rgba(255,255,255,0.2)`
                        }}
                        onClick={(e) => {
                            e.stopPropagation();
                            const event = new CustomEvent('openNodeDetail', { detail: { nodeId: id } });
                            window.dispatchEvent(event);
                        }}
                    >
                        <MoreVertical size={15} className="text-white drop-shadow-sm" strokeWidth={2.5} />
                    </motion.button>
                )}
            </AnimatePresence>

            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 text-center w-32 pointer-events-none">
                <p className={cn("text-[11px] font-bold tracking-wide transition-colors", (selected || data.isHighlight) ? 'text-white' : 'text-zinc-500')}>
                    {data.label}
                </p>
                {data.subLabel && <p className="text-[9px] text-zinc-600 mt-0.5 font-medium">{data.subLabel}</p>}
            </div>
        </div>
    );
});
CustomNode.displayName = "CustomNode";

// --- 2. 动画组件 ---
const AnimatedDataPoint = ({ pathD, color, duration }: { pathD: string; color: string; duration: number }) => {
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const pathRef = useRef<SVGPathElement>(null);

    useEffect(() => {
        const pathEl = pathRef.current;
        if (!pathEl) return;
        try {
            const totalLength = pathEl.getTotalLength();
            if (totalLength === 0) return;
            const controls = animate(0, 1, {
                duration: duration,
                ease: "linear",
                repeat: Infinity,
                onUpdate: (latest) => {
                    const point = pathEl.getPointAtLength(latest * totalLength);
                    x.set(point.x);
                    y.set(point.y);
                }
            });
            return () => controls.stop();
        } catch (e) { console.warn(e); }
    }, [pathD, duration]);

    return (
        <>
            <path ref={pathRef} d={pathD} fill="none" className="opacity-0 pointer-events-none" />
            <g>
                <motion.circle r="6" fill={color} fillOpacity="0.15" cx={x} cy={y} />
                <motion.circle r="4" fill={color} fillOpacity="0.4" cx={x} cy={y} style={{ filter: `blur(2px)` }} />
                <motion.circle fill={color} cx={x} cy={y} initial={{ r: 3, fillOpacity: 0.9 }} animate={{ r: [3, 3.5, 3], fillOpacity: [0.9, 1, 0.9] }} transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }} style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
                <motion.circle r="1.5" fill="white" fillOpacity="1" cx={x} cy={y} />
            </g>
        </>
    );
};

// --- 3. 自定义连线组件 ---
const CustomEdge = React.memo(({
                                   id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style = {}, markerEnd, data, selected
                               }: EdgeProps) => {
    const pathType = data?.pathType || 'bezier';
    let edgePath = '';
    const params = { sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition };

    switch (pathType) {
        case 'bezier': [edgePath] = getBezierPath(params); break;
        case 'straight': [edgePath] = getStraightPath(params); break;
        case 'step': [edgePath] = getSmoothStepPath({ ...params, borderRadius: 0 }); break;
        case 'smoothstep': default: [edgePath] = getSmoothStepPath(params); break;
    }

    const color = style.stroke as string || '#555';
    const speed = data?.speed || 2;
    const isFlowing = data?.isFlowing || false;
    const isDashed = data?.dashed || false;
    const isHighlight = data?.isHighlight || false;
    const isDimmed = data?.isDimmed || false;

    const strokeColor = isHighlight ? (style.stroke || '#fff') : (isDimmed ? '#333' : color);
    const strokeWidth = isHighlight ? 2.5 : (isDimmed ? 1 : 1.5);
    const zIndex = isHighlight ? 10 : 0;

    return (
        <g style={{ zIndex }}>
            <BaseEdge
                path={edgePath}
                markerEnd={markerEnd}
                style={{
                    ...style,
                    strokeWidth: selected ? 2.5 : strokeWidth,
                    stroke: selected ? '#fff' : strokeColor,
                    strokeDasharray: isDashed ? '5,5' : undefined,
                    transition: 'all 0.3s',
                    opacity: isDimmed ? 0.3 : 1
                }}
            />
            {isFlowing && (
                <AnimatedDataPoint pathD={edgePath} color={color} duration={speed} />
            )}
        </g>
    );
});
CustomEdge.displayName = "CustomEdge";

// --- 初始数据 ---
const initialNodes: Node<CustomNodeData>[] = [
    { id: 'user', position: { x: 50, y: 150 }, data: { label: '用户输入', iconKey: 'MessageSquare', color: '#3b82f6' }, type: 'custom' },
    { id: 'search', position: { x: 280, y: 50 }, data: { label: '搜索', subLabel: '任意向量', iconKey: 'Search', color: '#8b5cf6' }, type: 'custom' },
    { id: 'embedding', position: { x: 510, y: 50 }, data: { label: '向量嵌入', subLabel: '生成', iconKey: 'Layers', color: '#8b5cf6' }, type: 'custom' },
    { id: 'vectorDB', position: { x: 740, y: 50 }, data: { label: '向量存储', iconKey: 'Database', color: '#a855f7' }, type: 'custom' },
    { id: 'rerank', position: { x: 970, y: 50 }, data: { label: '重排序', subLabel: '结果', iconKey: 'ArrowUp', color: '#8b5cf6' }, type: 'custom' },
    { id: 'plan', position: { x: 280, y: 250 }, data: { label: '计划模型', subLabel: '自选模型', iconKey: 'Brain', color: '#06b6d4' }, type: 'custom' },
    { id: 'task', position: { x: 510, y: 250 }, data: { label: '任务系统', iconKey: 'Zap', color: '#f59e0b' }, type: 'custom' },
    { id: 'output', position: { x: 1200, y: 150 }, data: { label: '最终输出', iconKey: 'Server', color: '#10b981' }, type: 'custom' },
];

const initialEdges: Edge[] = [
    { id: 'c1', source: 'user', target: 'search', sourceHandle: 'r-s', targetHandle: 'l-t', type: 'custom', style: { stroke: '#3b82f6' }, data: { speed: 1.5, pathType: 'bezier' } },
    { id: 'c2', source: 'user', target: 'plan', sourceHandle: 'r-s', targetHandle: 'l-t', type: 'custom', style: { stroke: '#3b82f6' }, data: { speed: 1.5, pathType: 'bezier' } },
    { id: 'c3', source: 'search', target: 'embedding', sourceHandle: 'r-s', targetHandle: 'l-t', type: 'custom', style: { stroke: '#8b5cf6' }, data: { speed: 1.2, pathType: 'bezier' } },
    { id: 'c4', source: 'embedding', target: 'vectorDB', sourceHandle: 'r-s', targetHandle: 'l-t', type: 'custom', style: { stroke: '#8b5cf6' }, data: { speed: 1.2, pathType: 'bezier' } },
    { id: 'c5', source: 'vectorDB', target: 'rerank', sourceHandle: 'r-s', targetHandle: 'l-t', type: 'custom', style: { stroke: '#a855f7' }, data: { speed: 1.2, pathType: 'bezier' } },
    { id: 'c7', source: 'plan', target: 'task', sourceHandle: 'r-s', targetHandle: 'l-t', type: 'custom', style: { stroke: '#06b6d4' }, data: { speed: 1.5, pathType: 'bezier' } },
    { id: 'c18', source: 'rerank', target: 'output', sourceHandle: 'r-s', targetHandle: 'l-t', type: 'custom', style: { stroke: '#10b981' }, data: { speed: 1.0, pathType: 'bezier' } },
    { id: 'c19', source: 'task', target: 'output', sourceHandle: 'r-s', targetHandle: 'l-t', type: 'custom', style: { stroke: '#f59e0b' }, data: { speed: 1.0, pathType: 'bezier' } },
];

// --- 布局算法 ---
const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'LR') => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    const isHorizontal = direction === 'LR';
    dagreGraph.setGraph({ rankdir: direction, ranksep: isHorizontal ? 150 : 100, nodesep: isHorizontal ? 60 : 100 });
    nodes.forEach((node) => dagreGraph.setNode(node.id, { width: 150, height: 120 }));
    edges.forEach((edge) => dagreGraph.setEdge(edge.source, edge.target));
    dagre.layout(dagreGraph);
    return {
        nodes: nodes.map((node) => {
            const nodeWithPosition = dagreGraph.node(node.id);
            return {
                ...node,
                targetPosition: isHorizontal ? Position.Left : Position.Top,
                sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
                position: { x: nodeWithPosition.x - 32, y: nodeWithPosition.y - 32 },
            };
        }),
        edges
    };
};

// --- 3. 属性面板组件 ---
const PropertyPanel = ({ selectedItem, onClose, onUpdateNode, onUpdateEdge, onDelete }: any) => {
    if (!selectedItem) return null;
    return (
        <motion.div
            initial={{ width: 0, opacity: 0, x: 50 }}
            animate={{ width: 340, opacity: 1, x: 0 }}
            exit={{ width: 0, opacity: 0, x: 50 }}
            className="h-full bg-[#111] border-l border-white/10 flex flex-col z-40 shadow-2xl overflow-hidden absolute right-0 top-0 bottom-0"
        >
            <div className="w-[340px] flex flex-col h-full">
                <div className="h-14 px-5 border-b border-white/10 flex justify-between items-center bg-[#161616]">
                    <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded bg-blue-500/20 border border-blue-500/30">
                            <Settings2 size={16} className="text-blue-400" />
                        </div>
                        <span className="text-sm font-bold text-white tracking-wide">
                            {selectedItem.type === 'node' ? '节点配置' : '连线配置'}
                        </span>
                    </div>
                    <button onClick={onClose} className="text-white hover:bg-white/10 p-1.5 rounded-md transition-colors"><X size={18} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-8 custom-scrollbar">
                    {selectedItem.type === 'node' ? (
                        <>
                            <div className="space-y-4">
                                <SectionHeader icon={Type} title="基础信息" />
                                <InputGroup label="节点名称">
                                    <input value={selectedItem.data.label} onChange={(e) => onUpdateNode(selectedItem.id, { label: e.target.value })} className="w-full bg-[#050505] border border-white/20 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500" />
                                </InputGroup>
                                <InputGroup label="副标题">
                                    <input value={selectedItem.data.subLabel || ''} onChange={(e) => onUpdateNode(selectedItem.id, { subLabel: e.target.value })} className="w-full bg-[#050505] border border-white/20 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500" />
                                </InputGroup>
                            </div>
                            <div className="h-px bg-white/10" />
                            <div className="space-y-4">
                                <SectionHeader icon={Palette} title="外观样式" />
                                <div className="space-y-2.5">
                                    <label className="text-[11px] font-bold text-white uppercase">主题颜色</label>
                                    <div className="flex gap-2.5 flex-wrap">
                                        {PRESET_COLORS.map(c => (
                                            <button key={c} onClick={() => onUpdateNode(selectedItem.id, { color: c })} className={cn("w-6 h-6 rounded-full transition-all relative", selectedItem.data.color === c ? "scale-110 ring-2 ring-white" : "opacity-80 hover:opacity-100")} style={{ backgroundColor: c }} />
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-2.5">
                                    <label className="text-[11px] font-bold text-white uppercase">图标</label>
                                    <div className="grid grid-cols-5 gap-2">
                                        {Object.keys(ICON_MAP).map(key => {
                                            const Icon = ICON_MAP[key];
                                            return (
                                                <button key={key} onClick={() => onUpdateNode(selectedItem.id, { iconKey: key })} className={cn("aspect-square rounded-lg flex items-center justify-center transition-all", selectedItem.data.iconKey === key ? "bg-blue-600 text-white" : "bg-[#222] text-white hover:bg-[#333]")}><Icon size={18} /></button>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="space-y-5">
                                <SectionHeader icon={Activity} title="连线属性" />
                                <div className="space-y-2.5">
                                    <label className="text-[11px] font-bold text-white uppercase">连线形状</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[{ label: '贝塞尔曲线', value: 'bezier', icon: Spline }, { label: '圆角折线', value: 'smoothstep', icon: CornerDownRight }, { label: '直角折线', value: 'step', icon: Layout }, { label: '直线', value: 'straight', icon: Minus }].map(type => {
                                            const TypeIcon = type.icon;
                                            const isActive = selectedItem.data.pathType === type.value || (!selectedItem.data.pathType && type.value === 'bezier');
                                            return (
                                                <button key={type.value} onClick={() => onUpdateEdge(selectedItem.id, { pathType: type.value })} className={cn("flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-all border", isActive ? "bg-blue-600/20 border-blue-500 text-blue-400" : "bg-[#222] border-transparent text-zinc-400 hover:bg-[#333] hover:text-white")}><TypeIcon size={14} />{type.label}</button>
                                            )
                                        })}
                                    </div>
                                </div>
                                <div className="p-4 bg-[#1a1a1a] rounded-xl border border-white/10 space-y-5">
                                    <div className="flex items-center justify-between"><span className="text-sm font-medium text-white">虚线样式</span><input type="checkbox" checked={selectedItem.data.dashed || false} onChange={(e) => onUpdateEdge(selectedItem.id, { dashed: e.target.checked })} className="accent-blue-500 w-4 h-4" /></div>
                                    <div className="space-y-3 pt-3 border-t border-white/10">
                                        <div className="flex justify-between text-xs"><span className="text-white font-medium">流动时长</span><span className="text-blue-400 font-mono font-bold">{selectedItem.data.speed || 2}s</span></div>
                                        <input type="range" min="0.5" max="5" step="0.1" value={selectedItem.data.speed || 2} onChange={(e) => onUpdateEdge(selectedItem.id, { speed: parseFloat(e.target.value) })} className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                                    </div>
                                </div>
                                <div className="space-y-2.5">
                                    <label className="text-[11px] font-bold text-white uppercase">连线颜色</label>
                                    <div className="flex gap-2.5 flex-wrap">
                                        {PRESET_COLORS.map(c => (
                                            <button key={c} onClick={() => onUpdateEdge(selectedItem.id, { color: c })} className={cn("w-5 h-5 rounded-full transition-all relative", selectedItem.data.color === c ? "scale-110 ring-2 ring-white" : "opacity-80 hover:opacity-100")} style={{ backgroundColor: c }} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
                <div className="p-5 border-t border-white/10 bg-[#161616] mt-auto">
                    <button onClick={onDelete} className="w-full group flex items-center justify-center gap-2 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-lg transition-all border border-red-500/20 hover:border-red-500/40"><Trash2 size={16} className="group-hover:scale-110 transition-transform" /><span className="text-xs font-bold">删除当前{selectedItem.type === 'node' ? '节点' : '连线'}</span></button>
                </div>
            </div>
        </motion.div>
    );
};

const SectionHeader = ({ icon: Icon, title }: { icon: React.ElementType, title: string }) => (
    <div className="flex items-center gap-2 text-white mb-2"><Icon size={14} className="text-blue-400" /><span className="text-xs font-bold uppercase tracking-wider">{title}</span></div>
);
const InputGroup = ({ label, children }: { label: string, children: React.ReactNode }) => (
    <div className="space-y-1.5"><label className="text-[11px] font-bold text-white uppercase tracking-wider ml-1">{label}</label>{children}</div>
);

// 控制面板组件
const TopControlPanel = React.memo(({ isEditMode, onToggleEdit, onLayout, onAddNode }: { isEditMode: boolean, onToggleEdit: () => void, onLayout: (dir: 'LR' | 'TB') => void, onAddNode: () => void }) => {
    return (
        <Panel position="top-center" className="bg-[#1a1a1a]/80 backdrop-blur-md p-2 rounded-xl border border-white/10 flex gap-4 shadow-xl pointer-events-auto">
            <button onClick={() => onLayout('LR')} className="flex items-center gap-2 px-3 py-1.5 bg-[#333] hover:bg-[#444] text-white rounded-lg text-xs font-bold transition-all">
                <Layout size={14} className="rotate-90" /> 水平排版
            </button>
            <button onClick={() => onLayout('TB')} className="flex items-center gap-2 px-3 py-1.5 bg-[#333] hover:bg-[#444] text-white rounded-lg text-xs font-bold transition-all">
                <Layout size={14} /> 垂直排版
            </button>
            <div className="w-px h-6 bg-white/10 mx-1" />

            <button
                onClick={onToggleEdit}
                className={cn(
                    "flex items-center gap-2 px-3 py-1.5 border border-white/20 rounded-lg text-xs font-medium transition-all",
                    isEditMode ? "bg-blue-600 text-white border-blue-500" : "bg-[#222] hover:bg-[#333] text-zinc-300"
                )}
            >
                {isEditMode ? <Check size={14} /> : <Pencil size={14} />}
                {isEditMode ? "完成编辑" : "编辑模式"}
            </button>

            {isEditMode && (
                <button onClick={onAddNode}
                        className="flex items-center gap-2 px-3 py-1.5 bg-[#222] hover:bg-[#333] border border-white/20 text-white rounded-lg text-xs font-medium animate-in fade-in slide-in-from-left-2"
                >
                    <Sparkles size={14} /> 添加节点
                </button>
            )}
        </Panel>
    );
});
TopControlPanel.displayName = "TopControlPanel";

// --- 4. 主逻辑组件 ---
function FlowEditorInner() {
    const currentContent = useEditorStore((s) => s.currentContent);
    const setContent = useEditorStore((s) => s.setContent);
    const hasLoadedContent = useRef(false);
    const hasFitViewAfterLoad = useRef(false);

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const { fitView, deleteElements, getNodes, getEdges, project } = useReactFlow();
    
    // 撤销/重做历史记录
    const [history, setHistory] = useState<{ nodes: Node[], edges: Edge[] }[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedSelection, setSelectedSelection] = useState<{ type: 'node' | 'edge', id: string, data: any } | null>(null);
    const [selectedNodeForDetail, setSelectedNodeForDetail] = useState<{ id: string; data: CustomNodeData } | null>(null);

    const nodeTypes = useMemo(() => ({ custom: CustomNode }), []);
    const edgeTypes = useMemo(() => ({ custom: CustomEdge }), []);

    const engineRef = useRef<FlowEngine | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // ✅ 从 currentContent 加载保存的数据
    useEffect(() => {
        if (currentContent && !hasLoadedContent.current) {
            try {
                const parsed = JSON.parse(currentContent);
                if (parsed.nodes && parsed.edges) {
                    setNodes(parsed.nodes);
                    setEdges(parsed.edges);
                    hasLoadedContent.current = true;
                    hasFitViewAfterLoad.current = false; // 允许后续居中缩放
                }
            } catch (err) {
                console.warn('Failed to parse dataflow content, using defaults:', err);
            }
        }
    }, [currentContent, setNodes, setEdges]);

    // ✅ 加载完成后自动整体居中缩放，保持节点相对位置
    useEffect(() => {
        if (!hasLoadedContent.current || hasFitViewAfterLoad.current) return;
        if (!nodes.length && !edges.length) return;
        const timer = setTimeout(() => {
            try {
                fitView({ padding: 0.35, duration: 700, includeHiddenNodes: true });
                hasFitViewAfterLoad.current = true;
            } catch (err) {
                console.warn('fitView failed', err);
            }
        }, 50); // 等待节点渲染完成
        return () => clearTimeout(timer);
    }, [nodes, edges, fitView]);

    // 节点动画回调
    const handleNodeAnimate = useCallback((nodeId: string) => {
        setNodes((nds) => nds.map(n => ({
            ...n,
            data: { ...n.data, isAnimating: n.id === nodeId }
        })));
        
        // 500ms后取消动画
        setTimeout(() => {
            setNodes((nds) => nds.map(n => ({
                ...n,
                data: { ...n.data, isAnimating: false }
            })));
        }, 500);
    }, [setNodes]);
    
    // 初始化引擎
    if (!engineRef.current) {
        engineRef.current = new FlowEngine(
            (activeEdgeIds) => {
                setEdges((eds) => eds.map(e => ({
                    ...e,
                    data: { ...e.data, isFlowing: activeEdgeIds.has(e.id) }
                })));
            },
            handleNodeAnimate
        );    
}

    // 更新引擎数据
    useEffect(() => {
        engineRef.current?.updateData(nodes, edges);
    }, [nodes, edges]);
    
    // 保存历史记录
    const saveHistory = useCallback(() => {
        setHistory(prev => {
            const newHistory = prev.slice(0, historyIndex + 1);
            newHistory.push({ nodes: getNodes(), edges: getEdges() });
            // 限制历史记录数量为50
            if (newHistory.length > 50) newHistory.shift();
            return newHistory;
        });
        setHistoryIndex(prev => Math.min(prev + 1, 49));
    }, [historyIndex, getNodes, getEdges]);
    
    // Ctrl+Z 撤销功能
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                if (historyIndex > 0) {
                    const prevState = history[historyIndex - 1];
                    setNodes(prevState.nodes);
                    setEdges(prevState.edges);
                    setHistoryIndex(prev => prev - 1);
                }
            } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault();
                if (historyIndex < history.length - 1) {
                    const nextState = history[historyIndex + 1];
                    setNodes(nextState.nodes);
                    setEdges(nextState.edges);
                    setHistoryIndex(prev => prev + 1);
                }
            }
        };
        
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [history, historyIndex, setNodes, setEdges]);
    
    // 监听节点/边变化，保存历史（防抖）
    useEffect(() => {
        const timer = setTimeout(() => {
            if (nodes.length > 0 || edges.length > 0) {
                saveHistory();
            }
        }, 1000);
        return () => clearTimeout(timer);
    }, [nodes, edges]);

    // ✅ 修复：使用防抖（Debounce）来保存内容，避免拖拽时频繁触发父组件重渲染导致死循环
    useEffect(() => {
        const handler = setTimeout(() => {
            const data = JSON.stringify({ nodes, edges });
            setContent(data);
        }, 500); // 500ms 延迟保存

        return () => clearTimeout(handler);
    }, [nodes, edges, setContent]);

    // 自动运行逻辑
    useEffect(() => {
        const timer = setTimeout(() => {
            if (engineRef.current) {
                const targetIds = new Set(edges.map(e => e.target));
                const roots = nodes.filter(n => !targetIds.has(n.id)).map(n => n.id);
                const startIds = roots.length > 0 ? roots : (nodes.length > 0 ? [nodes[0].id] : []);

                engineRef.current.start(startIds, true);
            }
        }, 1000);
        return () => clearTimeout(timer);
    }, []);

    const onLayout = useCallback((direction: 'LR' | 'TB') => {
        const currentNodes = getNodes();
        const currentEdges = getEdges();
        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(currentNodes, currentEdges, direction);
        setNodes([...layoutedNodes]);
        setEdges([...layoutedEdges]);

        setTimeout(() => {
            window.requestAnimationFrame(() => {
                fitView({ padding: 0.2, duration: 800 });
            });
        }, 100);
    }, [getNodes, getEdges, setNodes, setEdges, fitView]);

    const onInit = useCallback(() => {
        // 移除自动布局，保留用户保存的节点位置
        // 用户需要手动点击"水平排版"或"垂直排版"按钮来应用布局
    }, []);

    const onConnect = useCallback((params: Connection) => {
        setEdges((eds) => addEdge({
            ...params,
            type: 'custom',
            style: { stroke: '#fff', strokeWidth: 2 },
            data: { speed: 2, isFlowing: false, dashed: false, pathType: 'bezier' }
        }, eds));
    }, [setEdges]);

    const getDownstreamElements = useCallback((startNodeId: string, allNodes: Node[], allEdges: Edge[]) => {
        const visitedNodes = new Set<string>();
        const visitedEdges = new Set<string>();
        const queue = [startNodeId];

        while (queue.length > 0) {
            const currentId = queue.shift()!;
            if (visitedNodes.has(currentId)) continue;
            visitedNodes.add(currentId);

            const outgoingEdges = allEdges.filter(e => e.source === currentId);
            outgoingEdges.forEach(edge => {
                visitedEdges.add(edge.id);
                queue.push(edge.target);
            });
        }
        return { nodes: visitedNodes, edges: visitedEdges };
    }, []);

    // 监听自定义事件打开节点详情
    useEffect(() => {
        const handleOpenDetail = (e: any) => {
            const nodeId = e.detail?.nodeId;
            if (nodeId) {
                const node = getNodes().find(n => n.id === nodeId);
                if (node) {
                    // 打开文档面板时，关闭节点配置面板
                    setSelectedSelection(null);
                    setSelectedNodeForDetail({ id: node.id, data: node.data as CustomNodeData });
                }
            }
        };
        window.addEventListener('openNodeDetail', handleOpenDetail);
        return () => window.removeEventListener('openNodeDetail', handleOpenDetail);
    }, [getNodes]);
    
    const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
        // 不再直接打开详情面板，改为通过三点菜单打开
        
        if (isEditMode) {
            // 编辑模式下点击节点时，关闭文档面板，打开节点配置
            setSelectedNodeForDetail(null);
            setSelectedSelection({ type: 'node', id: node.id, data: node.data });
        } else {
            const { nodes: downstreamNodes, edges: downstreamEdges } = getDownstreamElements(node.id, getNodes(), getEdges());

            setNodes(nds => nds.map(n => ({
                ...n,
                data: {
                    ...n.data,
                    isHighlight: downstreamNodes.has(n.id),
                    isDimmed: !downstreamNodes.has(n.id)
                }
            })));

            setEdges(eds => eds.map(e => ({
                ...e,
                data: {
                    ...e.data,
                    isHighlight: downstreamEdges.has(e.id),
                    isDimmed: !downstreamEdges.has(e.id)
                    // 不设置 isFlowing: false，让引擎控制流动状态
                }
            })));

            if (engineRef.current) {
                engineRef.current.start([node.id], false);
            }
        }
    }, [isEditMode, getDownstreamElements, getNodes, getEdges, setNodes, setEdges]);

    const onEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
        if (!isEditMode) return;
        const edgeData = {
            ...edge.data,
            color: edge.style?.stroke,
            dashed: edge.data?.dashed || false,
            pathType: edge.data?.pathType || 'bezier'
        };
        setSelectedSelection({ type: 'edge', id: edge.id, data: edgeData });
    }, [isEditMode]);

    const onPaneClick = useCallback(() => {
        setSelectedSelection(null);
        setSelectedNodeForDetail(null); // 点击空白画布时也关闭文档面板
        if (!isEditMode) {
            setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, isHighlight: false, isDimmed: false } })));
            setEdges(eds => eds.map(e => ({ ...e, data: { ...e.data, isHighlight: false, isDimmed: false } })));
        }
    }, [isEditMode, setNodes, setEdges]);

    const updateNodeData = useCallback((id: string, newData: Partial<CustomNodeData>) => {
        setNodes((nds) => nds.map((n) => {
            if (n.id === id) {
                const updatedData = { ...n.data, ...newData };
                setSelectedSelection({ type: 'node', id, data: updatedData });
                // 同时更新详情面板显示的节点数据
                setSelectedNodeForDetail(prev => 
                    prev?.id === id ? { id, data: updatedData } : prev
                );
                return { ...n, data: updatedData };
            }
            return n;
        }));
    }, [setNodes]);

    const updateEdgeData = useCallback((id: string, newData: any) => {
        setEdges((eds) => eds.map((e) => {
            if (e.id === id) {
                const newStyle = { ...e.style };
                if (newData.color) newStyle.stroke = newData.color;
                if (newData.dashed !== undefined) newStyle.strokeDasharray = newData.dashed ? '5,5' : undefined;

                const updatedData = { ...e.data, ...newData };
                setSelectedSelection({ type: 'edge', id, data: updatedData });
                return { ...e, style: newStyle, data: updatedData };
            }
            return e;
        }));
    }, [setEdges]);

    const handleDelete = useCallback(() => {
        if (!selectedSelection) return;
        // 仅编辑模式允许删除
        if (!isEditMode) return;
        if (selectedSelection.type === 'node') {
            const nodeToDelete = nodes.find(n => n.id === selectedSelection.id);
            if (nodeToDelete) deleteElements({ nodes: [nodeToDelete] });
        } else {
            const edgeToDelete = edges.find(e => e.id === selectedSelection.id);
            if (edgeToDelete) deleteElements({ edges: [edgeToDelete] });
        }
        setSelectedSelection(null);
    }, [selectedSelection, nodes, edges, deleteElements, isEditMode]);

    const handleAddNode = useCallback(() => {
        const id = `n-${Date.now()}`;
        const wrapper = containerRef.current;
        let position = { x: Math.random() * 400, y: Math.random() * 400 };

        if (wrapper) {
            const { width, height } = wrapper.getBoundingClientRect();
            position = project({ x: width / 2 - 75, y: height / 2 - 60 });
        }

        const newNode: Node = {
            id,
            position,
            data: { label: '新节点', iconKey: 'Cpu', color: '#ffffff' },
            type: 'custom'
        };
        setNodes((nds) => nds.concat(newNode));
    }, [project, setNodes]);

    const handleToggleEdit = useCallback(() => {
        setIsEditMode(prev => {
            const newEditMode = !prev;
            // 退出编辑模式时，清除高亮和暗化效果，恢复数据流动
            if (!newEditMode) {
                setNodes(nds => nds.map(n => ({ 
                    ...n, 
                    data: { ...n.data, isHighlight: false, isDimmed: false } 
                })));
                setEdges(eds => eds.map(e => ({ 
                    ...e, 
                    data: { ...e.data, isHighlight: false, isDimmed: false } 
                })));
            }
            return newEditMode;
        });
        setSelectedSelection(null);
    }, [setNodes, setEdges]);

    // ✅ 修复：将 UI 组件包裹在 useMemo 中，防止拖拽时频繁重渲染导致的 UI 库报错
    const uiOverlay = useMemo(() => (
        <>
            <Background color="#333" gap={24} size={1} />
            <Controls className="bg-[#1a1a1a] border-white/10 fill-white" />
            <TopControlPanel
                isEditMode={isEditMode}
                onToggleEdit={handleToggleEdit}
                onLayout={onLayout}
                onAddNode={handleAddNode}
            />
        </>
    ), [isEditMode, handleToggleEdit, onLayout, handleAddNode]);

    return (
        <div ref={containerRef} className="w-full h-full bg-[#050505] relative flex overflow-hidden">
            <div className="flex-1 relative">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    nodeTypes={nodeTypes}
                    edgeTypes={edgeTypes}
                    onNodeClick={onNodeClick}
                    onEdgeClick={onEdgeClick}
                    onPaneClick={onPaneClick}
                    onInit={onInit}
                    connectionLineType={ConnectionLineType.SmoothStep}
                    defaultEdgeOptions={{ type: 'custom' }}
                    fitView
                    minZoom={0.2}
                    maxZoom={2}
                    proOptions={{ hideAttribution: true }}
                    nodesDraggable={isEditMode}
                    nodesConnectable={isEditMode}
                    elementsSelectable={true}
                >
                    {uiOverlay}
                </ReactFlow>
            </div>

            <AnimatePresence>
                {selectedSelection && (
                    <PropertyPanel
                        selectedItem={selectedSelection}
                        onClose={() => setSelectedSelection(null)}
                        onUpdateNode={updateNodeData}
                        onUpdateEdge={updateEdgeData}
                        onDelete={handleDelete}
                    />
                )}
            </AnimatePresence>

            {/* 节点详情面板 */}
            <AnimatePresence>
                {selectedNodeForDetail && (
                    <NodeDetailPanel
                        node={selectedNodeForDetail}
                        isEditMode={isEditMode}
                        onUpdateNode={updateNodeData}
                        onClose={() => setSelectedNodeForDetail(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

export default function DataflowEditor() {
    return (
        <ReactFlowProvider>
            <FlowEditorInner />
        </ReactFlowProvider>
    );
}
