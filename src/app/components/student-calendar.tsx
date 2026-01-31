// =============================================
// Student Calendar Component
// =============================================

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from './ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from './ui/select';
import { toast } from 'sonner';
import {
    ChevronLeft,
    ChevronRight,
    Calendar as CalendarIcon,
    Clock,
    BookOpen,
    FileText,
    Award,
    AlertCircle,
    CheckCircle2,
    Loader2,
} from 'lucide-react';
import { cn } from './ui/utils';
import { supabase } from '@/lib/supabase-client';
import {
    CalendarEvent,
    CalendarView,
    CalendarDay,
    getMonthEvents,
    getWeekEvents,
    getMonthDays,
    getWeekDays,
    getEventStatus,
    getStatusLabel,
    getStatusBadgeClass,
    getCourseColour,
    formatMonthYear,
    formatDate,
    formatTime,
    getMonthStart,
    getWeekStart,
    isToday,
} from '@/lib/student-calendar';
import { formatAssessmentType } from '@/lib/student-filters';

// =============================================
// TYPES
// =============================================

interface StudentCalendarProps {
    studentId: string;
}

// =============================================
// MAIN CALENDAR COMPONENT
// =============================================

export function StudentCalendar({ studentId }: StudentCalendarProps) {
    const [view, setView] = useState<CalendarView>('month');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [days, setDays] = useState<CalendarDay[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
    const [eventDialogOpen, setEventDialogOpen] = useState(false);

    // Fetch events based on current view and date
    const fetchEvents = useCallback(async () => {
        setIsLoading(true);
        try {
            const fetchedEvents = view === 'month'
                ? await getMonthEvents(studentId, currentDate)
                : await getWeekEvents(studentId, currentDate);

            setEvents(fetchedEvents);

            // Calculate days with events
            const calculatedDays = view === 'month'
                ? getMonthDays(currentDate, fetchedEvents)
                : getWeekDays(currentDate, fetchedEvents);

            setDays(calculatedDays);
        } catch (error) {
            console.error('Error fetching calendar events:', error);
            toast.error('Failed to load calendar events');
        } finally {
            setIsLoading(false);
        }
    }, [studentId, currentDate, view]);

    // Fetch events when view or date changes
    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    // Real-time subscription for assessment updates
    useEffect(() => {
        const channel = supabase
            .channel('calendar-updates')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'assessments',
            }, () => {
                // Refresh calendar when assessments change
                fetchEvents();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchEvents]);

    // Navigation handlers
    const goToToday = () => setCurrentDate(new Date());

    const goToPrevious = () => {
        const newDate = new Date(currentDate);
        if (view === 'month') {
            newDate.setMonth(newDate.getMonth() - 1);
        } else {
            newDate.setDate(newDate.getDate() - 7);
        }
        setCurrentDate(newDate);
    };

    const goToNext = () => {
        const newDate = new Date(currentDate);
        if (view === 'month') {
            newDate.setMonth(newDate.getMonth() + 1);
        } else {
            newDate.setDate(newDate.getDate() + 7);
        }
        setCurrentDate(newDate);
    };

    // Event click handler
    const handleEventClick = (event: CalendarEvent) => {
        setSelectedEvent(event);
        setEventDialogOpen(true);
    };

    // Get header text based on view
    const getHeaderText = () => {
        if (view === 'month') {
            return formatMonthYear(currentDate);
        } else {
            const weekStart = getWeekStart(currentDate);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            return `${formatDate(weekStart)} - ${formatDate(weekEnd)}`;
        }
    };

    return (
        <div className="space-y-4">
            {/* Calendar Header */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <CalendarIcon className="h-5 w-5 text-blue-600" />
                            <CardTitle>Assessment Calendar</CardTitle>
                        </div>
                        <div className="flex items-center gap-2">
                            <Select
                                value={view}
                                onValueChange={(v) => setView(v as CalendarView)}
                            >
                                <SelectTrigger className="w-[120px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="month">Month</SelectItem>
                                    <SelectItem value="week">Week</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {/* Navigation */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="icon" onClick={goToPrevious}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="icon" onClick={goToNext}>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={goToToday}>
                                Today
                            </Button>
                        </div>
                        <h2 className="text-xl font-semibold">{getHeaderText()}</h2>
                        <div className="w-[140px]" /> {/* Spacer for alignment */}
                    </div>

                    {/* Legend */}
                    <div className="flex flex-wrap gap-4 mb-4 text-sm">
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded-full bg-red-500" />
                            <span>Overdue</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded-full bg-orange-500" />
                            <span>Due Soon (48h)</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded-full bg-blue-500" />
                            <span>Upcoming</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded-full bg-green-500" />
                            <span>Submitted</span>
                        </div>
                    </div>

                    <Separator className="mb-4" />

                    {/* Calendar Grid */}
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                        </div>
                    ) : view === 'month' ? (
                        <MonthView days={days} onEventClick={handleEventClick} />
                    ) : (
                        <WeekView days={days} onEventClick={handleEventClick} />
                    )}
                </CardContent>
            </Card>

            {/* Event Details Dialog */}
            <EventDetailsDialog
                event={selectedEvent}
                open={eventDialogOpen}
                onOpenChange={setEventDialogOpen}
            />
        </div>
    );
}

// =============================================
// MONTH VIEW COMPONENT
// =============================================

interface MonthViewProps {
    days: CalendarDay[];
    onEventClick: (event: CalendarEvent) => void;
}

function MonthView({ days, onEventClick }: MonthViewProps) {
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <div className="border rounded-lg overflow-hidden">
            {/* Week day headers */}
            <div className="grid grid-cols-7 bg-gray-50 border-b">
                {weekDays.map((day) => (
                    <div
                        key={day}
                        className="py-2 text-center text-sm font-medium text-gray-600"
                    >
                        {day}
                    </div>
                ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7">
                {days.map((day, index) => (
                    <div
                        key={index}
                        className={cn(
                            "min-h-[100px] p-1 border-b border-r",
                            !day.isCurrentMonth && "bg-gray-50",
                            day.isToday && "bg-purple-50 ring-2 ring-inset ring-purple-500"
                        )}
                    >
                        <div className={cn(
                            "text-sm font-medium mb-1",
                            !day.isCurrentMonth && "text-gray-400",
                            day.isToday && "text-purple-700"
                        )}>
                            {day.date.getDate()}
                        </div>
                        <div className="space-y-1">
                            {day.events.slice(0, 3).map((event) => (
                                <CalendarEventItem
                                    key={event.assessment_id}
                                    event={event}
                                    onClick={() => onEventClick(event)}
                                    compact
                                />
                            ))}
                            {day.events.length > 3 && (
                                <button
                                    className="text-xs text-blue-600 hover:underline"
                                    onClick={() => onEventClick(day.events[3])}
                                >
                                    +{day.events.length - 3} more
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// =============================================
// WEEK VIEW COMPONENT
// =============================================

interface WeekViewProps {
    days: CalendarDay[];
    onEventClick: (event: CalendarEvent) => void;
}

function WeekView({ days, onEventClick }: WeekViewProps) {
    return (
        <div className="border rounded-lg overflow-hidden">
            <div className="grid grid-cols-7">
                {days.map((day, index) => (
                    <div
                        key={index}
                        className={cn(
                            "min-h-[300px] border-r last:border-r-0",
                            day.isToday && "bg-purple-50"
                        )}
                    >
                        {/* Day header */}
                        <div className={cn(
                            "p-2 border-b text-center",
                            day.isToday ? "bg-purple-100" : "bg-gray-50"
                        )}>
                            <div className="text-xs text-gray-500">
                                {day.date.toLocaleDateString('en-AU', { weekday: 'short' })}
                            </div>
                            <div className={cn(
                                "text-lg font-semibold",
                                day.isToday && "text-purple-700"
                            )}>
                                {day.date.getDate()}
                            </div>
                        </div>

                        {/* Events */}
                        <ScrollArea className="h-[250px] p-2">
                            <div className="space-y-2">
                                {day.events.length === 0 ? (
                                    <div className="text-xs text-gray-400 text-center py-4">
                                        No deadlines
                                    </div>
                                ) : (
                                    day.events.map((event) => (
                                        <CalendarEventItem
                                            key={event.assessment_id}
                                            event={event}
                                            onClick={() => onEventClick(event)}
                                        />
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                    </div>
                ))}
            </div>
        </div>
    );
}

// =============================================
// CALENDAR EVENT ITEM
// =============================================

interface CalendarEventItemProps {
    event: CalendarEvent;
    onClick: () => void;
    compact?: boolean;
}

function CalendarEventItem({ event, onClick, compact = false }: CalendarEventItemProps) {
    const status = getEventStatus(event);
    const courseColour = getCourseColour(event.course_id);

    if (compact) {
        return (
            <button
                onClick={onClick}
                className={cn(
                    "w-full text-left text-xs p-1 rounded truncate transition-colors",
                    getStatusBadgeClass(status),
                    "hover:opacity-80 cursor-pointer"
                )}
                style={{ borderLeftColor: courseColour, borderLeftWidth: '3px' }}
            >
                {event.title}
            </button>
        );
    }

    return (
        <button
            onClick={onClick}
            className={cn(
                "w-full text-left p-2 rounded-lg border transition-colors",
                getStatusBadgeClass(status),
                "hover:opacity-80 cursor-pointer"
            )}
            style={{ borderLeftColor: courseColour, borderLeftWidth: '4px' }}
        >
            <div className="font-medium text-sm truncate">{event.title}</div>
            <div className="text-xs text-gray-600 mt-1">
                {event.course_code}
            </div>
            <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                <Clock className="h-3 w-3" />
                {formatTime(new Date(event.due_date))}
            </div>
        </button>
    );
}

// =============================================
// EVENT DETAILS DIALOG
// =============================================

interface EventDetailsDialogProps {
    event: CalendarEvent | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

function EventDetailsDialog({ event, open, onOpenChange }: EventDetailsDialogProps) {
    if (!event) return null;

    const status = getEventStatus(event);
    const dueDate = new Date(event.due_date);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-600" />
                        {event.title}
                    </DialogTitle>
                    <DialogDescription>
                        Assessment Details
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Status Badge */}
                    <div className="flex items-center gap-2">
                        <Badge className={getStatusBadgeClass(status)}>
                            {status === 'submitted' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                            {status === 'overdue' && <AlertCircle className="h-3 w-3 mr-1" />}
                            {getStatusLabel(status)}
                        </Badge>
                        <Badge variant="outline">
                            {formatAssessmentType(event.assessment_type)}
                        </Badge>
                    </div>

                    <Separator />

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <div className="text-gray-500 flex items-center gap-1">
                                <BookOpen className="h-4 w-4" />
                                Course
                            </div>
                            <div className="font-medium">
                                {event.course_code} - {event.course_title}
                            </div>
                        </div>
                        <div>
                            <div className="text-gray-500 flex items-center gap-1">
                                <Award className="h-4 w-4" />
                                Total Marks
                            </div>
                            <div className="font-medium">{event.total_marks}</div>
                        </div>
                        <div>
                            <div className="text-gray-500 flex items-center gap-1">
                                <CalendarIcon className="h-4 w-4" />
                                Due Date
                            </div>
                            <div className="font-medium">
                                {dueDate.toLocaleDateString('en-AU', {
                                    weekday: 'long',
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric',
                                })}
                            </div>
                        </div>
                        <div>
                            <div className="text-gray-500 flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                Due Time
                            </div>
                            <div className="font-medium">{formatTime(dueDate)}</div>
                        </div>
                    </div>

                    {/* Description */}
                    {event.description && (
                        <>
                            <Separator />
                            <div>
                                <div className="text-sm text-gray-500 mb-1">Description</div>
                                <p className="text-sm">{event.description}</p>
                            </div>
                        </>
                    )}

                    {/* Submission Status */}
                    <Separator />
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-sm text-gray-500">Submission Status</div>
                            <div className="font-medium">
                                {event.is_submitted ? (
                                    <span className="text-green-600 flex items-center gap-1">
                                        <CheckCircle2 className="h-4 w-4" />
                                        Submitted
                                    </span>
                                ) : event.is_overdue ? (
                                    <span className="text-red-600 flex items-center gap-1">
                                        <AlertCircle className="h-4 w-4" />
                                        Not Submitted (Overdue)
                                    </span>
                                ) : (
                                    <span className="text-gray-600">Not Yet Submitted</span>
                                )}
                            </div>
                        </div>
                        {!event.is_submitted && !event.is_overdue && (
                            <Button size="sm">
                                Go to Submission
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default StudentCalendar;
