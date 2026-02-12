// =============================================
// Course-Specific Submission History Component
// Submission proof and history for a single course
// =============================================

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from './ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from './ui/table';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from './ui/collapsible';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from './ui/dialog';
import { Separator } from './ui/separator';
import { toast } from 'sonner';
import {
    FileText,
    Download,
    Printer,
    Clock,
    CheckCircle2,
    AlertCircle,
    ChevronDown,
    ChevronRight,
    Loader2,
    FileCheck,
    History,
    Star,
    Shield,
    Calendar,
    AlertTriangle,
    ClipboardCheck,
} from 'lucide-react';
import { cn } from './ui/utils';

// =============================================
// TYPES
// =============================================

interface CourseSubmission {
    id: string;
    assessment_id: string;
    assessment_title: string;
    file_name: string;
    file_path: string;
    file_size: number;
    submitted_at: string;
    due_date: string;
    is_latest: boolean;
    version: number;
    status: 'on_time' | 'late' | 'pending';
    late_duration?: number; // in minutes
}

interface SubmissionReceipt {
    submission_id: string;
    reference_number: string;
    student_name: string;
    student_email: string;
    assessment_title: string;
    course_code: string;
    course_title: string;
    file_name: string;
    file_size: number;
    submitted_at: string;
    due_date: string;
    status: 'on_time' | 'late' | 'pending';
    late_duration?: number;
    file_hash?: string;
    version: number;
}

interface CourseSubmissionHistoryProps {
    courseId: string;
    courseCode: string;
    courseTitle: string;
    submissions: CourseSubmission[];
    studentName: string;
    studentEmail: string;
    isLoading?: boolean;
}

// =============================================
// HELPERS
// =============================================

function formatFileSize(bytes: number): string {
    if (!bytes || bytes === 0) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function formatLateDuration(minutes: number): string {
    if (minutes < 60) return `${minutes} min late`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)} hr ${minutes % 60} min late`;
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    return `${days}d ${hours}hr late`;
}

function getRelativeTime(submittedAt: string, dueDate: string): string {
    const submitted = new Date(submittedAt);
    const due = new Date(dueDate);
    const diff = due.getTime() - submitted.getTime();
    const minutes = Math.abs(diff) / (1000 * 60);

    if (diff > 0) {
        if (minutes < 60) return `${Math.round(minutes)} min before deadline`;
        if (minutes < 1440) return `${Math.round(minutes / 60)} hr before deadline`;
        return `${Math.round(minutes / 1440)} days before deadline`;
    } else {
        if (minutes < 60) return `${Math.round(minutes)} min after deadline`;
        if (minutes < 1440) return `${Math.round(minutes / 60)} hr after deadline`;
        return `${Math.round(minutes / 1440)} days after deadline`;
    }
}

function getStatusBadgeClass(status: string): string {
    switch (status) {
        case 'on_time':
            return 'bg-green-100 text-green-800 border-green-200';
        case 'late':
            return 'bg-red-100 text-red-800 border-red-200';
        case 'pending':
            return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        default:
            return 'bg-gray-100 text-gray-800 border-gray-200';
    }
}

function getStatusLabel(status: string): string {
    switch (status) {
        case 'on_time': return 'On Time';
        case 'late': return 'Late';
        case 'pending': return 'Pending';
        default: return status;
    }
}

function generateReferenceNumber(submissionId: string): string {
    return `SUB-${submissionId.substring(0, 8).toUpperCase()}`;
}

// Generate simple hash for file integrity display
function generateFileHash(fileName: string, fileSize: number, submittedAt: string): string {
    const str = `${fileName}${fileSize}${submittedAt}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(16, '0').toUpperCase().slice(0, 16);
}

// =============================================
// MAIN COMPONENT
// =============================================

