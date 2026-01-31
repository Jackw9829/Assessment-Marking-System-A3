import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { toast } from 'sonner';
import { Download, FileText, Bell, Award, LogOut, Upload } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Separator } from './ui/separator';
import { Label } from './ui/label';
import { getStudentEnrollments, getCourseMaterials, getCourses, getAssessments, submitAssessment, getStudentSubmissions, getStudentGrades, downloadMaterial } from '@/lib/supabase-helpers';

interface StudentDashboardProps {
  accessToken: string;
  userProfile: any;
  onLogout: () => void;
}

export function StudentDashboard({ accessToken, userProfile, onLogout }: StudentDashboardProps) {
  const [courses, setCourses] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedAssessment, setSelectedAssessment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [report, setReport] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch all available courses (for discovery)
      const allCourses = await getCourses();
      setCourses(allCourses || []);

      // Fetch enrolled courses (for submissions/assessments)
      const enrollments = await getStudentEnrollments(userProfile.id);

      // Fetch materials from enrolled courses
      const courseMaterialsList = [];
      if (enrollments && enrollments.length > 0) {
        for (const enrollment of enrollments) {
          try {
            const materials = await getCourseMaterials(enrollment.course_id);
            if (materials) {
              courseMaterialsList.push(...materials);
            }
          } catch (err) {
            console.error(`Error fetching materials for course ${enrollment.course_id}:`, err);
          }
        }
      }
      setMaterials(courseMaterialsList);

      // Fetch assessments from all courses
      const allAssessments = await getAssessments();
      setAssessments(allAssessments || []);

      // Fetch student's submissions
      const studentSubmissions = await getStudentSubmissions(userProfile.id);
      setSubmissions(studentSubmissions || []);

      // Fetch student's grades
      const studentGrades = await getStudentGrades(userProfile.id);
      setGrades(studentGrades || []);

      setNotifications([]);

      const gradedCount = studentSubmissions?.filter((s: any) => s.status === 'graded').length || 0;
      const pendingCount = studentSubmissions?.filter((s: any) => s.status === 'submitted').length || 0;

      setReport({
        totalAssessments: allAssessments?.length || 0,
        gradedAssessments: gradedCount,
        pendingAssessments: pendingCount,
        averageGrade: studentGrades?.length > 0
          ? Math.round(studentGrades.reduce((sum: number, g: any) => sum + (g.score / g.total_marks) * 100, 0) / studentGrades.length)
          : 0,
      });
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    }
  };

  const handleDownloadMaterial = async (materialId: string) => {
    try {
      const material = materials.find(m => m.id === materialId);
      if (!material) {
        toast.error('Material not found');
        return;
      }

      // Get the signed URL for the material
      const url = await downloadMaterial(material.file_path);

      // Create a temporary link and click it to trigger download
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
      toast.error('Please select an assessment and file');
      return;
    }

    setIsSubmitting(true);

    try {
      await submitAssessment(selectedAssessment, selectedFile);
      toast.success('Assessment submitted successfully!');
      setSelectedFile(null);
      setSelectedAssessment('');
      await fetchData();
    } catch (error: any) {
      console.error('Submission error:', error);
      toast.error(error.message || 'Failed to submit assessment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">EduConnect AMS</h1>
            <p className="text-sm text-gray-600">Welcome, {userProfile.name}</p>
          </div>
          <div className="flex gap-4 items-center">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon" className="relative">
                  <Bell className="h-4 w-4" />
                  {notifications.filter(n => !n.read).length > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center">
                      {notifications.filter(n => !n.read).length}
                    </span>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Notifications</DialogTitle>
                  <DialogDescription>Recent updates and announcements</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="text-sm text-gray-500">No notifications</p>
                  ) : (
                    notifications.map((notif) => (
                      <div key={notif.id || notif.timestamp} className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm font-medium">{notif.message}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(notif.timestamp).toLocaleString()}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" onClick={onLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Performance Overview */}
        {report && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Total Assessments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{report.totalAssessments}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Graded
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{report.gradedAssessments}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Pending
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{report.pendingAssessments}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Average Grade
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{report.averageGrade}%</div>
                <Progress value={report.averageGrade} className="mt-2" />
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="materials" className="space-y-4">
          <TabsList>
            <TabsTrigger value="materials">Learning Materials</TabsTrigger>
            <TabsTrigger value="assessments">Assessments</TabsTrigger>
            <TabsTrigger value="submissions">My Submissions</TabsTrigger>
            <TabsTrigger value="grades">Grades</TabsTrigger>
          </TabsList>

          <TabsContent value="materials" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Learning Materials</CardTitle>
                <CardDescription>Download course materials and resources</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {materials.length === 0 ? (
                    <p className="text-sm text-gray-500">No materials available</p>
                  ) : (
                    materials.map((material) => (
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadMaterial(material.id)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
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
                <CardTitle>Submit Assessment</CardTitle>
                <CardDescription>Upload your completed assessment</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Assessment</Label>
                  <select
                    className="w-full p-2 border rounded-md"
                    value={selectedAssessment}
                    onChange={(e) => setSelectedAssessment(e.target.value)}
                  >
                    <option value="">Choose an assessment...</option>
                    {assessments.map((assessment) => (
                      <option key={assessment.id} value={assessment.id}>
                        {assessment.title} (Due: {new Date(assessment.due_date).toLocaleDateString()})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Upload File</Label>
                  <input
                    type="file"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="w-full p-2 border rounded-md"
                  />
                  {selectedFile && (
                    <p className="text-sm text-gray-600">Selected: {selectedFile.name}</p>
                  )}
                </div>
                <Button
                  onClick={handleSubmitAssessment}
                  disabled={isSubmitting || !selectedFile || !selectedAssessment}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {isSubmitting ? 'Submitting...' : 'Submit Assessment'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Available Assessments</CardTitle>
                <CardDescription>View all assessments and their details</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {assessments.length === 0 ? (
                    <p className="text-sm text-gray-500">No assessments available</p>
                  ) : (
                    assessments.map((assessment) => (
                      <div key={assessment.id} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-medium">{assessment.title}</h3>
                          <Badge>{assessment.total_marks} marks</Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{assessment.description}</p>
                        <div className="flex gap-4 text-xs text-gray-500">
                          <span>Due: {new Date(assessment.due_date).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="submissions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>My Submissions</CardTitle>
                <CardDescription>Track your submitted assessments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {submissions.length === 0 ? (
                    <p className="text-sm text-gray-500">No submissions yet</p>
                  ) : (
                    submissions.map((submission: any) => (
                      <div key={submission.id} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium">{submission.assessment?.title || submission.file_name}</h3>
                            <p className="text-sm text-gray-600">{submission.file_name}</p>
                            <p className="text-xs text-gray-500">
                              Submitted: {new Date(submission.submitted_at).toLocaleString()}
                            </p>
                          </div>
                          <Badge variant={submission.status === 'graded' ? 'default' : 'secondary'}>
                            {submission.status}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="grades" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>My Grades</CardTitle>
                <CardDescription>View your assessment results and feedback</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {grades.length === 0 ? (
                    <p className="text-sm text-gray-500">No grades yet</p>
                  ) : (
                    grades.map((grade) => {
                      const percentage = Math.round((grade.score / grade.total_marks) * 100);
                      return (
                        <div key={grade.id} className="p-4 border rounded-lg space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2">
                                <Award className="h-5 w-5 text-yellow-600" />
                                <h3 className="font-medium">
                                  {grade.submission?.assessment?.title || 'Assessment'}
                                </h3>
                              </div>
                              <p className="text-lg font-semibold mt-1">
                                Grade: {grade.score}/{grade.total_marks} ({percentage}%)
                              </p>
                              <p className="text-sm text-gray-600 mt-1">
                                Graded by {grade.grader?.full_name || 'Instructor'} on {new Date(grade.graded_at).toLocaleString()}
                              </p>
                              <p className="text-xs text-gray-500">
                                Submitted: {grade.submission?.file_name} on {new Date(grade.submission?.submitted_at).toLocaleString()}
                              </p>
                            </div>
                            <Badge variant={percentage >= 50 ? 'default' : 'destructive'}>
                              {percentage >= 80 ? 'Excellent' : percentage >= 60 ? 'Good' : percentage >= 50 ? 'Pass' : 'Needs Improvement'}
                            </Badge>
                          </div>
                          {grade.feedback && (
                            <>
                              <Separator />
                              <div>
                                <h4 className="text-sm font-medium mb-1">Feedback:</h4>
                                <p className="text-sm text-gray-700">{grade.feedback}</p>
                              </div>
                            </>
                          )}
                          <Progress value={percentage} className="mt-2" />
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}