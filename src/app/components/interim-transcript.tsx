// =============================================
// Interim Transcript Component
// =============================================

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Progress } from './ui/progress';
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
import { toast } from 'sonner';
import {
    FileText,
    Download,
    Printer,
    GraduationCap,
    BookOpen,
    ChevronDown,
    ChevronRight,
    Loader2,
    AlertTriangle,
    User,
    Mail,
    Calendar,
    Award,
} from 'lucide-react';
import { cn } from './ui/utils';
import { supabase } from '@/lib/supabase-client';
import {
    TranscriptData,
    CourseTranscriptGroup,
    getCompleteTranscriptData,
    logTranscriptAction,
    downloadTranscriptHTML,
    printTranscript,
    formatTranscriptDateTime,
    formatShortDate,
    getGradeBadgeClass,
    getGradeLabelName,
} from '@/lib/transcript';
import { formatAssessmentType, AssessmentType } from '@/lib/student-filters';

// =============================================
// TYPES
// =============================================

interface InterimTranscriptProps {
    studentId: string;
}

// =============================================
// MAIN COMPONENT
// =============================================

export function InterimTranscript({ studentId }: InterimTranscriptProps) {
    const [transcriptData, setTranscriptData] = useState<TranscriptData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isDownloading, setIsDownloading] = useState(false);

    // Fetch transcript data
    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await getCompleteTranscriptData(studentId);
            setTranscriptData(data);

            // Log that transcript was viewed
            if (data) {
                await logTranscriptAction(studentId, 'viewed', {
                    total_grades: data.summary.total_assessments,
                });
            }
        } catch (error) {
            console.error('Error fetching transcript data:', error);
            toast.error('Failed to load transcript data');
        } finally {
            setIsLoading(false);
        }
    }, [studentId]);

    // Initial fetch
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Real-time subscription for grade updates (verification)
    useEffect(() => {
        const channel = supabase
            .channel('transcript-grade-updates')
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'grades',
            }, () => {
                // Refresh when any grade is updated (verified/released)
                fetchData();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchData]);

    // Handle download
    const handleDownload = async () => {
        if (!transcriptData) return;

        setIsDownloading(true);
        try {
            downloadTranscriptHTML(transcriptData);
            await logTranscriptAction(studentId, 'downloaded', {
                format: 'html',
                total_grades: transcriptData.summary.total_assessments,
            });
            toast.success('Transcript downloaded. Open and print to PDF for best results.');
        } catch (error) {
            console.error('Error downloading transcript:', error);
            toast.error('Failed to download transcript');
        } finally {
            setIsDownloading(false);
        }
    };

    // Handle print
    const handlePrint = async () => {
        if (!transcriptData) return;

        try {
            printTranscript(transcriptData);
            await logTranscriptAction(studentId, 'generated', {
                format: 'print',
                total_grades: transcriptData.summary.total_assessments,
            });
        } catch (error) {
            console.error('Error printing transcript:', error);
            toast.error('Failed to open print dialog');
        }
    };

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
    if (!transcriptData || transcriptData.summary.total_assessments === 0) {
        return (
            <Card>
                <CardContent className="py-12">
                    <div className="text-center">
                        <GraduationCap className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">
                            No Released Grades Available
                        </h3>
                        <p className="text-gray-500 max-w-md mx-auto">
                            Your interim transcript cannot be generated because there are no
                            officially released grades in the system yet.
                        </p>
                        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg max-w-md mx-auto">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                                <div className="text-left text-sm text-amber-800">
                                    <p className="font-medium">What does this mean?</p>
                                    <p className="mt-1">
                                        Grades will appear here once your instructors officially
                                        release them. Check back after your assessments have been
                                        graded and results published.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const { profile, courses, summary } = transcriptData;

    return (
        <div className="space-y-4">
            {/* Interim Notice Banner */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div>
                        <h4 className="font-semibold text-amber-800">Interim Transcript</h4>
                        <p className="text-sm text-amber-700 mt-1">
                            This is an interim transcript showing only released grades. It is not
                            an official document from the university registrar. For certified
                            transcripts, contact Student Administration.
                        </p>
                    </div>
                </div>
            </div>

            {/* Student Profile Card */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <User className="h-5 w-5 text-blue-600" />
                            <CardTitle>Student Information</CardTitle>
                        </div>
                        <Badge variant="outline" className="text-xs">
                            INTERIM TRANSCRIPT
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-3">
                            <User className="h-4 w-4 text-gray-400" />
                            <div>
                                <p className="text-sm text-gray-500">Full Name</p>
                                <p className="font-medium">{profile.full_name || 'N/A'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Mail className="h-4 w-4 text-gray-400" />
                            <div>
                                <p className="text-sm text-gray-500">Email</p>
                                <p className="font-medium">{profile.email}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <FileText className="h-4 w-4 text-gray-400" />
                            <div>
                                <p className="text-sm text-gray-500">Student ID</p>
                                <p className="font-medium font-mono text-sm">{profile.student_id}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <div>
                                <p className="text-sm text-gray-500">Generated</p>
                                <p className="font-medium">{formatTranscriptDateTime(profile.generated_at)}</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Summary Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">
                            Overall Average
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{summary.overall_average}%</div>
                        <Progress value={summary.overall_average} className="mt-2" />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">
                            Total Assessments
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{summary.total_assessments}</div>
                        <p className="text-sm text-gray-500 mt-1">
                            Across {summary.total_courses} course{summary.total_courses !== 1 ? 's' : ''}
                        </p>
                    </CardContent>
                </Card>

                <Card className="md:col-span-2">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">
                            Grade Distribution
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-around">
                            <GradeCountBadge label="HD" count={summary.hd_count} colour="green" />
                            <GradeCountBadge label="D" count={summary.d_count} colour="blue" />
                            <GradeCountBadge label="CR" count={summary.cr_count} colour="purple" />
                            <GradeCountBadge label="P" count={summary.p_count} colour="yellow" />
                            <GradeCountBadge label="F" count={summary.f_count} colour="red" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Academic Record */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Award className="h-5 w-5 text-yellow-600" />
                            <CardTitle>Academic Record</CardTitle>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={handlePrint}>
                                <Printer className="h-4 w-4 mr-2" />
                                Print
                            </Button>
                            <Button size="sm" onClick={handleDownload} disabled={isDownloading}>
                                {isDownloading ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <Download className="h-4 w-4 mr-2" />
                                )}
                                Download
                            </Button>
                        </div>
                    </div>
                    <CardDescription>
                        {summary.total_assessments} released grade{summary.total_assessments !== 1 ? 's' : ''} from {summary.total_courses} course{summary.total_courses !== 1 ? 's' : ''}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <CourseGradesList courses={courses} />
                </CardContent>
            </Card>

            {/* Disclaimer Footer */}
            <Card className="bg-gray-50 border-gray-200">
                <CardContent className="py-4">
                    <p className="text-xs text-gray-600 text-center">
                        <strong>Disclaimer:</strong> This interim transcript reflects only grades
                        that have been officially released as of the generation date. It is not an
                        official transcript from the university registrar and should not be used
                        for purposes requiring certified academic records.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}

// =============================================
// GRADE COUNT BADGE
// =============================================

interface GradeCountBadgeProps {
    label: string;
    count: number;
    colour: 'green' | 'blue' | 'purple' | 'yellow' | 'red';
}

function GradeCountBadge({ label, count, colour }: GradeCountBadgeProps) {
    const colourClasses = {
        green: 'bg-green-100 text-green-800 border-green-200',
        blue: 'bg-blue-100 text-blue-800 border-blue-200',
        purple: 'bg-purple-100 text-purple-800 border-purple-200',
        yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        red: 'bg-red-100 text-red-800 border-red-200',
    };

    return (
        <div className="text-center">
            <div className="text-2xl font-bold">{count}</div>
            <Badge className={cn('mt-1', colourClasses[colour])}>{label}</Badge>
        </div>
    );
}

// =============================================
// COURSE GRADES LIST
// =============================================

interface CourseGradesListProps {
    courses: CourseTranscriptGroup[];
}

function CourseGradesList({ courses }: CourseGradesListProps) {
    const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());

    // Expand all by default
    useEffect(() => {
        setExpandedCourses(new Set(courses.map((c) => c.course_id)));
    }, [courses]);

    const toggleCourse = (courseId: string) => {
        const newExpanded = new Set(expandedCourses);
        if (newExpanded.has(courseId)) {
            newExpanded.delete(courseId);
        } else {
            newExpanded.add(courseId);
        }
        setExpandedCourses(newExpanded);
    };

    return (
        <div className="space-y-4">
            {courses.map((course) => {
                const isExpanded = expandedCourses.has(course.course_id);

                return (
                    <Collapsible
                        key={course.course_id}
                        open={isExpanded}
                        onOpenChange={() => toggleCourse(course.course_id)}
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
                                        <span className="font-semibold">{course.course_code}</span>
                                        <span className="text-gray-500 ml-2">
                                            - {course.course_title}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-sm text-gray-500">
                                        {course.grades.length} grade{course.grades.length !== 1 ? 's' : ''}
                                    </span>
                                    <span className="font-medium">
                                        Avg: {course.course_average}%
                                    </span>
                                </div>
                            </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                            <div className="mt-2 border rounded-lg overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Assessment</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead className="text-center">Score</TableHead>
                                            <TableHead className="text-center">%</TableHead>
                                            <TableHead className="text-center">Grade</TableHead>
                                            <TableHead>Released</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {course.grades.map((grade) => (
                                            <TableRow key={grade.assessment_id}>
                                                <TableCell className="font-medium">
                                                    {grade.assessment_title}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="text-xs">
                                                        {formatAssessmentType(grade.assessment_type as AssessmentType)}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {grade.score}/{grade.total_marks}
                                                </TableCell>
                                                <TableCell className="text-center font-medium">
                                                    {grade.percentage}%
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge className={getGradeBadgeClass(grade.grade_label)}>
                                                        {grade.grade_label}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-gray-500 text-sm">
                                                    {formatShortDate(grade.released_at)}
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

export default InterimTranscript;
