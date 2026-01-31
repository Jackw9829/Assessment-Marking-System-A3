// =============================================
// Notification Center Component
// =============================================
// Displays notifications, upcoming deadlines, and
// allows users to manage notification preferences.
// =============================================

import { useState, useEffect, useCallback } from 'react';
import { Bell, BellRing, Check, CheckCheck, Clock, X, Settings, AlertTriangle, Calendar, Mail, MailX } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { toast } from 'sonner';
import {
    Notification,
    NotificationPreferences,
    ReminderHistoryEntry,
    getNotifications,
    getUnreadNotificationCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    dismissNotification,
    getNotificationPreferences,
    updateNotificationPreferences,
    getReminderHistory,
    getUpcomingDeadlines,
    subscribeToNotifications,
    formatTimeUntilDeadline,
    getDeadlineUrgency,
} from '@/lib/notifications';

interface NotificationCenterProps {
    userId: string;
}

export function NotificationCenter({ userId }: NotificationCenterProps) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Fetch notifications
    const fetchNotifications = useCallback(async () => {
        setIsLoading(true);
        try {
            const [notifs, count] = await Promise.all([
                getNotifications({ limit: 20 }),
                getUnreadNotificationCount(),
            ]);
            setNotifications(notifs);
            setUnreadCount(count);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Initial fetch and realtime subscription
    useEffect(() => {
        fetchNotifications();

        // Subscribe to new notifications
        const unsubscribe = subscribeToNotifications(userId, (newNotification) => {
            setNotifications((prev) => [newNotification, ...prev]);
            setUnreadCount((prev) => prev + 1);

            // Show toast for new notification
            toast.info(newNotification.title, {
                description: newNotification.message,
                action: {
                    label: 'View',
                    onClick: () => setIsOpen(true),
                },
            });
        });

        return () => {
            unsubscribe();
        };
    }, [userId, fetchNotifications]);

    // Handle mark as read
    const handleMarkAsRead = async (notificationId: string) => {
        try {
            await markNotificationAsRead(notificationId);
            setNotifications((prev) =>
                prev.map((n) =>
                    n.id === notificationId
                        ? { ...n, status: 'read', read_at: new Date().toISOString() }
                        : n
                )
            );
            setUnreadCount((prev) => Math.max(0, prev - 1));
        } catch (error) {
            toast.error('Failed to mark notification as read');
        }
    };

    // Handle mark all as read
    const handleMarkAllAsRead = async () => {
        try {
            await markAllNotificationsAsRead();
            setNotifications((prev) =>
                prev.map((n) => ({ ...n, status: 'read', read_at: new Date().toISOString() }))
            );
            setUnreadCount(0);
            toast.success('All notifications marked as read');
        } catch (error) {
            toast.error('Failed to mark notifications as read');
        }
    };

    // Handle dismiss
    const handleDismiss = async (notificationId: string) => {
        try {
            await dismissNotification(notificationId);
            setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
            toast.success('Notification dismissed');
        } catch (error) {
            toast.error('Failed to dismiss notification');
        }
    };

    // Get urgency color
    const getUrgencyColor = (notification: Notification) => {
        if (notification.type !== 'reminder') return 'bg-blue-500';

        const metadata = notification.metadata as { days_before?: number; hours_before?: number };
        if (metadata.hours_before && metadata.hours_before <= 6) return 'bg-red-500';
        if (metadata.days_before && metadata.days_before <= 1) return 'bg-orange-500';
        if (metadata.days_before && metadata.days_before <= 3) return 'bg-yellow-500';
        return 'bg-blue-500';
    };

    // Format notification time
    const formatNotificationTime = (createdAt: string) => {
        const now = new Date();
        const created = new Date(createdAt);
        const diffMs = now.getTime() - created.getTime();
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return created.toLocaleDateString();
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    {unreadCount > 0 ? (
                        <BellRing className="h-5 w-5" />
                    ) : (
                        <Bell className="h-5 w-5" />
                    )}
                    {unreadCount > 0 && (
                        <Badge
                            variant="destructive"
                            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                        >
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </Badge>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96 p-0" align="end">
                <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="font-semibold">Notifications</h3>
                    <div className="flex gap-2">
                        {unreadCount > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleMarkAllAsRead}
                                className="text-xs"
                            >
                                <CheckCheck className="h-4 w-4 mr-1" />
                                Mark all read
                            </Button>
                        )}
                        <NotificationSettingsDialog userId={userId} />
                    </div>
                </div>
                <ScrollArea className="h-[400px]">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-32">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                            <Bell className="h-8 w-8 mb-2" />
                            <p>No notifications</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={`p-4 hover:bg-muted/50 transition-colors ${notification.status === 'unread' ? 'bg-muted/30' : ''
                                        }`}
                                >
                                    <div className="flex gap-3">
                                        <div
                                            className={`h-2 w-2 rounded-full mt-2 ${getUrgencyColor(notification)}`}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className="font-medium text-sm truncate">
                                                    {notification.title}
                                                </p>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 shrink-0"
                                                    onClick={() => handleDismiss(notification.id)}
                                                >
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            </div>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {notification.message}
                                            </p>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className="text-xs text-muted-foreground">
                                                    {formatNotificationTime(notification.created_at)}
                                                </span>
                                                {notification.email_sent && (
                                                    <Badge variant="outline" className="text-xs">
                                                        <Mail className="h-3 w-3 mr-1" />
                                                        Email sent
                                                    </Badge>
                                                )}
                                                {notification.status === 'unread' && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-xs h-6 px-2"
                                                        onClick={() => handleMarkAsRead(notification.id)}
                                                    >
                                                        <Check className="h-3 w-3 mr-1" />
                                                        Mark read
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
}

// =============================================
// Notification Settings Dialog
// =============================================

function NotificationSettingsDialog({ userId }: { userId: string }) {
    const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchPreferences();
        }
    }, [isOpen]);

    const fetchPreferences = async () => {
        setIsLoading(true);
        try {
            const prefs = await getNotificationPreferences();
            setPreferences(
                prefs || {
                    id: '',
                    user_id: userId,
                    email_enabled: true,
                    dashboard_enabled: true,
                    reminder_7_days: true,
                    reminder_3_days: true,
                    reminder_1_day: true,
                    reminder_6_hours: true,
                    quiet_hours_start: null,
                    quiet_hours_end: null,
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    created_at: '',
                    updated_at: '',
                }
            );
        } catch (error) {
            toast.error('Failed to load preferences');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!preferences) return;

        setIsSaving(true);
        try {
            await updateNotificationPreferences({
                email_enabled: preferences.email_enabled,
                dashboard_enabled: preferences.dashboard_enabled,
                reminder_7_days: preferences.reminder_7_days,
                reminder_3_days: preferences.reminder_3_days,
                reminder_1_day: preferences.reminder_1_day,
                reminder_6_hours: preferences.reminder_6_hours,
                timezone: preferences.timezone,
            });
            toast.success('Preferences saved');
            setIsOpen(false);
        } catch (error) {
            toast.error('Failed to save preferences');
        } finally {
            setIsSaving(false);
        }
    };

    const updatePreference = (key: keyof NotificationPreferences, value: boolean) => {
        setPreferences((prev) => (prev ? { ...prev, [key]: value } : null));
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Settings className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Notification Preferences</DialogTitle>
                    <DialogDescription>
                        Customize how and when you receive deadline reminders.
                    </DialogDescription>
                </DialogHeader>
                {isLoading ? (
                    <div className="flex items-center justify-center h-48">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                    </div>
                ) : preferences ? (
                    <div className="space-y-6">
                        {/* Notification Channels */}
                        <div className="space-y-4">
                            <h4 className="font-medium">Notification Channels</h4>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Bell className="h-4 w-4" />
                                        <Label htmlFor="dashboard">Dashboard Notifications</Label>
                                    </div>
                                    <Switch
                                        id="dashboard"
                                        checked={preferences.dashboard_enabled}
                                        onCheckedChange={(checked) =>
                                            updatePreference('dashboard_enabled', checked)
                                        }
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Mail className="h-4 w-4" />
                                        <Label htmlFor="email">Email Notifications</Label>
                                    </div>
                                    <Switch
                                        id="email"
                                        checked={preferences.email_enabled}
                                        onCheckedChange={(checked) =>
                                            updatePreference('email_enabled', checked)
                                        }
                                    />
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Reminder Intervals */}
                        <div className="space-y-4">
                            <h4 className="font-medium">Reminder Timing</h4>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="7days">7 days before deadline</Label>
                                    <Switch
                                        id="7days"
                                        checked={preferences.reminder_7_days}
                                        onCheckedChange={(checked) =>
                                            updatePreference('reminder_7_days', checked)
                                        }
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="3days">3 days before deadline</Label>
                                    <Switch
                                        id="3days"
                                        checked={preferences.reminder_3_days}
                                        onCheckedChange={(checked) =>
                                            updatePreference('reminder_3_days', checked)
                                        }
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="1day">1 day before deadline</Label>
                                    <Switch
                                        id="1day"
                                        checked={preferences.reminder_1_day}
                                        onCheckedChange={(checked) =>
                                            updatePreference('reminder_1_day', checked)
                                        }
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="6hours">6 hours before deadline</Label>
                                    <Switch
                                        id="6hours"
                                        checked={preferences.reminder_6_hours}
                                        onCheckedChange={(checked) =>
                                            updatePreference('reminder_6_hours', checked)
                                        }
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="outline" onClick={() => setIsOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleSave} disabled={isSaving}>
                                {isSaving ? 'Saving...' : 'Save Preferences'}
                            </Button>
                        </div>
                    </div>
                ) : null}
            </DialogContent>
        </Dialog>
    );
}

