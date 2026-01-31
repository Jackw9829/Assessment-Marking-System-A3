// =============================================
// Student Grades Dashboard Component
// =============================================

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Progress } from './ui/progress';
import { ScrollArea } from './ui/scroll-area';
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
    BarChart3,
    TableIcon,
    Award,
    TrendingUp,
    TrendingDown,
    ChevronDown,
    ChevronRight,
    MessageSquare,
    Loader2,
    GraduationCap,
    BookOpen,
} from 'lucide-react';
import { cn } from './ui/utils';
import { supabase } from '@/lib/supabase-client';
import {
    GradeRecord,
    GradeStatistics,
    CourseGradeSummary,
    GradeLabel,
    GradesViewMode,
    getStudentGrades,
    getGradeStatistics,
    getGradesByCourse,
    groupGradesByCourse,
    getGradeBadgeClass,
    getGradeLabelName,
    getGradeLabelColour,
    formatGradeDate,
    gradeLabels,
    prepareBarChartData,
    preparePieChartData,
    prepareTrendChartData,
} from '@/lib/grades-dashboard';
import { formatAssessmentType } from '@/lib/student-filters';

// =============================================
// TYPES
// =============================================

interface GradesDashboardProps {
    studentId: string;
}

// =============================================
// MAIN COMPONENT
// =============================================

