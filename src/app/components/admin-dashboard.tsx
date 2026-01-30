import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { LogOut, PlusCircle, CheckCircle, XCircle, Users, BookOpen, FileCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { getCourses, createCourse, getProfiles, getPendingVerificationGrades, getVerifiedGrades, verifyGrade, getAllAssessments, getAllSubmissions } from '@/lib/supabase-helpers';
import { Separator } from './ui/separator';
import { Progress } from './ui/progress';

interface AdminDashboardProps {
  accessToken: string;
  userProfile: any;
  onLogout: () => void;
}

export function AdminDashboard({ accessToken, userProfile, onLogout }: AdminDashboardProps) {
  const [courses, setCourses] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [pendingGrades, setPendingGrades] = useState<any[]>([]);
  const [verifiedGrades, setVerifiedGrades] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);

  // Course creation state
  const [courseName, setCourseName] = useState('');
  const [courseDesc, setCourseDesc] = useState('');
  const [isCreatingCourse, setIsCreatingCourse] = useState(false);

  // Grade verification state
  const [selectedGrade, setSelectedGrade] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch courses
      const coursesData = await getCourses();
      setCourses(Array.isArray(coursesData) ? coursesData : []);

      // Fetch assessments
      const assessmentsData = await getAllAssessments();
      setAssessments(Array.isArray(assessmentsData) ? assessmentsData : []);

      // Fetch submissions
      const submissionsData = await getAllSubmissions();
      setSubmissions(Array.isArray(submissionsData) ? submissionsData : []);

      // Fetch pending verification grades
      const pendingData = await getPendingVerificationGrades();
      setPendingGrades(Array.isArray(pendingData) ? pendingData : []);

      // Fetch verified grades
      const verifiedData = await getVerifiedGrades();
      setVerifiedGrades(Array.isArray(verifiedData) ? verifiedData : []);

      // Calculate stats
      setStats({
        totalCourses: Array.isArray(coursesData) ? coursesData.length : 0,
        totalAssessments: Array.isArray(assessmentsData) ? assessmentsData.length : 0,
        totalSubmissions: Array.isArray(submissionsData) ? submissionsData.length : 0,
        pendingVerification: Array.isArray(pendingData) ? pendingData.length : 0,
      });
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    }
  };

  const handleCreateCourse = async () => {
    if (!courseName) {
      toast.error('Please enter a course name');
      return;
    }

    setIsCreatingCourse(true);

    try {
      await createCourse(courseName, courseName, courseDesc);
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

  const handleVerifyGrade = async (gradeId: string) => {
    setIsVerifying(true);
    try {
      await verifyGrade(gradeId);

      // Refresh data first
      await fetchData();

      // Then close dialog and reset state
      setVerifyDialogOpen(false);
      setSelectedGrade(null);

      toast.success('Grade verified and released to student!');
    } catch (error: any) {
      console.error('Verify grade error:', error);
      toast.error(error.message || 'Failed to verify grade');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">EduConnect AMS - Exam Administrator</h1>
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
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Total Courses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalCourses}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <FileCheck className="h-4 w-4" />
                  Total Assessments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalAssessments}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Total Submissions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalSubmissions}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Pending Verification
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{stats.pendingVerification}</div>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="verification" className="space-y-4">
          <TabsList>
            <TabsTrigger value="verification">
              Grade Verification
              {pendingGrades.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {pendingGrades.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="courses">Course Management</TabsTrigger>
            <TabsTrigger value="reports">System Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="verification" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Pending Grade Verification</CardTitle>
                <CardDescription>Review and officially release student grades</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pendingGrades.length === 0 ? (
                    <p className="text-sm text-gray-500">No grades pending verification</p>
                  ) : (
                    pendingGrades.map((grade) => {
                      const percentage = Math.round((grade.score / grade.total_marks) * 100);

                      return (
                        <div key={grade.id} className="p-4 border rounded-lg space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium">
                                Student: {grade.submission?.student?.full_name || 'Unknown'}
                              </h3>
                              <p className="text-sm text-gray-600">
                                Assessment: {grade.submission?.assessment?.title || 'Unknown'}
                              </p>
                              <p className="text-sm font-semibold text-blue-700 mt-1">
                                Grade: {grade.score}/{grade.total_marks} ({percentage}%)
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                Graded by {grade.grader?.full_name || 'Unknown'} on {new Date(grade.graded_at).toLocaleString()}
                              </p>
                              <p className="text-xs text-gray-500">
                                Submitted: {grade.submission?.file_name} on {new Date(grade.submission?.submitted_at).toLocaleString()}
                              </p>
                            </div>
                            <Badge variant="secondary">Pending Verification</Badge>
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
                          <div className="flex gap-2">
                            <Dialog open={verifyDialogOpen && selectedGrade?.id === grade.id} onOpenChange={(open) => {
                              setVerifyDialogOpen(open);
                              if (!open) {
                                setSelectedGrade(null);
                              }
                            }}>
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setSelectedGrade(grade);
                                    setVerifyDialogOpen(true);
                                  }}
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Verify & Release
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Verify and Release Grade</DialogTitle>
                                  <DialogDescription>
                                    Are you sure you want to verify and officially release this grade to the student?
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-2 py-4">
                                  <p className="text-sm"><strong>Student:</strong> {grade.submission?.student?.full_name}</p>
                                  <p className="text-sm"><strong>Assessment:</strong> {grade.submission?.assessment?.title}</p>
                                  <p className="text-sm"><strong>Grade:</strong> {grade.score}/{grade.total_marks} ({percentage}%)</p>
                                  {grade.feedback && <p className="text-sm"><strong>Feedback:</strong> {grade.feedback}</p>}
                                </div>
                                <DialogFooter>
                                  <Button
                                    onClick={() => handleVerifyGrade(grade.id)}
                                    disabled={isVerifying}
                                  >
                                    {isVerifying ? 'Verifying...' : 'Confirm Verification'}
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Verified & Released Grades</CardTitle>
                <CardDescription>Grades that have been officially released to students</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {verifiedGrades.length === 0 ? (
                    <p className="text-sm text-gray-500">No verified grades yet</p>
                  ) : (
                    verifiedGrades.map((grade) => {
                      const percentage = Math.round((grade.score / grade.total_marks) * 100);

                      return (
                        <div key={grade.id} className="p-4 border rounded-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium">
                                {grade.submission?.student?.full_name || 'Unknown'} - {grade.score}/{grade.total_marks} ({percentage}%)
                              </h3>
                              <p className="text-sm text-gray-600">
                                {grade.submission?.assessment?.title || 'Unknown'}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                Graded by {grade.grader?.full_name || 'Unknown'} • Verified by {grade.verifier?.full_name || 'Admin'} on {new Date(grade.verified_at || grade.graded_at).toLocaleString()}
                              </p>
                              {grade.feedback && (
                                <p className="text-sm text-gray-600 mt-1 italic">"{grade.feedback}"</p>
                              )}
                            </div>
                            <Badge className="bg-green-600">Verified</Badge>
                          </div>
                          <Progress value={percentage} className="mt-2" />
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="courses" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Create New Course</CardTitle>
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
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Course description..."
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
                <CardTitle>All Courses</CardTitle>
                <CardDescription>Manage system courses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {courses.length === 0 ? (
                    <p className="text-sm text-gray-500">No courses created yet</p>
                  ) : (
                    courses.map((course) => (
                      <div key={course.id} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium">{course.title}</h3>
                            <p className="text-sm text-gray-600">{course.description}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              Code: {course.code} • Instructor: {course.instructor?.full_name || 'Not assigned'}
                            </p>
                          </div>
                          <Badge variant="outline">{course.code}</Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>System Overview</CardTitle>
                <CardDescription>Key metrics and statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Total Courses</p>
                      <p className="text-2xl font-bold">{stats?.totalCourses || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Assessments</p>
                      <p className="text-2xl font-bold">{stats?.totalAssessments || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Submissions</p>
                      <p className="text-2xl font-bold">{stats?.totalSubmissions || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Verified Grades</p>
                      <p className="text-2xl font-bold">{verifiedGrades.length}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}