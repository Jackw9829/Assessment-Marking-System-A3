// =============================================
// Instructor User Profile Component
// =============================================
// Role-based profile management for instructors within
// the EduConnect Assessment Marking System (AMS).
// =============================================

import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import { toast } from 'sonner';
import {
    User, Mail, Phone, Camera, Lock, Bell, Shield,
    Save, Clock, BookOpen, AlertCircle, CheckCircle, Building
} from 'lucide-react';
import {
    getExtendedProfile,
    updateProfile,
    uploadAvatar,
    removeAvatar,
    changePassword,
    requestEmailChange,
    getNotificationPreferences,
    updateNotificationPreferences,
    getProfileAuditLog,
    getAssignedCoursesForProfile,
    type ExtendedProfile,
    type NotificationPreferences,
    type ProfileAuditEntry,
} from '@/lib/user-profile';

interface InstructorProfileProps {
    userId: string;
}

export function InstructorProfile({ userId }: InstructorProfileProps) {
    // ── State ──────────────────────────────────────────────
    const [profile, setProfile] = useState<ExtendedProfile | null>(null);
    const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences | null>(null);
    const [auditLog, setAuditLog] = useState<ProfileAuditEntry[]>([]);
    const [assignedCourses, setAssignedCourses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Editable fields (instructor may only edit personal details)
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [bio, setBio] = useState('');

    // Password change
    const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [changingPassword, setChangingPassword] = useState(false);

    // Email change
    const [emailDialogOpen, setEmailDialogOpen] = useState(false);
    const [newEmail, setNewEmail] = useState('');
    const [changingEmail, setChangingEmail] = useState(false);

    // Avatar
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    // ── Data Fetch ─────────────────────────────────────────
    useEffect(() => {
        fetchAll();
    }, []);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [prof, prefs, log, courses] = await Promise.all([
                getExtendedProfile(),
                getNotificationPreferences(),
                getProfileAuditLog(30),
                getAssignedCoursesForProfile(userId),
            ]);

            if (prof) {
                setProfile(prof);
                setFullName(prof.full_name || '');
                setPhone(prof.phone || '');
                setBio(prof.bio || '');
            }
            setNotifPrefs(prefs);
            setAuditLog(log);
            setAssignedCourses(courses);
        } catch (err) {
            console.error('Error loading profile:', err);
            toast.error('Failed to load profile data');
        } finally {
            setLoading(false);
        }
    };

    // ── Handlers ───────────────────────────────────────────
    const handleSaveProfile = async () => {
        setSaving(true);
        try {
            const updated = await updateProfile({ full_name: fullName, phone, bio });
            setProfile(updated);
            toast.success('Profile updated successfully');
            const log = await getProfileAuditLog(30);
            setAuditLog(log);
        } catch (err: any) {
            toast.error(err.message || 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
        if (file.size > 2 * 1024 * 1024) { toast.error('Image must be under 2 MB'); return; }

        setUploadingAvatar(true);
        try {
            const url = await uploadAvatar(file);
            setProfile(prev => prev ? { ...prev, avatar_url: url } : prev);
            toast.success('Profile photo updated');
        } catch (err: any) {
            toast.error(err.message || 'Failed to upload photo');
        } finally {
            setUploadingAvatar(false);
        }
    };

    const handleRemoveAvatar = async () => {
        try {
            await removeAvatar();
            setProfile(prev => prev ? { ...prev, avatar_url: null } : prev);
            toast.success('Profile photo removed');
        } catch (err: any) {
            toast.error(err.message || 'Failed to remove photo');
        }
    };

    const handleChangePassword = async () => {
        if (newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return; }
        if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }
        setChangingPassword(true);
        try {
            await changePassword(newPassword);
            toast.success('Password changed successfully');
            setPasswordDialogOpen(false);
            setNewPassword('');
            setConfirmPassword('');
            const log = await getProfileAuditLog(30);
            setAuditLog(log);
        } catch (err: any) {
            toast.error(err.message || 'Failed to change password');
        } finally {
            setChangingPassword(false);
        }
    };

    const handleRequestEmailChange = async () => {
        if (!newEmail || !/\S+@\S+\.\S+/.test(newEmail)) { toast.error('Please enter a valid email address'); return; }
        setChangingEmail(true);
        try {
            await requestEmailChange(newEmail);
            toast.success('Verification email sent to ' + newEmail);
            setEmailDialogOpen(false);
            setNewEmail('');
        } catch (err: any) {
            toast.error(err.message || 'Failed to request email change');
        } finally {
            setChangingEmail(false);
        }
    };

    const handleUpdateNotifPref = async (key: string, value: boolean | string) => {
        try {
            const updated = await updateNotificationPreferences({ [key]: value });
            setNotifPrefs(updated);
            toast.success('Notification preferences updated');
        } catch (err: any) {
            toast.error(err.message || 'Failed to update preferences');
        }
    };

    // ── Render ─────────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
        );
    }

    if (!profile) {
        return (
            <Card>
                <CardContent className="py-8 text-center text-gray-500">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                    Unable to load profile
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* ── Personal Information ────────────────────────── */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Personal Information
                    </CardTitle>
                    <CardDescription>
                        Manage your personal details. Staff ID, department and course assignments are read-only.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Avatar */}
                    <div className="flex items-center gap-6">
                        <div className="relative">
                            <div className="h-20 w-20 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border-2 border-gray-300">
                                {profile.avatar_url ? (
                                    <img src={profile.avatar_url} alt="Profile" className="h-full w-full object-cover" />
                                ) : (
                                    <User className="h-10 w-10 text-gray-400" />
                                )}
                            </div>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors"
                                disabled={uploadingAvatar}
                            >
                                <Camera className="h-3.5 w-3.5" />
                            </button>
                            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                        </div>
                        <div>
                            <p className="font-medium">{profile.full_name || 'Instructor'}</p>
                            <Badge variant="secondary">{profile.role}</Badge>
                            {profile.avatar_url && (
                                <Button variant="ghost" size="sm" className="ml-2 text-xs text-red-500" onClick={handleRemoveAvatar}>
                                    Remove photo
                                </Button>
                            )}
                        </div>
                    </div>

                    <Separator />

                    {/* Read-only fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-gray-500 flex items-center gap-1">
                                <Shield className="h-3.5 w-3.5" /> Staff ID
                            </Label>
                            <Input value={profile.staff_id || '—'} disabled className="bg-gray-50" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-gray-500 flex items-center gap-1">
                                <Building className="h-3.5 w-3.5" /> Department
                            </Label>
                            <Input value={profile.department || '—'} disabled className="bg-gray-50" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-gray-500 flex items-center gap-1">
                                <Mail className="h-3.5 w-3.5" /> Email Address
                            </Label>
                            <div className="flex gap-2">
                                <Input value={profile.email} disabled className="bg-gray-50 flex-1" />
                                <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" size="sm">Change</Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Change Email Address</DialogTitle>
                                            <DialogDescription>
                                                A verification link will be sent to the new email. The change takes effect only after confirmation.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-4 py-2">
                                            <div className="space-y-2">
                                                <Label>Current Email</Label>
                                                <Input value={profile.email} disabled className="bg-gray-50" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>New Email</Label>
                                                <Input type="email" placeholder="new.email@institution.edu" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>Cancel</Button>
                                            <Button onClick={handleRequestEmailChange} disabled={changingEmail}>
                                                {changingEmail ? 'Sending…' : 'Send Verification'}
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </div>
                    </div>

                    {/* Editable fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Full Name</Label>
                            <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Enter your full name" />
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> Phone</Label>
                            <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+60 12 345 6789" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Bio</Label>
                        <Textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Brief professional summary…" rows={3} />
                    </div>

                    <div className="flex gap-3">
                        <Button onClick={handleSaveProfile} disabled={saving}>
                            <Save className="h-4 w-4 mr-2" />
                            {saving ? 'Saving…' : 'Save Changes'}
                        </Button>

                        <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline">
                                    <Lock className="h-4 w-4 mr-2" />
                                    Change Password
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Change Password</DialogTitle>
                                    <DialogDescription>Choose a strong password with at least 8 characters.</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-2">
                                    <div className="space-y-2">
                                        <Label>New Password</Label>
                                        <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Confirm Password</Label>
                                        <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>Cancel</Button>
                                    <Button onClick={handleChangePassword} disabled={changingPassword}>
                                        {changingPassword ? 'Updating…' : 'Update Password'}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardContent>
            </Card>

            {/* ── Assigned Courses (read-only) ───────────────── */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5" />
                        Assigned Courses
                    </CardTitle>
                    <CardDescription>
                        Course assignments are managed by the administrator. This is a read-only view.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {assignedCourses.length === 0 ? (
                        <p className="text-sm text-gray-500">No assigned courses found.</p>
                    ) : (
                        <div className="space-y-3">
                            {assignedCourses.map((course: any) => (
                                <div key={course.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                                    <div>
                                        <p className="font-medium">{course.title}</p>
                                        <p className="text-sm text-gray-500">{course.code}</p>
                                    </div>
                                    <Badge variant="outline">Assigned</Badge>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ── Notification Preferences ───────────────────── */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Bell className="h-5 w-5" />
                        Notification Settings
                    </CardTitle>
                    <CardDescription>Control how and when you receive notifications.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {notifPrefs && (
                        <>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-sm">Email Reminders</p>
                                    <p className="text-xs text-gray-500">Receive submission and deadline reminders via email</p>
                                </div>
                                <Switch checked={notifPrefs.email_reminders} onCheckedChange={v => handleUpdateNotifPref('email_reminders', v)} />
                            </div>
                            <Separator />
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-sm">Grade Notifications</p>
                                    <p className="text-xs text-gray-500">Notifications when grading tasks require attention</p>
                                </div>
                                <Switch checked={notifPrefs.grade_notifications} onCheckedChange={v => handleUpdateNotifPref('grade_notifications', v)} />
                            </div>
                            <Separator />
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-sm">Announcements</p>
                                    <p className="text-xs text-gray-500">System and institutional announcements</p>
                                </div>
                                <Switch checked={notifPrefs.announcement_notifications} onCheckedChange={v => handleUpdateNotifPref('announcement_notifications', v)} />
                            </div>
                            <Separator />
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-sm">System Notifications</p>
                                    <p className="text-xs text-gray-500">Platform updates and maintenance notices</p>
                                </div>
                                <Switch checked={notifPrefs.system_notifications} onCheckedChange={v => handleUpdateNotifPref('system_notifications', v)} />
                            </div>
                            <Separator />
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-sm">Digest Frequency</p>
                                    <p className="text-xs text-gray-500">How often to batch non-urgent notifications</p>
                                </div>
                                <Select value={notifPrefs.digest_frequency} onValueChange={v => handleUpdateNotifPref('digest_frequency', v)}>
                                    <SelectTrigger className="w-[140px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="immediate">Immediate</SelectItem>
                                        <SelectItem value="daily">Daily</SelectItem>
                                        <SelectItem value="weekly">Weekly</SelectItem>
                                        <SelectItem value="none">None</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* ── Activity Audit Log ─────────────────────────── */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Profile Activity Log
                    </CardTitle>
                    <CardDescription>
                        All profile changes are recorded securely for audit purposes.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {auditLog.length === 0 ? (
                        <p className="text-sm text-gray-500">No activity recorded yet.</p>
                    ) : (
                        <ScrollArea className="h-[220px]">
                            <div className="space-y-2">
                                {auditLog.map(entry => (
                                    <div key={entry.id} className="flex items-start gap-3 p-2 rounded bg-gray-50 text-sm">
                                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium capitalize">{entry.action.replace(/_/g, ' ')}</p>
                                            {entry.field_changed && (
                                                <p className="text-xs text-gray-500">Field: {entry.field_changed}</p>
                                            )}
                                        </div>
                                        <span className="text-xs text-gray-400 whitespace-nowrap">
                                            {new Date(entry.performed_at).toLocaleString()}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
