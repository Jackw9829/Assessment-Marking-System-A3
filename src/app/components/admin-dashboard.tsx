import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { LogOut, PlusCircle, CheckCircle, XCircle, Users, BookOpen, FileCheck, UserCircle, Shield, AlertTriangle, Clock, TrendingUp, ClipboardCheck, BarChart3, Settings, AlertCircle, ChevronRight, GraduationCap, Activity } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { getCourses, createCourse, getProfiles, getPendingVerificationGrades, getVerifiedGrades, verifyGrade, getAllAssessments, getAllSubmissions } from '@/lib/supabase-helpers';
import { Separator } from './ui/separator';
import { Progress } from './ui/progress';
import { AdminProfile } from './admin-profile';

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

      toast.success('Grade verified and released to student!');

      // Reset state first
      setSelectedGrade(null);

      // Close dialog
      setVerifyDialogOpen(false);

      // Refresh data after UI has updated
      setTimeout(() => {
        fetchData();
      }, 100);
    } catch (error: any) {
      console.error('Verify grade error:', error);
      toast.error(error.message || 'Failed to verify grade');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50">
      {/* Enhanced Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-600 text-white p-2 rounded-lg">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">EduConnect AMS</h1>
              <p className="text-sm text-gray-600">Exam Administrator • <span className="font-medium text-emerald-600">{userProfile.name}</span></p>
            </div>
          </div>
          <Button variant="outline" onClick={onLogout} className="border-gray-300 hover:bg-gray-50">
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Enhanced System Statistics */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
            <Card className="bg-white border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalCourses}</p>
                    <p className="text-xs text-gray-500">Courses</p>
                  </div>
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <BookOpen className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-l-4 border-l-purple-500 hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Active</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalAssessments}</p>
                    <p className="text-xs text-gray-500">Assessments</p>
                  </div>
                  <div className="bg-purple-100 p-2 rounded-lg">
                    <FileCheck className="h-5 w-5 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-l-4 border-l-cyan-500 hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalSubmissions}</p>
                    <p className="text-xs text-gray-500">Submissions</p>
                  </div>
                  <div className="bg-cyan-100 p-2 rounded-lg">
                    <Users className="h-5 w-5 text-cyan-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={`bg-white border-l-4 hover:shadow-md transition-shadow ${stats.pendingVerification > 0 ? 'border-l-orange-500' : 'border-l-green-500'}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pending</p>
                    <p className={`text-2xl font-bold ${stats.pendingVerification > 0 ? 'text-orange-600' : 'text-green-600'}`}>{stats.pendingVerification}</p>
                    <p className="text-xs text-gray-500">Verification</p>
                  </div>
                  <div className={`p-2 rounded-lg ${stats.pendingVerification > 0 ? 'bg-orange-100' : 'bg-green-100'}`}>
                    {stats.pendingVerification > 0 ? <Clock className="h-5 w-5 text-orange-600" /> : <CheckCircle className="h-5 w-5 text-green-600" />}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-l-4 border-l-emerald-500 hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Released</p>
                    <p className="text-2xl font-bold text-emerald-600">{verifiedGrades.length}</p>
                    <p className="text-xs text-gray-500">Grades</p>
                  </div>
                  <div className="bg-emerald-100 p-2 rounded-lg">
                    <ClipboardCheck className="h-5 w-5 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Actions Requiring Attention Alert */}
        {pendingGrades.length > 0 && (
          <Card className="mb-6 border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  <CardTitle className="text-lg text-orange-800">Actions Requiring Approval</CardTitle>
                </div>
                <Badge variant="destructive" className="animate-pulse">
                  {pendingGrades.length} Pending
                </Badge>
              </div>
              <CardDescription className="text-orange-700">
                Grade verifications awaiting your review and official release
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {pendingGrades.slice(0, 3).map((grade: any) => {
                  const percentage = Math.round((grade.score / grade.total_marks) * 100);
                  return (
                    <div key={grade.id} className="p-3 rounded-lg border bg-white border-orange-200 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{grade.submission?.student?.full_name || 'Student'}</h4>
                          <p className="text-xs text-gray-600">{grade.submission?.assessment?.title}</p>
                        </div>
                        <Badge variant="outline" className="text-xs">{percentage}%</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-400">By {grade.grader?.full_name || 'Instructor'}</p>
                        <Button size="sm" onClick={() => {
                          setSelectedGrade(grade);
                          setVerifyDialogOpen(true);
                        }}>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Verify
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
              {pendingGrades.length > 3 && (
                <p className="mt-3 text-sm text-orange-700">
                  +{pendingGrades.length - 3} more grades awaiting verification
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* System Health Indicator */}
        <Card className="mb-6 bg-white">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-emerald-600" />
              <CardTitle className="text-lg">System Overview</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-3xl font-bold text-gray-900">{stats?.totalCourses || 0}</p>
                <p className="text-sm text-gray-600">Active Courses</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-3xl font-bold text-gray-900">{stats?.totalAssessments || 0}</p>
                <p className="text-sm text-gray-600">Assessments</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-3xl font-bold text-gray-900">{stats?.totalSubmissions || 0}</p>
                <p className="text-sm text-gray-600">Submissions</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-3xl font-bold text-emerald-600">{verifiedGrades.length}</p>
                <p className="text-sm text-gray-600">Released Grades</p>
              </div>
            </div>
            {stats?.pendingVerification > 0 && (
              <div className="mt-4 p-3 bg-orange-50 rounded-lg border border-orange-200 flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <span className="text-sm text-orange-800">
                  <strong>{stats.pendingVerification}</strong> grade(s) require verification before release to students
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3 mb-6">
          <Button className="bg-emerald-600 hover:bg-emerald-700">
            <PlusCircle className="h-4 w-4 mr-2" />
            Create Course
          </Button>
          {pendingGrades.length > 0 && (
            <Button variant="outline" className="border-orange-300 text-orange-700 hover:bg-orange-50">
              <ClipboardCheck className="h-4 w-4 mr-2" />
              Verify Grades ({pendingGrades.length})
            </Button>
          )}
          <Button variant="outline">
            <BarChart3 className="h-4 w-4 mr-2" />
            System Reports
          </Button>
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>

        <Tabs defaultValue="verification" className="space-y-4">
          <TabsList className="bg-white border shadow-sm p-1 flex-wrap h-auto">
            <TabsTrigger value="verification" className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">
              <ClipboardCheck className="h-4 w-4 mr-1" />
              Verification
              {pendingGrades.length > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 min-w-[20px] flex items-center justify-center">
                  {pendingGrades.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="courses" className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">
              <BookOpen className="h-4 w-4 mr-1" />
              Courses
            </TabsTrigger>
            <TabsTrigger value="reports" className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">
              <BarChart3 className="h-4 w-4 mr-1" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="profile" className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">
              <UserCircle className="h-4 w-4 mr-1" />
              Profile
            </TabsTrigger>
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
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Verification Dialog - Outside map for proper control */}
            <Dialog open={verifyDialogOpen} onOpenChange={(open) => {
              if (!open) {
                setVerifyDialogOpen(false);
                setTimeout(() => {
                  setSelectedGrade(null);
                }, 0);
              }
            }}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Verify and Release Grade</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to verify and officially release this grade to the student?
                  </DialogDescription>
                </DialogHeader>
                {selectedGrade && (
                  <div className="space-y-2 py-4">
                    <p className="text-sm"><strong>Student:</strong> {selectedGrade.submission?.student?.full_name}</p>
                    <p className="text-sm"><strong>Assessment:</strong> {selectedGrade.submission?.assessment?.title}</p>
                    <p className="text-sm"><strong>Grade:</strong> {selectedGrade.score}/{selectedGrade.total_marks} ({Math.round((selectedGrade.score / selectedGrade.total_marks) * 100)}%)</p>
                    {selectedGrade.feedback && <p className="text-sm"><strong>Feedback:</strong> {selectedGrade.feedback}</p>}
                  </div>
                )}
                <DialogFooter>
                  <Button
                    onClick={() => handleVerifyGrade(selectedGrade?.id)}
                    disabled={isVerifying}
                  >
                    {isVerifying ? 'Verifying...' : 'Confirm Verification'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

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

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-4">
            <AdminProfile userId={userProfile.id} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}