// =============================================
// Upcoming Deadlines Widget
// =============================================

interface UpcomingDeadlinesWidgetProps {
    className?: string;
}

export function UpcomingDeadlinesWidget({ className }: UpcomingDeadlinesWidgetProps) {
    const [deadlines, setDeadlines] = useState<
        {
            assessment: { id: string; title: string; due_date: string; total_marks: number };
            course: { id: string; title: string; code: string };
            submitted: boolean;
            daysUntilDue: number;
        }[]
    >([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchDeadlines();
    }, []);

    const fetchDeadlines = async () => {
        try {
            const data = await getUpcomingDeadlines(14);
            setDeadlines(data);
        } catch (error) {
            console.error('Failed to fetch deadlines:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getUrgencyBadge = (daysUntilDue: number, submitted: boolean) => {
        if (submitted) {
            return <Badge variant="secondary">Submitted</Badge>;
        }
        if (daysUntilDue <= 1) {
            return <Badge variant="destructive">Due Soon!</Badge>;
        }
        if (daysUntilDue <= 3) {
            return <Badge className="bg-orange-500">Due in {daysUntilDue} days</Badge>;
        }
        return <Badge variant="outline">{daysUntilDue} days left</Badge>;
    };

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Upcoming Deadlines
                </CardTitle>
                <CardDescription>
                    Assessments due in the next 14 days
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex items-center justify-center h-32">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                    </div>
                ) : deadlines.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                        <Check className="h-8 w-8 mb-2 text-green-500" />
                        <p>No upcoming deadlines!</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {deadlines.map((item) => (
                            <div
                                key={item.assessment.id}
                                className={`flex items-center justify-between p-3 rounded-lg border ${!item.submitted && item.daysUntilDue <= 1
                                        ? 'border-red-200 bg-red-50'
                                        : !item.submitted && item.daysUntilDue <= 3
                                            ? 'border-orange-200 bg-orange-50'
                                            : ''
                                    }`}
                            >
                                <div className="space-y-1">
                                    <p className="font-medium">{item.assessment.title}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {item.course.code} - {item.course.title}
                                    </p>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <Clock className="h-3 w-3" />
                                        {new Date(item.assessment.due_date).toLocaleString()}
                                    </div>
                                </div>
                                <div className="text-right">
                                    {getUrgencyBadge(item.daysUntilDue, item.submitted)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// =============================================
// Reminder History Component
// =============================================

interface ReminderHistoryProps {
    userId: string;
}

export function ReminderHistory({ userId }: ReminderHistoryProps) {
    const [history, setHistory] = useState<ReminderHistoryEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const data = await getReminderHistory(30);
            setHistory(data);
        } catch (error) {
            console.error('Failed to fetch reminder history:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getActionIcon = (action: string) => {
        switch (action) {
            case 'sent':
                return <Bell className="h-4 w-4 text-blue-500" />;
            case 'cancelled':
                return <X className="h-4 w-4 text-gray-500" />;
            case 'failed':
                return <AlertTriangle className="h-4 w-4 text-red-500" />;
            case 'opened':
                return <Check className="h-4 w-4 text-green-500" />;
            default:
                return <Clock className="h-4 w-4" />;
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Reminder History</CardTitle>
                <CardDescription>
                    Track all reminder activities for your assessments
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex items-center justify-center h-32">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                    </div>
                ) : history.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                        <Clock className="h-8 w-8 mb-2" />
                        <p>No reminder history</p>
                    </div>
                ) : (
                    <ScrollArea className="h-[300px]">
                        <div className="space-y-3">
                            {history.map((entry) => (
                                <div
                                    key={entry.id}
                                    className="flex items-start gap-3 p-3 rounded-lg border"
                                >
                                    {getActionIcon(entry.action)}
                                    <div className="flex-1">
                                        <p className="text-sm font-medium capitalize">{entry.action}</p>
                                        {entry.assessment && (
                                            <p className="text-sm text-muted-foreground">
                                                {entry.assessment.title}
                                                {entry.assessment.course && (
                                                    <> - {entry.assessment.course.title}</>
                                                )}
                                            </p>
                                        )}
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {new Date(entry.created_at).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                )}
            </CardContent>
        </Card>
    );
}
