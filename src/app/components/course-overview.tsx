import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import {
    Search,
    BookOpen,
    GraduationCap,
    Filter,
    Grid3X3,
    List,
    Plus,
    SortAsc,
    SortDesc,
    ChevronLeft,
    ChevronRight,
    FileText,
    ClipboardList,
    Users,
    TrendingUp,
    CheckCircle2,
    Clock,
    Archive,
    X
} from 'lucide-react';
import { CourseCard } from './course-card';
import {
    getCourses,
    getCourseMaterials,
    getAssessments,
    getStudentSubmissions,
    getStudentGrades,
    getInstructorCourses,
} from '@/lib/supabase-helpers';

interface CourseOverviewProps {
    userProfile: any;
    role: 'student' | 'instructor' | 'admin';
    onCourseSelect: (courseId: string) => void;
    onCreateCourse?: () => void;
    refreshTrigger?: number;  // Increment to trigger course list refresh
}

interface CourseWithStats {
    id: string;
    title: string;
    code: string;
    description?: string;
    instructor?: { name: string; full_name?: string };
    image_url?: string;
    created_at?: string;
    updated_at?: string;
    status?: 'active' | 'archived' | 'completed' | 'draft' | 'published';
    stats: {
        materialsCount: number;
        assessmentsCount: number;
        studentsCount?: number;
        completedAssessments?: number;
        averageGrade?: number;
        submissionsCount?: number;
        progress?: number;
    };
}

type SortField = 'name' | 'code' | 'newest' | 'progress' | 'assessments' | 'updated';
type StatusFilter = 'all' | 'active' | 'completed' | 'archived' | 'draft' | 'published';

const ITEMS_PER_PAGE = 12;

