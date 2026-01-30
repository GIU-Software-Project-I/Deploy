import * as React from "react"
import { cn } from "@/lib/utils"
import {
    UserPlus,
    Briefcase,
    Calendar,
    ArrowRight,
    ChevronRight,
    ChevronLeft
} from "lucide-react"

export interface TimelineEvent {
    id: string
    date: Date
    title: string
    description: string
    type: "hiring" | "promotion" | "department_change" | "current"
}

interface JourneyTimelineProps {
    events: TimelineEvent[]
    className?: string
}

export function JourneyTimeline({ events, className }: JourneyTimelineProps) {
    const scrollContainerRef = React.useRef<HTMLDivElement>(null)

    const scroll = (direction: "left" | "right") => {
        if (scrollContainerRef.current) {
            const scrollAmount = 300
            scrollContainerRef.current.scrollBy({
                left: direction === "left" ? -scrollAmount : scrollAmount,
                behavior: "smooth"
            })
        }
    }

    const getEventIcon = (type: TimelineEvent["type"]) => {
        switch (type) {
            case "hiring":
                return <UserPlus className="w-5 h-5" />
            case "promotion":
                return <Briefcase className="w-5 h-5" />
            case "department_change":
                return <Briefcase className="w-5 h-5 opacity-70" />
            case "current":
                return <Calendar className="w-5 h-5" />
            default:
                return <ArrowRight className="w-5 h-5" />
        }
    }

    const getEventColor = (type: TimelineEvent["type"]) => {
        switch (type) {
            case "hiring":
                return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
            case "promotion":
                return "bg-primary/10 text-primary border-primary/20"
            case "department_change":
                return "bg-blue-500/10 text-blue-500 border-blue-500/20"
            case "current":
                return "bg-amber-500/10 text-amber-500 border-amber-500/20"
            default:
                return "bg-muted text-muted-foreground border-border"
        }
    }

    // Sort events by date
    const sortedEvents = [...events].sort((a, b) => a.date.getTime() - b.date.getTime())

    return (
        <div className={cn("relative group w-full", className)}>
            {/* Navigation Buttons */}
            <div className="absolute top-1/2 -translate-y-1/2 -left-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={() => scroll("left")}
                    className="p-2 rounded-full bg-background border border-border shadow-lg hover:bg-muted transition-colors"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
            </div>
            <div className="absolute top-1/2 -translate-y-1/2 -right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={() => scroll("right")}
                    className="p-2 rounded-full bg-background border border-border shadow-lg hover:bg-muted transition-colors"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>

            <div
                ref={scrollContainerRef}
                className="flex overflow-x-auto pb-8 pt-4 gap-0 no-scrollbar items-start"
            >
                {sortedEvents.map((event, index) => (
                    <div key={event.id} className="flex-shrink-0 flex items-start group/node">
                        {/* Event Node */}
                        <div className="flex flex-col items-center w-64 text-center">
                            <div className={cn(
                                "w-12 h-12 rounded-2xl border flex items-center justify-center transition-all duration-300 group-hover/node:scale-110 group-hover/node:shadow-lg",
                                getEventColor(event.type)
                            )}>
                                {getEventIcon(event.type)}
                            </div>

                            <div className="mt-4 space-y-1 px-4">
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                    {event.date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                                </p>
                                <h4 className="text-sm font-black text-foreground line-clamp-1">{event.title}</h4>
                                <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed h-8">
                                    {event.description}
                                </p>
                            </div>
                        </div>

                        {/* Connecting Line */}
                        {index < sortedEvents.length - 1 && (
                            <div className="flex-shrink-0 pt-6">
                                <div className="h-[2px] w-24 bg-gradient-to-r from-border via-border/50 to-border" />
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}
