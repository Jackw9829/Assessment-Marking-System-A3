import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';
import {
    ArrowLeft,
    BookOpen,
    FileText,
    ClipboardList,
    Upload,
    Calendar,
    Clock,
    CheckCircle2,
    AlertTriangle,
    GraduationCap,
    Eye,
    Plus,
    Settings,
    Users,
    Download,
    Trash2,
    Calculator,
    ChevronRight,
    File,
    FileImage,
    FileVideo,
    FileArchive,
    Send,
    MessageSquare
} from 'lucide-react';
import {
    getCourseMaterials,
    getAssessments,
    getSubmissionsForGrading,
    getGradedSubmissionsForInstructor,
    uploadMaterial,
    createAssessment,
    downloadMaterial,
    getRubricTemplate
} from '@/lib/supabase-helpers';
import { DocumentPreview } from './document-preview';

interface InstructorCourseDetailProps {
    courseId: string;
    course: {
        id: string;
        title: string;
        code: string;
        description?: string;
        image_url?: string;
    };
    userProfile: any;
    onBack: () => void;
    onOpenGrading?: (submission: any) => void;
    onOpenRubric?: (assessment: any) => void;
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

export function InstructorCourseDetail({
    courseId,
    course,
    userProfile,
    onBack,
    onOpenGrading,
    onOpenRubric
}: InstructorCourseDetailProps) {
    const [activeTab, setActiveTab] = useState('materials');
    const [materials, setMaterials] = useState<any[]>([]);
    const [assessments, setAssessments] = useState<any[]>([]);
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [gradedSubmissions, setGradedSubmissions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Upload material state
    const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
    const [materialTitle, setMaterialTitle] = useState('');
    const [materialDesc, setMaterialDesc] = useState('');
    const [materialFile, setMaterialFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    // Create assessment state
    const [assessmentDialogOpen, setAssessmentDialogOpen] = useState(false);
    const [assessmentTitle, setAssessmentTitle] = useState('');
    const [assessmentDesc, setAssessmentDesc] = useState('');
    const [assessmentDue, setAssessmentDue] = useState('');
    const [assessmentMarks, setAssessmentMarks] = useState('100');
    const [isCreating, setIsCreating] = useState(false);

    // Preview state
    const [previewSubmission, setPreviewSubmission] = useState<any>(null);

    const gradient = getGradient(courseId);

    useEffect(() => {
        fetchCourseData();
    }, [courseId]);

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

            // Fetch submissions for grading
            const allSubmissions = await getSubmissionsForGrading();
            const courseSubmissions = (allSubmissions || []).filter(
                (s: any) => courseAssessments.some((a: any) => a.id === s.assessment_id)
            );
            setSubmissions(courseSubmissions);

            // Fetch graded submissions
            const allGraded = await getGradedSubmissionsForInstructor();
            const courseGraded = (allGraded || []).filter(
                (g: any) => courseAssessments.some((a: any) => a.id === g.submission?.assessment_id)
            );
            setGradedSubmissions(courseGraded);
        } catch (error) {
            console.error('Error fetching course data:', error);
            toast.error('Failed to load course data');
        } finally {
            setIsLoading(false);
        }
    };

    const handleUploadMaterial = async () => {
        if (!materialFile || !materialTitle) {
            toast.error('Please fill all required fields');
            return;
        }

        setIsUploading(true);
        try {
            await uploadMaterial(courseId, materialFile, materialTitle, materialDesc);
            toast.success('Material uploaded successfully!');
            setMaterialTitle('');
            setMaterialDesc('');
            setMaterialFile(null);
            setUploadDialogOpen(false);
            await fetchCourseData();
        } catch (error: any) {
            console.error('Upload error:', error);
            toast.error(error.message || 'Failed to upload material');
        } finally {
            setIsUploading(false);
        }
    };

    const handleCreateAssessment = async () => {
        if (!assessmentTitle || !assessmentDue || !assessmentMarks) {
            toast.error('Please fill all required fields');
            return;
        }

        setIsCreating(true);
        try {
            await createAssessment(
                courseId,
                assessmentTitle,
                assessmentDesc || null,
                assessmentDue,
                parseInt(assessmentMarks)
            );
            toast.success('Assessment created successfully!');
            setAssessmentTitle('');
            setAssessmentDesc('');
            setAssessmentDue('');
            setAssessmentMarks('100');
            setAssessmentDialogOpen(false);
            await fetchCourseData();
        } catch (error: any) {
            console.error('Create error:', error);
            toast.error(error.message || 'Failed to create assessment');
        } finally {
            setIsCreating(false);
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
            toast.error(error.message || 'Failed to download');
        }
    };

    const getSubmissionStats = (assessmentId: string) => {
        const assessmentSubmissions = submissions.filter(s => s.assessment_id === assessmentId);
        const graded = gradedSubmissions.filter(g => g.submission?.assessment_id === assessmentId);
        return {
            total: assessmentSubmissions.length,
            pending: assessmentSubmissions.filter(s => s.status === 'submitted').length,
            graded: graded.length
        };
    };

    const pendingCount = submissions.filter(s => s.status === 'submitted').length;
    const gradedCount = gradedSubmissions.length;

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
                    <p className="text-white/80 flex items-center gap-2">
                        <GraduationCap className="h-4 w-4" />
                        Instructor View
                    </p>
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

                    <Card className={`bg-white border-l-4 ${pendingCount > 0 ? 'border-l-orange-500' : 'border-l-emerald-500'}`}>
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wide">Pending</p>
                                <p className={`text-2xl font-bold ${pendingCount > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>{pendingCount}</p>
                            </div>
                            {pendingCount > 0 ? (
                                <AlertTriangle className="h-8 w-8 text-orange-200" />
                            ) : (
                                <CheckCircle2 className="h-8 w-8 text-emerald-200" />
                            )}
                        </CardContent>
                    </Card>

                    <Card className="bg-white border-l-4 border-l-green-500">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wide">Graded</p>
                                <p className="text-2xl font-bold text-green-600">{gradedCount}</p>
                            </div>
                            <CheckCircle2 className="h-8 w-8 text-green-200" />
                        </CardContent>
                    </Card>
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                    <TabsList className="bg-white border shadow-sm p-1">
                        <TabsTrigger value="materials" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
                            <FileText className="h-4 w-4 mr-2" />
                            Materials
                        </TabsTrigger>
                        <TabsTrigger value="assessments" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
                            <ClipboardList className="h-4 w-4 mr-2" />
                            Assessments
                        </TabsTrigger>
                        <TabsTrigger value="submissions" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
                            <Send className="h-4 w-4 mr-2" />
                            Submissions
                            {pendingCount > 0 && (
                                <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 text-xs">
                                    {pendingCount}
                                </Badge>
                            )}
                        </TabsTrigger>
                    </TabsList>

                    {/* Materials Tab */}
                    <TabsContent value="materials">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <FileText className="h-5 w-5 text-blue-500" />
                                        Learning Materials
                                    </CardTitle>
                                    <CardDescription>{materials.length} materials uploaded</CardDescription>
                                </div>
                                <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button className="bg-blue-600 hover:bg-blue-700">
                                            <Upload className="h-4 w-4 mr-2" />
                                            Upload Material
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Upload Learning Material</DialogTitle>
                                            <DialogDescription>
                                                Add a new learning material to this course
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-4 py-4">
                                            <div>
                                                <Label htmlFor="title">Title *</Label>
                                                <Input
                                                    id="title"
                                                    value={materialTitle}
                                                    onChange={(e) => setMaterialTitle(e.target.value)}
                                                    placeholder="e.g., Week 1 Lecture Notes"
                                                    className="mt-1"
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor="description">Description</Label>
                                                <Textarea
                                                    id="description"
                                                    value={materialDesc}
                                                    onChange={(e) => setMaterialDesc(e.target.value)}
                                                    placeholder="Brief description of the material"
                                                    className="mt-1"
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor="file">File *</Label>
                                                <input
                                                    id="file"
                                                    type="file"
                                                    onChange={(e) => setMaterialFile(e.target.files?.[0] || null)}
                                                    className="mt-2 w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                                />
                                            </div>
                                            {materialFile && (
                                                <p className="text-sm text-gray-600">
                                                    Selected: {materialFile.name} ({formatFileSize(materialFile.size)})
                                                </p>
                                            )}
                                        </div>
                                        <DialogFooter>
                                            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
                                                Cancel
                                            </Button>
                                            <Button
                                                onClick={handleUploadMaterial}
                                                disabled={!materialFile || !materialTitle || isUploading}
                                                className="bg-blue-600 hover:bg-blue-700"
                                            >
                                                {isUploading ? 'Uploading...' : 'Upload'}
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
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
                                        <p className="text-gray-500 mb-4">No materials uploaded yet</p>
                                        <Button onClick={() => setUploadDialogOpen(true)}>
                                            <Upload className="h-4 w-4 mr-2" />
                                            Upload First Material
                                        </Button>
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
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleDownloadMaterial(material)}
                                                    >
                                                        <Download className="h-4 w-4" />
                                                    </Button>
                                                </div>
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
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <ClipboardList className="h-5 w-5 text-purple-500" />
                                        Assessments
                                    </CardTitle>
                                    <CardDescription>{assessments.length} assessments created</CardDescription>
                                </div>
                                <Dialog open={assessmentDialogOpen} onOpenChange={setAssessmentDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button className="bg-purple-600 hover:bg-purple-700">
                                            <Plus className="h-4 w-4 mr-2" />
                                            Create Assessment
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Create Assessment</DialogTitle>
                                            <DialogDescription>
                                                Add a new assessment for students to complete
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-4 py-4">
                                            <div>
                                                <Label htmlFor="assessTitle">Title *</Label>
                                                <Input
                                                    id="assessTitle"
                                                    value={assessmentTitle}
                                                    onChange={(e) => setAssessmentTitle(e.target.value)}
                                                    placeholder="e.g., Assignment 1"
                                                    className="mt-1"
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor="assessDesc">Description</Label>
                                                <Textarea
                                                    id="assessDesc"
                                                    value={assessmentDesc}
                                                    onChange={(e) => setAssessmentDesc(e.target.value)}
                                                    placeholder="Instructions for the assessment"
                                                    className="mt-1"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <Label htmlFor="dueDate">Due Date *</Label>
                                                    <Input
                                                        id="dueDate"
                                                        type="datetime-local"
                                                        value={assessmentDue}
                                                        onChange={(e) => setAssessmentDue(e.target.value)}
                                                        className="mt-1"
                                                    />
                                                </div>
                                                <div>
                                                    <Label htmlFor="totalMarks">Total Marks *</Label>
                                                    <Input
                                                        id="totalMarks"
                                                        type="number"
                                                        value={assessmentMarks}
                                                        onChange={(e) => setAssessmentMarks(e.target.value)}
                                                        className="mt-1"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button variant="outline" onClick={() => setAssessmentDialogOpen(false)}>
                                                Cancel
                                            </Button>
                                            <Button
                                                onClick={handleCreateAssessment}
                                                disabled={!assessmentTitle || !assessmentDue || !assessmentMarks || isCreating}
                                                className="bg-purple-600 hover:bg-purple-700"
                                            >
                                                {isCreating ? 'Creating...' : 'Create'}
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
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
                                        <p className="text-gray-500 mb-4">No assessments created yet</p>
                                        <Button onClick={() => setAssessmentDialogOpen(true)}>
                                            <Plus className="h-4 w-4 mr-2" />
                                            Create First Assessment
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {assessments.map((assessment) => {
                                            const stats = getSubmissionStats(assessment.id);
                                            const now = new Date();
                                            const due = new Date(assessment.due_date);
                                            const isPast = due < now;

                                            return (
                                                <div
                                                    key={assessment.id}
                                                    className="p-4 rounded-lg border bg-white hover:bg-gray-50 transition-colors"
                                                >
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <h4 className="font-semibold text-gray-900">{assessment.title}</h4>
                                                                {isPast && (
                                                                    <Badge variant="outline" className="bg-gray-100 text-gray-600">
                                                                        Closed
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            {assessment.description && (
                                                                <p className="text-sm text-gray-600 mb-2">{assessment.description}</p>
                                                            )}
                                                            <div className="flex items-center gap-4 text-sm text-gray-500">
                                                                <span className="flex items-center gap-1">
                                                                    <Calendar className="h-4 w-4" />
                                                                    Due: {new Date(assessment.due_date).toLocaleString()}
                                                                </span>
                                                                <span className="flex items-center gap-1">
                                                                    <Calculator className="h-4 w-4" />
                                                                    {assessment.total_marks} marks
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-4 mt-2 text-sm">
                                                                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                                                    {stats.total} submissions
                                                                </Badge>
                                                                {stats.pending > 0 && (
                                                                    <Badge variant="outline" className="bg-orange-50 text-orange-700">
                                                                        {stats.pending} pending
                                                                    </Badge>
                                                                )}
                                                                <Badge variant="outline" className="bg-green-50 text-green-700">
                                                                    {stats.graded} graded
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col gap-2">
                                                            {onOpenRubric && (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => onOpenRubric(assessment)}
                                                                >
                                                                    <Settings className="h-4 w-4 mr-1" />
                                                                    Rubric
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Submissions Tab */}
                    <TabsContent value="submissions">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Send className="h-5 w-5 text-emerald-500" />
                                    Student Submissions
                                </CardTitle>
                                <CardDescription>
                                    {pendingCount} pending review • {gradedCount} graded
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
                                ) : submissions.length === 0 ? (
                                    <div className="text-center py-12">
                                        <Send className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                                        <p className="text-gray-500">No submissions yet</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {submissions.map((submission) => {
                                            const isLate = submission.submitted_at && submission.assessment?.due_date &&
                                                new Date(submission.submitted_at) > new Date(submission.assessment.due_date);
                                            const isGraded = submission.status === 'graded';

                                            return (
                                                <div
                                                    key={submission.id}
                                                    className={`p-4 rounded-lg border ${isGraded
                                                        ? 'bg-green-50 border-green-200'
                                                        : 'bg-white border-gray-200'
                                                        } hover:shadow-sm transition-all`}
                                                >
                                                    <div className="flex items-center justify-between gap-4">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <h4 className="font-medium text-gray-900">
                                                                    {submission.student?.name || 'Unknown Student'}
                                                                </h4>
                                                                {isLate && (
                                                                    <Badge variant="destructive" className="text-xs">Late</Badge>
                                                                )}
                                                                {isGraded && (
                                                                    <Badge className="bg-green-100 text-green-800 border-green-200">
                                                                        Graded
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <p className="text-sm text-gray-600 mb-1">
                                                                {submission.assessment?.title || 'Assessment'}
                                                            </p>
                                                            <div className="flex items-center gap-3 text-xs text-gray-500">
                                                                <span className="flex items-center gap-1">
                                                                    <Clock className="h-3 w-3" />
                                                                    Submitted: {new Date(submission.submitted_at).toLocaleString()}
                                                                </span>
                                                                <span>{submission.file_name}</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => setPreviewSubmission(submission)}
                                                            >
                                                                <Eye className="h-4 w-4" />
                                                            </Button>
                                                            {onOpenGrading && !isGraded && (
                                                                <Button
                                                                    size="sm"
                                                                    className="bg-blue-600 hover:bg-blue-700"
                                                                    onClick={() => onOpenGrading(submission)}
                                                                >
                                                                    <Calculator className="h-4 w-4 mr-1" />
                                                                    Grade
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
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

            {/* Document Preview Dialog */}
            {previewSubmission && (
                <Dialog open={!!previewSubmission} onOpenChange={(open) => !open && setPreviewSubmission(null)}>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
                        <DialogHeader>
                            <DialogTitle>Preview: {previewSubmission.file_name}</DialogTitle>
                        </DialogHeader>
                        <DocumentPreview
                            filePath={previewSubmission.file_path}
                            fileName={previewSubmission.file_name}
                            fileType={previewSubmission.file_type}
                            fileSize={previewSubmission.file_size || 0}
                        />
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}

export default InstructorCourseDetail;
