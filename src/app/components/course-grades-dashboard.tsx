// =============================================
// Course-Specific Grades Dashboard Component
// Table + Graph views for a single course
// =============================================

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
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
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from './ui/dialog';
import { Separator } from './ui/separator';
import {
    BarChart3,
    TableIcon,
    Award,
    TrendingUp,
    TrendingDown,
    Minus,
    MessageSquare,
    Loader2,
    GraduationCap,
    Target,
    Star,
    AlertCircle,
} from 'lucide-react';
import { cn } from './ui/utils';

// =============================================
// TYPES
// =============================================

interface CourseGrade {
    id: string;
    assessment_id: string;
    assessment_title: string;
    assessment_type: string;
    score: number;
    total_marks: number;
    percentage: number;
    feedback?: string;
    graded_at: string;
    is_released: boolean;
}

interface CourseGradesDashboardProps {
    courseId: string;
    courseCode: string;
    courseTitle: string;
    grades: CourseGrade[];
    isLoading?: boolean;
}

type ViewMode = 'table' | 'graph';
type GradeLabel = 'HD' | 'D' | 'CR' | 'P' | 'F';

// =============================================
// GRADE HELPERS
// =============================================

const gradeRanges: Record<GradeLabel, { name: string; min: number; max: number; color: string; bgColor: string }> = {
    HD: { name: 'High Distinction', min: 85, max: 100, color: 'text-purple-700', bgColor: 'bg-purple-100 border-purple-200' },
    D: { name: 'Distinction', min: 75, max: 84, color: 'text-blue-700', bgColor: 'bg-blue-100 border-blue-200' },
    CR: { name: 'Credit', min: 65, max: 74, color: 'text-green-700', bgColor: 'bg-green-100 border-green-200' },
    P: { name: 'Pass', min: 50, max: 64, color: 'text-yellow-700', bgColor: 'bg-yellow-100 border-yellow-200' },
    F: { name: 'Fail', min: 0, max: 49, color: 'text-red-700', bgColor: 'bg-red-100 border-red-200' },
};

function getGradeLabel(percentage: number): GradeLabel {
    if (percentage >= 85) return 'HD';
    if (percentage >= 75) return 'D';
    if (percentage >= 65) return 'CR';
    if (percentage >= 50) return 'P';
    return 'F';
}

function getGradeBadgeClass(label: GradeLabel): string {
    return gradeRanges[label].bgColor + ' ' + gradeRanges[label].color + ' border';
}

function getGradeBarColor(percentage: number): string {
    if (percentage >= 85) return 'bg-purple-500';
    if (percentage >= 75) return 'bg-blue-500';
    if (percentage >= 65) return 'bg-green-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
}

function formatAssessmentType(type: string): string {
    const labels: Record<string, string> = {
        assignment: 'Assignment',
        quiz: 'Quiz',
        examination: 'Exam',
        project: 'Project',
        practical: 'Practical',
        other: 'Other',
    };
    return labels[type] || type;
}

// =============================================
// MAIN COMPONENT
// =============================================