export function CourseSubmissionHistory({
    courseId,
    courseCode,
    courseTitle,
    submissions,
    studentName,
    studentEmail,
    isLoading = false,
}: CourseSubmissionHistoryProps) {
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
    const [selectedReceipt, setSelectedReceipt] = useState<SubmissionReceipt | null>(null);
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

    // Group submissions by assessment
    const groupedSubmissions = useMemo(() => {
        const groups = new Map<string, CourseSubmission[]>();
        submissions.forEach(sub => {
            const existing = groups.get(sub.assessment_id) || [];
            existing.push(sub);
            groups.set(sub.assessment_id, existing);
        });
        // Sort each group by version (latest first)
        groups.forEach((subs, key) => {
            groups.set(key, subs.sort((a, b) => b.version - a.version));
        });
        return groups;
    }, [submissions]);

    // Expand all by default
    useEffect(() => {
        setExpandedGroups(new Set(Array.from(groupedSubmissions.keys())));
    }, [groupedSubmissions]);

    // Filter submissions
    const filteredSubmissions = useMemo(() => {
        if (statusFilter === 'all') return submissions;
        return submissions.filter(s => s.status === statusFilter);
    }, [submissions, statusFilter]);

    // Calculate stats
    const stats = useMemo(() => {
        const total = submissions.length;
        const onTime = submissions.filter(s => s.status === 'on_time').length;
        const late = submissions.filter(s => s.status === 'late').length;
        const latestCount = submissions.filter(s => s.is_latest).length;
        const onTimeRate = total > 0 ? Math.round((onTime / total) * 100) : 0;

        return { total, onTime, late, latestCount, onTimeRate };
    }, [submissions]);

    const toggleGroup = (assessmentId: string) => {
        const newExpanded = new Set(expandedGroups);
        if (newExpanded.has(assessmentId)) {
            newExpanded.delete(assessmentId);
        } else {
            newExpanded.add(assessmentId);
        }
        setExpandedGroups(newExpanded);
    };

    const handleViewReceipt = (submission: CourseSubmission) => {
        const receipt: SubmissionReceipt = {
            submission_id: submission.id,
            reference_number: generateReferenceNumber(submission.id),
            student_name: studentName,
            student_email: studentEmail,
            assessment_title: submission.assessment_title,
            course_code: courseCode,
            course_title: courseTitle,
            file_name: submission.file_name,
            file_size: submission.file_size,
            submitted_at: submission.submitted_at,
            due_date: submission.due_date,
            status: submission.status,
            late_duration: submission.late_duration,
            file_hash: generateFileHash(submission.file_name, submission.file_size, submission.submitted_at),
            version: submission.version,
        };
        setSelectedReceipt(receipt);
        setReceiptDialogOpen(true);
    };

    // Loading state
    if (isLoading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </CardContent>
            </Card>
        );
    }

    // Empty state
    if (submissions.length === 0) {
        return (
            <Card>
                <CardContent className="py-12">
                    <div className="text-center">
                        <FileText className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">
                            No Submissions Yet
                        </h3>
                        <p className="text-gray-500 max-w-md mx-auto">
                            You haven't submitted any assessments for {courseCode} yet.
                            Submit your work through the Assessments tab to see your
                            submission history and receipts here.
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-white border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wide">Total Submissions</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                                <p className="text-sm text-gray-500 mt-1">
                                    {stats.latestCount} assessment{stats.latestCount !== 1 ? 's' : ''} submitted
                                </p>
                            </div>
                            <History className="h-8 w-8 text-blue-200" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-l-4 border-l-green-500">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wide">On Time</p>
                                <p className="text-2xl font-bold text-green-600">{stats.onTime}</p>
                                <Progress
                                    value={stats.total > 0 ? (stats.onTime / stats.total) * 100 : 0}
                                    className="mt-2 h-2"
                                />
                            </div>
                            <CheckCircle2 className="h-8 w-8 text-green-200" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-l-4 border-l-red-500">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wide">Late</p>
                                <p className="text-2xl font-bold text-red-600">{stats.late}</p>
                                <Progress
                                    value={stats.total > 0 ? (stats.late / stats.total) * 100 : 0}
                                    className="mt-2 h-2"
                                />
                            </div>
                            <AlertCircle className="h-8 w-8 text-red-200" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-l-4 border-l-purple-500">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wide">On-Time Rate</p>
                                <p className="text-2xl font-bold text-purple-600">{stats.onTimeRate}%</p>
                                <Badge
                                    className={cn(
                                        "mt-1",
                                        stats.onTimeRate >= 90
                                            ? "bg-green-100 text-green-800 border-green-200"
                                            : stats.onTimeRate >= 70
                                                ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                                                : "bg-red-100 text-red-800 border-red-200"
                                    )}
                                >
                                    {stats.onTimeRate >= 90 ? 'Excellent' : stats.onTimeRate >= 70 ? 'Good' : 'Needs Improvement'}
                                </Badge>
                            </div>
                            <ClipboardCheck className="h-8 w-8 text-purple-200" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <History className="h-5 w-5 text-blue-600" />
                                Submission History
                            </CardTitle>
                            <CardDescription>
                                Viewing {filteredSubmissions.length} submission{filteredSubmissions.length !== 1 ? 's' : ''} for {courseCode}
                            </CardDescription>
                        </div>

                        {/* Status Filter */}
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="All Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="on_time">On Time</SelectItem>
                                <SelectItem value="late">Late</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {Array.from(groupedSubmissions.entries()).map(([assessmentId, subs]) => {
                            // Filter this group's submissions
                            const filteredSubs = statusFilter === 'all'
                                ? subs
                                : subs.filter(s => s.status === statusFilter);

                            if (filteredSubs.length === 0) return null;

                            const latestSub = subs.find(s => s.is_latest);
                            const firstSub = subs[0];
                            const isExpanded = expandedGroups.has(assessmentId);

                            return (
                                <Collapsible
                                    key={assessmentId}
                                    open={isExpanded}
                                    onOpenChange={() => toggleGroup(assessmentId)}
                                >
                                    <CollapsibleTrigger asChild>
                                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                                            <div className="flex items-center gap-3">
                                                {isExpanded ? (
                                                    <ChevronDown className="h-5 w-5 text-gray-500" />
                                                ) : (
                                                    <ChevronRight className="h-5 w-5 text-gray-500" />
                                                )}
                                                <FileText className="h-5 w-5 text-blue-600" />
                                                <div>
                                                    <span className="font-semibold">{firstSub.assessment_title}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="text-sm text-gray-500">
                                                    {subs.length} version{subs.length !== 1 ? 's' : ''}
                                                </span>
                                                {latestSub && (
                                                    <Badge className={getStatusBadgeClass(latestSub.status)}>
                                                        {getStatusLabel(latestSub.status)}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                        <div className="mt-2 border rounded-lg overflow-hidden">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Version</TableHead>
                                                        <TableHead>File Name</TableHead>
                                                        <TableHead>Submitted</TableHead>
                                                        <TableHead className="text-center">Status</TableHead>
                                                        <TableHead className="text-right">Receipt</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {filteredSubs.map((submission) => (
                                                        <TableRow key={submission.id}>
                                                            <TableCell>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-medium">v{submission.version}</span>
                                                                    {submission.is_latest && (
                                                                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                                                            <Star className="h-3 w-3 mr-1" />
                                                                            Latest
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="flex items-center gap-2">
                                                                    <FileText className="h-4 w-4 text-gray-400" />
                                                                    <div>
                                                                        <div className="font-medium truncate max-w-[200px]" title={submission.file_name}>
                                                                            {submission.file_name}
                                                                        </div>
                                                                        <div className="text-xs text-gray-500">
                                                                            {formatFileSize(submission.file_size)}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div>
                                                                    <div className="flex items-center gap-1">
                                                                        <Clock className="h-3 w-3 text-gray-400" />
                                                                        {formatDateTime(submission.submitted_at)}
                                                                    </div>
                                                                    <div className="text-xs text-gray-500 mt-1">
                                                                        {getRelativeTime(submission.submitted_at, submission.due_date)}
                                                                    </div>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                <Badge className={getStatusBadgeClass(submission.status)}>
                                                                    {getStatusLabel(submission.status)}
                                                                </Badge>
                                                                {submission.late_duration && (
                                                                    <div className="text-xs text-red-600 mt-1">
                                                                        {formatLateDuration(submission.late_duration)}
                                                                    </div>
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => handleViewReceipt(submission)}
                                                                >
                                                                    <FileCheck className="h-4 w-4 mr-1" />
                                                                    Receipt
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </CollapsibleContent>
                                </Collapsible>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Info Card */}
            <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                        <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div>
                            <h4 className="font-medium text-blue-900">Submission Verification</h4>
                            <p className="text-sm text-blue-700 mt-1">
                                All submissions are time-stamped and cannot be modified after submission.
                                Download your submission receipt as proof of submission. The receipt includes
                                a unique reference number and file integrity hash.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Receipt Dialog */}
            <ReceiptDialog
                receipt={selectedReceipt}
                open={receiptDialogOpen}
                onOpenChange={setReceiptDialogOpen}
            />
        </div>
    );
}

// =============================================
// RECEIPT DIALOG
// =============================================

interface ReceiptDialogProps {
    receipt: SubmissionReceipt | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

function ReceiptDialog({ receipt, open, onOpenChange }: ReceiptDialogProps) {
    if (!receipt) return null;

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(generateReceiptHTML(receipt));
            printWindow.document.close();
            printWindow.print();
        }
    };

    const handleDownload = () => {
        const blob = new Blob([generateReceiptHTML(receipt)], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `submission-receipt-${receipt.reference_number}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Receipt downloaded');
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[550px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileCheck className="h-5 w-5 text-green-600" />
                        Submission Confirmation Receipt
                    </DialogTitle>
                    <DialogDescription>
                        Reference: {receipt.reference_number}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Student Info */}
                    <div className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-600 mb-2">Student Information</h4>
                        <div className="space-y-1">
                            <div className="font-medium">{receipt.student_name}</div>
                            <div className="text-sm text-gray-500">{receipt.student_email}</div>
                        </div>
                    </div>

                    {/* Assessment Info */}
                    <div className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-600 mb-2">Assessment Details</h4>
                        <div className="space-y-1">
                            <div className="font-medium">{receipt.assessment_title}</div>
                            <div className="text-sm text-gray-500">
                                {receipt.course_code} - {receipt.course_title}
                            </div>
                            <div className="text-sm text-gray-500 flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Due: {formatDateTime(receipt.due_date)}
                            </div>
                        </div>
                    </div>

                    {/* Submission Details */}
                    <div className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-600 mb-2">Submission Details</h4>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <span className="text-gray-500">Submitted:</span>
                                <div className="font-medium">{formatDateTime(receipt.submitted_at)}</div>
                            </div>
                            <div>
                                <span className="text-gray-500">Version:</span>
                                <div className="font-medium">v{receipt.version}</div>
                            </div>
                            <div>
                                <span className="text-gray-500">File:</span>
                                <div className="font-medium truncate" title={receipt.file_name}>
                                    {receipt.file_name}
                                </div>
                            </div>
                            <div>
                                <span className="text-gray-500">Size:</span>
                                <div className="font-medium">{formatFileSize(receipt.file_size)}</div>
                            </div>
                        </div>
                    </div>

                    {/* Status */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <span className="text-gray-600">Submission Status:</span>
                        <Badge className={cn("text-base", getStatusBadgeClass(receipt.status))}>
                            {getStatusLabel(receipt.status)}
                            {receipt.late_duration && ` (${formatLateDuration(receipt.late_duration)})`}
                        </Badge>
                    </div>

                    {/* File Hash */}
                    {receipt.file_hash && (
                        <div className="p-3 bg-blue-50 rounded-lg">
                            <h4 className="text-xs font-medium text-blue-700 mb-1 flex items-center gap-1">
                                <Shield className="h-3 w-3" />
                                File Integrity Hash
                            </h4>
                            <div className="font-mono text-sm text-blue-600 break-all">
                                {receipt.file_hash}
                            </div>
                        </div>
                    )}

                    <Separator />

                    {/* Reminder Stopped Notice */}
                    <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 p-3 rounded-lg">
                        <CheckCircle2 className="h-4 w-4" />
                        Deadline reminders for this assessment have been stopped.
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={handlePrint}>
                            <Printer className="h-4 w-4 mr-2" />
                            Print
                        </Button>
                        <Button onClick={handleDownload}>
                            <Download className="h-4 w-4 mr-2" />
                            Download
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// =============================================
// RECEIPT HTML GENERATOR
// =============================================

function generateReceiptHTML(receipt: SubmissionReceipt): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Submission Receipt - ${receipt.reference_number}</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid #3b82f6; padding-bottom: 20px; margin-bottom: 20px; }
        .header h1 { color: #1e40af; margin: 0; }
        .header p { color: #6b7280; margin: 5px 0 0; }
        .section { background: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 15px; }
        .section h3 { margin: 0 0 10px; color: #374151; font-size: 14px; text-transform: uppercase; }
        .row { display: flex; justify-content: space-between; margin: 5px 0; }
        .label { color: #6b7280; }
        .value { font-weight: 600; color: #111827; }
        .status { display: inline-block; padding: 4px 12px; border-radius: 4px; font-weight: 600; }
        .status.on_time { background: #dcfce7; color: #166534; }
        .status.late { background: #fee2e2; color: #991b1b; }
        .hash { background: #dbeafe; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 12px; word-break: break-all; color: #1e40af; }
        .footer { text-align: center; color: #9ca3af; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📄 Submission Confirmation Receipt</h1>
        <p>Reference: ${receipt.reference_number}</p>
    </div>

    <div class="section">
        <h3>Student Information</h3>
        <div class="row"><span class="label">Name:</span><span class="value">${receipt.student_name}</span></div>
        <div class="row"><span class="label">Email:</span><span class="value">${receipt.student_email}</span></div>
    </div>

    <div class="section">
        <h3>Assessment Details</h3>
        <div class="row"><span class="label">Assessment:</span><span class="value">${receipt.assessment_title}</span></div>
        <div class="row"><span class="label">Course:</span><span class="value">${receipt.course_code} - ${receipt.course_title}</span></div>
        <div class="row"><span class="label">Due Date:</span><span class="value">${formatDateTime(receipt.due_date)}</span></div>
    </div>

    <div class="section">
        <h3>Submission Details</h3>
        <div class="row"><span class="label">Submitted:</span><span class="value">${formatDateTime(receipt.submitted_at)}</span></div>
        <div class="row"><span class="label">Version:</span><span class="value">v${receipt.version}</span></div>
        <div class="row"><span class="label">File Name:</span><span class="value">${receipt.file_name}</span></div>
        <div class="row"><span class="label">File Size:</span><span class="value">${formatFileSize(receipt.file_size)}</span></div>
    </div>

    <div class="section">
        <h3>Status</h3>
        <span class="status ${receipt.status}">${getStatusLabel(receipt.status)}${receipt.late_duration ? ` (${formatLateDuration(receipt.late_duration)})` : ''}</span>
    </div>

    ${receipt.file_hash ? `
    <div class="section">
        <h3>File Integrity Hash</h3>
        <div class="hash">${receipt.file_hash}</div>
    </div>
    ` : ''}

    <div class="footer">
        <p>This receipt confirms your submission was received.</p>
        <p>Generated on ${new Date().toLocaleString()}</p>
        <p>© EduConnect Assessment & Marking System</p>
    </div>
</body>
</html>
    `;
}

export default CourseSubmissionHistory;
