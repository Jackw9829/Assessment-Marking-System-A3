// =============================================
// Exam Administrator User Profile Component
// =============================================
// Secure, role-based profile management for exam
// administrators within EduConnect AMS.
// Emphasises security controls & audit compliance.
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
    User, Mail, Phone, Camera, Lock, Bell, Shield, ShieldCheck,
    Save, Clock, BookOpen, AlertCircle, CheckCircle, Building,
    KeyRound, AlertTriangle
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
    getAdminManagedSummary,
    type ExtendedProfile,
    type NotificationPreferences,
    type ProfileAuditEntry,
} from '@/lib/user-profile';

interface AdminProfileProps {
    userId: string;
}

export function AdminProfile({ userId }: AdminProfileProps) {
    // ── State ──────────────────────────────────────────────
    const [profile, setProfile] = useState<ExtendedProfile | null>(null);
    const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences | null>(null);
    const [auditLog, setAuditLog] = useState<ProfileAuditEntry[]>([]);
    const [managedCourses, setManagedCourses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Editable fields
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [bio, setBio] = useState('');
    const [roleDesignation, setRoleDesignation] = useState('');

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
                getProfileAuditLog(50),
                getAdminManagedSummary(),
            ]);

            if (prof) {
                setProfile(prof);
                setFullName(prof.full_name || '');
                setPhone(prof.phone || '');
                setBio(prof.bio || '');
                setRoleDesignation(prof.role_designation || '');
            }
            setNotifPrefs(prefs);
            setAuditLog(log);
            setManagedCourses(courses);
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
            const updated = await updateProfile({
                full_name: fullName,
                phone,
                bio,
                role_designation: roleDesignation,
            });
            setProfile(updated);
            toast.success('Profile updated successfully');
            const log = await getProfileAuditLog(50);
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
        if (newPassword.length < 10) { toast.error('Admin passwords must be at least 10 characters'); return; }
        if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }
        setChangingPassword(true);
        try {
            await changePassword(newPassword);
            toast.success('Password changed successfully');
            setPasswordDialogOpen(false);
            setNewPassword('');
            setConfirmPassword('');
            const log = await getProfileAuditLog(50);
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
            {/* ── Security Notice ────────────────────────────── */}
            <Card className="border-amber-200 bg-amber-50">
                <CardContent className="py-4">
                    <div className="flex items-start gap-3">
                        <ShieldCheck className="h-5 w-5 text-amber-600 mt-0.5" />
                        <div>
                            <p className="font-medium text-amber-800 text-sm">Administrator Account</p>
                            <p className="text-xs text-amber-700">
                                This is a privileged account. All profile activity is logged for audit and compliance.
                                System configuration and role permissions are managed at the system level and cannot be
                                modified through this profile page.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ── Personal Information ────────────────────────── */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Personal Information
                    </CardTitle>
                    <CardDescription>
                        Manage your personal details. Admin ID and role permissions are system-managed (read-only).
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
                            <p className="font-medium">{profile.full_name || 'Administrator'}</p>
                            <div className="flex gap-2 mt-1">
                                <Badge variant="destructive">Administrator</Badge>
                                {profile.two_factor_enabled && (
                                    <Badge variant="outline" className="text-green-600 border-green-300">
                                        <KeyRound className="h-3 w-3 mr-1" /> 2FA Enabled
                                    </Badge>
                                )}
                            </div>
                            {profile.avatar_url && (
                                <Button variant="ghost" size="sm" className="mt-1 text-xs text-red-500" onClick={handleRemoveAvatar}>
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
                                <Shield className="h-3.5 w-3.5" /> Admin ID
                            </Label>
                            <Input value={profile.staff_id || '—'} disabled className="bg-gray-50" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-gray-500 flex items-center gap-1">
                                <ShieldCheck className="h-3.5 w-3.5" /> Role
                            </Label>
                            <Input value="Exam Administrator" disabled className="bg-gray-50" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-gray-500 flex items-center gap-1">
                                <Mail className="h-3.5 w-3.5" /> Official Email
                            </Label>
                            <div className="flex gap-2">
                                <Input value={profile.email} disabled className="bg-gray-50 flex-1" />
                                <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" size="sm">Change</Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Change Official Email</DialogTitle>
                                            <DialogDescription>
                                                A verification link will be sent to the new email. The change requires confirmation for security purposes.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-4 py-2">
                                            <div className="space-y-2">
                                                <Label>Current Email</Label>
                                                <Input value={profile.email} disabled className="bg-gray-50" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>New Email</Label>
                                                <Input type="email" placeholder="admin@institution.edu" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
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
                        <div className="space-y-2">
                            <Label className="text-gray-500 flex items-center gap-1">
                                <Building className="h-3.5 w-3.5" /> Department / Faculty
                            </Label>
                            <Input value={profile.department || '—'} disabled className="bg-gray-50" />
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
                        <div className="space-y-2">
                            <Label>Role Designation</Label>
                            <Input value={roleDesignation} onChange={e => setRoleDesignation(e.target.value)} placeholder="e.g., Chief Examiner" />
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
                                    <DialogDescription>
                                        Administrator accounts require a minimum of 10 characters for enhanced security.
                                    </DialogDescription>
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
                                    {!profile.two_factor_enabled && (
                                        <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                                            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                                            <p className="text-xs text-amber-700">
                                                Two-factor authentication is recommended for administrator accounts.
                                                Contact your system administrator to enable 2FA.
                                            </p>
                                        </div>
                                    )}
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

            {/* ── Managed Departments / Courses (read-only) ─── */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5" />
                        Managed Courses Overview
                    </CardTitle>
                    <CardDescription>
                        System-level overview of courses under administration. Modifications are performed in System Configuration.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {managedCourses.length === 0 ? (
                        <p className="text-sm text-gray-500">No courses in the system.</p>
                    ) : (
                        <ScrollArea className="h-[200px]">
                            <div className="space-y-3">
                                {managedCourses.map((course: any) => (
                                    <div key={course.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                                        <div>
                                            <p className="font-medium">{course.title}</p>
                                            <p className="text-sm text-gray-500">
                                                {course.code} — Instructor: {course.instructor?.full_name || 'Unassigned'}
                                            </p>
                                        </div>
                                        <Badge variant="outline">Active</Badge>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
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
                                    <p className="text-xs text-gray-500">Receive verification and deadline reminders</p>
                                </div>
                                <Switch checked={notifPrefs.email_reminders} onCheckedChange={v => handleUpdateNotifPref('email_reminders', v)} />
                            </div>
                            <Separator />
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-sm">Grade Verification Alerts</p>
                                    <p className="text-xs text-gray-500">Notifications when grades require verification</p>
                                </div>
                                <Switch checked={notifPrefs.grade_notifications} onCheckedChange={v => handleUpdateNotifPref('grade_notifications', v)} />
                            </div>
                            <Separator />
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-sm">System Notifications</p>
                                    <p className="text-xs text-gray-500">Platform updates, security alerts, maintenance</p>
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

            {/* ── Security & Compliance Audit Log ─────────────── */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Security &amp; Compliance Audit Log
                    </CardTitle>
                    <CardDescription>
                        Complete audit trail of all profile activity for regulatory compliance.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {auditLog.length === 0 ? (
                        <p className="text-sm text-gray-500">No activity recorded yet.</p>
                    ) : (
                        <ScrollArea className="h-[280px]">
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