export function CourseGradesDashboard({
    courseId,
    courseCode,
    courseTitle,
    grades,
    isLoading = false,
}: CourseGradesDashboardProps) {
    const [viewMode, setViewMode] = useState<ViewMode>('table');
    const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
    const [selectedGrade, setSelectedGrade] = useState<CourseGrade | null>(null);

    // Calculate statistics
    const stats = useMemo(() => {
        if (grades.length === 0) return null;

        const total = grades.reduce((sum, g) => sum + g.percentage, 0);
        const average = Math.round(total / grades.length);
        const highest = Math.max(...grades.map(g => g.percentage));
        const lowest = Math.min(...grades.map(g => g.percentage));
        const totalScore = grades.reduce((sum, g) => sum + g.score, 0);
        const totalPossible = grades.reduce((sum, g) => sum + g.total_marks, 0);
        const overallPercentage = Math.round((totalScore / totalPossible) * 100);

        // Grade distribution
        const distribution: Record<GradeLabel, number> = { HD: 0, D: 0, CR: 0, P: 0, F: 0 };
        grades.forEach(g => {
            distribution[getGradeLabel(g.percentage)]++;
        });

        // Trend calculation (compare first half vs second half)
        const sorted = [...grades].sort((a, b) =>
            new Date(a.graded_at).getTime() - new Date(b.graded_at).getTime()
        );
        let trend: 'up' | 'down' | 'stable' = 'stable';
        if (sorted.length >= 2) {
            const mid = Math.floor(sorted.length / 2);
            const firstHalf = sorted.slice(0, mid).reduce((s, g) => s + g.percentage, 0) / mid;
            const secondHalf = sorted.slice(mid).reduce((s, g) => s + g.percentage, 0) / (sorted.length - mid);
            if (secondHalf > firstHalf + 5) trend = 'up';
            else if (secondHalf < firstHalf - 5) trend = 'down';
        }

        return {
            average,
            highest,
            lowest,
            totalScore,
            totalPossible,
            overallPercentage,
            distribution,
            trend,
            gradeLabel: getGradeLabel(average),
        };
    }, [grades]);

    const handleViewFeedback = (grade: CourseGrade) => {
        setSelectedGrade(grade);
        setFeedbackDialogOpen(true);
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
    if (grades.length === 0) {
        return (
            <Card>
                <CardContent className="py-12">
                    <div className="text-center">
                        <GraduationCap className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">
                            No Grades Released Yet
                        </h3>
                        <p className="text-gray-500 max-w-md mx-auto">
                            Your grades for {courseCode} will appear here once your instructor
                            releases them. Check back after assessments have been graded.
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {/* Statistics Cards */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Course Average */}
                    <Card className="bg-white border-l-4 border-l-blue-500">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wide">Course Average</p>
                                    <p className="text-2xl font-bold text-gray-900">{stats.average}%</p>
                                    <Badge className={cn("mt-1", getGradeBadgeClass(stats.gradeLabel))}>
                                        {stats.gradeLabel} - {gradeRanges[stats.gradeLabel].name}
                                    </Badge>
                                </div>
                                <Target className="h-8 w-8 text-blue-200" />
                            </div>
                            <Progress value={stats.average} className="mt-3 h-2" />
                        </CardContent>
                    </Card>

                    {/* Total Score */}
                    <Card className="bg-white border-l-4 border-l-purple-500">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wide">Total Score</p>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {stats.totalScore}/{stats.totalPossible}
                                    </p>
                                    <p className="text-sm text-gray-500 mt-1">
                                        {stats.overallPercentage}% overall
                                    </p>
                                </div>
                                <Star className="h-8 w-8 text-purple-200" />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Highest/Lowest */}
                    <Card className="bg-white border-l-4 border-l-emerald-500">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wide">Best Score</p>
                                    <p className="text-2xl font-bold text-emerald-600">{stats.highest}%</p>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Lowest: {stats.lowest}%
                                    </p>
                                </div>
                                <TrendingUp className="h-8 w-8 text-emerald-200" />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Trend */}
                    <Card className="bg-white border-l-4 border-l-amber-500">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wide">Performance Trend</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        {stats.trend === 'up' && (
                                            <>
                                                <TrendingUp className="h-6 w-6 text-green-600" />
                                                <span className="text-lg font-bold text-green-600">Improving</span>
                                            </>
                                        )}
                                        {stats.trend === 'down' && (
                                            <>
                                                <TrendingDown className="h-6 w-6 text-red-600" />
                                                <span className="text-lg font-bold text-red-600">Declining</span>
                                            </>
                                        )}
                                        {stats.trend === 'stable' && (
                                            <>
                                                <Minus className="h-6 w-6 text-gray-600" />
                                                <span className="text-lg font-bold text-gray-600">Stable</span>
                                            </>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-500 mt-1">
                                        {grades.length} assessment{grades.length !== 1 ? 's' : ''} graded
                                    </p>
                                </div>
                                <Award className="h-8 w-8 text-amber-200" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Main Grades Content */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Award className="h-5 w-5 text-amber-500" />
                                Grades for {courseCode}
                            </CardTitle>
                            <CardDescription>
                                {grades.length} released grade{grades.length !== 1 ? 's' : ''}
                            </CardDescription>
                        </div>

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
                </CardHeader>
                <CardContent>
                    {viewMode === 'table' ? (
                        <GradesTable grades={grades} onViewFeedback={handleViewFeedback} />
                    ) : (
                        <GradesGraph grades={grades} stats={stats} />
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
                        {(Object.keys(gradeRanges) as GradeLabel[]).map(label => (
                            <div key={label} className="flex items-center gap-2">
                                <Badge className={getGradeBadgeClass(label)}>
                                    {label}
                                </Badge>
                                <span className="text-sm text-gray-600">
                                    {gradeRanges[label].name} ({gradeRanges[label].min}-{gradeRanges[label].max}%)
                                </span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Feedback Dialog */}
            <FeedbackDialog
                grade={selectedGrade}
                courseCode={courseCode}
                open={feedbackDialogOpen}
                onOpenChange={setFeedbackDialogOpen}
            />
        </div>
    );
}

// =============================================
// TABLE VIEW
// =============================================

interface GradesTableProps {
    grades: CourseGrade[];
    onViewFeedback: (grade: CourseGrade) => void;
}

function GradesTable({ grades, onViewFeedback }: GradesTableProps) {
    // Sort by graded date (most recent first)
    const sortedGrades = [...grades].sort((a, b) =>
        new Date(b.graded_at).getTime() - new Date(a.graded_at).getTime()
    );

    return (
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Assessment Title</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-center">Marks Obtained</TableHead>
                        <TableHead className="text-center">Total Marks</TableHead>
                        <TableHead className="text-center">Percentage</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-center">Feedback</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sortedGrades.map(grade => {
                        const label = getGradeLabel(grade.percentage);
                        return (
                            <TableRow key={grade.id}>
                                <TableCell className="font-medium">{grade.assessment_title}</TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="text-xs">
                                        {formatAssessmentType(grade.assessment_type)}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-center font-medium">{grade.score}</TableCell>
                                <TableCell className="text-center">{grade.total_marks}</TableCell>
                                <TableCell className="text-center">
                                    <span className={cn("font-bold", gradeRanges[label].color)}>
                                        {grade.percentage}%
                                    </span>
                                </TableCell>
                                <TableCell className="text-center">
                                    <Badge className={getGradeBadgeClass(label)}>
                                        {label}
                                    </Badge>
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
                                        <span className="text-gray-400">—</span>
                                    )}
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}

// =============================================
// GRAPH VIEW
// =============================================

interface GradesGraphProps {
    grades: CourseGrade[];
    stats: {
        average: number;
        distribution: Record<GradeLabel, number>;
    } | null;
}

function GradesGraph({ grades, stats }: GradesGraphProps) {
    // Sort by date for trend
    const sortedGrades = [...grades].sort((a, b) =>
        new Date(a.graded_at).getTime() - new Date(b.graded_at).getTime()
    );

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Bar Chart - Individual Scores */}
                <Card className="border">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Score by Assessment</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                            {sortedGrades.map((grade, index) => (
                                <div key={grade.id} className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <span className="truncate max-w-[200px]" title={grade.assessment_title}>
                                            {grade.assessment_title}
                                        </span>
                                        <span className="font-medium ml-2">{grade.percentage}%</span>
                                    </div>
                                    <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className={cn("h-full rounded-full transition-all", getGradeBarColor(grade.percentage))}
                                            style={{ width: `${grade.percentage}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Distribution Chart */}
                <Card className="border">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Grade Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {stats && (
                            <div className="flex items-center justify-center">
                                <div className="relative w-40 h-40">
                                    <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                                        {(() => {
                                            const total = Object.values(stats.distribution).reduce((a, b) => a + b, 0);
                                            if (total === 0) return null;

                                            let offset = 0;
                                            const colors: Record<GradeLabel, string> = {
                                                HD: '#a855f7',
                                                D: '#3b82f6',
                                                CR: '#22c55e',
                                                P: '#eab308',
                                                F: '#ef4444',
                                            };

                                            return (Object.keys(stats.distribution) as GradeLabel[])
                                                .filter(label => stats.distribution[label] > 0)
                                                .map(label => {
                                                    const value = stats.distribution[label];
                                                    const percentage = (value / total) * 100;
                                                    const dashArray = (percentage * 251.2) / 100;
                                                    const dashOffset = offset;
                                                    offset += dashArray;

                                                    return (
                                                        <circle
                                                            key={label}
                                                            cx="50"
                                                            cy="50"
                                                            r="40"
                                                            fill="none"
                                                            stroke={colors[label]}
                                                            strokeWidth="20"
                                                            strokeDasharray={`${dashArray} ${251.2 - dashArray}`}
                                                            strokeDashoffset={-dashOffset}
                                                        />
                                                    );
                                                });
                                        })()}
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="text-center">
                                            <span className="text-2xl font-bold">{grades.length}</span>
                                            <p className="text-xs text-gray-500">grades</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {/* Legend */}
                        <div className="flex flex-wrap justify-center gap-3 mt-4">
                            {stats && (Object.keys(stats.distribution) as GradeLabel[])
                                .filter(label => stats.distribution[label] > 0)
                                .map(label => (
                                    <div key={label} className="flex items-center gap-1">
                                        <div className={cn("w-3 h-3 rounded-full", getGradeBarColor(gradeRanges[label].min + 1))} />
                                        <span className="text-sm">{label}: {stats.distribution[label]}</span>
                                    </div>
                                ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Performance Trend Line */}
            <Card className="border">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Performance Trend Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-48 flex items-end gap-2 pb-6 relative">
                        {/* Y-axis labels */}
                        <div className="absolute left-0 top-0 bottom-6 w-10 flex flex-col justify-between text-xs text-gray-400">
                            <span>100%</span>
                            <span>75%</span>
                            <span>50%</span>
                            <span>25%</span>
                            <span>0%</span>
                        </div>

                        {/* Bars */}
                        <div className="flex-1 ml-12 flex items-end gap-1">
                            {sortedGrades.map((grade, index) => (
                                <div key={grade.id} className="flex-1 flex flex-col items-center max-w-20">
                                    <div
                                        className={cn(
                                            "w-full rounded-t transition-all hover:opacity-80 cursor-pointer min-h-[4px]",
                                            getGradeBarColor(grade.percentage)
                                        )}
                                        style={{ height: `${(grade.percentage / 100) * 160}px` }}
                                        title={`${grade.assessment_title}: ${grade.percentage}%`}
                                    />
                                    <div className="text-xs text-gray-500 mt-2 truncate w-full text-center" title={grade.assessment_title}>
                                        {new Date(grade.graded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Average Line Indicator */}
                    {stats && (
                        <div className="text-center text-sm text-gray-500 mt-2">
                            <AlertCircle className="h-4 w-4 inline mr-1" />
                            Course average: <span className="font-medium">{stats.average}%</span>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

// =============================================
// FEEDBACK DIALOG
// =============================================

interface FeedbackDialogProps {
    grade: CourseGrade | null;
    courseCode: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

function FeedbackDialog({ grade, courseCode, open, onOpenChange }: FeedbackDialogProps) {
    if (!grade) return null;

    const label = getGradeLabel(grade.percentage);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-blue-600" />
                        Instructor Feedback
                    </DialogTitle>
                    <DialogDescription>
                        {grade.assessment_title} • {courseCode}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Grade Summary */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                            <span className="text-2xl font-bold">
                                {grade.score}/{grade.total_marks}
                            </span>
                            <span className="text-gray-500 ml-2">
                                ({grade.percentage}%)
                            </span>
                        </div>
                        <Badge className={cn("text-base", getGradeBadgeClass(label))}>
                            {label} - {gradeRanges[label].name}
                        </Badge>
                    </div>

                    <Separator />

                    {/* Feedback Content */}
                    <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Feedback</h4>
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                            <p className="text-gray-700 whitespace-pre-wrap">
                                {grade.feedback || 'No feedback provided for this assessment.'}
                            </p>
                        </div>
                    </div>

                    {/* Graded Date */}
                    <div className="text-sm text-gray-500">
                        Graded on {new Date(grade.graded_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                        })}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default CourseGradesDashboard;
