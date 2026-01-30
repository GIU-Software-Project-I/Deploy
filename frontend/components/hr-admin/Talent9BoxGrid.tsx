
import React from 'react';
import { Employee } from './EmployeeTableRow';

interface Talent9BoxGridProps {
    employees: Employee[];
}

export const Talent9BoxGrid: React.FC<Talent9BoxGridProps> = ({ employees }) => {

    // Mock performance/potential since they aren't in the base Employee interface yet
    const getBox = (emp: Employee) => {
        const hash = emp._id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const performance = (hash % 3); // 0: Low, 1: Med, 2: High
        const potential = ((hash * 7) % 3);
        return { x: performance, y: potential };
    };

    const boxes = [
        { x: 0, y: 2, label: "Rough Diamond", color: "bg-white text-zinc-600 border-zinc-200" },
        { x: 1, y: 2, label: "Future Star", color: "bg-white text-zinc-700 border-zinc-200" },
        { x: 2, y: 2, label: "Star / Top Talent", color: "bg-white text-black border-black shadow-sm" },
        { x: 0, y: 1, label: "Inconsistent", color: "bg-white text-zinc-500 border-zinc-200" },
        { x: 1, y: 1, label: "Core Performer", color: "bg-zinc-50 text-black border-zinc-300" },
        { x: 2, y: 1, label: "High Performer", color: "bg-white text-zinc-900 border-zinc-400" },
        { x: 0, y: 0, label: "Underperformer", color: "bg-white text-zinc-400 border-zinc-200" },
        { x: 1, y: 0, label: "Effective", color: "bg-white text-zinc-600 border-zinc-200" },
        { x: 2, y: 0, label: "Trusted Pro", color: "bg-white text-zinc-800 border-zinc-300" },
    ];

    return (
        <div className="bg-card border border-border rounded-xl p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-xl font-bold text-foreground">Talent Matrix (9-Box Grid)</h2>
                    <p className="text-sm text-muted-foreground">Mapping {employees.length} employees by Performance vs Potential</p>
                </div>
                <div className="flex gap-4 text-xs font-medium uppercase tracking-tighter">
                    <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-black"></span> High Potential</div>
                    <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-zinc-400"></span> High Performance</div>
                </div>
            </div>

            <div className="relative grid grid-cols-3 grid-rows-3 gap-3 aspect-square max-w-2xl mx-auto">
                <div className="absolute -left-12 top-1/2 -rotate-90 text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-32 text-center">
                    Potential →
                </div>
                <div className="absolute left-1/2 -bottom-8 -translate-x-1/2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-32 text-center">
                    Performance →
                </div>

                {boxes.sort((a, b) => b.y - a.y || a.x - b.x).map((box, idx) => {
                    const empsInBox = employees.filter(e => {
                        const pos = getBox(e);
                        return pos.x === box.x && pos.y === box.y;
                    });

                    return (
                        <div
                            key={idx}
                            className={`relative flex flex-col items-center justify-center border p-4 rounded-xl transition-all duration-300 hover:border-black cursor-default bg-white ${box.color}`}
                        >
                            <span className="absolute top-2 left-2 text-[9px] font-black opacity-30 uppercase">{box.label}</span>
                            <div className="flex flex-wrap items-center justify-center gap-1.5 max-h-full overflow-y-auto">
                                {empsInBox.map((e, eidx) => (
                                    <div
                                        key={eidx}
                                        title={e.fullName || `${e.firstName} ${e.lastName}`}
                                        className="w-8 h-8 rounded-full border border-border bg-zinc-100 flex-shrink-0 flex items-center justify-center text-[10px] font-bold overflow-hidden"
                                    >
                                        {e.profilePictureUrl ? (
                                            <img src={e.profilePictureUrl} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            (e.firstName?.[0] || '') + (e.lastName?.[0] || '')
                                        )}
                                    </div>
                                ))}
                            </div>
                            <span className="absolute bottom-2 right-2 text-xs font-bold opacity-20">{empsInBox.length || ''}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
