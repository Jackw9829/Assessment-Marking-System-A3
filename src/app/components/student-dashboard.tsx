import { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { toast } from 'sonner';
import { Download, FileText, Bell, Award, LogOut, Upload, Filter, Calendar, BarChart3, History, GraduationCap, UserCircle, Clock, AlertTriangle, CheckCircle2, BookOpen, TrendingUp, Send, Eye, ChevronRight, AlertCircle, LayoutGrid, Table as TableIcon, MessageSquare, SortAsc, SortDesc, ArrowUpDown } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Separator } from './ui/separator';
import { Label } from './ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { getStudentEnrollments, getCourseMaterials, getEnrolledCourses, getAssessments, submitAssessment, getStudentSubmissions, getStudentGrades, downloadMaterial, getCourseById } from '@/lib/supabase-helpers';
import { NotificationCenter, UpcomingDeadlinesWidget } from './notification-center';
import { AssessmentFilter } from './assessment-filter';
import { StudentCalendar } from './student-calendar';
import { GradesDashboard } from './grades-dashboard';
import { SubmissionHistory } from './submission-history';
import { InterimTranscript } from './interim-transcript';
import { AIChatbot } from './ai-chatbot';
import { StudentProfile } from './student-profile';
import { CourseOverview } from './course-overview';
import { StudentCourseDetail } from './student-course-detail';

interface StudentDashboardProps {
  accessToken: string;
  userProfile: any;
  onLogout: () => void;
}

