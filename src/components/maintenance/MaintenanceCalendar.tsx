'use client';

import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths,
    addWeeks,
    subWeeks,
    isToday,
    setHours,
    setMinutes
} from 'date-fns';
import { es } from 'date-fns/locale';
import { MaintenanceRecord, Vehicle, Workshop } from '@/types';
import { ChevronLeft, ChevronRight, Wrench, CheckCircle, Clock, CalendarDays, CalendarRange } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface MaintenanceCalendarProps {
    records: MaintenanceRecord[];
    vehicles: Vehicle[];
    workshops: Workshop[];
    onSelectDate: (date: Date) => void;
    onSelectRecord: (record: MaintenanceRecord) => void;
}

type CalendarView = 'month' | 'week';

// Time Grid Configuration
const START_HOUR = 6;
const END_HOUR = 22;
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);
const HOUR_HEIGHT = 64; // px

export function MaintenanceCalendar({
    records,
    vehicles,
    workshops,
    onSelectDate,
    onSelectRecord
}: MaintenanceCalendarProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [view, setView] = useState<CalendarView>('month');
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Month View Logic
    const firstDayOfMonth = startOfMonth(currentDate);
    const lastDayOfMonth = endOfMonth(currentDate);
    const startMonthDate = startOfWeek(firstDayOfMonth, { weekStartsOn: 1 });
    const endMonthDate = endOfWeek(lastDayOfMonth, { weekStartsOn: 1 });

    // Week View Logic
    const startWeekDate = startOfWeek(currentDate, { weekStartsOn: 1 });
    const endWeekDate = endOfWeek(currentDate, { weekStartsOn: 1 });

    const days = eachDayOfInterval({
        start: view === 'month' ? startMonthDate : startWeekDate,
        end: view === 'month' ? endMonthDate : endWeekDate
    });

    const next = () => {
        setCurrentDate(view === 'month' ? addMonths(currentDate, 1) : addWeeks(currentDate, 1));
    };

    const prev = () => {
        setCurrentDate(view === 'month' ? subMonths(currentDate, 1) : subWeeks(currentDate, 1));
    };

    const goToToday = () => {
        const now = new Date();
        setCurrentDate(now);
        // Scroll to current time in week view?
    };

    const getDayRecords = (day: Date) => {
        return records.filter(record => {
            const recordDate = record.date?.seconds
                ? new Date(record.date.seconds * 1000)
                : new Date(record.date);
            return isSameDay(recordDate, day);
        }).sort((a, b) => {
            const dateA = a.date?.seconds ? new Date(a.date.seconds * 1000) : new Date(a.date);
            const dateB = b.date?.seconds ? new Date(b.date.seconds * 1000) : new Date(b.date);
            return dateA.getTime() - dateB.getTime();
        });
    };

    const getVehicleInfo = (vehicleId: string) => {
        const v = vehicles.find(v => v.id === vehicleId);
        return v ? `${v.plate ?? '???'} - ${v.model}` : 'Vehículo desconocido';
    };

    const getFormattedTime = (date: any) => {
        const d = date?.seconds ? new Date(date.seconds * 1000) : new Date(date);
        return format(d, 'HH:mm');
    };

    // Helper to calculate top position for week view events
    const getEventStyle = (record: MaintenanceRecord) => {
        const date = record.date?.seconds ? new Date(record.date.seconds * 1000) : new Date(record.date);
        const hour = date.getHours();
        const minutes = date.getMinutes();

        // Relative to START_HOUR
        const minutesFromStart = (hour - START_HOUR) * 60 + minutes;
        const top = (minutesFromStart / 60) * HOUR_HEIGHT;

        return {
            top: `${top}px`,
            height: '58px', // Fixed height for readability (~1h slot minus gap)
        };
    };

    const handleTimeSlotClick = (day: Date, hour: number) => {
        const dateWithTime = setMinutes(setHours(day, hour), 0);
        onSelectDate(dateWithTime);
    };

    return (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col h-[700px]">
            {/* Calendar Header */}
            <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-border bg-muted/30 flex-shrink-0">
                <h2 className="text-lg font-bold capitalize flex items-center gap-2">
                    {view === 'month'
                        ? format(currentDate, 'MMMM yyyy', { locale: es })
                        : `Semana del ${format(startWeekDate, 'd MMM')} al ${format(endWeekDate, 'd MMM yyyy', { locale: es })}`
                    }
                </h2>

                <div className="flex items-center gap-4">
                    {/* View Toggle */}
                    <div className="flex bg-background rounded-lg border border-input p-1">
                        <button
                            onClick={() => setView('month')}
                            className={`px-3 py-1 flex items-center gap-2 text-sm font-medium rounded-md transition-all ${view === 'month' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted'
                                }`}
                        >
                            <CalendarDays className="w-4 h-4" />
                            <span className="hidden sm:inline">Mes</span>
                        </button>
                        <button
                            onClick={() => setView('week')}
                            className={`px-3 py-1 flex items-center gap-2 text-sm font-medium rounded-md transition-all ${view === 'week' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted'
                                }`}
                        >
                            <CalendarRange className="w-4 h-4" />
                            <span className="hidden sm:inline">Semana</span>
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={goToToday}
                            className="text-xs font-medium px-3 py-1.5 bg-background border border-input rounded-md hover:bg-accent transition-colors"
                        >
                            Hoy
                        </button>
                        <div className="flex items-center rounded-md border border-input bg-background">
                            <button onClick={prev} className="p-1.5 hover:bg-accent rounded-l-md border-r border-input">
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button onClick={next} className="p-1.5 hover:bg-accent rounded-r-md">
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Week Days Header */}
            <div className={`grid border-b border-border bg-background flex-shrink-0 ${view === 'week' ? 'grid-cols-[60px_1fr]' : 'w-full'}`}>
                {view === 'week' && <div className="border-r border-border bg-muted/10"></div>}
                <div className={`grid grid-cols-7 ${view === 'month' ? 'w-full' : ''}`}>
                    {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day, i) => (
                        <div key={day} className={`py-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider ${view === 'week' ? 'border-l border-transparent' : ''}`}>
                            {view === 'week' ? (
                                <div className="flex flex-col items-center">
                                    <span>{day}</span>
                                    <span className={`text-lg ${isToday(days[i]) ? 'text-primary font-bold' : 'text-foreground'}`}>
                                        {format(days[i], 'd')}
                                    </span>
                                </div>
                            ) : day}
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Content Area */}
            {view === 'month' ? (
                // MONTH VIEW
                <div className="grid grid-cols-7 auto-rows-fr bg-muted/20 gap-px border-b border-border flex-grow overflow-auto">
                    {days.map((day, dayIdx) => {
                        const dayRecords = getDayRecords(day);
                        const isCurrentMonth = isSameMonth(day, currentDate);
                        const isDayToday = isToday(day);
                        return (
                            <div
                                key={day.toString()}
                                className={`
                    bg-background p-2 transition-colors relative group min-h-[120px]
                    ${!isCurrentMonth ? 'text-muted-foreground/40 bg-muted/5' : ''}
                    ${isDayToday ? 'bg-primary/5' : ''}
                    hover:bg-muted/30 cursor-pointer
                  `}
                                onClick={() => onSelectDate(day)}
                            >
                                <div className={`
                    text-sm font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full
                    ${isDayToday ? 'bg-primary text-primary-foreground' : ''}
                  `}>
                                    {format(day, 'd')}
                                </div>
                                <div className="space-y-1">
                                    {dayRecords.map(record => (
                                        <RecordItem key={record.id} record={record} getVehicleInfo={getVehicleInfo} getFormattedTime={getFormattedTime} onSelectRecord={onSelectRecord} />
                                    ))}
                                </div>
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                                    <div className="bg-primary/90 text-primary-foreground text-xs font-bold px-2 py-1 rounded shadow-sm translate-y-4 group-hover:translate-y-0 transition-transform duration-200 pointer-events-auto">
                                        +
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                // WEEK VIEW (Time Grid)
                <div className="flex-grow overflow-y-auto custom-scrollbar relative" ref={scrollContainerRef}>
                    <div className="grid grid-cols-[60px_1fr] min-h-max" style={{ height: HOURS.length * HOUR_HEIGHT }}>
                        {/* Time Axis */}
                        <div className="border-r border-border bg-muted/5 select-none">
                            {HOURS.map(hour => (
                                <div key={hour} className="text-xs text-muted-foreground text-right pr-2 pt-1 border-b border-border/50" style={{ height: HOUR_HEIGHT }}>
                                    {hour}:00
                                </div>
                            ))}
                        </div>

                        {/* Days Columns */}
                        <div className="grid grid-cols-7 relative">
                            {/* Background Grid Lines */}
                            <div className="absolute inset-0 grid grid-rows-[repeat(auto-fill,64px)] pointer-events-none z-0">
                                {HOURS.map(h => (
                                    <div key={h} className="border-b border-border/30 w-full" style={{ height: HOUR_HEIGHT }}></div>
                                ))}
                            </div>

                            {/* Day Columns */}
                            {days.map((day, i) => {
                                const dayRecords = getDayRecords(day);
                                const isDayToday = isToday(day);

                                return (
                                    <div key={day.toString()} className={`relative border-l border-border/50 h-full group ${isDayToday ? 'bg-primary/[0.02]' : ''}`}>
                                        {/* Clickable Time Slots */}
                                        {HOURS.map(hour => (
                                            <div
                                                key={hour}
                                                className="w-full absolute z-10 hover:bg-primary/10 transition-colors cursor-pointer"
                                                style={{ top: (hour - START_HOUR) * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                                                onClick={() => handleTimeSlotClick(day, hour)}
                                                title={`Añadir cita a las ${hour}:00`}
                                            ></div>
                                        ))}

                                        {/* Events */}
                                        {dayRecords.map(record => {
                                            const style = getEventStyle(record);
                                            return (
                                                <div
                                                    key={record.id}
                                                    style={style}
                                                    className={`
                                                    absolute left-0.5 right-0.5 z-20 rounded-md border shadow-sm p-1.5 text-xs overflow-hidden cursor-pointer transition-transform hover:scale-[1.02] hover:z-30
                                                    ${record.status === 'completed'
                                                            ? 'bg-emerald-50/90 text-emerald-700 border-emerald-200'
                                                            : record.status === 'in_progress'
                                                                ? 'bg-blue-50/90 text-blue-700 border-blue-200'
                                                                : 'bg-white/90 text-gray-700 border-gray-200'}
                                                `}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onSelectRecord(record);
                                                    }}
                                                >
                                                    <div className="font-bold flex items-center gap-1">
                                                        {getFormattedTime(record.date)}
                                                    </div>
                                                    <div className="truncate">{getVehicleInfo(record.vehicleId)}</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Subcomponent for simple record display in Month view
function RecordItem({ record, getVehicleInfo, getFormattedTime, onSelectRecord }: any) {
    return (
        <button
            onClick={(e) => {
                e.stopPropagation();
                onSelectRecord(record);
            }}
            className={`
                w-full text-left text-xs p-1.5 rounded-md border shadow-sm transition-all hover:scale-[1.02]
                flex items-center gap-1.5 mb-1
                ${record.status === 'completed'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : record.status === 'in_progress'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-white text-gray-700 border-gray-200'}
            `}
        >
            <div className="flex items-center gap-1.5 opacity-80 flex-shrink-0">
                {record.status === 'completed' ? (
                    <CheckCircle className="w-3 h-3 shrink-0" />
                ) : record.status === 'in_progress' ? (
                    <Wrench className="w-3 h-3 shrink-0" />
                ) : (
                    <Clock className="w-3 h-3 shrink-0 text-amber-500" />
                )}
            </div>
            <div className="flex flex-col min-w-0">
                <span className="font-mono text-[10px] font-bold tracking-tight leading-none mb-0.5">
                    {getFormattedTime(record.date)}
                </span>
                <span className="truncate font-medium leading-none">
                    {getVehicleInfo(record.vehicleId)}
                </span>
            </div>
        </button>
    );
}
