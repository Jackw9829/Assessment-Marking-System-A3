import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { Upload, Download, FileText, LogOut, PlusCircle, CheckCircle, Trash2, Calculator, Settings, Eye, Loader2, MessageSquare, UserCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Progress } from './ui/progress';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { DocumentPreview } from './document-preview';
import { VisuallyHidden } from './ui/visually-hidden';
import {
  getCourses,
  uploadMaterial,
  getCourseMaterials,
  createCourse,
  downloadMaterial,
  getAssessments,
  createAssessment,
  getSubmissionsForGrading,
  gradeSubmission,
  getGradedSubmissionsForInstructor,
  createRubricTemplate,
  getRubricTemplate,
  addRubricComponent,
  deleteRubricComponent,
  getRubricScores,
  gradeSubmissionWithRubric,
  calculateWeightedTotal,
  validateRubricWeights,
  RubricComponent,
  RubricScore
} from '../../lib/supabase-helpers';
import { InstructorProfile } from './instructor-profile';

interface InstructorDashboardProps {
  accessToken: string;
  userProfile: any;
  onLogout: () => void;
}

export function InstructorDashboard({ accessToken, userProfile, onLogout }: InstructorDashboardProps) {
  const [materials, setMaterials] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [gradedSubmissions, setGradedSubmissions] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);

  // Material upload state
  const [materialTitle, setMaterialTitle] = useState('');
  const [materialDesc, setMaterialDesc] = useState('');
  const [materialCourse, setMaterialCourse] = useState('');
  const [materialFile, setMaterialFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Assessment creation state
  const [assessmentTitle, setAssessmentTitle] = useState('');
  const [assessmentDesc, setAssessmentDesc] = useState('');
  const [assessmentCourse, setAssessmentCourse] = useState('');
  const [assessmentDue, setAssessmentDue] = useState('');
  const [assessmentMarks, setAssessmentMarks] = useState('100');
  const [isCreating, setIsCreating] = useState(false);

  // Course creation state
  const [courseName, setCourseName] = useState('');
  const [courseDesc, setCourseDesc] = useState('');
  const [isCreatingCourse, setIsCreatingCourse] = useState(false);

  // Grading state
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [gradeScore, setGradeScore] = useState('');
  const [gradeFeedback, setGradeFeedback] = useState('');
  const [isGrading, setIsGrading] = useState(false);
  const [gradeDialogOpen, setGradeDialogOpen] = useState(false);

  // Rubric state
  const [rubricDialogOpen, setRubricDialogOpen] = useState(false);
  const [selectedAssessmentForRubric, setSelectedAssessmentForRubric] = useState<any>(null);
  const [rubricTemplate, setRubricTemplate] = useState<any>(null);
  const [rubricComponents, setRubricComponents] = useState<any[]>([]);
  const [newComponentName, setNewComponentName] = useState('');
  const [newComponentWeight, setNewComponentWeight] = useState('');
  const [newComponentDesc, setNewComponentDesc] = useState('');
  const [isAddingComponent, setIsAddingComponent] = useState(false);

  // Rubric grading state
  const [rubricGradingDialogOpen, setRubricGradingDialogOpen] = useState(false);
  const [rubricScores, setRubricScores] = useState<{ [componentId: string]: { score: number; feedback: string } }>({});
  const [calculatedTotal, setCalculatedTotal] = useState<number>(0);
  const [allComponentsGraded, setAllComponentsGraded] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch courses
      const coursesData = await getCourses();
      const coursesArray = Array.isArray(coursesData) ? coursesData : [];
      setCourses(coursesArray);

      // Fetch materials for all courses
      const allMaterials: any[] = [];
      for (const course of coursesArray) {
        const materials = await getCourseMaterials((course as any).id);
        allMaterials.push(...materials);
      }
      setMaterials(allMaterials);

      // Fetch assessments
      const assessmentsData = await getAssessments();
      setAssessments(Array.isArray(assessmentsData) ? assessmentsData : []);

      // Fetch submissions for grading
      const submissionsData = await getSubmissionsForGrading();
      setSubmissions(Array.isArray(submissionsData) ? submissionsData : []);

      // Fetch graded submissions
      const gradedData = await getGradedSubmissionsForInstructor();
      setGradedSubmissions(Array.isArray(gradedData) ? gradedData : []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    }
  };

  const handleUploadMaterial = async () => {
    if (!materialFile || !materialTitle || !materialCourse) {
      toast.error('Please fill all fields');
      return;
    }

    setIsUploading(true);

    try {
      await uploadMaterial(materialCourse, materialFile, materialTitle, materialDesc);
      toast.success('Material uploaded successfully!');
      setMaterialTitle('');
      setMaterialDesc('');
      setMaterialCourse('');
      setMaterialFile(null);
      fetchData();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload material');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateAssessment = async () => {
    if (!assessmentTitle || !assessmentCourse || !assessmentDue || !assessmentMarks) {
      toast.error('Please fill all fields');
      return;
    }

    setIsCreating(true);

    try {
      await createAssessment(
        assessmentCourse,
        assessmentTitle,
        assessmentDesc || null,
        assessmentDue,
        parseInt(assessmentMarks)
      );
      toast.success('Assessment created successfully!');
      setAssessmentTitle('');
      setAssessmentDesc('');
      setAssessmentCourse('');
      setAssessmentDue('');
      setAssessmentMarks('100');
      await fetchData(); // Refresh data
    } catch (error: any) {
      console.error('Create error:', error);
      toast.error(error.message || 'Failed to create assessment');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateCourse = async () => {
    if (!courseName || !courseDesc) {
      toast.error('Please fill all fields');
      return;
    }

    setIsCreatingCourse(true);

    try {
      await createCourse(courseName, courseName, courseDesc, userProfile.id);
      toast.success('Course created successfully!');
      setCourseName('');
      setCourseDesc('');
      fetchData();
    } catch (error: any) {
      console.error('Create course error:', error);
      toast.error(error.message || 'Failed to create course');
    } finally {
      setIsCreatingCourse(false);
    }
  };

  const handleGradeSubmission = async () => {
    if (!selectedSubmission || !gradeScore) {
      toast.error('Please provide a grade');
      return;
    }

    setIsGrading(true);

    try {
      const totalMarks = selectedSubmission.assessment?.total_marks || 100;
      await gradeSubmission(
        selectedSubmission.id,
        parseInt(gradeScore),
        totalMarks,
        gradeFeedback || null
      );

      toast.success('Submission graded successfully!');

      // Reset form state first
      setGradeScore('');
      setGradeFeedback('');
      setSelectedSubmission(null);

      // Close dialog
      setGradeDialogOpen(false);

      // Refresh data after UI has updated
      setTimeout(() => {
        fetchData();
      }, 100);
    } catch (error: any) {
      console.error('Grading error:', error);
      toast.error(error.message || 'Failed to grade submission');
    } finally {
      setIsGrading(false);
    }
  };

  const handleDownloadSubmission = async (submissionId: string) => {
    try {
      // TODO: Create submissions table with file storage
      // For now, this is a placeholder
      toast.info('Submission download feature coming soon. Create submissions table in Supabase first.');
    } catch (error: any) {
      console.error('Download error:', error);
      toast.error(error.message || 'Failed to download');
    }
  };

  // =============================================
  // RUBRIC HANDLERS
  // =============================================

  const handleOpenRubricDialog = async (assessment: any) => {
    setSelectedAssessmentForRubric(assessment);
    setRubricDialogOpen(true);

    try {
      const template = await getRubricTemplate(assessment.id) as any;
      if (template) {
        setRubricTemplate(template);
        setRubricComponents(template.components || []);
      } else {
        setRubricTemplate(null);
        setRubricComponents([]);
      }
    } catch (error) {
      console.error('Error loading rubric:', error);
      setRubricTemplate(null);
      setRubricComponents([]);
    }
  };

  const handleCreateRubricTemplate = async () => {
    if (!selectedAssessmentForRubric) return;

    try {
      const template = await createRubricTemplate(
        selectedAssessmentForRubric.id,
        `Rubric for ${selectedAssessmentForRubric.title}`,
        'Weighted rubric for automatic mark calculation'
      );
      setRubricTemplate(template);
      setRubricComponents([]);
      toast.success('Rubric template created!');
    } catch (error: any) {
      console.error('Error creating rubric:', error);
      toast.error(error.message || 'Failed to create rubric template');
    }
  };

  const handleAddRubricComponent = async () => {
    if (!rubricTemplate || !newComponentName || !newComponentWeight) {
      toast.error('Please fill in component name and weight');
      return;
    }

    const weight = parseFloat(newComponentWeight);
    if (isNaN(weight) || weight <= 0 || weight > 100) {
      toast.error('Weight must be between 0 and 100');
      return;
    }

    // Check if adding this component would exceed 100%
    const currentTotal = rubricComponents.reduce((sum, c) => sum + c.weight_percentage, 0);
    if (currentTotal + weight > 100) {
      toast.error(`Cannot add component. Total weight would be ${(currentTotal + weight).toFixed(2)}% (max 100%)`);
      return;
    }

    setIsAddingComponent(true);
    try {
      const newComponent = await addRubricComponent(rubricTemplate.id, {
        name: newComponentName,
        description: newComponentDesc,
        weight_percentage: weight,
        max_score: 100,
      } as any);

      setRubricComponents([...rubricComponents, newComponent]);
      setNewComponentName('');
      setNewComponentWeight('');
      setNewComponentDesc('');
      toast.success('Rubric component added!');
    } catch (error: any) {
      console.error('Error adding component:', error);
      toast.error(error.message || 'Failed to add component');
    } finally {
      setIsAddingComponent(false);
    }
  };

  const handleDeleteRubricComponent = async (componentId: string) => {
    try {
      await deleteRubricComponent(componentId);
      setRubricComponents(rubricComponents.filter(c => c.id !== componentId));
      toast.success('Component deleted!');
    } catch (error: any) {
      console.error('Error deleting component:', error);
      toast.error(error.message || 'Failed to delete component');
    }
  };

  const getTotalWeight = () => {
    return rubricComponents.reduce((sum, c) => sum + c.weight_percentage, 0);
  };

  const isRubricComplete = () => {
    const total = getTotalWeight();
    return Math.abs(total - 100) < 0.01;
  };

  // =============================================
  // RUBRIC GRADING HANDLERS
  // =============================================

  const handleOpenRubricGrading = async (submission: any) => {
    setSelectedSubmission(submission);

    // Load rubric template for this assessment
    try {
      const template = await getRubricTemplate(submission.assessment?.id) as any;
      if (!template || !template.components || template.components.length === 0) {
        // No rubric - use simple grading
        setGradeDialogOpen(true);
        return;
      }

      setRubricTemplate(template);
      setRubricComponents(template.components);

      // Initialize scores
      const initialScores: { [id: string]: { score: number; feedback: string } } = {};
      template.components.forEach((c: any) => {
        initialScores[c.id] = { score: 0, feedback: '' };
      });
      setRubricScores(initialScores);
      setCalculatedTotal(0);
      setAllComponentsGraded(false);
      setRubricGradingDialogOpen(true);
    } catch (error) {
      console.error('Error loading rubric for grading:', error);
      // Fall back to simple grading
      setGradeDialogOpen(true);
    }
  };

  const handleRubricScoreChange = (componentId: string, score: number) => {
    const component = rubricComponents.find(c => c.id === componentId);
    if (!component) return;

    // Validate score
    if (score < 0) score = 0;
    if (score > component.max_score) score = component.max_score;

    const newScores = {
      ...rubricScores,
      [componentId]: { ...rubricScores[componentId], score }
    };
    setRubricScores(newScores);

    // Recalculate total in real-time
    const scoresArray = rubricComponents.map(c => ({
      score: newScores[c.id]?.score || 0,
      max_score: c.max_score,
      weight_percentage: c.weight_percentage,
    }));

    const { weightedTotal, allGraded } = calculateWeightedTotal(scoresArray);
    setCalculatedTotal(weightedTotal);
    setAllComponentsGraded(allGraded);
  };

  const handleRubricFeedbackChange = (componentId: string, feedback: string) => {
    setRubricScores({
      ...rubricScores,
      [componentId]: { ...rubricScores[componentId], feedback }
    });
  };

  const handleSubmitRubricGrade = async () => {
    if (!selectedSubmission || !rubricTemplate) {
      toast.error('Missing submission or rubric data');
      return;
    }

    // Validate all components are graded
    const missingScores = rubricComponents.filter(c => {
      const score = rubricScores[c.id]?.score;
      return score === undefined || score === null;
    });

    if (missingScores.length > 0) {
      toast.error(`Please grade all components. Missing: ${missingScores.map(c => c.name).join(', ')}`);
      return;
    }

    // Validate rubric is complete (100%)
    if (!isRubricComplete()) {
      toast.error('Rubric weights must total 100% before grading');
      return;
    }

    setIsGrading(true);
    try {
      const scores: RubricScore[] = rubricComponents.map(c => ({
        component_id: c.id,
        score: rubricScores[c.id]?.score || 0,
        feedback: rubricScores[c.id]?.feedback,
      }));

      const totalMarks = selectedSubmission.assessment?.total_marks || 100;

      const result = await gradeSubmissionWithRubric(
        selectedSubmission.id,
        scores,
        rubricComponents.map(c => ({
          id: c.id,
          weight_percentage: c.weight_percentage,
          max_score: c.max_score,
        })),
        totalMarks,
        gradeFeedback || undefined
      );

      toast.success(`Graded successfully! Score: ${result.finalScore}/${totalMarks} (${result.weightedTotal.toFixed(2)}%)`);

      // Reset state
      setRubricGradingDialogOpen(false);
      setSelectedSubmission(null);
      setRubricScores({});
      setGradeFeedback('');

      // Refresh data
      fetchData();
    } catch (error: any) {
      console.error('Grading error:', error);
      toast.error(error.message || 'Failed to submit grade');
    } finally {
      setIsGrading(false);
    }
  };

  const pendingSubmissions = submissions.filter(s => s.status === 'submitted');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">EduConnect AMS - Instructor</h1>
            <p className="text-sm text-gray-600">Welcome, {userProfile.name}</p>
          </div>
          <Button variant="outline" onClick={onLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Materials
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{materials.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Active Assessments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{assessments.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Pending Grading
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingSubmissions.length}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="materials" className="space-y-4">
          <TabsList>
            <TabsTrigger value="courses">Courses</TabsTrigger>
            <TabsTrigger value="materials">Materials</TabsTrigger>
            <TabsTrigger value="assessments">Assessments</TabsTrigger>
            <TabsTrigger value="grading">
              Grading
              {pendingSubmissions.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {pendingSubmissions.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="profile">
              <UserCircle className="h-4 w-4 mr-1" />
              My Profile
            </TabsTrigger>
          </TabsList>

          <TabsContent value="courses" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Create Course</CardTitle>
                <CardDescription>Add a new course to the system</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Course Name</Label>
                  <Input
                    placeholder="e.g., Business Strategy 101"
                    value={courseName}
                    onChange={(e) => setCourseName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Course Description</Label>
                  <Textarea
                    placeholder="Describe the course..."
                    value={courseDesc}
                    onChange={(e) => setCourseDesc(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleCreateCourse}
                  disabled={isCreatingCourse}
                  className="w-full"
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  {isCreatingCourse ? 'Creating...' : 'Create Course'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>My Courses</CardTitle>
                <CardDescription>Courses you've created</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {courses.filter(c => c.instructor_id === userProfile.id || c.created_by === userProfile.id).length === 0 ? (
                    <p className="text-sm text-gray-500">No courses created yet. Create your first course above!</p>
                  ) : (
                    courses
                      .filter(c => c.instructor_id === userProfile.id || c.created_by === userProfile.id)
                      .map((course) => (
                        <div key={course.id} className="p-4 border rounded-lg">
                          <h3 className="font-medium">{course.title} ({course.code})</h3>
                          <p className="text-sm text-gray-600 mt-1">{course.description}</p>
                          <p className="text-xs text-gray-500 mt-2">
                            Created {new Date(course.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="materials" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Upload Learning Material</CardTitle>
                <CardDescription>Share resources with students</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    placeholder="e.g., Business Strategy Report – Week 4"
                    value={materialTitle}
                    onChange={(e) => setMaterialTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Brief description of the material"
                    value={materialDesc}
                    onChange={(e) => setMaterialDesc(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Course</Label>
                  <select
                    className="w-full p-2 border rounded-md"
                    value={materialCourse}
                    onChange={(e) => setMaterialCourse(e.target.value)}
                  >
                    <option value="">Select a course...</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.title} ({course.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>File</Label>
                  <input
                    type="file"
                    onChange={(e) => setMaterialFile(e.target.files?.[0] || null)}
                    className="w-full p-2 border rounded-md"
                  />
                </div>
                <Button
                  onClick={handleUploadMaterial}
                  disabled={isUploading}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {isUploading ? 'Uploading...' : 'Upload Material'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Uploaded Materials</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {materials.filter(m => m.uploader_id === userProfile.id).length === 0 ? (
                    <p className="text-sm text-gray-500">No materials uploaded yet</p>
                  ) : (
                    materials
                      .filter(m => m.uploader_id === userProfile.id)
                      .map((material) => (
                        <div key={material.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <FileText className="h-8 w-8 text-blue-600" />
                            <div>
                              <h3 className="font-medium">{material.title}</h3>
                              <p className="text-sm text-gray-600">{material.description}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {new Date(material.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assessments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Create Assessment</CardTitle>
                <CardDescription>Set up a new assessment for students</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    placeholder="e.g., Marketing Strategy Assignment"
                    value={assessmentTitle}
                    onChange={(e) => setAssessmentTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Assessment instructions and requirements"
                    value={assessmentDesc}
                    onChange={(e) => setAssessmentDesc(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Course</Label>
                    <select
                      className="w-full p-2 border rounded-md"
                      value={assessmentCourse}
                      onChange={(e) => setAssessmentCourse(e.target.value)}
                    >
                      <option value="">Select a course...</option>
                      {courses.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.title} ({course.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Total Marks</Label>
                    <Input
                      type="number"
                      value={assessmentMarks}
                      onChange={(e) => setAssessmentMarks(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input
                    type="datetime-local"
                    value={assessmentDue}
                    onChange={(e) => setAssessmentDue(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleCreateAssessment}
                  disabled={isCreating}
                  className="w-full"
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  {isCreating ? 'Creating...' : 'Create Assessment'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>My Assessments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {assessments.filter(a => a.created_by === userProfile.id).length === 0 ? (
                    <p className="text-sm text-gray-500">No assessments created yet</p>
                  ) : (
                    assessments
                      .filter(a => a.created_by === userProfile.id)
                      .map((assessment) => (
                        <div key={assessment.id} className="p-4 border rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-medium">{assessment.title}</h3>
                            <Badge>{assessment.total_marks} marks</Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{assessment.description}</p>
                          <p className="text-xs text-gray-500">
                            Due: {new Date(assessment.due_date).toLocaleString()}
                          </p>
                          <div className="mt-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenRubricDialog(assessment)}
                            >
                              <Settings className="h-4 w-4 mr-2" />
                              Manage Rubric
                            </Button>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="grading" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Pending Submissions</CardTitle>
                <CardDescription>Review and grade student submissions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pendingSubmissions.length === 0 ? (
                    <p className="text-sm text-gray-500">No pending submissions</p>
                  ) : (
                    pendingSubmissions.map((submission: any) => (
                      <div key={submission.id} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-medium">{submission.student?.full_name || 'Unknown Student'}</h3>
                            <p className="text-sm text-gray-600">{submission.assessment?.title || 'Assessment'}</p>
                            <p className="text-sm text-gray-500">
                              <FileText className="h-3 w-3 inline mr-1" />
                              {submission.file_name}
                              <span className="ml-2 text-xs text-gray-400">
                                ({submission.file_type || 'unknown type'})
                              </span>
                            </p>
                            <p className="text-xs text-gray-500">
                              Submitted: {new Date(submission.submitted_at).toLocaleString()}
                            </p>
                          </div>
                          <Badge>{submission.status}</Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadSubmission(submission.id)}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleOpenRubricGrading(submission)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Preview & Grade
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Grade Dialog - Outside map for proper control */}
            <Dialog open={gradeDialogOpen} onOpenChange={(open) => {
              if (!open) {
                setGradeDialogOpen(false);
                setTimeout(() => {
                  setSelectedSubmission(null);
                  setGradeScore('');
                  setGradeFeedback('');
                }, 0);
              }
            }}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Grade Submission</DialogTitle>
                  <DialogDescription>
                    Provide score and feedback for {selectedSubmission?.student?.full_name || 'student'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Score (out of {selectedSubmission?.assessment?.total_marks || 100})</Label>
                    <Input
                      type="number"
                      placeholder="Enter marks"
                      value={gradeScore}
                      onChange={(e) => setGradeScore(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Feedback</Label>
                    <Textarea
                      placeholder="Provide detailed feedback..."
                      value={gradeFeedback}
                      onChange={(e) => setGradeFeedback(e.target.value)}
                      rows={5}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={handleGradeSubmission}
                    disabled={isGrading}
                  >
                    {isGrading ? 'Submitting...' : 'Submit Grade'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Graded Submissions Section */}
            <Card>
              <CardHeader>
                <CardTitle>Graded Submissions</CardTitle>
                <CardDescription>View previously graded assessments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {gradedSubmissions.length === 0 ? (
                    <p className="text-sm text-gray-500">No graded submissions yet</p>
                  ) : (
                    gradedSubmissions.map((submission: any) => {
                      const gradeInfo = Array.isArray(submission.grade) ? submission.grade[0] : submission.grade;
                      const percentage = gradeInfo ? Math.round((gradeInfo.score / gradeInfo.total_marks) * 100) : 0;
                      return (
                        <div key={submission.id} className="p-4 border rounded-lg">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h3 className="font-medium">{submission.student?.full_name || 'Unknown Student'}</h3>
                              <p className="text-sm text-gray-600">{submission.assessment?.title || 'Assessment'}</p>
                              <p className="text-sm text-gray-500">{submission.file_name}</p>
                              <p className="text-xs text-gray-500">
                                Submitted: {new Date(submission.submitted_at).toLocaleString()}
                              </p>
                              {gradeInfo && (
                                <>
                                  <p className="text-sm font-semibold text-green-700 mt-2">
                                    Grade: {gradeInfo.score}/{gradeInfo.total_marks} ({percentage}%)
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Graded: {new Date(gradeInfo.graded_at).toLocaleString()}
                                  </p>
                                  {gradeInfo.feedback && (
                                    <p className="text-sm text-gray-600 mt-1 italic">"{gradeInfo.feedback}"</p>
                                  )}
                                </>
                              )}
                            </div>
                            <Badge variant={percentage >= 50 ? 'default' : 'destructive'}>
                              {percentage >= 80 ? 'Excellent' : percentage >= 60 ? 'Good' : percentage >= 50 ? 'Pass' : 'Needs Improvement'}
                            </Badge>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-4">
            <InstructorProfile userId={userProfile.id} />
          </TabsContent>
        </Tabs>

        {/* Rubric Management Dialog */}
        <Dialog open={rubricDialogOpen} onOpenChange={setRubricDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Manage Rubric</DialogTitle>
              <DialogDescription>
                Define weighted rubric components for: {selectedAssessmentForRubric?.title}
              </DialogDescription>
            </DialogHeader>

            {!rubricTemplate ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  No rubric template exists for this assessment. Create one to enable weighted grading.
                </p>
                <Button onClick={handleCreateRubricTemplate}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Create Rubric Template
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Weight Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Total Weight</span>
                    <span className={isRubricComplete() ? 'text-green-600 font-medium' : 'text-amber-600'}>
                      {getTotalWeight().toFixed(1)}% / 100%
                    </span>
                  </div>
                  <Progress value={getTotalWeight()} className="h-2" />
                  {!isRubricComplete() && (
                    <p className="text-xs text-amber-600">
                      ⚠️ Weights must total exactly 100% before grading
                    </p>
                  )}
                  {isRubricComplete() && (
                    <p className="text-xs text-green-600">
                      ✓ Rubric is complete and ready for grading
                    </p>
                  )}
                </div>

                <Separator />

                {/* Existing Components */}
                <div className="space-y-3">
                  <h4 className="font-medium">Rubric Components</h4>
                  {rubricComponents.length === 0 ? (
                    <p className="text-sm text-gray-500">No components added yet</p>
                  ) : (
                    rubricComponents.map((component, index) => (
                      <div key={component.id} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{component.name}</span>
                            <Badge variant="outline">{component.weight_percentage}%</Badge>
                          </div>
                          {component.description && (
                            <p className="text-sm text-gray-500 mt-1">{component.description}</p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">Max score: {component.max_score}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteRubricComponent(component.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>

                <Separator />

                {/* Add New Component */}
                <div className="space-y-4">
                  <h4 className="font-medium">Add Component</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Component Name *</Label>
                      <Input
                        placeholder="e.g., Presentation"
                        value={newComponentName}
                        onChange={(e) => setNewComponentName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Weight (%) *</Label>
                      <Input
                        type="number"
                        placeholder="e.g., 40"
                        value={newComponentWeight}
                        onChange={(e) => setNewComponentWeight(e.target.value)}
                        min="1"
                        max={100 - getTotalWeight()}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Description (optional)</Label>
                    <Textarea
                      placeholder="Describe what this component evaluates..."
                      value={newComponentDesc}
                      onChange={(e) => setNewComponentDesc(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={handleAddRubricComponent}
                    disabled={isAddingComponent || !newComponentName || !newComponentWeight}
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    {isAddingComponent ? 'Adding...' : 'Add Component'}
                  </Button>
                </div>

                {/* Example Calculation */}
                {rubricComponents.length > 0 && (
                  <>
                    <Separator />
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-medium text-blue-800 mb-2">
                        <Calculator className="h-4 w-4 inline mr-2" />
                        Calculation Example
                      </h4>
                      <p className="text-sm text-blue-700 mb-2">
                        If a student scores on each component:
                      </p>
                      <ul className="text-sm text-blue-600 space-y-1">
                        {rubricComponents.map(c => (
                          <li key={c.id}>
                            • {c.name}: 80/{c.max_score} × {c.weight_percentage}% = {(80 / c.max_score * c.weight_percentage).toFixed(2)}%
                          </li>
                        ))}
                      </ul>
                      <p className="text-sm text-blue-800 font-medium mt-2">
                        Total = Sum of weighted scores = Final %
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setRubricDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Rubric-Based Grading Dialog with Side-by-Side Preview */}
        <Dialog open={rubricGradingDialogOpen} onOpenChange={(open) => {
          if (!open) {
            setRubricGradingDialogOpen(false);
            setSelectedSubmission(null);
            setRubricScores({});
            setGradeFeedback('');
          }
        }}>
          <DialogContent className="max-w-[98vw] sm:max-w-[98vw] w-[98vw] h-[98vh] overflow-hidden flex flex-col p-0">
            {/* Accessibility: Hidden title and description for screen readers */}
            <VisuallyHidden>
              <DialogTitle>Digital Marking Interface</DialogTitle>
              <DialogDescription>
                Grade submission from {selectedSubmission?.student?.full_name} for {selectedSubmission?.assessment?.title}
              </DialogDescription>
            </VisuallyHidden>

            {/* Compact Header Bar */}
            <div className="flex-shrink-0 bg-gradient-to-r from-slate-800 to-slate-700 text-white px-4 py-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  <div>
                    <h2 className="text-sm font-semibold">Digital Marking Interface</h2>
                    <p className="text-xs text-slate-300">
                      <span className="font-medium text-white">{selectedSubmission?.student?.full_name || 'Student'}</span>
                      <span className="mx-1">•</span>
                      <span>{selectedSubmission?.assessment?.title}</span>
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-white/20 text-white border-0 text-xs">
                  {selectedSubmission?.file_name}
                </Badge>
              </div>
            </div>

            {/* Main Content Area - Side by Side */}
            <div className="flex-1 flex min-h-0 overflow-hidden">
              {/* Left Panel: Document Preview - 45% width */}
              <div className="w-[45%] flex-shrink-0 border-r border-slate-200 bg-slate-50 overflow-hidden">
                {selectedSubmission && (
                  <DocumentPreview
                    filePath={selectedSubmission.file_path}
                    fileName={selectedSubmission.file_name}
                    fileType={selectedSubmission.file_type}
                    fileSize={selectedSubmission.file_size}
                  />
                )}
              </div>

              {/* Right Panel: Rubric Grading - 55% width, full height, no horizontal scroll */}
              <div className="w-[55%] flex flex-col min-h-0 bg-white overflow-hidden">
                {/* Compact Score Summary */}
                <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div>
                        <p className="text-xs uppercase tracking-wide opacity-70">Total</p>
                        <p className="text-2xl font-bold">{calculatedTotal.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide opacity-70">Score</p>
                        <p className="text-2xl font-bold">
                          {Math.round((calculatedTotal / 100) * (selectedSubmission?.assessment?.total_marks || 100))}
                          <span className="text-sm font-normal opacity-70">/{selectedSubmission?.assessment?.total_marks || 100}</span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <span className="opacity-70">{rubricComponents.filter(c => (rubricScores[c.id]?.score || 0) > 0).length}/{rubricComponents.length} scored</span>
                    </div>
                  </div>
                </div>

                {/* Scrollable Rubric Components - Vertical scroll only */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden">
                  <div className="p-4">
                    {/* Section Header */}
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200">
                      <div className="flex items-center gap-2">
                        <Calculator className="h-4 w-4 text-slate-500" />
                        <span className="font-semibold text-slate-700">Rubric Components</span>
                      </div>
                      <Badge variant="secondary">{rubricComponents.length} items</Badge>
                    </div>

                    {/* Rubric Component Cards */}
                    <div className="space-y-3">
                      {rubricComponents.map((component, index) => {
                        const currentScore = rubricScores[component.id]?.score || 0;
                        const contribution = (currentScore / component.max_score) * component.weight_percentage;
                        const isScored = currentScore > 0;

                        return (
                          <div
                            key={component.id}
                            className={`border rounded-lg p-3 transition-all ${isScored
                              ? 'border-blue-300 bg-blue-50/50'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                              }`}
                          >
                            {/* Component Header */}
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isScored
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-slate-200 text-slate-600'
                                  }`}>
                                  {index + 1}
                                </div>
                                <h4 className="font-medium text-sm text-slate-800 truncate">{component.name}</h4>
                              </div>
                              <Badge variant="outline" className="flex-shrink-0 text-xs">
                                {component.weight_percentage}%
                              </Badge>
                            </div>

                            {/* Score Input Row */}
                            <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-2 mb-2">
                              <span className="text-xs text-slate-500">Score:</span>
                              <Input
                                type="number"
                                value={rubricScores[component.id]?.score ?? ''}
                                onChange={(e) => handleRubricScoreChange(component.id, parseInt(e.target.value) || 0)}
                                min="0"
                                max={component.max_score}
                                className="w-14 h-7 text-center text-sm font-semibold"
                                placeholder="0"
                              />
                              <span className="text-xs text-slate-500">/{component.max_score}</span>
                              <div className="flex-1 min-w-[60px]">
                                <Progress value={(currentScore / component.max_score) * 100} className="h-1.5" />
                              </div>
                              <span className={`text-xs font-bold ${contribution > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                                +{contribution.toFixed(1)}%
                              </span>
                            </div>

                            {/* Feedback Textarea */}
                            <Textarea
                              placeholder={`Feedback for ${component.name}...`}
                              value={rubricScores[component.id]?.feedback || ''}
                              onChange={(e) => handleRubricFeedbackChange(component.id, e.target.value)}
                              rows={2}
                              className="text-sm w-full resize-none"
                            />
                          </div>
                        );
                      })}
                    </div>

                    {/* Overall Feedback Section */}
                    <div className="mt-3 border rounded-lg p-3 bg-slate-50">
                      <Label className="text-sm font-semibold text-slate-700 mb-1.5 block flex items-center gap-2">
                        <MessageSquare className="h-3.5 w-3.5" />
                        Overall Feedback
                      </Label>
                      <Textarea
                        placeholder="Overall comments for the student..."
                        value={gradeFeedback}
                        onChange={(e) => setGradeFeedback(e.target.value)}
                        rows={2}
                        className="text-sm bg-white resize-none"
                      />
                    </div>

                    {/* Status Message */}
                    <div className={`mt-3 rounded-lg p-2 flex items-center gap-2 ${allComponentsGraded
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-amber-50 border border-amber-200'
                      }`}>
                      {allComponentsGraded ? (
                        <>
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-green-700">Ready to submit</span>
                        </>
                      ) : (
                        <>
                          <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                          <span className="text-sm text-amber-700">
                            {rubricComponents.length - rubricComponents.filter(c => (rubricScores[c.id]?.score || 0) > 0).length} remaining
                          </span>
                        </>
                      )}
                    </div>

                    {/* Bottom padding for scroll */}
                    <div className="h-4" />
                  </div>
                </div>
              </div>
            </div>

            {/* Compact Footer */}
            <div className="flex-shrink-0 bg-white border-t border-slate-200 px-4 py-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <div className={`w-2 h-2 rounded-full ${allComponentsGraded ? 'bg-green-500' : 'bg-amber-500 animate-pulse'}`} />
                  <span>{rubricComponents.filter(c => (rubricScores[c.id]?.score || 0) > 0).length}/{rubricComponents.length} scored</span>
                  <span className="text-slate-300">|</span>
                  <span className="font-medium">Total: {calculatedTotal.toFixed(1)}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setRubricGradingDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSubmitRubricGrade}
                    disabled={isGrading || !allComponentsGraded}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  >
                    {isGrading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Submit Grade ({calculatedTotal.toFixed(1)}%)
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Profile Tab Content — rendered outside the Grading Dialog */}
        <div className="mt-0">
          {/* This tab content is managed by the Tabs component above */}
        </div>
      </main>
    </div>
  );
}