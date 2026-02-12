import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { Search, BookOpen, GraduationCap, Filter, Grid3X3, List, Plus } from 'lucide-react';
import { CourseCard } from './course-card';
import {
    getCourses,
    getStudentEnrollments,
    getCourseMaterials,
    getAssessments,
    getStudentSubmissions,
    getStudentGrades,
    getInstructorCourses,
    getEnrolledCourses
} from '@/lib/supabase-helpers';

interface CourseOverviewProps {
    userProfile: any;
    role: 'student' | 'instructor' | 'admin';
    onCourseSelect: (courseId: string) => void;
    onCreateCourse?: () => void;
}

interface CourseWithStats {
    id: string;
    title: string;
    code: string;
    description?: string;
    instructor?: { name: string };
    image_url?: string;
    stats: {
        materialsCount: number;
        assessmentsCount: number;
        studentsCount?: number;
        completedAssessments?: number;
        averageGrade?: number;
    };
}

export function CourseOverview({ userProfile, role, onCourseSelect, onCreateCourse }: CourseOverviewProps) {
    const [courses, setCourses] = useState<CourseWithStats[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchCourses();
    }, [userProfile.id, role]);

    const fetchCourses = async () => {
        setIsLoading(true);
        try {
            if (role === 'student') {
                // Fetch enrolled courses for students
                const enrollments = await getStudentEnrollments(userProfile.id);
                const submissions = await getStudentSubmissions(userProfile.id);
                const grades = await getStudentGrades(userProfile.id);
                const allAssessments = await getAssessments();

                const coursesWithStats: CourseWithStats[] = [];

                for (const enrollment of (enrollments || []) as any[]) {
                    const course = enrollment.course as any;
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

                    coursesWithStats.push({
                        id: course.id,
                        title: course.title,
                        code: course.code,
                        description: course.description,
                        instructor: course.instructor,
                        image_url: course.image_url,
                        stats: {
                            materialsCount: materials?.length || 0,
                            assessmentsCount: courseAssessments.length,
                            completedAssessments,
                            averageGrade: avgGrade,
                        }
                    });
                }

                setCourses(coursesWithStats);
            } else {
                // For instructors - fetch their assigned courses, for admins - fetch all
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

                    coursesWithStats.push({
                        id: course.id,
                        title: course.title,
                        code: course.code,
                        description: course.description,
                        instructor: course.instructor,
                        image_url: course.image_url,
                        stats: {
                            materialsCount: materials?.length || 0,
                            assessmentsCount: courseAssessments.length,
                            studentsCount: course.enrollment_count || 0,
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

    const filteredCourses = courses.filter(course =>
        course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.code.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
                            ? `${courses.length} enrolled courses`
                            : `${courses.length} courses`}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search courses..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 w-64"
                        />
                    </div>

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

                    {/* Create Course Button (Instructor only) */}
                    {role === 'instructor' && onCreateCourse && (
                        <Button onClick={onCreateCourse} className="bg-blue-600 hover:bg-blue-700">
                            <Plus className="h-4 w-4 mr-2" />
                            New Course
                        </Button>
                    )}
                </div>
            </div>

            {/* Loading State */}
            {isLoading && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map((i) => (
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
            {!isLoading && filteredCourses.length === 0 && (
                <Card className="p-12 text-center">
                    <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <BookOpen className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {searchQuery ? 'No courses found' : 'No courses yet'}
                    </h3>
                    <p className="text-gray-500 mb-4">
                        {role === 'student'
                            ? "You haven't enrolled in any courses yet."
                            : "Create your first course to get started."}
                    </p>
                    {role === 'instructor' && onCreateCourse && (
                        <Button onClick={onCreateCourse}>
                            <Plus className="h-4 w-4 mr-2" />
                            Create Course
                        </Button>
                    )}
                </Card>
            )}

            {/* Course Grid */}
            {!isLoading && filteredCourses.length > 0 && (
                <div className={
                    viewMode === 'grid'
                        ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                        : 'flex flex-col gap-4'
                }>
                    {filteredCourses.map((course) => (
                        viewMode === 'grid' ? (
                            <CourseCard
                                key={course.id}
                                course={course}
                                role={role}
                                stats={course.stats}
                                onClick={() => onCourseSelect(course.id)}
                            />
                        ) : (
                            // List View
                            <Card
                                key={course.id}
                                className="flex items-center p-4 hover:shadow-md transition-shadow cursor-pointer"
                                onClick={() => onCourseSelect(course.id)}
                            >
                                <div className={`w-16 h-16 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center mr-4 flex-shrink-0`}>
                                    <BookOpen className="h-8 w-8 text-white/50" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-semibold text-gray-900 truncate">{course.title}</h3>
                                        <Badge variant="secondary" className="flex-shrink-0">{course.code}</Badge>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                                        <span>{course.stats.materialsCount} Materials</span>
                                        <span>{course.stats.assessmentsCount} Assessments</span>
                                        {role === 'instructor' && course.stats.studentsCount !== undefined && (
                                            <span>{course.stats.studentsCount} Students</span>
                                        )}
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm">
                                    Open
                                </Button>
                            </Card>
                        )
                    ))}
                </div>
            )}
        </div>
    );
}

export default CourseOverview;
