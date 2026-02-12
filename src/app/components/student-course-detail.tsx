import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { toast } from 'sonner';
import {
    ArrowLeft,
    BookOpen,
    FileText,
    ClipboardList,
    Award,
    Download,
    Upload,
    Calendar,
    Clock,
    CheckCircle2,
    AlertTriangle,
    GraduationCap,
    Eye,
    Send,
    ChevronRight,
    File,
    FileImage,
    FileVideo,
    FileArchive
} from 'lucide-react';
import {
    getCourseMaterials,
    getAssessments,
    getStudentSubmissions,
    getStudentGrades,
    downloadMaterial,
    submitAssessment
} from '@/lib/supabase-helpers';

interface StudentCourseDetailProps {
    courseId: string;
    course: {
        id: string;
        title: string;
        code: string;
        description?: string;
        instructor?: { name: string };
        image_url?: string;
    };
    userProfile: any;
    onBack: () => void;
}

// Course banner gradients
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

function getFileIcon(fileType: string) {
    if (fileType.includes('image')) return <FileImage className="h-5 w-5 text-purple-500" />;
    if (fileType.includes('video')) return <FileVideo className="h-5 w-5 text-red-500" />;
    if (fileType.includes('zip') || fileType.includes('rar')) return <FileArchive className="h-5 w-5 text-yellow-500" />;
    if (fileType.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />;
    return <File className="h-5 w-5 text-blue-500" />;
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export function StudentCourseDetail({ courseId, course, userProfile, onBack }: StudentCourseDetailProps) {
    const [activeTab, setActiveTab] = useState('overview');
    const [materials, setMaterials] = useState<any[]>([]);
    const [assessments, setAssessments] = useState<any[]>([]);
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [grades, setGrades] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Submission state
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [selectedAssessment, setSelectedAssessment] = useState<any>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitDialogOpen, setSubmitDialogOpen] = useState(false);

    const gradient = getGradient(courseId);

    useEffect(() => {
        fetchCourseData();
    }, [courseId, userProfile.id]);

    const fetchCourseData = async () => {
        setIsLoading(true);
        try {
            // Fetch materials
            const courseMaterials = await getCourseMaterials(courseId);
            setMaterials(courseMaterials || []);

            // Fetch assessments for this course
            const allAssessments = await getAssessments();
            const courseAssessments = (allAssessments || []).filter(
                (a: any) => a.course_id === courseId
            );
            setAssessments(courseAssessments);

            // Fetch student submissions
            const studentSubmissions = await getStudentSubmissions(userProfile.id);
            setSubmissions(studentSubmissions || []);

            // Fetch student grades
            const studentGrades = await getStudentGrades(userProfile.id);
            setGrades(studentGrades || []);
        } catch (error) {
            console.error('Error fetching course data:', error);
            toast.error('Failed to load course data');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownloadMaterial = async (material: any) => {
        try {
            const url = await downloadMaterial(material.file_path);
            const link = document.createElement('a');
            link.href = url;
            link.download = material.file_name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success('Download started');
        } catch (error: any) {
            console.error('Download error:', error);
            toast.error(error.message || 'Failed to download material');
        }
    };

    const handleSubmitAssessment = async () => {
        if (!selectedFile || !selectedAssessment) {
            toast.error('Please select a file');
            return;
        }

        setIsSubmitting(true);
        try {
            await submitAssessment(selectedAssessment.id, selectedFile);
            toast.success('Assessment submitted successfully!');
            setSelectedFile(null);
            setSelectedAssessment(null);
            setSubmitDialogOpen(false);
            await fetchCourseData();
        } catch (error: any) {
            console.error('Submission error:', error);
            toast.error(error.message || 'Failed to submit assessment');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getAssessmentStatus = (assessment: any) => {
        const submission = submissions.find(s => s.assessment_id === assessment.id);
        const grade = grades.find(g => g.submission?.assessment_id === assessment.id);
        const now = new Date();
        const due = new Date(assessment.due_date);
        const isOverdue = due < now;

        if (grade) {
            return { status: 'graded', label: 'Graded', color: 'bg-green-100 text-green-800 border-green-200' };
        }
        if (submission) {
            return { status: 'submitted', label: 'Submitted', color: 'bg-blue-100 text-blue-800 border-blue-200' };
        }
        if (isOverdue) {
            return { status: 'overdue', label: 'Overdue', color: 'bg-red-100 text-red-800 border-red-200' };
        }

        const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 3) {
            return { status: 'urgent', label: `Due in ${diffDays}d`, color: 'bg-orange-100 text-orange-800 border-orange-200' };
        }
        return { status: 'pending', label: 'Pending', color: 'bg-gray-100 text-gray-800 border-gray-200' };
    };

    const getGradeForAssessment = (assessmentId: string) => {
        return grades.find(g => g.submission?.assessment_id === assessmentId);
    };

    // Calculate stats
    const completedCount = assessments.filter(a => {
        const status = getAssessmentStatus(a);
        return ['submitted', 'graded'].includes(status.status);
    }).length;

    const progress = assessments.length > 0
        ? Math.round((completedCount / assessments.length) * 100)
        : 0;

    const avgGrade = grades.length > 0
        ? Math.round(grades.reduce((sum, g) => sum + (g.score / g.total_marks) * 100, 0) / grades.length)
        : null;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
            {/* Course Banner */}
            <div className={`h-48 md:h-56 bg-gradient-to-br ${gradient} relative overflow-hidden`}>
                {course.image_url && (
                    <img
                        src={course.image_url}
                        alt={course.title}
                        className="absolute inset-0 w-full h-full object-cover opacity-60"
                    />
                )}

                {/* Back Button */}
                <Button
                    variant="ghost"
                    onClick={onBack}
                    className="absolute top-4 left-4 text-white hover:bg-white/20"
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Courses
                </Button>

                {/* Course Info */}
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/60 to-transparent">
                    <Badge className="mb-2 bg-white/20 text-white border-0 backdrop-blur-sm">
                        {course.code}
                    </Badge>
                    <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
                        {course.title}
                    </h1>
                    {course.instructor && (
                        <p className="text-white/80 flex items-center gap-2">
                            <GraduationCap className="h-4 w-4" />
                            {course.instructor.name}
                        </p>
                    )}
                </div>

                {/* Decorative */}
                <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-white/10 rounded-full" />
                <div className="absolute top-8 right-8 w-24 h-24 bg-white/5 rounded-full" />
            </div>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-6 -mt-4">
                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <Card className="bg-white border-l-4 border-l-blue-500">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wide">Materials</p>
                                <p className="text-2xl font-bold text-gray-900">{materials.length}</p>
                            </div>
                            <FileText className="h-8 w-8 text-blue-200" />
                        </CardContent>
                    </Card>

                    <Card className="bg-white border-l-4 border-l-purple-500">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wide">Assessments</p>
                                <p className="text-2xl font-bold text-gray-900">{assessments.length}</p>
                            </div>
                            <ClipboardList className="h-8 w-8 text-purple-200" />
                        </CardContent>
                    </Card>

                    <Card className="bg-white border-l-4 border-l-emerald-500">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wide">Progress</p>
                                <p className="text-2xl font-bold text-emerald-600">{progress}%</p>
                            </div>
                            <CheckCircle2 className="h-8 w-8 text-emerald-200" />
                        </CardContent>
                    </Card>

                    <Card className="bg-white border-l-4 border-l-amber-500">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wide">Avg Grade</p>
                                <p className="text-2xl font-bold text-amber-600">{avgGrade !== null ? `${avgGrade}%` : '--'}</p>
                            </div>
                            <Award className="h-8 w-8 text-amber-200" />
                        </CardContent>
                    </Card>
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                    <TabsList className="bg-white border shadow-sm p-1">
                        <TabsTrigger value="overview" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
                            <Eye className="h-4 w-4 mr-2" />
                            Overview
                        </TabsTrigger>
                        <TabsTrigger value="materials" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
                            <FileText className="h-4 w-4 mr-2" />
                            Materials
                        </TabsTrigger>
                        <TabsTrigger value="assessments" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
                            <ClipboardList className="h-4 w-4 mr-2" />
                            Assessments
                        </TabsTrigger>
                        <TabsTrigger value="grades" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
                            <Award className="h-4 w-4 mr-2" />
                            Grades
                        </TabsTrigger>
                    </TabsList>

                    {/* Overview Tab */}
                    <TabsContent value="overview" className="space-y-6">
                        {/* Course Description */}
                        {course.description && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <BookOpen className="h-5 w-5 text-blue-500" />
                                        About This Course
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-gray-600">{course.description}</p>
                                </CardContent>
                            </Card>
                        )}

                        {/* Recent/Upcoming */}
                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Recent Materials */}
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <FileText className="h-5 w-5 text-blue-500" />
                                        Recent Materials
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    {materials.slice(0, 3).map((material) => (
                                        <div key={material.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                                            <div className="flex items-center gap-2">
                                                {getFileIcon(material.file_type)}
                                                <span className="text-sm font-medium">{material.title}</span>
                                            </div>
                                            <Button variant="ghost" size="sm" onClick={() => handleDownloadMaterial(material)}>
                                                <Download className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                    {materials.length === 0 && (
                                        <p className="text-sm text-gray-500 text-center py-4">No materials yet</p>
                                    )}
                                    {materials.length > 3 && (
                                        <Button variant="link" className="w-full" onClick={() => setActiveTab('materials')}>
                                            View all {materials.length} materials
                                            <ChevronRight className="h-4 w-4 ml-1" />
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Upcoming Assessments */}
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <ClipboardList className="h-5 w-5 text-purple-500" />
                                        Upcoming Assessments
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    {assessments
                                        .filter(a => getAssessmentStatus(a).status !== 'graded')
                                        .slice(0, 3)
                                        .map((assessment) => {
                                            const status = getAssessmentStatus(assessment);
                                            return (
                                                <div key={assessment.id} className={`flex items-center justify-between p-2 rounded-lg border ${status.color}`}>
                                                    <div>
                                                        <p className="text-sm font-medium">{assessment.title}</p>
                                                        <p className="text-xs opacity-80">
                                                            Due: {new Date(assessment.due_date).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                    <Badge variant="outline" className={status.color}>
                                                        {status.label}
                                                    </Badge>
                                                </div>
                                            );
                                        })}
                                    {assessments.filter(a => getAssessmentStatus(a).status !== 'graded').length === 0 && (
                                        <p className="text-sm text-gray-500 text-center py-4">All assessments completed!</p>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Materials Tab */}
                    <TabsContent value="materials">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-blue-500" />
                                    Learning Materials
                                </CardTitle>
                                <CardDescription>
                                    {materials.length} materials available
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {isLoading ? (
                                    <div className="space-y-3">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="animate-pulse flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                                                <div className="w-10 h-10 bg-gray-200 rounded" />
                                                <div className="flex-1 space-y-2">
                                                    <div className="h-4 bg-gray-200 rounded w-1/3" />
                                                    <div className="h-3 bg-gray-200 rounded w-1/4" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : materials.length === 0 ? (
                                    <div className="text-center py-12">
                                        <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                                        <p className="text-gray-500">No materials uploaded yet</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {materials.map((material) => (
                                            <div
                                                key={material.id}
                                                className="flex items-center gap-4 p-4 rounded-lg border bg-white hover:bg-gray-50 transition-colors"
                                            >
                                                <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                                                    {getFileIcon(material.file_type)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-medium text-gray-900 truncate">{material.title}</h4>
                                                    {material.description && (
                                                        <p className="text-sm text-gray-500 truncate">{material.description}</p>
                                                    )}
                                                    <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                                                        <span>{formatFileSize(material.file_size)}</span>
                                                        <span>•</span>
                                                        <span>{new Date(material.created_at).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleDownloadMaterial(material)}
                                                >
                                                    <Download className="h-4 w-4 mr-2" />
                                                    Download
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Assessments Tab */}
                    <TabsContent value="assessments">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <ClipboardList className="h-5 w-5 text-purple-500" />
                                    Assessments
                                </CardTitle>
                                <CardDescription>
                                    {completedCount} of {assessments.length} completed
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {isLoading ? (
                                    <div className="space-y-3">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="animate-pulse p-4 rounded-lg bg-gray-50">
                                                <div className="h-5 bg-gray-200 rounded w-1/2 mb-2" />
                                                <div className="h-4 bg-gray-200 rounded w-1/3" />
                                            </div>
                                        ))}
                                    </div>
                                ) : assessments.length === 0 ? (
                                    <div className="text-center py-12">
                                        <ClipboardList className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                                        <p className="text-gray-500">No assessments assigned yet</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {assessments.map((assessment) => {
                                            const status = getAssessmentStatus(assessment);
                                            const grade = getGradeForAssessment(assessment.id);
                                            const canSubmit = !['graded', 'submitted'].includes(status.status);

                                            return (
                                                <div
                                                    key={assessment.id}
                                                    className={`p-4 rounded-lg border ${status.color} transition-colors`}
                                                >
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <h4 className="font-semibold text-gray-900">{assessment.title}</h4>
                                                                <Badge variant="outline" className={status.color}>
                                                                    {status.label}
                                                                </Badge>
                                                            </div>
                                                            {assessment.description && (
                                                                <p className="text-sm text-gray-600 mb-2">{assessment.description}</p>
                                                            )}
                                                            <div className="flex items-center gap-4 text-sm">
                                                                <span className="flex items-center gap-1 text-gray-500">
                                                                    <Calendar className="h-4 w-4" />
                                                                    Due: {new Date(assessment.due_date).toLocaleDateString()}
                                                                </span>
                                                                <span className="flex items-center gap-1 text-gray-500">
                                                                    <Award className="h-4 w-4" />
                                                                    {assessment.total_marks} marks
                                                                </span>
                                                            </div>
                                                            {grade && (
                                                                <div className="mt-2 text-sm">
                                                                    <span className="font-medium text-emerald-700">
                                                                        Score: {grade.score}/{grade.total_marks} ({Math.round((grade.score / grade.total_marks) * 100)}%)
                                                                    </span>
                                                                    {grade.feedback && (
                                                                        <p className="text-gray-600 mt-1">Feedback: {grade.feedback}</p>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                        {canSubmit && (
                                                            <Dialog open={submitDialogOpen && selectedAssessment?.id === assessment.id} onOpenChange={(open) => {
                                                                setSubmitDialogOpen(open);
                                                                if (open) setSelectedAssessment(assessment);
                                                            }}>
                                                                <DialogTrigger asChild>
                                                                    <Button className="bg-blue-600 hover:bg-blue-700">
                                                                        <Upload className="h-4 w-4 mr-2" />
                                                                        Submit
                                                                    </Button>
                                                                </DialogTrigger>
                                                                <DialogContent>
                                                                    <DialogHeader>
                                                                        <DialogTitle>Submit Assessment</DialogTitle>
                                                                        <DialogDescription>
                                                                            Upload your submission for "{assessment.title}"
                                                                        </DialogDescription>
                                                                    </DialogHeader>
                                                                    <div className="space-y-4 py-4">
                                                                        <div>
                                                                            <Label htmlFor="file">Select File</Label>
                                                                            <input
                                                                                id="file"
                                                                                type="file"
                                                                                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                                                                className="mt-2 w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                                                            />
                                                                        </div>
                                                                        {selectedFile && (
                                                                            <p className="text-sm text-gray-600">
                                                                                Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                    <DialogFooter>
                                                                        <Button variant="outline" onClick={() => setSubmitDialogOpen(false)}>
                                                                            Cancel
                                                                        </Button>
                                                                        <Button
                                                                            onClick={handleSubmitAssessment}
                                                                            disabled={!selectedFile || isSubmitting}
                                                                            className="bg-blue-600 hover:bg-blue-700"
                                                                        >
                                                                            {isSubmitting ? 'Submitting...' : 'Submit'}
                                                                        </Button>
                                                                    </DialogFooter>
                                                                </DialogContent>
                                                            </Dialog>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Grades Tab */}
                    <TabsContent value="grades">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Award className="h-5 w-5 text-amber-500" />
                                    My Grades
                                </CardTitle>
                                <CardDescription>
                                    {grades.length} grades released
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {grades.length === 0 ? (
                                    <div className="text-center py-12">
                                        <Award className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                                        <p className="text-gray-500">No grades released yet</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {grades.map((grade) => {
                                            const percentage = Math.round((grade.score / grade.total_marks) * 100);
                                            return (
                                                <div key={grade.id} className="p-4 rounded-lg border bg-white">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <h4 className="font-medium">{grade.submission?.assessment?.title || 'Assessment'}</h4>
                                                        <Badge
                                                            variant="outline"
                                                            className={
                                                                percentage >= 70
                                                                    ? 'bg-green-50 text-green-700 border-green-200'
                                                                    : percentage >= 50
                                                                        ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                                                        : 'bg-red-50 text-red-700 border-red-200'
                                                            }
                                                        >
                                                            {percentage}%
                                                        </Badge>
                                                    </div>
                                                    <div className="flex items-center gap-4 text-sm text-gray-500">
                                                        <span>Score: {grade.score}/{grade.total_marks}</span>
                                                        <span>•</span>
                                                        <span>Graded: {new Date(grade.graded_at).toLocaleDateString()}</span>
                                                    </div>
                                                    {grade.feedback && (
                                                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                                            <p className="text-sm text-gray-600">
                                                                <span className="font-medium">Feedback:</span> {grade.feedback}
                                                            </p>
                                                        </div>
                                                    )}
                                                    <Progress value={percentage} className="mt-3 h-2" />
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
}

export default StudentCourseDetail;