export function StudentDashboard({ accessToken, userProfile, onLogout }: StudentDashboardProps) {
  const [courses, setCourses] = useState<any[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedAssessment, setSelectedAssessment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Grades view state
  const [gradesViewMode, setGradesViewMode] = useState<'card' | 'table' | 'graph'>('card');
  const [gradesSortField, setGradesSortField] = useState<'date' | 'percentage' | 'name'>('date');
  const [gradesSortOrder, setGradesSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedFeedbackGrade, setSelectedFeedbackGrade] = useState<any>(null);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);

  // Course detail state
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [showCourseDetail, setShowCourseDetail] = useState(false);

  // Handle course selection
  const handleCourseSelect = async (courseId: string) => {
    try {
      // Fetch course directly by ID to ensure it works for all courses
      const course = await getCourseById(courseId);
      if (course) {
        setSelectedCourse(course);
        setShowCourseDetail(true);
      } else {
        toast.error('Course not available');
      }
    } catch (error) {
      console.error('Error loading course:', error);
      toast.error('Failed to load course details');
    }
  };

  const handleBackToCourses = () => {
    setShowCourseDetail(false);
    setSelectedCourse(null);
  };

  // Handle chatbot navigation
  const handleChatbotNavigate = (tab: string) => {
    setActiveTab(tab);
  };

  // Helper functions for urgency calculations
  const getAssessmentUrgency = (dueDate: string, assessmentId: string) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diffMs = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const isSubmitted = submissions.some(s => s.assessment_id === assessmentId);

    if (isSubmitted) return { level: 'completed', label: 'Submitted', color: 'bg-green-100 text-green-800 border-green-200' };
    if (diffMs < 0) return { level: 'overdue', label: 'Overdue', color: 'bg-red-100 text-red-800 border-red-200' };
    if (diffDays <= 1) return { level: 'urgent', label: 'Due Today', color: 'bg-red-100 text-red-800 border-red-200' };
    if (diffDays <= 3) return { level: 'soon', label: `${diffDays} days left`, color: 'bg-orange-100 text-orange-800 border-orange-200' };
    if (diffDays <= 7) return { level: 'upcoming', label: `${diffDays} days left`, color: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
    return { level: 'normal', label: `${diffDays} days left`, color: 'bg-gray-100 text-gray-800 border-gray-200' };
  };

  // Helper to get submission info for an assessment
  const getSubmissionInfo = (assessmentId: string) => {
    const submission = submissions.find(s => s.assessment_id === assessmentId);
    return {
      isSubmitted: !!submission,
      submission,
    };
  };

  // Get assessments available for submission (not submitted, or resubmission allowed)
  const getSubmittableAssessments = () => {
    return assessments
      .filter(a => {
        const { isSubmitted } = getSubmissionInfo(a.id);
        const resubmissionAllowed = a.resubmission_allowed === true;
        const now = new Date();
        const dueDate = new Date(a.due_date);
        const isPastDue = dueDate < now;

        // If not submitted, it's submittable (unless past due for non-resubmission)
        if (!isSubmitted) {
          return true; // Show even overdue for students to see the status
        }

        // If submitted but resubmission is allowed and not past due
        if (isSubmitted && resubmissionAllowed && !isPastDue) {
          return true;
        }

        return false;
      })
      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  };

  // Check if all assessments have been submitted (no pending submissions)
  const allAssessmentsSubmitted = useMemo(() => {
    if (assessments.length === 0) return false;

    return assessments.every(a => {
      const { isSubmitted } = getSubmissionInfo(a.id);
      const resubmissionAllowed = a.resubmission_allowed === true;
      const now = new Date();
      const dueDate = new Date(a.due_date);
      const isPastDue = dueDate < now;

      // Considered "fully submitted" if submitted AND (no resubmission allowed OR past due)
      return isSubmitted && (!resubmissionAllowed || isPastDue);
    });
  }, [assessments, submissions]);

  const getUrgentAssessments = () => {
    return assessments
      .filter(a => {
        const urgency = getAssessmentUrgency(a.due_date, a.id);
        return ['overdue', 'urgent', 'soon'].includes(urgency.level);
      })
      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  };

  // Grade helpers and computed values
  const getGradeLabel = (percentage: number) => {
    if (percentage >= 85) return { label: 'HD', name: 'High Distinction', color: 'bg-purple-100 text-purple-800 border-purple-200' };
    if (percentage >= 75) return { label: 'D', name: 'Distinction', color: 'bg-blue-100 text-blue-800 border-blue-200' };
    if (percentage >= 65) return { label: 'CR', name: 'Credit', color: 'bg-green-100 text-green-800 border-green-200' };
    if (percentage >= 50) return { label: 'P', name: 'Pass', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
    return { label: 'F', name: 'Fail', color: 'bg-red-100 text-red-800 border-red-200' };
  };

  const getGradeBarColor = (percentage: number) => {
    if (percentage >= 85) return 'bg-purple-500';
    if (percentage >= 75) return 'bg-blue-500';
    if (percentage >= 65) return 'bg-green-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const sortedGrades = useMemo(() => {
    const gradesWithPercentage = grades.map(g => ({
      ...g,
      percentage: Math.round((g.score / g.total_marks) * 100),
      assessmentName: g.submission?.assessment?.title || 'Assessment',
    }));

    return gradesWithPercentage.sort((a, b) => {
      let comparison = 0;
      switch (gradesSortField) {
        case 'date':
          comparison = new Date(a.graded_at).getTime() - new Date(b.graded_at).getTime();
          break;
        case 'percentage':
          comparison = a.percentage - b.percentage;
          break;
        case 'name':
          comparison = a.assessmentName.localeCompare(b.assessmentName);
          break;
      }
      return gradesSortOrder === 'asc' ? comparison : -comparison;
    });
  }, [grades, gradesSortField, gradesSortOrder]);

  const gradeStats = useMemo(() => {
    if (grades.length === 0) return null;
    const percentages = grades.map(g => Math.round((g.score / g.total_marks) * 100));
    const average = Math.round(percentages.reduce((a, b) => a + b, 0) / percentages.length);
    const highest = Math.max(...percentages);
    const lowest = Math.min(...percentages);
    return { average, highest, lowest, total: grades.length };
  }, [grades]);

  const handleGradesSort = (field: 'date' | 'percentage' | 'name') => {
    if (gradesSortField === field) {
      setGradesSortOrder(gradesSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setGradesSortField(field);
      setGradesSortOrder('desc');
    }
  };

  const handleViewFeedback = (grade: any) => {
    setSelectedFeedbackGrade(grade);
    setFeedbackDialogOpen(true);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch enrolled courses for this student (role-based access)
      const studentCourses = await getEnrolledCourses(userProfile.id);
      setCourses(studentCourses || []);

      // Fetch enrolled courses (for submissions/assessments)
      const enrollments = await getStudentEnrollments(userProfile.id);
      setEnrolledCourses(enrollments || []);

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

      // Calculate urgent assessments
      const now = new Date();
      const overdueCount = (allAssessments || []).filter((a: any) => {
        const due = new Date(a.due_date);
        const isSubmitted = (studentSubmissions || []).some((s: any) => s.assessment_id === a.id);
        return due < now && !isSubmitted;
      }).length;

      setReport({
        totalAssessments: allAssessments?.length || 0,
        gradedAssessments: gradedCount,
        pendingAssessments: pendingCount,
        overdueAssessments: overdueCount,
        enrolledCourses: enrollments?.length || 0,
        releasedGrades: studentGrades?.length || 0,
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Enhanced Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 text-white p-2 rounded-lg">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">EduConnect AMS</h1>
              <p className="text-sm text-gray-600">Welcome back, <span className="font-medium text-blue-600">{userProfile.name}</span></p>
            </div>
          </div>
          <div className="flex gap-3 items-center">
            <NotificationCenter userId={userProfile.id} />
            <Button variant="outline" onClick={onLogout} className="border-gray-300 hover:bg-gray-50">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Enhanced Summary Cards */}
        {report && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            <Card className="bg-white border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Enrolled</p>
                    <p className="text-2xl font-bold text-gray-900">{report.enrolledCourses}</p>
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
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total</p>
                    <p className="text-2xl font-bold text-gray-900">{report.totalAssessments}</p>
                    <p className="text-xs text-gray-500">Assessments</p>
                  </div>
                  <div className="bg-purple-100 p-2 rounded-lg">
                    <FileText className="h-5 w-5 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-l-4 border-l-yellow-500 hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pending</p>
                    <p className="text-2xl font-bold text-yellow-600">{report.pendingAssessments}</p>
                    <p className="text-xs text-gray-500">Submissions</p>
                  </div>
                  <div className="bg-yellow-100 p-2 rounded-lg">
                    <Clock className="h-5 w-5 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={`bg-white border-l-4 hover:shadow-md transition-shadow ${report.overdueAssessments > 0 ? 'border-l-red-500' : 'border-l-green-500'}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Overdue</p>
                    <p className={`text-2xl font-bold ${report.overdueAssessments > 0 ? 'text-red-600' : 'text-green-600'}`}>{report.overdueAssessments}</p>
                    <p className="text-xs text-gray-500">Assessments</p>
                  </div>
                  <div className={`p-2 rounded-lg ${report.overdueAssessments > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
                    {report.overdueAssessments > 0 ? <AlertTriangle className="h-5 w-5 text-red-600" /> : <CheckCircle2 className="h-5 w-5 text-green-600" />}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-l-4 border-l-emerald-500 hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Released</p>
                    <p className="text-2xl font-bold text-emerald-600">{report.releasedGrades}</p>
                    <p className="text-xs text-gray-500">Grades</p>
                  </div>
                  <div className="bg-emerald-100 p-2 rounded-lg">
                    <Award className="h-5 w-5 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-l-4 border-l-indigo-500 hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Average</p>
                    <p className="text-2xl font-bold text-indigo-600">{report.averageGrade}%</p>
                    <p className="text-xs text-gray-500">Grade</p>
                  </div>
                  <div className="bg-indigo-100 p-2 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-indigo-600" />
                  </div>
                </div>
                <Progress value={report.averageGrade} className="mt-2 h-1" />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Urgent Deadlines Alert Section */}
        {getUrgentAssessments().length > 0 && (
          <Card className="mb-6 border-orange-200 bg-gradient-to-r from-orange-50 to-red-50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  <CardTitle className="text-lg text-orange-800">Urgent Deadlines</CardTitle>
                </div>
                <Badge variant="destructive" className="animate-pulse">
                  {getUrgentAssessments().length} Require Attention
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {getUrgentAssessments().slice(0, 3).map((assessment) => {
                  const urgency = getAssessmentUrgency(assessment.due_date, assessment.id);
                  return (
                    <div key={assessment.id} className={`p-3 rounded-lg border ${urgency.color} flex items-center justify-between`}>
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{assessment.title}</h4>
                        <p className="text-xs opacity-80">Due: {new Date(assessment.due_date).toLocaleDateString()}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setActiveTab('assessments')}>
                          <Send className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
              {getUrgentAssessments().length > 3 && (
                <Button variant="link" className="mt-2 text-orange-700" onClick={() => setActiveTab('deadlines')}>
                  View all {getUrgentAssessments().length} urgent deadlines <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Quick Actions Section */}
        <div className="flex flex-wrap gap-3 mb-6">
          <Button onClick={() => setActiveTab('courses')} className="bg-blue-600 hover:bg-blue-700">
            <LayoutGrid className="h-4 w-4 mr-2" />
            My Courses
          </Button>
          <Button variant="outline" onClick={() => setActiveTab('grades')}>
            <Award className="h-4 w-4 mr-2" />
            View Grades
          </Button>
          <Button variant="outline" onClick={() => setActiveTab('calendar')}>
            <Calendar className="h-4 w-4 mr-2" />
            Calendar
          </Button>
          <Button variant="outline" onClick={() => setActiveTab('transcript')}>
            <GraduationCap className="h-4 w-4 mr-2" />
            Transcript
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-white border shadow-sm p-1 flex-wrap h-auto">
            <TabsTrigger value="overview" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
              <Eye className="h-4 w-4 mr-1" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="courses" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
              <LayoutGrid className="h-4 w-4 mr-1" />
              My Courses
            </TabsTrigger>
            <TabsTrigger value="calendar" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
              <Calendar className="h-4 w-4 mr-1" />
              Calendar
            </TabsTrigger>
            <TabsTrigger value="grades" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
              <Award className="h-4 w-4 mr-1" />
              Grades
            </TabsTrigger>
            <TabsTrigger value="transcript" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
              <GraduationCap className="h-4 w-4 mr-1" />
              Transcript
            </TabsTrigger>
            <TabsTrigger value="profile" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
              <UserCircle className="h-4 w-4 mr-1" />
              Profile
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab - New Dashboard Home */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Recent Activity */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-600" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {submissions.slice(0, 5).length > 0 ? (
                      submissions.slice(0, 5).map((submission: any) => (
                        <div key={submission.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${submission.status === 'graded' ? 'bg-green-100' : 'bg-yellow-100'}`}>
                              {submission.status === 'graded' ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Clock className="h-4 w-4 text-yellow-600" />}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{submission.assessment?.title || submission.file_name}</p>
                              <p className="text-xs text-gray-500">{new Date(submission.submitted_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <Badge variant={submission.status === 'graded' ? 'default' : 'secondary'}>
                            {submission.status}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-4">No recent submissions</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Grade Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-emerald-600" />
                    Grade Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {grades.length > 0 ? (
                    <div className="space-y-4">
                      <div className="text-center">
                        <p className="text-4xl font-bold text-emerald-600">{report?.averageGrade || 0}%</p>
                        <p className="text-sm text-gray-500">Overall Average</p>
                      </div>
                      <Separator />
                      <div className="space-y-2">
                        {grades.slice(0, 3).map((grade: any) => {
                          const pct = Math.round((grade.score / grade.total_marks) * 100);
                          return (
                            <div key={grade.id} className="flex items-center justify-between">
                              <span className="text-sm truncate flex-1">{grade.submission?.assessment?.title}</span>
                              <Badge variant={pct >= 50 ? 'default' : 'destructive'} className="ml-2">{pct}%</Badge>
                            </div>
                          );
                        })}
                      </div>
                      <Button variant="outline" className="w-full" onClick={() => setActiveTab('grades')}>
                        View All Grades
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">No grades yet</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Courses Tab - Modern LMS-style Course Overview */}
          <TabsContent value="courses" className="space-y-4">
            {showCourseDetail && selectedCourse ? (
              <StudentCourseDetail
                courseId={selectedCourse.id}
                course={selectedCourse}
                userProfile={userProfile}
                onBack={handleBackToCourses}
              />
            ) : (
              <CourseOverview
                userProfile={userProfile}
                role="student"
                onCourseSelect={handleCourseSelect}
              />
            )}
          </TabsContent>

          {/* Calendar Tab */}
          <TabsContent value="calendar" className="space-y-4">
            <StudentCalendar studentId={userProfile.id} />
          </TabsContent>

          {/* Filter Tab */}
          <TabsContent value="filter" className="space-y-4">
            <AssessmentFilter studentId={userProfile.id} />
          </TabsContent>

          {/* Submission History Tab */}
          <TabsContent value="submission-history" className="space-y-4">
            <SubmissionHistory studentId={userProfile.id} />
          </TabsContent>

          {/* Grades Dashboard Tab */}
          <TabsContent value="grades-dashboard" className="space-y-4">
            <GradesDashboard studentId={userProfile.id} />
          </TabsContent>

          {/* Interim Transcript Tab */}
          <TabsContent value="transcript" className="space-y-4">
            <InterimTranscript studentId={userProfile.id} />
          </TabsContent>

          {/* Upcoming Deadlines Tab */}
          <TabsContent value="deadlines" className="space-y-4">
            <UpcomingDeadlinesWidget />
          </TabsContent>

          <TabsContent value="materials" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                  Learning Materials
                </CardTitle>
                <CardDescription>Download course materials and resources</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {materials.length === 0 ? (
                    <p className="text-sm text-gray-500 col-span-2 text-center py-8">No materials available</p>
                  ) : (
                    materials.map((material) => (
                      <div key={material.id} className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md hover:border-blue-200 transition-all bg-white">
                        <div className="flex items-center gap-4">
                          <div className="bg-blue-100 p-3 rounded-lg">
                            <FileText className="h-6 w-6 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">{material.title}</h3>
                            <p className="text-sm text-gray-600">{material.description}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(material.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadMaterial(material.id)}
                          className="shrink-0"
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
            <Card className="border-t-4 border-t-blue-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-blue-600" />
                  Submit Assessment
                </CardTitle>
                <CardDescription>Upload your completed assessment</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Show message if all assessments are submitted */}
                {allAssessmentsSubmitted ? (
                  <div className="text-center py-8 bg-green-50 rounded-lg border border-green-200">
                    <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-green-800 mb-2">All Assessments Submitted</h3>
                    <p className="text-sm text-green-700">
                      Great work! You have submitted all available assessments.
                    </p>
                    <p className="text-xs text-green-600 mt-2">
                      Check the "My Grades" tab to view your results.
                    </p>
                  </div>
                ) : getSubmittableAssessments().length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                    <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No assessments available for submission.</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Select Assessment</Label>
                      <select
                        className="w-full p-3 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        value={selectedAssessment}
                        onChange={(e) => setSelectedAssessment(e.target.value)}
                      >
                        <option value="">Choose an assessment...</option>
                        {getSubmittableAssessments().map((assessment) => {
                          const urgency = getAssessmentUrgency(assessment.due_date, assessment.id);
                          const { isSubmitted } = getSubmissionInfo(assessment.id);
                          const isResubmission = isSubmitted && assessment.resubmission_allowed;

                          return (
                            <option key={assessment.id} value={assessment.id}>
                              {isResubmission ? '🔄 ' : ''}
                              {urgency.level === 'overdue' ? '🔴 ' : urgency.level === 'urgent' ? '🟠 ' : urgency.level === 'soon' ? '🟡 ' : ''}
                              {assessment.title}
                              {isResubmission ? ' [Resubmission]' : ''}
                              (Due: {new Date(assessment.due_date).toLocaleDateString()})
                            </option>
                          );
                        })}
                      </select>

                      {/* Show resubmission info when a resubmission assessment is selected */}
                      {selectedAssessment && (() => {
                        const selected = assessments.find(a => a.id === selectedAssessment);
                        const { isSubmitted } = getSubmissionInfo(selectedAssessment);
                        if (selected && isSubmitted && selected.resubmission_allowed) {
                          return (
                            <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                              <div className="flex items-center gap-2 text-amber-800">
                                <AlertTriangle className="h-4 w-4" />
                                <span className="text-sm font-medium">Resubmission</span>
                              </div>
                              <p className="text-xs text-amber-700 mt-1">
                                You have already submitted this assessment. Uploading a new file will replace your previous submission.
                              </p>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Upload File</Label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                        <input
                          type="file"
                          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                          className="w-full"
                        />
                        {selectedFile && (
                          <p className="text-sm text-blue-600 mt-2 flex items-center justify-center gap-2">
                            <FileText className="h-4 w-4" />
                            {selectedFile.name}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      onClick={handleSubmitAssessment}
                      disabled={isSubmitting || !selectedFile || !selectedAssessment}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      size="lg"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {isSubmitting ? 'Submitting...' : 'Submit Assessment'}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-purple-600" />
                  Available Assessments
                </CardTitle>
                <CardDescription>View all assessments and their deadlines</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {assessments.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-8">No assessments available</p>
                  ) : (
                    assessments.map((assessment) => {
                      const urgency = getAssessmentUrgency(assessment.due_date, assessment.id);
                      const { isSubmitted } = getSubmissionInfo(assessment.id);
                      const resubmissionAllowed = assessment.resubmission_allowed === true;
                      const now = new Date();
                      const dueDate = new Date(assessment.due_date);
                      const isPastDue = dueDate < now;
                      const canResubmit = isSubmitted && resubmissionAllowed && !isPastDue;
                      const canSubmit = !isSubmitted || canResubmit;

                      return (
                        <div key={assessment.id} className={`p-4 border rounded-lg hover:shadow-md transition-all ${urgency.level !== 'completed' && urgency.level !== 'normal' ? 'border-l-4' : ''} ${urgency.level === 'overdue' ? 'border-l-red-500 bg-red-50/50' : urgency.level === 'urgent' ? 'border-l-orange-500 bg-orange-50/50' : urgency.level === 'soon' ? 'border-l-yellow-500 bg-yellow-50/50' : urgency.level === 'completed' ? 'border-l-green-500 bg-green-50/50' : ''}`}>
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-gray-900">{assessment.title}</h3>
                                {resubmissionAllowed && (
                                  <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                                    Resubmission Allowed
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 mt-1">{assessment.description}</p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <Badge variant="outline">{assessment.total_marks} marks</Badge>
                              <Badge className={urgency.color}>{urgency.label}</Badge>
                            </div>
                          </div>
                          <div className="flex justify-between items-center mt-3">
                            <span className="text-sm text-gray-500 flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              Due: {new Date(assessment.due_date).toLocaleDateString()}
                            </span>
                            {canSubmit && (
                              <Button size="sm" onClick={() => {
                                setSelectedAssessment(assessment.id);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}>
                                <Send className="h-4 w-4 mr-1" />
                                {canResubmit ? 'Resubmit' : 'Submit Now'}
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })
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
            {/* Statistics Summary */}
            {gradeStats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-white border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Overall Average</p>
                    <p className="text-2xl font-bold text-gray-900">{gradeStats.average}%</p>
                    <Badge className={getGradeLabel(gradeStats.average).color}>
                      {getGradeLabel(gradeStats.average).label}
                    </Badge>
                  </CardContent>
                </Card>
                <Card className="bg-white border-l-4 border-l-green-500">
                  <CardContent className="p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Highest Score</p>
                    <p className="text-2xl font-bold text-green-600">{gradeStats.highest}%</p>
                  </CardContent>
                </Card>
                <Card className="bg-white border-l-4 border-l-orange-500">
                  <CardContent className="p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Lowest Score</p>
                    <p className="text-2xl font-bold text-orange-600">{gradeStats.lowest}%</p>
                  </CardContent>
                </Card>
                <Card className="bg-white border-l-4 border-l-purple-500">
                  <CardContent className="p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Total Graded</p>
                    <p className="text-2xl font-bold text-purple-600">{gradeStats.total}</p>
                  </CardContent>
                </Card>
              </div>
            )}

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>My Grades</CardTitle>
                    <CardDescription>View your assessment results and feedback</CardDescription>
                  </div>
                  {/* View Toggle */}
                  <div className="flex border rounded-lg overflow-hidden">
                    <Button
                      variant={gradesViewMode === 'card' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setGradesViewMode('card')}
                      className="rounded-none"
                    >
                      <LayoutGrid className="h-4 w-4 mr-1" />
                      Card
                    </Button>
                    <Button
                      variant={gradesViewMode === 'table' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setGradesViewMode('table')}
                      className="rounded-none"
                    >
                      <TableIcon className="h-4 w-4 mr-1" />
                      Table
                    </Button>
                    <Button
                      variant={gradesViewMode === 'graph' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setGradesViewMode('graph')}
                      className="rounded-none"
                    >
                      <BarChart3 className="h-4 w-4 mr-1" />
                      Graph
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {grades.length === 0 ? (
                  <div className="text-center py-12">
                    <Award className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No grades released yet</p>
                    <p className="text-sm text-gray-400 mt-1">Your grades will appear here once released by your instructor</p>
                  </div>
                ) : (
                  <>
                    {/* Card View */}
                    {gradesViewMode === 'card' && (
                      <div className="space-y-4">
                        {sortedGrades.map((grade) => {
                          const gradeInfo = getGradeLabel(grade.percentage);
                          return (
                            <div key={grade.id} className="p-4 border rounded-lg space-y-3 hover:shadow-sm transition-shadow">
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <Award className="h-5 w-5 text-yellow-600" />
                                    <h3 className="font-medium">{grade.assessmentName}</h3>
                                  </div>
                                  <p className="text-lg font-semibold mt-1">
                                    Grade: {grade.score}/{grade.total_marks} ({grade.percentage}%)
                                  </p>
                                  <p className="text-sm text-gray-600 mt-1">
                                    Graded by {grade.grader?.full_name || 'Instructor'} on {new Date(grade.graded_at).toLocaleDateString()}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Submitted: {grade.submission?.file_name}
                                  </p>
                                </div>
                                <Badge className={gradeInfo.color}>
                                  {gradeInfo.label} - {gradeInfo.name}
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
                              <Progress value={grade.percentage} className="mt-2" />
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Table View */}
                    {gradesViewMode === 'table' && (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead
                                className="cursor-pointer hover:bg-gray-50"
                                onClick={() => handleGradesSort('name')}
                              >
                                <div className="flex items-center gap-1">
                                  Assessment Name
                                  {gradesSortField === 'name' && (
                                    gradesSortOrder === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />
                                  )}
                                  {gradesSortField !== 'name' && <ArrowUpDown className="h-3 w-3 text-gray-400" />}
                                </div>
                              </TableHead>
                              <TableHead className="text-center">Marks Obtained</TableHead>
                              <TableHead className="text-center">Total Marks</TableHead>
                              <TableHead
                                className="text-center cursor-pointer hover:bg-gray-50"
                                onClick={() => handleGradesSort('percentage')}
                              >
                                <div className="flex items-center justify-center gap-1">
                                  Percentage
                                  {gradesSortField === 'percentage' && (
                                    gradesSortOrder === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />
                                  )}
                                  {gradesSortField !== 'percentage' && <ArrowUpDown className="h-3 w-3 text-gray-400" />}
                                </div>
                              </TableHead>
                              <TableHead className="text-center">Grade Status</TableHead>
                              <TableHead
                                className="cursor-pointer hover:bg-gray-50"
                                onClick={() => handleGradesSort('date')}
                              >
                                <div className="flex items-center gap-1">
                                  Grading Date
                                  {gradesSortField === 'date' && (
                                    gradesSortOrder === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />
                                  )}
                                  {gradesSortField !== 'date' && <ArrowUpDown className="h-3 w-3 text-gray-400" />}
                                </div>
                              </TableHead>
                              <TableHead className="text-center">Feedback</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {sortedGrades.map((grade) => {
                              const gradeInfo = getGradeLabel(grade.percentage);
                              return (
                                <TableRow key={grade.id}>
                                  <TableCell className="font-medium">{grade.assessmentName}</TableCell>
                                  <TableCell className="text-center font-semibold">{grade.score}</TableCell>
                                  <TableCell className="text-center">{grade.total_marks}</TableCell>
                                  <TableCell className="text-center">
                                    <span className={`font-bold ${grade.percentage >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                                      {grade.percentage}%
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Badge className={gradeInfo.color}>
                                      {gradeInfo.label}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-sm text-gray-600">
                                    {new Date(grade.graded_at).toLocaleDateString()}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {grade.feedback ? (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleViewFeedback(grade)}
                                      >
                                        <MessageSquare className="h-4 w-4" />
                                      </Button>
                                    ) : (
                                      <span className="text-gray-400">—</span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}

                    {/* Graph View */}
                    {gradesViewMode === 'graph' && (
                      <div className="space-y-6">
                        {/* Bar Chart */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-4">Performance by Assessment</h4>
                          <div className="space-y-3">
                            {sortedGrades.map((grade) => (
                              <div key={grade.id} className="space-y-1">
                                <div className="flex justify-between text-sm">
                                  <span className="truncate max-w-[200px] md:max-w-[300px]" title={grade.assessmentName}>
                                    {grade.assessmentName}
                                  </span>
                                  <span className="font-medium ml-2">{grade.percentage}%</span>
                                </div>
                                <div className="h-6 bg-gray-100 rounded-full overflow-hidden relative">
                                  <div
                                    className={`h-full rounded-full transition-all ${getGradeBarColor(grade.percentage)}`}
                                    style={{ width: `${grade.percentage}%` }}
                                  />
                                  {/* Average line indicator */}
                                  {gradeStats && (
                                    <div
                                      className="absolute top-0 bottom-0 w-0.5 bg-gray-800"
                                      style={{ left: `${gradeStats.average}%` }}
                                      title={`Average: ${gradeStats.average}%`}
                                    />
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                          {gradeStats && (
                            <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
                              <div className="w-3 h-3 bg-gray-800 rounded-full" />
                              <span>Average: {gradeStats.average}%</span>
                            </div>
                          )}
                        </div>

                        {/* Performance Trend */}
                        <Separator />
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-4">Performance Trend Over Time</h4>
                          <div className="h-48 flex items-end gap-2 pb-6 relative">
                            {/* Y-axis labels */}
                            <div className="absolute left-0 top-0 bottom-6 w-8 flex flex-col justify-between text-xs text-gray-400">
                              <span>100%</span>
                              <span>75%</span>
                              <span>50%</span>
                              <span>25%</span>
                              <span>0%</span>
                            </div>

                            {/* Bars */}
                            <div className="flex-1 ml-10 flex items-end gap-1">
                              {[...sortedGrades]
                                .sort((a, b) => new Date(a.graded_at).getTime() - new Date(b.graded_at).getTime())
                                .map((grade) => (
                                  <div key={grade.id} className="flex-1 flex flex-col items-center max-w-16 group relative">
                                    <div
                                      className={`w-full rounded-t transition-all cursor-pointer hover:opacity-80 min-h-[4px] ${getGradeBarColor(grade.percentage)}`}
                                      style={{ height: `${(grade.percentage / 100) * 160}px` }}
                                    />
                                    <div className="text-xs text-gray-500 mt-2 truncate w-full text-center">
                                      {new Date(grade.graded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </div>
                                    {/* Tooltip on hover */}
                                    <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                                      <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                                        {grade.assessmentName}: {grade.percentage}%
                                      </div>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </div>
                        </div>

                        {/* Grade Distribution Legend */}
                        <Separator />
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-3">Grade Scale</h4>
                          <div className="flex flex-wrap gap-3">
                            {[
                              { label: 'HD', name: 'High Distinction', range: '85-100%', color: 'bg-purple-500' },
                              { label: 'D', name: 'Distinction', range: '75-84%', color: 'bg-blue-500' },
                              { label: 'CR', name: 'Credit', range: '65-74%', color: 'bg-green-500' },
                              { label: 'P', name: 'Pass', range: '50-64%', color: 'bg-yellow-500' },
                              { label: 'F', name: 'Fail', range: '0-49%', color: 'bg-red-500' },
                            ].map((g) => (
                              <div key={g.label} className="flex items-center gap-2 text-sm">
                                <div className={`w-4 h-4 rounded ${g.color}`} />
                                <span className="font-medium">{g.label}</span>
                                <span className="text-gray-500">({g.range})</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Feedback Dialog */}
            <Dialog open={feedbackDialogOpen} onOpenChange={setFeedbackDialogOpen}>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-blue-600" />
                    Instructor Feedback
                  </DialogTitle>
                  <DialogDescription>
                    {selectedFeedbackGrade?.assessmentName}
                  </DialogDescription>
                </DialogHeader>
                {selectedFeedbackGrade && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <span className="text-lg font-semibold">
                          {selectedFeedbackGrade.score}/{selectedFeedbackGrade.total_marks}
                        </span>
                        <span className="text-gray-500 ml-2">
                          ({selectedFeedbackGrade.percentage}%)
                        </span>
                      </div>
                      <Badge className={getGradeLabel(selectedFeedbackGrade.percentage).color}>
                        {getGradeLabel(selectedFeedbackGrade.percentage).label} - {getGradeLabel(selectedFeedbackGrade.percentage).name}
                      </Badge>
                    </div>
                    <Separator />
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Feedback</h4>
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                        <p className="text-gray-700 whitespace-pre-wrap">
                          {selectedFeedbackGrade.feedback || 'No feedback provided.'}
                        </p>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      Graded on {new Date(selectedFeedbackGrade.graded_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-4">
            <StudentProfile userId={userProfile.id} />
          </TabsContent>
        </Tabs>
      </main>

      {/* AI Chatbot */}
      <AIChatbot
        studentId={userProfile.id}
        studentName={userProfile.name}
        onNavigate={handleChatbotNavigate}
      />
    </div>
  );
}