export function CourseOverview({ userProfile, role, onCourseSelect, onCreateCourse, refreshTrigger }: CourseOverviewProps) {
    const [courses, setCourses] = useState<CourseWithStats[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [isLoading, setIsLoading] = useState(true);

    // Filtering & Sorting
    const [sortField, setSortField] = useState<SortField>('newest');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [showFilters, setShowFilters] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        fetchCourses();
    }, [userProfile.id, role, refreshTrigger]);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, statusFilter, sortField, sortOrder]);

    const fetchCourses = async () => {
        setIsLoading(true);
        try {
            if (role === 'student') {
                // Fetch ALL published/active courses - no enrollment required
                const allCourses = await getCourses();
                const submissions = await getStudentSubmissions(userProfile.id);
                const grades = await getStudentGrades(userProfile.id);
                const allAssessments = await getAssessments();

                const coursesWithStats: CourseWithStats[] = [];

                // Filter to only published/active courses (hide draft/archived)
                const publishedCourses = (allCourses || []).filter((course: any) =>
                    course.status === 'published' || course.status === 'active' || !course.status
                );

                for (const course of publishedCourses as any[]) {
                    if (!course) continue;

                    // Get materials for this course
                    const materials = await getCourseMaterials(course.id);

                    // Get assessments for this course
                    const courseAssessments = (allAssessments || []).filter(
                        (a: any) => a.course_id === course.id
                    );

                    // Count completed assessments (submitted)
                    const completedAssessments = (submissions || []).filter(
                        (s: any) => courseAssessments.some((a: any) => a.id === s.assessment_id)
                    ).length;

                    // Calculate progress percentage
                    const progress = courseAssessments.length > 0
                        ? Math.round((completedAssessments / courseAssessments.length) * 100)
                        : 0;

                    // Calculate average grade for this course
                    const courseGrades = (grades || []).filter((g: any) =>
                        courseAssessments.some((a: any) => a.id === g.submission?.assessment_id)
                    );
                    const avgGrade = courseGrades.length > 0
                        ? Math.round(
                            courseGrades.reduce((sum: number, g: any) =>
                                sum + (g.score / g.total_marks) * 100, 0
                            ) / courseGrades.length
                        )
                        : 0;

                    // Determine display status based on progress
                    const displayStatus: 'active' | 'completed' = progress === 100 ? 'completed' : 'active';

                    coursesWithStats.push({
                        id: course.id,
                        title: course.title,
                        code: course.code,
                        description: course.description,
                        instructor: course.instructor,
                        image_url: course.image_url,
                        created_at: course.created_at,
                        updated_at: course.updated_at,
                        status: displayStatus,
                        stats: {
                            materialsCount: materials?.length || 0,
                            assessmentsCount: courseAssessments.length,
                            completedAssessments,
                            averageGrade: avgGrade,
                            progress,
                        }
                    });
                }

                setCourses(coursesWithStats);
            } else {
                // For instructors - fetch ALL their assigned/created courses
                // For admins - fetch ALL courses
                const roleCourses = role === 'instructor'
                    ? await getInstructorCourses(userProfile.id)
                    : await getCourses();
                const allAssessments = await getAssessments();

                const coursesWithStats: CourseWithStats[] = [];

                for (const course of (roleCourses || []) as any[]) {
                    const materials = await getCourseMaterials(course.id);
                    const courseAssessments = (allAssessments || []).filter(
                        (a: any) => a.course_id === course.id
                    );

                    // Count submissions for this course's assessments
                    let submissionsCount = 0;
                    // We'll estimate based on assessment count for now

                    coursesWithStats.push({
                        id: course.id,
                        title: course.title,
                        code: course.code,
                        description: course.description,
                        instructor: course.instructor,
                        image_url: course.image_url,
                        created_at: course.created_at,
                        updated_at: course.updated_at,
                        status: course.status || 'active',
                        stats: {
                            materialsCount: materials?.length || 0,
                            assessmentsCount: courseAssessments.length,
                            studentsCount: course.enrollment_count || 0,
                            submissionsCount,
                        }
                    });
                }

                setCourses(coursesWithStats);
            }
        } catch (error) {
            console.error('Error fetching courses:', error);
            toast.error('Failed to load courses');
        } finally {
            setIsLoading(false);
        }
    };

    // Filter and sort courses
    const filteredAndSortedCourses = useMemo(() => {
        let result = [...courses];

        // Apply search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(course =>
                course.title.toLowerCase().includes(query) ||
                course.code.toLowerCase().includes(query) ||
                course.instructor?.full_name?.toLowerCase().includes(query) ||
                course.instructor?.name?.toLowerCase().includes(query)
            );
        }

        // Apply status filter
        if (statusFilter !== 'all') {
            result = result.filter(course => course.status === statusFilter);
        }

        // Apply sorting
        result.sort((a, b) => {
            let comparison = 0;

            switch (sortField) {
                case 'name':
                    comparison = a.title.localeCompare(b.title);
                    break;
                case 'code':
                    comparison = a.code.localeCompare(b.code);
                    break;
                case 'newest':
                    comparison = new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
                    break;
                case 'updated':
                    comparison = new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime();
                    break;
                case 'progress':
                    comparison = (b.stats.progress || 0) - (a.stats.progress || 0);
                    break;
                case 'assessments':
                    comparison = b.stats.assessmentsCount - a.stats.assessmentsCount;
                    break;
            }

            return sortOrder === 'asc' ? -comparison : comparison;
        });

        return result;
    }, [courses, searchQuery, statusFilter, sortField, sortOrder]);

    // Pagination
    const totalPages = Math.ceil(filteredAndSortedCourses.length / ITEMS_PER_PAGE);
    const paginatedCourses = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredAndSortedCourses.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredAndSortedCourses, currentPage]);

    const handleSortChange = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('desc');
        }
    };

    const clearFilters = () => {
        setSearchQuery('');
        setStatusFilter('all');
        setSortField('newest');
        setSortOrder('desc');
    };

    const hasActiveFilters = searchQuery || statusFilter !== 'all' || sortField !== 'newest';

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                        {role === 'student' ? 'My Courses' : 'Course Management'}
                    </h2>
                    <p className="text-gray-500">
                        {role === 'student'
                            ? `${courses.length} available course${courses.length !== 1 ? 's' : ''}`
                            : `${courses.length} course${courses.length !== 1 ? 's' : ''}`}
                        {filteredAndSortedCourses.length !== courses.length && (
                            <span className="text-blue-600"> • {filteredAndSortedCourses.length} shown</span>
                        )}
                    </p>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search by name or code..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 w-64"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    {/* Filter Toggle */}
                    <Button
                        variant={showFilters ? 'secondary' : 'outline'}
                        size="sm"
                        onClick={() => setShowFilters(!showFilters)}
                        className="relative"
                    >
                        <Filter className="h-4 w-4 mr-2" />
                        Filters
                        {hasActiveFilters && (
                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-600 rounded-full" />
                        )}
                    </Button>

                    {/* View Toggle */}
                    <div className="flex items-center border rounded-lg overflow-hidden">
                        <Button
                            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => setViewMode('grid')}
                            className="rounded-none"
                        >
                            <Grid3X3 className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => setViewMode('list')}
                            className="rounded-none"
                        >
                            <List className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Create Course Button (Instructor/Admin only) */}
                    {(role === 'instructor' || role === 'admin') && onCreateCourse && (
                        <Button onClick={onCreateCourse} className="bg-blue-600 hover:bg-blue-700">
                            <Plus className="h-4 w-4 mr-2" />
                            New Course
                        </Button>
                    )}
                </div>
            </div>

            {/* Filter Bar */}
            {showFilters && (
                <Card className="p-4">
                    <div className="flex flex-wrap items-center gap-4">
                        {/* Status Filter */}
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-700">Status:</span>
                            <div className="flex gap-1">
                                {(role === 'student'
                                    ? ['all', 'active', 'completed'] as StatusFilter[]
                                    : ['all', 'draft', 'published', 'active', 'archived'] as StatusFilter[]
                                ).map((status) => (
                                    <Button
                                        key={status}
                                        variant={statusFilter === status ? 'secondary' : 'ghost'}
                                        size="sm"
                                        onClick={() => setStatusFilter(status)}
                                        className="capitalize"
                                    >
                                        {status === 'all' && 'All'}
                                        {status === 'draft' && <><Clock className="h-3 w-3 mr-1" /> Draft</>}
                                        {status === 'published' && <><CheckCircle2 className="h-3 w-3 mr-1" /> Published</>}
                                        {status === 'active' && <><CheckCircle2 className="h-3 w-3 mr-1" /> Active</>}
                                        {status === 'completed' && <><TrendingUp className="h-3 w-3 mr-1" /> Completed</>}
                                        {status === 'archived' && <><Archive className="h-3 w-3 mr-1" /> Archived</>}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <div className="h-6 w-px bg-gray-200" />

                        {/* Sort Options */}
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-700">Sort by:</span>
                            <div className="flex gap-1">
                                <Button
                                    variant={sortField === 'name' ? 'secondary' : 'ghost'}
                                    size="sm"
                                    onClick={() => handleSortChange('name')}
                                >
                                    Name {sortField === 'name' && (sortOrder === 'asc' ? <SortAsc className="h-3 w-3 ml-1" /> : <SortDesc className="h-3 w-3 ml-1" />)}
                                </Button>
                                <Button
                                    variant={sortField === 'newest' ? 'secondary' : 'ghost'}
                                    size="sm"
                                    onClick={() => handleSortChange('newest')}
                                >
                                    Newest {sortField === 'newest' && (sortOrder === 'asc' ? <SortAsc className="h-3 w-3 ml-1" /> : <SortDesc className="h-3 w-3 ml-1" />)}
                                </Button>
                                {role === 'student' && (
                                    <Button
                                        variant={sortField === 'progress' ? 'secondary' : 'ghost'}
                                        size="sm"
                                        onClick={() => handleSortChange('progress')}
                                    >
                                        Progress {sortField === 'progress' && (sortOrder === 'asc' ? <SortAsc className="h-3 w-3 ml-1" /> : <SortDesc className="h-3 w-3 ml-1" />)}
                                    </Button>
                                )}
                                {(role === 'instructor' || role === 'admin') && (
                                    <>
                                        <Button
                                            variant={sortField === 'updated' ? 'secondary' : 'ghost'}
                                            size="sm"
                                            onClick={() => handleSortChange('updated')}
                                        >
                                            Updated {sortField === 'updated' && (sortOrder === 'asc' ? <SortAsc className="h-3 w-3 ml-1" /> : <SortDesc className="h-3 w-3 ml-1" />)}
                                        </Button>
                                        <Button
                                            variant={sortField === 'assessments' ? 'secondary' : 'ghost'}
                                            size="sm"
                                            onClick={() => handleSortChange('assessments')}
                                        >
                                            Assessments {sortField === 'assessments' && (sortOrder === 'asc' ? <SortAsc className="h-3 w-3 ml-1" /> : <SortDesc className="h-3 w-3 ml-1" />)}
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Clear Filters */}
                        {hasActiveFilters && (
                            <>
                                <div className="h-6 w-px bg-gray-200" />
                                <Button variant="ghost" size="sm" onClick={clearFilters}>
                                    <X className="h-3 w-3 mr-1" />
                                    Clear Filters
                                </Button>
                            </>
                        )}
                    </div>
                </Card>
            )}

            {/* Loading State */}
            {isLoading && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                        <Card key={i} className="animate-pulse">
                            <div className="h-32 bg-gray-200 rounded-t-lg" />
                            <CardContent className="p-4 space-y-3">
                                <div className="h-4 bg-gray-200 rounded w-3/4" />
                                <div className="h-3 bg-gray-200 rounded w-1/2" />
                                <div className="h-8 bg-gray-200 rounded" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Empty State */}
            {!isLoading && filteredAndSortedCourses.length === 0 && (
                <Card className="p-12 text-center">
                    <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <BookOpen className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {searchQuery || statusFilter !== 'all' ? 'No courses match your filters' : 'No courses yet'}
                    </h3>
                    <p className="text-gray-500 mb-4">
                        {searchQuery || statusFilter !== 'all' ? (
                            <>
                                Try adjusting your search or filters to find what you're looking for.
                                <br />
                                <Button variant="link" onClick={clearFilters} className="mt-2">
                                    Clear all filters
                                </Button>
                            </>
                        ) : role === 'student' ? (
                            "You haven't enrolled in any courses yet. Contact your instructor or administrator."
                        ) : (
                            "Create your first course to get started."
                        )}
                    </p>
                    {(role === 'instructor' || role === 'admin') && onCreateCourse && !searchQuery && statusFilter === 'all' && (
                        <Button onClick={onCreateCourse}>
                            <Plus className="h-4 w-4 mr-2" />
                            Create Course
                        </Button>
                    )}
                </Card>
            )}

            {/* Course Grid/List */}
            {!isLoading && paginatedCourses.length > 0 && (
                <>
                    <div className={
                        viewMode === 'grid'
                            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                            : 'flex flex-col gap-4'
                    }>
                        {paginatedCourses.map((course) => (
                            viewMode === 'grid' ? (
                                <CourseCard
                                    key={course.id}
                                    course={course}
                                    role={role}
                                    stats={course.stats}
                                    onClick={() => onCourseSelect(course.id)}
                                />
                            ) : (
                                // Enhanced List View
                                <Card
                                    key={course.id}
                                    className="flex items-center p-4 hover:shadow-md transition-shadow cursor-pointer group"
                                    onClick={() => onCourseSelect(course.id)}
                                >
                                    <div className={`w-16 h-16 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center mr-4 flex-shrink-0`}>
                                        <BookOpen className="h-8 w-8 text-white/50" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                                                {course.title}
                                            </h3>
                                            <Badge variant="secondary" className="flex-shrink-0">{course.code}</Badge>
                                            {course.status === 'completed' && (
                                                <Badge className="bg-green-100 text-green-800 flex-shrink-0">Completed</Badge>
                                            )}
                                            {course.status === 'archived' && (
                                                <Badge variant="outline" className="flex-shrink-0">Archived</Badge>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                                            <span className="flex items-center gap-1">
                                                <FileText className="h-3 w-3" />
                                                {course.stats.materialsCount} Materials
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <ClipboardList className="h-3 w-3" />
                                                {course.stats.assessmentsCount} Assessments
                                            </span>
                                            {role === 'student' && course.stats.progress !== undefined && (
                                                <span className="flex items-center gap-1">
                                                    <TrendingUp className="h-3 w-3" />
                                                    {course.stats.progress}% Complete
                                                </span>
                                            )}
                                            {(role === 'instructor' || role === 'admin') && course.stats.studentsCount !== undefined && (
                                                <span className="flex items-center gap-1">
                                                    <Users className="h-3 w-3" />
                                                    {course.stats.studentsCount} Students
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {role === 'student' && course.stats.progress !== undefined && (
                                        <div className="mr-4 w-20">
                                            <div className="text-sm font-medium text-gray-700 text-center mb-1">
                                                {course.stats.progress}%
                                            </div>
                                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all ${course.stats.progress === 100
                                                        ? 'bg-green-500'
                                                        : course.stats.progress >= 50
                                                            ? 'bg-blue-500'
                                                            : 'bg-orange-500'
                                                        }`}
                                                    style={{ width: `${course.stats.progress}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                    <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        Open
                                    </Button>
                                </Card>
                            )
                        ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between border-t pt-4">
                            <p className="text-sm text-gray-500">
                                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredAndSortedCourses.length)} of {filteredAndSortedCourses.length} courses
                            </p>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                >
                                    <ChevronLeft className="h-4 w-4 mr-1" />
                                    Previous
                                </Button>
                                <div className="flex items-center gap-1">
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        let pageNum: number;
                                        if (totalPages <= 5) {
                                            pageNum = i + 1;
                                        } else if (currentPage <= 3) {
                                            pageNum = i + 1;
                                        } else if (currentPage >= totalPages - 2) {
                                            pageNum = totalPages - 4 + i;
                                        } else {
                                            pageNum = currentPage - 2 + i;
                                        }
                                        return (
                                            <Button
                                                key={pageNum}
                                                variant={currentPage === pageNum ? 'secondary' : 'ghost'}
                                                size="sm"
                                                onClick={() => setCurrentPage(pageNum)}
                                                className="w-8 h-8 p-0"
                                            >
                                                {pageNum}
                                            </Button>
                                        );
                                    })}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                >
                                    Next
                                    <ChevronRight className="h-4 w-4 ml-1" />
                                </Button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default CourseOverview;