export function GradesDashboard({ studentId }: GradesDashboardProps) {
    const [viewMode, setViewMode] = useState<GradesViewMode>('table');
    const [grades, setGrades] = useState<GradeRecord[]>([]);
    const [statistics, setStatistics] = useState<GradeStatistics | null>(null);
    const [courseSummaries, setCourseSummaries] = useState<CourseGradeSummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('all');
    const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
    const [selectedGrade, setSelectedGrade] = useState<GradeRecord | null>(null);

    // Fetch all grade data
    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [gradesData, statsData, courseData] = await Promise.all([
                getStudentGrades(studentId),
                getGradeStatistics(studentId),
                getGradesByCourse(studentId),
            ]);

            setGrades(gradesData);
            setStatistics(statsData);
            setCourseSummaries(courseData);
        } catch (error) {
            console.error('Error fetching grades:', error);
            toast.error('Failed to load grades');
        } finally {
            setIsLoading(false);
        }
    }, [studentId]);

    // Initial fetch
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Real-time subscription for grade releases
    useEffect(() => {
        const channel = supabase
            .channel('grade-releases')
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'grades',
            }, () => {
                // Refresh when any grade is updated (released)
                fetchData();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchData]);

    // Filter grades by course
    const filteredGrades = selectedCourseFilter === 'all'
        ? grades
        : grades.filter(g => g.course_id === selectedCourseFilter);

    // Handle feedback view
    const handleViewFeedback = (grade: GradeRecord) => {
        setSelectedGrade(grade);
        setFeedbackDialogOpen(true);
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
    if (grades.length === 0) {
        return (
            <Card>
                <CardContent className="py-12">
                    <div className="text-center">
                        <GraduationCap className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">
                            No Grades Available Yet
                        </h3>
                        <p className="text-gray-500 max-w-md mx-auto">
                            Your grades will appear here once your instructors release them.
                        </p>
                        <div className="mt-6 text-sm text-gray-400">
                            <p>In the meantime, you can:</p>
                            <ul className="mt-2 space-y-1">
                                <li>• Check your upcoming deadlines in the Calendar</li>
                                <li>• Review your submitted assessments</li>
                                <li>• Contact your instructor if you expect results</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {/* Statistics Summary */}
            {statistics && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600">
                                Overall Average
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">
                                {statistics.overall_average}%
                            </div>
                            <Badge className={cn("mt-2", getGradeBadgeClass(
                                statistics.overall_average >= 85 ? 'HD' :
                                    statistics.overall_average >= 75 ? 'D' :
                                        statistics.overall_average >= 65 ? 'CR' :
                                            statistics.overall_average >= 50 ? 'P' : 'F'
                            ))}>
                                {getGradeLabelName(
                                    statistics.overall_average >= 85 ? 'HD' :
                                        statistics.overall_average >= 75 ? 'D' :
                                            statistics.overall_average >= 65 ? 'CR' :
                                                statistics.overall_average >= 50 ? 'P' : 'F'
                                )}
                            </Badge>
                            <Progress value={statistics.overall_average} className="mt-3" />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600">
                                Assessments Graded
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">
                                {statistics.total_assessments}
                            </div>
                            <p className="text-sm text-gray-500 mt-2">
                                Across {courseSummaries.length} course{courseSummaries.length !== 1 ? 's' : ''}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-1">
                                <TrendingUp className="h-4 w-4 text-green-500" />
                                Highest Score
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-green-600">
                                {statistics.highest_percentage}%
                            </div>
                            <p className="text-sm text-gray-500 mt-2">
                                {statistics.highest_score} marks
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-1">
                                <TrendingDown className="h-4 w-4 text-orange-500" />
                                Lowest Score
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-orange-600">
                                {statistics.lowest_percentage}%
                            </div>
                            <p className="text-sm text-gray-500 mt-2">
                                {statistics.lowest_score} marks
                            </p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Main Content Card */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Award className="h-5 w-5 text-yellow-600" />
                            <CardTitle>My Grades</CardTitle>
                        </div>
                        <div className="flex items-center gap-3">
                            {/* Course Filter */}
                            <Select
                                value={selectedCourseFilter}
                                onValueChange={setSelectedCourseFilter}
                            >
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="All Courses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Courses</SelectItem>
                                    {courseSummaries.map((course) => (
                                        <SelectItem key={course.course_id} value={course.course_id}>
                                            {course.course_code}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* View Toggle */}
                            <div className="flex border rounded-lg overflow-hidden">
                                <Button
                                    variant={viewMode === 'table' ? 'default' : 'ghost'}
                                    size="sm"
                                    onClick={() => setViewMode('table')}
                                    className="rounded-none"
                                >
                                    <TableIcon className="h-4 w-4 mr-1" />
                                    Table
                                </Button>
                                <Button
                                    variant={viewMode === 'graph' ? 'default' : 'ghost'}
                                    size="sm"
                                    onClick={() => setViewMode('graph')}
                                    className="rounded-none"
                                >
                                    <BarChart3 className="h-4 w-4 mr-1" />
                                    Graph
                                </Button>
                            </div>
                        </div>
                    </div>
                    <CardDescription>
                        Showing {filteredGrades.length} released grade{filteredGrades.length !== 1 ? 's' : ''}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {viewMode === 'table' ? (
                        <GradesTableView
                            grades={filteredGrades}
                            courseSummaries={courseSummaries}
                            onViewFeedback={handleViewFeedback}
                            groupByCourse={selectedCourseFilter === 'all'}
                        />
                    ) : (
                        <GradesGraphView
                            grades={filteredGrades}
                            statistics={statistics}
                        />
                    )}
                </CardContent>
            </Card>

            {/* Grade Scale Legend */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Grade Scale</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-4">
                        {(Object.keys(gradeLabels) as GradeLabel[]).map((label) => (
                            <div key={label} className="flex items-center gap-2">
                                <Badge className={getGradeBadgeClass(label)}>
                                    {label}
                                </Badge>
                                <span className="text-sm text-gray-600">
                                    {gradeLabels[label].name} ({gradeLabels[label].range})
                                </span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Feedback Dialog */}
            <FeedbackDialog
                grade={selectedGrade}
                open={feedbackDialogOpen}
                onOpenChange={setFeedbackDialogOpen}
            />
        </div>
    );
}

// =============================================
// TABLE VIEW COMPONENT
// =============================================

interface GradesTableViewProps {
    grades: GradeRecord[];
    courseSummaries: CourseGradeSummary[];
    onViewFeedback: (grade: GradeRecord) => void;
    groupByCourse: boolean;
}

function GradesTableView({ grades, courseSummaries, onViewFeedback, groupByCourse }: GradesTableViewProps) {
    const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());

    const toggleCourse = (courseId: string) => {
        const newExpanded = new Set(expandedCourses);
        if (newExpanded.has(courseId)) {
            newExpanded.delete(courseId);
        } else {
            newExpanded.add(courseId);
        }
        setExpandedCourses(newExpanded);
    };

    // Expand all by default on first render
    useEffect(() => {
        setExpandedCourses(new Set(courseSummaries.map(c => c.course_id)));
    }, [courseSummaries]);

    if (!groupByCourse) {
        return (
            <SimpleGradesTable grades={grades} onViewFeedback={onViewFeedback} showCourse />
        );
    }

    const groupedGrades = groupGradesByCourse(grades);

    return (
        <div className="space-y-4">
            {courseSummaries.map((course) => {
                const courseGrades = groupedGrades.get(course.course_id) || [];
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
                                        <span className="text-gray-500 ml-2">- {course.course_title}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-sm text-gray-500">
                                        {course.assessment_count} assessment{course.assessment_count !== 1 ? 's' : ''}
                                    </span>
                                    <span className="font-medium">
                                        Avg: {course.course_average}%
                                    </span>
                                    <Badge className={getGradeBadgeClass(course.course_grade_label as GradeLabel)}>
                                        {course.course_grade_label}
                                    </Badge>
                                </div>
                            </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                            <div className="mt-2 border rounded-lg">
                                <SimpleGradesTable
                                    grades={courseGrades}
                                    onViewFeedback={onViewFeedback}
                                    showCourse={false}
                                />
                            </div>
                        </CollapsibleContent>
                    </Collapsible>
                );
            })}
        </div>
    );
}

// =============================================
// SIMPLE GRADES TABLE
// =============================================

interface SimpleGradesTableProps {
    grades: GradeRecord[];
    onViewFeedback: (grade: GradeRecord) => void;
    showCourse: boolean;
}

function SimpleGradesTable({ grades, onViewFeedback, showCourse }: SimpleGradesTableProps) {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    {showCourse && <TableHead>Course</TableHead>}
                    <TableHead>Assessment</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-center">Score</TableHead>
                    <TableHead className="text-center">%</TableHead>
                    <TableHead className="text-center">Grade</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-center">Feedback</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {grades.map((grade) => (
                    <TableRow key={grade.grade_id}>
                        {showCourse && (
                            <TableCell className="font-medium">{grade.course_code}</TableCell>
                        )}
                        <TableCell>{grade.assessment_title}</TableCell>
                        <TableCell>
                            <Badge variant="outline" className="text-xs">
                                {formatAssessmentType(grade.assessment_type)}
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
                            {formatGradeDate(grade.graded_at)}
                        </TableCell>
                        <TableCell className="text-center">
                            {grade.feedback ? (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onViewFeedback(grade)}
                                >
                                    <MessageSquare className="h-4 w-4" />
                                </Button>
                            ) : (
                                <span className="text-gray-400 text-sm">-</span>
                            )}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}

// =============================================
// GRAPH VIEW COMPONENT
// =============================================

interface GradesGraphViewProps {
    grades: GradeRecord[];
    statistics: GradeStatistics | null;
}

function GradesGraphView({ grades, statistics }: GradesGraphViewProps) {
    const barChartData = prepareBarChartData(grades);
    const pieChartData = statistics ? preparePieChartData(statistics) : [];
    const trendData = prepareTrendChartData(grades);

    return (
        <div className="space-y-6">
            {/* Score Distribution Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Bar Chart - Scores by Assessment */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Scores by Assessment</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {barChartData.map((item, index) => (
                                <div key={index} className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <span className="truncate" title={item.fullName}>
                                            {item.name}
                                        </span>
                                        <span className="font-medium">{item.score}%</span>
                                    </div>
                                    <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all"
                                            style={{
                                                width: `${item.score}%`,
                                                backgroundColor: getGradeLabelColour(item.gradeLabel as GradeLabel),
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Pie Chart - Grade Distribution */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Grade Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-center">
                            <div className="relative w-48 h-48">
                                {/* Simple donut chart representation */}
                                <svg viewBox="0 0 100 100" className="w-full h-full">
                                    {pieChartData.length > 0 ? (
                                        <>
                                            {(() => {
                                                const total = pieChartData.reduce((sum, d) => sum + d.value, 0);
                                                let currentAngle = 0;

                                                return pieChartData.map((slice, index) => {
                                                    const percentage = slice.value / total;
                                                    const angle = percentage * 360;
                                                    const startAngle = currentAngle;
                                                    currentAngle += angle;

                                                    const x1 = 50 + 40 * Math.cos((startAngle - 90) * Math.PI / 180);
                                                    const y1 = 50 + 40 * Math.sin((startAngle - 90) * Math.PI / 180);
                                                    const x2 = 50 + 40 * Math.cos((startAngle + angle - 90) * Math.PI / 180);
                                                    const y2 = 50 + 40 * Math.sin((startAngle + angle - 90) * Math.PI / 180);
                                                    const largeArc = angle > 180 ? 1 : 0;

                                                    return (
                                                        <path
                                                            key={index}
                                                            d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
                                                            fill={slice.colour}
                                                            stroke="white"
                                                            strokeWidth="1"
                                                        />
                                                    );
                                                });
                                            })()}
                                            {/* Center circle for donut effect */}
                                            <circle cx="50" cy="50" r="20" fill="white" />
                                            <text x="50" y="53" textAnchor="middle" className="text-lg font-bold" fill="#374151">
                                                {statistics?.total_assessments}
                                            </text>
                                        </>
                                    ) : (
                                        <text x="50" y="50" textAnchor="middle" fill="#9CA3AF">
                                            No data
                                        </text>
                                    )}
                                </svg>
                            </div>
                        </div>
                        {/* Legend */}
                        <div className="flex flex-wrap justify-center gap-3 mt-4">
                            {pieChartData.map((item) => (
                                <div key={item.name} className="flex items-center gap-1">
                                    <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: item.colour }}
                                    />
                                    <span className="text-sm">
                                        {item.name}: {item.value}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Trend Line Chart */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Performance Trend Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-48 flex items-end gap-1">
                        {trendData.map((item, index) => (
                            <div
                                key={index}
                                className="flex-1 flex flex-col items-center"
                            >
                                <div
                                    className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-600"
                                    style={{ height: `${item.score * 1.8}px` }}
                                    title={`${item.assessment}: ${item.score}%`}
                                />
                                <div className="text-xs text-gray-500 mt-1 truncate w-full text-center">
                                    {item.date}
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// =============================================
// FEEDBACK DIALOG
// =============================================

interface FeedbackDialogProps {
    grade: GradeRecord | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

function FeedbackDialog({ grade, open, onOpenChange }: FeedbackDialogProps) {
    if (!grade) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-blue-600" />
                        Instructor Feedback
                    </DialogTitle>
                    <DialogDescription>
                        {grade.assessment_title} - {grade.course_code}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Grade Summary */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                            <span className="text-lg font-semibold">
                                {grade.score}/{grade.total_marks}
                            </span>
                            <span className="text-gray-500 ml-2">
                                ({grade.percentage}%)
                            </span>
                        </div>
                        <Badge className={getGradeBadgeClass(grade.grade_label)}>
                            {grade.grade_label} - {getGradeLabelName(grade.grade_label)}
                        </Badge>
                    </div>

                    <Separator />

                    {/* Feedback Content */}
                    <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Feedback</h4>
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                            <p className="text-gray-700 whitespace-pre-wrap">
                                {grade.feedback || 'No feedback provided.'}
                            </p>
                        </div>
                    </div>

                    {/* Graded Date */}
                    <div className="text-sm text-gray-500">
                        Graded on {formatGradeDate(grade.graded_at)}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default GradesDashboard;
