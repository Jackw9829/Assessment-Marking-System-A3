// =============================================
// Student Assessment Filter Component
// =============================================

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { Progress } from './ui/progress';
import { ScrollArea } from './ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { Checkbox } from './ui/checkbox';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from './ui/select';
import { toast } from 'sonner';
import {
    Filter,
    X,
    Calendar as CalendarIcon,
    RefreshCw,
    FileText,
    CheckCircle2,
    Clock,
    AlertCircle,
    Award,
    Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from './ui/utils';
import { supabase } from '@/lib/supabase-client';
import {
    FilterState,
    FilteredAssessment,
    EnrolledCourse,
    AssessmentType,
    SubmissionStatus,
    ResultsStatus,
    defaultFilterState,
    getFilteredAssessments,
    getEnrolledCourses,
    hasActiveFilters,
    getActiveFilterCount,
    formatAssessmentType,
    formatSubmissionStatus,
    formatResultsStatus,
    getStatusBadgeVariant,
    getResultsBadgeVariant,
    isOverdue,
    getDaysUntilDue,
} from '@/lib/student-filters';

// =============================================
// TYPES
// =============================================

interface AssessmentFilterProps {
    studentId: string;
}

// =============================================
// ASSESSMENT TYPE OPTIONS
// =============================================

const assessmentTypes: AssessmentType[] = [
    'assignment',
    'quiz',
    'examination',
    'project',
    'practical',
    'other',
];

const submissionStatuses: SubmissionStatus[] = [
    'not_submitted',
    'submitted',
    'graded',
];

const resultsStatuses: ResultsStatus[] = [
    'available',
    'pending',
    'not_applicable',
];

// =============================================
// MAIN COMPONENT
// =============================================

export function AssessmentFilter({ studentId }: AssessmentFilterProps) {
    // State
    const [filters, setFilters] = useState<FilterState>(defaultFilterState);
    const [assessments, setAssessments] = useState<FilteredAssessment[]>([]);
    const [courses, setCourses] = useState<EnrolledCourse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFiltering, setIsFiltering] = useState(false);

    // Fetch enrolled courses on mount
    useEffect(() => {
        async function fetchCourses() {
            try {
                const enrolledCourses = await getEnrolledCourses(studentId);
                setCourses(enrolledCourses);
            } catch (error) {
                console.error('Error fetching courses:', error);
                toast.error('Failed to load courses');
            }
        }
        fetchCourses();
    }, [studentId]);

    // Debounced filter function
    const fetchAssessments = useCallback(async (currentFilters: FilterState) => {
        setIsFiltering(true);
        try {
            const data = await getFilteredAssessments(studentId, currentFilters);
            setAssessments(data);
        } catch (error) {
            console.error('Error fetching assessments:', error);
            toast.error('Failed to load assessments');
        } finally {
            setIsFiltering(false);
            setIsLoading(false);
        }
    }, [studentId]);

    // Fetch assessments when filters change (with debounce effect)
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchAssessments(filters);
        }, 300); // 300ms debounce

        return () => clearTimeout(timeoutId);
    }, [filters, fetchAssessments]);

    // Real-time subscription for grade updates (verification)
    useEffect(() => {
        const channel = supabase
            .channel('filter-grade-updates')
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'grades',
            }, () => {
                // Refresh when any grade is updated (verified/released)
                fetchAssessments(filters);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchAssessments, filters]);

    // Reset all filters
    const handleResetFilters = () => {
        setFilters(defaultFilterState);
        toast.success('Filters have been reset');
    };

    // Update individual filter
    const updateFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    // Clear individual filter
    const clearFilter = (key: keyof FilterState) => {
        setFilters(prev => ({ ...prev, [key]: null }));
    };

    // Active filters for display
    const activeFilterTags = useMemo(() => {
        const tags: { key: keyof FilterState; label: string }[] = [];

        if (filters.courseId) {
            const course = courses.find(c => c.course_id === filters.courseId);
            tags.push({ key: 'courseId', label: course?.course_code || 'Course' });
        }
        if (filters.assessmentType) {
            tags.push({ key: 'assessmentType', label: formatAssessmentType(filters.assessmentType) });
        }
        if (filters.status) {
            tags.push({ key: 'status', label: formatSubmissionStatus(filters.status) });
        }
        if (filters.dueDateStart || filters.dueDateEnd) {
            const start = filters.dueDateStart ? format(filters.dueDateStart, 'MMM d') : '';
            const end = filters.dueDateEnd ? format(filters.dueDateEnd, 'MMM d') : '';
            tags.push({ key: 'dueDateStart', label: `Due: ${start}${start && end ? ' - ' : ''}${end}` });
        }
        if (filters.submissionDateStart || filters.submissionDateEnd) {
            const start = filters.submissionDateStart ? format(filters.submissionDateStart, 'MMM d') : '';
            const end = filters.submissionDateEnd ? format(filters.submissionDateEnd, 'MMM d') : '';
            tags.push({ key: 'submissionDateStart', label: `Submitted: ${start}${start && end ? ' - ' : ''}${end}` });
        }
        if (filters.resultsStatus) {
            tags.push({ key: 'resultsStatus', label: formatResultsStatus(filters.resultsStatus) });
        }

        return tags;
    }, [filters, courses]);

    const filterCount = getActiveFilterCount(filters);

    return (
        <div className="space-y-4">
            {/* Filter Bar */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Filter className="h-5 w-5 text-gray-500" />
                            <CardTitle className="text-lg">Filter Assessments</CardTitle>
                            {filterCount > 0 && (
                                <Badge variant="secondary">{filterCount} active</Badge>
                            )}
                        </div>
                        {hasActiveFilters(filters) && (
                            <Button variant="ghost" size="sm" onClick={handleResetFilters}>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Reset Filters
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Filter Controls Row 1 */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Course Filter */}
                        <div className="space-y-2">
                            <Label>Course</Label>
                            <Select
                                value={filters.courseId || 'all'}
                                onValueChange={(value) => updateFilter('courseId', value === 'all' ? null : value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="All Courses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Courses</SelectItem>
                                    {courses.map((course) => (
                                        <SelectItem key={course.course_id} value={course.course_id}>
                                            {course.course_code} - {course.course_title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Assessment Type Filter */}
                        <div className="space-y-2">
                            <Label>Assessment Type</Label>
                            <Select
                                value={filters.assessmentType || 'all'}
                                onValueChange={(value) => updateFilter('assessmentType', value === 'all' ? null : value as AssessmentType)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="All Types" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Types</SelectItem>
                                    {assessmentTypes.map((type) => (
                                        <SelectItem key={type} value={type}>
                                            {formatAssessmentType(type)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Due Date Range */}
                        <div className="space-y-2">
                            <Label>Due Date Range</Label>
                            <div className="flex gap-2">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={cn(
                                                "flex-1 justify-start text-left font-normal",
                                                !filters.dueDateStart && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {filters.dueDateStart ? format(filters.dueDateStart, "MMM d") : "Start"}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={filters.dueDateStart || undefined}
                                            onSelect={(date) => updateFilter('dueDateStart', date || null)}
                                        />
                                    </PopoverContent>
                                </Popover>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={cn(
                                                "flex-1 justify-start text-left font-normal",
                                                !filters.dueDateEnd && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {filters.dueDateEnd ? format(filters.dueDateEnd, "MMM d") : "End"}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={filters.dueDateEnd || undefined}
                                            onSelect={(date) => updateFilter('dueDateEnd', date || null)}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>
                    </div>

                    {/* Filter Controls Row 2 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Status Checkboxes */}
                        <div className="space-y-2">
                            <Label>Submission Status</Label>
                            <div className="flex flex-wrap gap-4">
                                {submissionStatuses.map((status) => (
                                    <div key={status} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`status-${status}`}
                                            checked={filters.status === status}
                                            onCheckedChange={(checked) =>
                                                updateFilter('status', checked ? status : null)
                                            }
                                        />
                                        <Label htmlFor={`status-${status}`} className="text-sm font-normal cursor-pointer">
                                            {formatSubmissionStatus(status)}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Results Status Checkboxes */}
                        <div className="space-y-2">
                            <Label>Results Status</Label>
                            <div className="flex flex-wrap gap-4">
                                {resultsStatuses.map((status) => (
                                    <div key={status} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`results-${status}`}
                                            checked={filters.resultsStatus === status}
                                            onCheckedChange={(checked) =>
                                                updateFilter('resultsStatus', checked ? status : null)
                                            }
                                        />
                                        <Label htmlFor={`results-${status}`} className="text-sm font-normal cursor-pointer">
                                            {formatResultsStatus(status)}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Active Filter Tags */}
                    {activeFilterTags.length > 0 && (
                        <>
                            <Separator />
                            <div className="flex flex-wrap gap-2 items-center">
                                <span className="text-sm text-gray-500">Active Filters:</span>
                                {activeFilterTags.map((tag) => (
                                    <Badge
                                        key={tag.key}
                                        variant="secondary"
                                        className="flex items-center gap-1 pr-1"
                                    >
                                        {tag.label}
                                        <button
                                            onClick={() => {
                                                if (tag.key === 'dueDateStart') {
                                                    clearFilter('dueDateStart');
                                                    clearFilter('dueDateEnd');
                                                } else if (tag.key === 'submissionDateStart') {
                                                    clearFilter('submissionDateStart');
                                                    clearFilter('submissionDateEnd');
                                                } else {
                                                    clearFilter(tag.key);
                                                }
                                            }}
                                            className="ml-1 rounded-full p-0.5 hover:bg-gray-300"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Results */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Assessments</CardTitle>
                            <CardDescription>
                                {isFiltering ? (
                                    <span className="flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Filtering...
                                    </span>
                                ) : (
                                    `Showing ${assessments.length} assessment${assessments.length !== 1 ? 's' : ''}`
                                )}
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                        </div>
                    ) : assessments.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                            <p>No assessments match your filter criteria.</p>
                            <p className="text-sm mt-2">
                                Try adjusting your filters or{' '}
                                <button
                                    onClick={handleResetFilters}
                                    className="text-blue-600 hover:underline"
                                >
                                    reset all filters
                                </button>
                                {' '}to view all assessments.
                            </p>
                        </div>
                    ) : (
                        <ScrollArea className="h-[500px]">
                            <div className="space-y-4">
                                {assessments.map((assessment) => (
                                    <AssessmentCard key={assessment.assessment_id} assessment={assessment} />
                                ))}
                            </div>
                        </ScrollArea>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

// =============================================
// ASSESSMENT CARD COMPONENT
// =============================================

interface AssessmentCardProps {
    assessment: FilteredAssessment;
}

function AssessmentCard({ assessment }: AssessmentCardProps) {
    const daysUntil = getDaysUntilDue(assessment.due_date);
    const overdue = isOverdue(assessment.due_date, assessment.submission_status);
    const percentage = assessment.score !== null && assessment.total_marks
        ? Math.round((assessment.score / assessment.total_marks) * 100)
        : null;

    return (
        <div className={cn(
            "p-4 border rounded-lg transition-colors",
            overdue && "border-red-200 bg-red-50",
            assessment.results_status === 'available' && "border-green-200 bg-green-50"
        )}>
            <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg">{assessment.assessment_title}</h3>
                        <Badge variant="outline" className="text-xs">
                            {formatAssessmentType(assessment.assessment_type)}
                        </Badge>
                    </div>
                    <p className="text-sm text-gray-600">{assessment.course_code} - {assessment.course_title}</p>
                    {assessment.assessment_description && (
                        <p className="text-sm text-gray-500 mt-1">{assessment.assessment_description}</p>
                    )}
                </div>
                <div className="flex flex-col items-end gap-2">
                    <Badge variant={getStatusBadgeVariant(assessment.submission_status)}>
                        {assessment.submission_status === 'not_submitted' ? (
                            <Clock className="h-3 w-3 mr-1" />
                        ) : assessment.submission_status === 'submitted' ? (
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                        ) : (
                            <Award className="h-3 w-3 mr-1" />
                        )}
                        {formatSubmissionStatus(assessment.submission_status as SubmissionStatus)}
                    </Badge>
                    {assessment.results_status !== 'not_applicable' && (
                        <Badge variant={getResultsBadgeVariant(assessment.results_status)}>
                            {formatResultsStatus(assessment.results_status as ResultsStatus)}
                        </Badge>
                    )}
                </div>
            </div>

            <Separator className="my-3" />

            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-gray-400" />
                    <span className={cn(overdue && "text-red-600 font-medium")}>
                        Due: {format(new Date(assessment.due_date), 'MMM d, yyyy h:mm a')}
                        {!overdue && daysUntil <= 7 && daysUntil > 0 && (
                            <span className="text-orange-600 ml-1">({daysUntil} day{daysUntil !== 1 ? 's' : ''} left)</span>
                        )}
                        {overdue && (
                            <span className="text-red-600 ml-1 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" /> Overdue
                            </span>
                        )}
                    </span>
                </div>
                <div>
                    <span className="text-gray-500">Total Marks:</span>{' '}
                    <span className="font-medium">{assessment.total_marks}</span>
                </div>
                {assessment.submitted_at && (
                    <div>
                        <span className="text-gray-500">Submitted:</span>{' '}
                        <span>{format(new Date(assessment.submitted_at), 'MMM d, yyyy')}</span>
                    </div>
                )}
            </div>

            {/* Grade Display */}
            {assessment.results_status === 'available' && percentage !== null && (
                <div className="mt-4 p-3 bg-white rounded-lg border">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <Award className="h-5 w-5 text-yellow-600" />
                            <span className="font-semibold">
                                Grade: {assessment.score}/{assessment.total_marks} ({percentage}%)
                            </span>
                        </div>
                        <Badge variant={percentage >= 50 ? 'default' : 'destructive'}>
                            {percentage >= 80 ? 'Excellent' : percentage >= 60 ? 'Good' : percentage >= 50 ? 'Pass' : 'Needs Improvement'}
                        </Badge>
                    </div>
                    <Progress value={percentage} className="h-2" />
                    {assessment.feedback && (
                        <div className="mt-3 pt-3 border-t">
                            <p className="text-sm font-medium text-gray-700">Feedback:</p>
                            <p className="text-sm text-gray-600 mt-1">{assessment.feedback}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default AssessmentFilter;
