// =============================================
// Submission History Component
// =============================================

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
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
    BookOpen,
} from 'lucide-react';
import { cn } from './ui/utils';
import { supabase } from '@/lib/supabase-client';
import {
    SubmissionRecord,
    SubmissionReceipt,
    getSubmissionHistory,
    getSubmissionReceipt,
    getUniqueCourses,
    filterByCourse,
    filterByStatus,
    groupSubmissionsByAssessment,
    formatSubmissionDate,
    formatFileSize,
    formatLateDuration,
    getRelativeTime,
    getStatusBadgeClass,
    getStatusLabel,
    downloadReceiptHTML,
    printReceipt,
    SubmissionStatusType,
} from '@/lib/submission-history';
import { formatAssessmentType } from '@/lib/student-filters';

// =============================================
// TYPES
// =============================================

interface SubmissionHistoryProps {
    studentId: string;
}

// =============================================
// MAIN COMPONENT
// =============================================

export function SubmissionHistory({ studentId }: SubmissionHistoryProps) {
    const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [courseFilter, setCourseFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<SubmissionStatusType | 'all'>('all');
    const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
    const [selectedReceipt, setSelectedReceipt] = useState<SubmissionReceipt | null>(null);
    const [loadingReceiptId, setLoadingReceiptId] = useState<string | null>(null);

    // Fetch submission history
    const fetchHistory = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await getSubmissionHistory(studentId);
            setSubmissions(data);
        } catch (error) {
            console.error('Error fetching submission history:', error);
            toast.error('Failed to load submission history');
        } finally {
            setIsLoading(false);
        }
    }, [studentId]);

    // Initial fetch
    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    // Real-time subscription for new submissions
    useEffect(() => {
        const channel = supabase
            .channel('submission-updates')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'submissions',
                filter: `student_id=eq.${studentId}`,
            }, () => {
                fetchHistory();
                toast.success('New submission recorded');
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [studentId, fetchHistory]);

    // Handle viewing receipt
    const handleViewReceipt = async (submissionId: string) => {
        setLoadingReceiptId(submissionId);
        try {
            const receipt = await getSubmissionReceipt(submissionId, studentId);
            if (receipt) {
                setSelectedReceipt(receipt);
                setReceiptDialogOpen(true);
            } else {
                toast.error('Receipt not found');
            }
        } catch (error) {
            console.error('Error fetching receipt:', error);
            toast.error('Failed to load receipt');
        } finally {
            setLoadingReceiptId(null);
        }
    };

    // Get unique courses for filter
    const courses = getUniqueCourses(submissions);

    // Apply filters
    let filteredSubmissions = filterByCourse(submissions, courseFilter);
    filteredSubmissions = filterByStatus(filteredSubmissions, statusFilter);

    // Group by assessment
    const groupedSubmissions = groupSubmissionsByAssessment(filteredSubmissions);

    // Calculate summary stats
    const totalSubmissions = submissions.length;
    const onTimeCount = submissions.filter(s => s.submission_status === 'on_time').length;
    const lateCount = submissions.filter(s => s.submission_status === 'late').length;
    const latestSubmissions = submissions.filter(s => s.is_latest);

    // Render loading state
    if (isLoading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </CardContent>
            </Card>
        );
    }

    // Render empty state
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
                            You haven't submitted any assessments yet. Once you submit work,
                            you'll see your submission history and receipts here.
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">
                            Total Submissions
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{totalSubmissions}</div>
                        <p className="text-sm text-gray-500 mt-1">
                            {latestSubmissions.length} assessment{latestSubmissions.length !== 1 ? 's' : ''} submitted
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-1">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            On Time
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-green-600">{onTimeCount}</div>
                        <Progress
                            value={totalSubmissions > 0 ? (onTimeCount / totalSubmissions) * 100 : 0}
                            className="mt-2"
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-1">
                            <AlertCircle className="h-4 w-4 text-red-500" />
                            Late
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-red-600">{lateCount}</div>
                        <Progress
                            value={totalSubmissions > 0 ? (lateCount / totalSubmissions) * 100 : 0}
                            className="mt-2"
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">
                            On-Time Rate
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">
                            {totalSubmissions > 0
                                ? Math.round((onTimeCount / totalSubmissions) * 100)
                                : 0}%
                        </div>
                        <Badge
                            className={cn(
                                "mt-2",
                                onTimeCount / totalSubmissions >= 0.9
                                    ? "bg-green-100 text-green-800"
                                    : onTimeCount / totalSubmissions >= 0.7
                                        ? "bg-yellow-100 text-yellow-800"
                                        : "bg-red-100 text-red-800"
                            )}
                        >
                            {onTimeCount / totalSubmissions >= 0.9
                                ? "Excellent"
                                : onTimeCount / totalSubmissions >= 0.7
                                    ? "Good"
                                    : "Needs Improvement"}
                        </Badge>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Card */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <History className="h-5 w-5 text-blue-600" />
                            <CardTitle>Submission History</CardTitle>
                        </div>
                        <div className="flex items-center gap-3">
                            {/* Course Filter */}
                            <Select value={courseFilter} onValueChange={setCourseFilter}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="All Courses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Courses</SelectItem>
                                    {courses.map((course) => (
                                        <SelectItem key={course.id} value={course.id}>
                                            {course.code}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Status Filter */}
                            <Select
                                value={statusFilter}
                                onValueChange={(v) => setStatusFilter(v as SubmissionStatusType | 'all')}
                            >
                                <SelectTrigger className="w-[140px]">
                                    <SelectValue placeholder="All Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="on_time">On Time</SelectItem>
                                    <SelectItem value="late">Late</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <CardDescription>
                        Showing {filteredSubmissions.length} submission{filteredSubmissions.length !== 1 ? 's' : ''} across {groupedSubmissions.size} assessment{groupedSubmissions.size !== 1 ? 's' : ''}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <SubmissionGroupList
                        groupedSubmissions={groupedSubmissions}
                        onViewReceipt={handleViewReceipt}
                        loadingReceiptId={loadingReceiptId}
                    />
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
// SUBMISSION GROUP LIST
// =============================================

interface SubmissionGroupListProps {
    groupedSubmissions: Map<string, SubmissionRecord[]>;
    onViewReceipt: (submissionId: string) => void;
    loadingReceiptId: string | null;
}

function SubmissionGroupList({
    groupedSubmissions,
    onViewReceipt,
    loadingReceiptId,
}: SubmissionGroupListProps) {
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

    // Expand all by default
    useEffect(() => {
        setExpandedGroups(new Set(Array.from(groupedSubmissions.keys())));
    }, [groupedSubmissions]);

    const toggleGroup = (assessmentId: string) => {
        const newExpanded = new Set(expandedGroups);
        if (newExpanded.has(assessmentId)) {
            newExpanded.delete(assessmentId);
        } else {
            newExpanded.add(assessmentId);
        }
        setExpandedGroups(newExpanded);
    };

    if (groupedSubmissions.size === 0) {
        return (
            <div className="text-center py-8 text-gray-500">
                No submissions match the current filters.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {Array.from(groupedSubmissions.entries()).map(([assessmentId, submissions]) => {
                const latestSubmission = submissions.find(s => s.is_latest);
                const firstSubmission = submissions[submissions.length - 1]; // Oldest
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
                                    <BookOpen className="h-5 w-5 text-blue-600" />
                                    <div>
                                        <span className="font-semibold">{firstSubmission.assessment_title}</span>
                                        <span className="text-gray-500 ml-2">
                                            ({firstSubmission.course_code})
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-sm text-gray-500">
                                        {submissions.length} attempt{submissions.length !== 1 ? 's' : ''}
                                    </span>
                                    {latestSubmission && (
                                        <Badge className={getStatusBadgeClass(latestSubmission.submission_status)}>
                                            {getStatusLabel(latestSubmission.submission_status)}
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
                                            <TableHead>Attempt</TableHead>
                                            <TableHead>File</TableHead>
                                            <TableHead>Submitted</TableHead>
                                            <TableHead className="text-center">Status</TableHead>
                                            <TableHead className="text-right">Receipt</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {submissions.map((submission) => (
                                            <TableRow key={submission.submission_id}>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium">
                                                            #{submission.attempt_number}
                                                        </span>
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
                                                            <div className="font-medium truncate max-w-[200px]" title={submission.original_filename}>
                                                                {submission.original_filename || submission.file_path.split('/').pop()}
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
                                                            {formatSubmissionDate(submission.submitted_at)}
                                                        </div>
                                                        <div className="text-xs text-gray-500 mt-1">
                                                            {getRelativeTime(submission.submitted_at, submission.due_date)}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge className={getStatusBadgeClass(submission.submission_status)}>
                                                        {getStatusLabel(submission.submission_status)}
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
                                                        onClick={() => onViewReceipt(submission.submission_id)}
                                                        disabled={loadingReceiptId === submission.submission_id}
                                                    >
                                                        {loadingReceiptId === submission.submission_id ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <FileCheck className="h-4 w-4" />
                                                        )}
                                                        <span className="ml-1">Receipt</span>
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

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[550px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileCheck className="h-5 w-5 text-green-600" />
                        Submission Receipt
                    </DialogTitle>
                    <DialogDescription>
                        Reference: {receipt.submission_reference}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Student Info */}
                    <div className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-600 mb-2">Student</h4>
                        <div className="space-y-1">
                            <div className="font-medium">{receipt.student_name}</div>
                            <div className="text-sm text-gray-500">{receipt.student_email}</div>
                        </div>
                    </div>

                    {/* Assessment Info */}
                    <div className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-600 mb-2">Assessment</h4>
                        <div className="space-y-1">
                            <div className="font-medium">{receipt.assessment_title}</div>
                            <div className="text-sm text-gray-500">
                                {receipt.course_code} - {receipt.course_title}
                            </div>
                            <div className="text-sm text-gray-500">
                                Due: {formatSubmissionDate(receipt.due_date)}
                            </div>
                        </div>
                    </div>

                    {/* Submission Details */}
                    <div className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-600 mb-2">Submission Details</h4>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <span className="text-gray-500">Submitted:</span>
                                <div className="font-medium">{formatSubmissionDate(receipt.submitted_at)}</div>
                            </div>
                            <div>
                                <span className="text-gray-500">Attempt:</span>
                                <div className="font-medium">#{receipt.attempt_number}</div>
                            </div>
                            <div>
                                <span className="text-gray-500">File:</span>
                                <div className="font-medium truncate" title={receipt.original_filename}>
                                    {receipt.original_filename}
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
                        <span className="text-gray-600">Status:</span>
                        <Badge className={cn("text-base", getStatusBadgeClass(receipt.submission_status))}>
                            {getStatusLabel(receipt.submission_status)}
                            {receipt.late_duration && ` (${formatLateDuration(receipt.late_duration)})`}
                        </Badge>
                    </div>

                    {/* File Hash */}
                    {receipt.file_hash && (
                        <div className="p-3 bg-blue-50 rounded-lg">
                            <h4 className="text-xs font-medium text-blue-700 mb-1">
                                File Integrity Hash (SHA-256)
                            </h4>
                            <div className="font-mono text-xs text-blue-600 break-all">
                                {receipt.file_hash}
                            </div>
                        </div>
                    )}

                    <Separator />

                    {/* Actions */}
                    <div className="flex justify-end gap-2">
                        <Button
                            variant="outline"
                            onClick={() => printReceipt(receipt)}
                        >
                            <Printer className="h-4 w-4 mr-2" />
                            Print
                        </Button>
                        <Button
                            onClick={() => downloadReceiptHTML(receipt)}
                        >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default SubmissionHistory;
