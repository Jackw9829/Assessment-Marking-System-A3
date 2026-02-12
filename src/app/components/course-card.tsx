import { Card, CardContent, CardFooter, CardHeader } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { BookOpen, FileText, ClipboardList, ChevronRight, Users, GraduationCap } from 'lucide-react';

interface CourseCardProps {
    course: {
        id: string;
        title: string;
        code: string;
        description?: string;
        instructor?: { name: string };
        image_url?: string;
    };
    role: 'student' | 'instructor' | 'admin';
    stats?: {
        materialsCount: number;
        assessmentsCount: number;
        studentsCount?: number;
        completedAssessments?: number;
        averageGrade?: number;
    };
    onClick: () => void;
}

// Course banner gradients based on course code hash
const gradients = [
    'from-blue-500 to-blue-700',
    'from-purple-500 to-purple-700',
    'from-emerald-500 to-emerald-700',
    'from-orange-500 to-orange-700',
    'from-pink-500 to-pink-700',
    'from-cyan-500 to-cyan-700',
    'from-indigo-500 to-indigo-700',
    'from-teal-500 to-teal-700',
];

function getGradient(courseId: string): string {
    let hash = 0;
    for (let i = 0; i < courseId.length; i++) {
        hash = courseId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return gradients[Math.abs(hash) % gradients.length];
}

export function CourseCard({ course, role, stats, onClick }: CourseCardProps) {
    const gradient = getGradient(course.id);
    const progress = stats?.completedAssessments && stats?.assessmentsCount
        ? Math.round((stats.completedAssessments / stats.assessmentsCount) * 100)
        : 0;

    return (
        <Card
            className="group overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer border-0 bg-white"
            onClick={onClick}
        >
            {/* Course Banner */}
            <div className={`h-32 bg-gradient-to-br ${gradient} relative overflow-hidden`}>
                {course.image_url ? (
                    <img
                        src={course.image_url}
                        alt={course.title}
                        className="absolute inset-0 w-full h-full object-cover opacity-80"
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <BookOpen className="h-16 w-16 text-white/30" />
                    </div>
                )}

                {/* Course Code Badge */}
                <Badge className="absolute top-3 left-3 bg-white/20 text-white border-0 backdrop-blur-sm">
                    {course.code}
                </Badge>

                {/* Decorative Elements */}
                <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full" />
                <div className="absolute -top-8 -left-8 w-32 h-32 bg-white/5 rounded-full" />
            </div>

            {/* Course Info */}
            <CardHeader className="pb-2">
                <h3 className="font-semibold text-lg text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                    {course.title}
                </h3>
                {course.instructor && role === 'student' && (
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                        <GraduationCap className="h-3.5 w-3.5" />
                        {course.instructor.name}
                    </p>
                )}
            </CardHeader>

            <CardContent className="pb-3">
                {/* Stats Row */}
                <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1.5">
                        <FileText className="h-4 w-4 text-blue-500" />
                        <span>{stats?.materialsCount || 0} Materials</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <ClipboardList className="h-4 w-4 text-purple-500" />
                        <span>{stats?.assessmentsCount || 0} Assessments</span>
                    </div>
                </div>

                {/* Instructor-specific: Students count */}
                {role === 'instructor' && stats?.studentsCount !== undefined && (
                    <div className="flex items-center gap-1.5 text-sm text-gray-600 mt-2">
                        <Users className="h-4 w-4 text-emerald-500" />
                        <span>{stats.studentsCount} Students</span>
                    </div>
                )}

                {/* Student Progress */}
                {role === 'student' && stats?.assessmentsCount && stats.assessmentsCount > 0 && (
                    <div className="mt-3">
                        <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-gray-500">Progress</span>
                            <span className="font-medium text-gray-700">{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-1.5" />
                    </div>
                )}

                {/* Average Grade */}
                {role === 'student' && stats?.averageGrade !== undefined && stats.averageGrade > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                        <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                            Avg: {stats.averageGrade}%
                        </Badge>
                    </div>
                )}
            </CardContent>

            <CardFooter className="pt-0 pb-4">
                <Button
                    variant="ghost"
                    className="w-full group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors"
                >
                    Open Course
                    <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </Button>
            </CardFooter>
        </Card>
    );
}

export default CourseCard;
