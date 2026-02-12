// =============================================
// Student Filter Component
// Course-based filtering for assessments, materials, submissions, grades
// =============================================

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from './ui/select';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from './ui/popover';
import { Calendar } from './ui/calendar';
import {
    Filter,
    X,
    Search,
    Calendar as CalendarIcon,
    SortAsc,
    SortDesc,
    RotateCcw,
    Sliders,
    CheckCircle2,
    Clock,
    FileText,
    Award,
} from 'lucide-react';
import { cn } from './ui/utils';
import { format } from 'date-fns';

// =============================================
// TYPES
// =============================================

export type AssessmentStatus = 'not_submitted' | 'submitted' | 'graded';
export type GradeReleaseStatus = 'released' | 'pending' | 'all';
export type SortField = 'date' | 'title' | 'grade' | 'status';
export type SortOrder = 'asc' | 'desc';

export interface StudentFilterState {
    // Text search
    searchQuery: string;
    // Status filters
    assessmentStatus: AssessmentStatus | 'all';
    gradeReleaseStatus: GradeReleaseStatus;
    // Date filters
    dueDateStart: Date | undefined;
    dueDateEnd: Date | undefined;
    // Sorting
    sortField: SortField;
    sortOrder: SortOrder;
}

export interface FilterableItem {
    id: string;
    title: string;
    type: 'assessment' | 'material' | 'submission' | 'grade';
    date: string; // due_date, created_at, submitted_at, or graded_at
    status?: AssessmentStatus;
    gradeReleased?: boolean;
    score?: number;
    totalMarks?: number;
    percentage?: number;
}

interface StudentFilterProps {
    filters: StudentFilterState;
    onFiltersChange: (filters: StudentFilterState) => void;
    itemType?: 'assessment' | 'material' | 'submission' | 'grade' | 'all';
    showSearch?: boolean;
    showDateFilter?: boolean;
    showStatusFilter?: boolean;
    showGradeFilter?: boolean;
    showSorting?: boolean;
    className?: string;
}

// =============================================
// DEFAULT STATE
// =============================================

export const defaultFilterState: StudentFilterState = {
    searchQuery: '',
    assessmentStatus: 'all',
    gradeReleaseStatus: 'all',
    dueDateStart: undefined,
    dueDateEnd: undefined,
    sortField: 'date',
    sortOrder: 'desc',
};

// =============================================
// FILTER HELPERS
// =============================================

export function hasActiveFilters(filters: StudentFilterState): boolean {
    return (
        filters.searchQuery !== '' ||
        filters.assessmentStatus !== 'all' ||
        filters.gradeReleaseStatus !== 'all' ||
        filters.dueDateStart !== undefined ||
        filters.dueDateEnd !== undefined
    );
}

export function getActiveFilterCount(filters: StudentFilterState): number {
    let count = 0;
    if (filters.searchQuery) count++;
    if (filters.assessmentStatus !== 'all') count++;
    if (filters.gradeReleaseStatus !== 'all') count++;
    if (filters.dueDateStart || filters.dueDateEnd) count++;
    return count;
}

export function filterItems<T extends FilterableItem>(
    items: T[],
    filters: StudentFilterState
): T[] {
    let filtered = [...items];

    // Search query
    if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        filtered = filtered.filter(item =>
            item.title.toLowerCase().includes(query)
        );
    }

    // Assessment status
    if (filters.assessmentStatus !== 'all') {
        filtered = filtered.filter(item =>
            item.status === filters.assessmentStatus
        );
    }

    // Grade release status
    if (filters.gradeReleaseStatus !== 'all') {
        filtered = filtered.filter(item => {
            if (filters.gradeReleaseStatus === 'released') {
                return item.gradeReleased === true;
            }
            return item.gradeReleased === false;
        });
    }

    // Date range
    if (filters.dueDateStart) {
        filtered = filtered.filter(item =>
            new Date(item.date) >= filters.dueDateStart!
        );
    }
    if (filters.dueDateEnd) {
        filtered = filtered.filter(item =>
            new Date(item.date) <= filters.dueDateEnd!
        );
    }

    // Sorting
    filtered.sort((a, b) => {
        let comparison = 0;
        switch (filters.sortField) {
            case 'date':
                comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
                break;
            case 'title':
                comparison = a.title.localeCompare(b.title);
                break;
            case 'grade':
                comparison = (a.percentage || 0) - (b.percentage || 0);
                break;
            case 'status':
                const statusOrder: Record<string, number> = {
                    'not_submitted': 0,
                    'submitted': 1,
                    'graded': 2,
                };
                comparison = (statusOrder[a.status || ''] || 0) - (statusOrder[b.status || ''] || 0);
                break;
        }
        return filters.sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
}

// =============================================
// MAIN COMPONENT
// =============================================

export function StudentFilter({
    filters,
    onFiltersChange,
    itemType = 'all',
    showSearch = true,
    showDateFilter = true,
    showStatusFilter = true,
    showGradeFilter = true,
    showSorting = true,
    className,
}: StudentFilterProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    const activeCount = getActiveFilterCount(filters);
    const hasFilters = hasActiveFilters(filters);

    const updateFilter = <K extends keyof StudentFilterState>(
        key: K,
        value: StudentFilterState[K]
    ) => {
        onFiltersChange({ ...filters, [key]: value });
    };

    const resetFilters = () => {
        onFiltersChange(defaultFilterState);
    };

    // Quick filter buttons
    const quickFilters = [
        { label: 'Pending', status: 'not_submitted' as AssessmentStatus, icon: Clock },
        { label: 'Submitted', status: 'submitted' as AssessmentStatus, icon: FileText },
        { label: 'Graded', status: 'graded' as AssessmentStatus, icon: Award },
    ];

    return (
        <Card className={cn("", className)}>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Filter className="h-4 w-4" />
                        Filters
                        {activeCount > 0 && (
                            <Badge variant="secondary" className="ml-1">
                                {activeCount} active
                            </Badge>
                        )}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        {hasFilters && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={resetFilters}
                                className="h-8 px-2 text-gray-500"
                            >
                                <RotateCcw className="h-3 w-3 mr-1" />
                                Reset
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="h-8 px-2"
                        >
                            <Sliders className="h-3 w-3 mr-1" />
                            {isExpanded ? 'Less' : 'More'}
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Search Bar */}
                {showSearch && (
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search by title..."
                            value={filters.searchQuery}
                            onChange={(e) => updateFilter('searchQuery', e.target.value)}
                            className="pl-10 pr-8"
                        />
                        {filters.searchQuery && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => updateFilter('searchQuery', '')}
                                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                            >
                                <X className="h-3 w-3" />
                            </Button>
                        )}
                    </div>
                )}

                {/* Quick Status Filters */}
                {showStatusFilter && (itemType === 'assessment' || itemType === 'all') && (
                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant={filters.assessmentStatus === 'all' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => updateFilter('assessmentStatus', 'all')}
                            className="h-8"
                        >
                            All
                        </Button>
                        {quickFilters.map(({ label, status, icon: Icon }) => (
                            <Button
                                key={status}
                                variant={filters.assessmentStatus === status ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => updateFilter('assessmentStatus', status)}
                                className="h-8"
                            >
                                <Icon className="h-3 w-3 mr-1" />
                                {label}
                            </Button>
                        ))}
                    </div>
                )}

                {/* Expanded Filters */}
                {isExpanded && (
                    <div className="space-y-4 pt-2 border-t">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Date Range Filter */}
                            {showDateFilter && (
                                <>
                                    <div className="space-y-2">
                                        <Label className="text-xs">From Date</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    className={cn(
                                                        "w-full justify-start text-left font-normal h-9",
                                                        !filters.dueDateStart && "text-muted-foreground"
                                                    )}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {filters.dueDateStart
                                                        ? format(filters.dueDateStart, "PPP")
                                                        : "Select date"}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={filters.dueDateStart}
                                                    onSelect={(date) => updateFilter('dueDateStart', date)}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-xs">To Date</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    className={cn(
                                                        "w-full justify-start text-left font-normal h-9",
                                                        !filters.dueDateEnd && "text-muted-foreground"
                                                    )}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {filters.dueDateEnd
                                                        ? format(filters.dueDateEnd, "PPP")
                                                        : "Select date"}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={filters.dueDateEnd}
                                                    onSelect={(date) => updateFilter('dueDateEnd', date)}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </>
                            )}

                            {/* Grade Release Status */}
                            {showGradeFilter && (itemType === 'grade' || itemType === 'all') && (
                                <div className="space-y-2">
                                    <Label className="text-xs">Grade Status</Label>
                                    <Select
                                        value={filters.gradeReleaseStatus}
                                        onValueChange={(value: GradeReleaseStatus) =>
                                            updateFilter('gradeReleaseStatus', value)
                                        }
                                    >
                                        <SelectTrigger className="h-9">
                                            <SelectValue placeholder="All grades" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Grades</SelectItem>
                                            <SelectItem value="released">Released</SelectItem>
                                            <SelectItem value="pending">Pending</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {/* Sorting */}
                            {showSorting && (
                                <div className="space-y-2">
                                    <Label className="text-xs">Sort By</Label>
                                    <div className="flex gap-1">
                                        <Select
                                            value={filters.sortField}
                                            onValueChange={(value: SortField) =>
                                                updateFilter('sortField', value)
                                            }
                                        >
                                            <SelectTrigger className="h-9 flex-1">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="date">Date</SelectItem>
                                                <SelectItem value="title">Title</SelectItem>
                                                <SelectItem value="grade">Grade</SelectItem>
                                                <SelectItem value="status">Status</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                updateFilter(
                                                    'sortOrder',
                                                    filters.sortOrder === 'asc' ? 'desc' : 'asc'
                                                )
                                            }
                                            className="h-9 w-9 p-0"
                                        >
                                            {filters.sortOrder === 'asc' ? (
                                                <SortAsc className="h-4 w-4" />
                                            ) : (
                                                <SortDesc className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Active Filter Tags */}
                        {hasFilters && (
                            <div className="flex flex-wrap gap-2 pt-2">
                                {filters.searchQuery && (
                                    <Badge variant="secondary" className="gap-1">
                                        Search: "{filters.searchQuery}"
                                        <X
                                            className="h-3 w-3 cursor-pointer"
                                            onClick={() => updateFilter('searchQuery', '')}
                                        />
                                    </Badge>
                                )}
                                {filters.assessmentStatus !== 'all' && (
                                    <Badge variant="secondary" className="gap-1">
                                        Status: {filters.assessmentStatus.replace('_', ' ')}
                                        <X
                                            className="h-3 w-3 cursor-pointer"
                                            onClick={() => updateFilter('assessmentStatus', 'all')}
                                        />
                                    </Badge>
                                )}
                                {filters.gradeReleaseStatus !== 'all' && (
                                    <Badge variant="secondary" className="gap-1">
                                        Grades: {filters.gradeReleaseStatus}
                                        <X
                                            className="h-3 w-3 cursor-pointer"
                                            onClick={() => updateFilter('gradeReleaseStatus', 'all')}
                                        />
                                    </Badge>
                                )}
                                {(filters.dueDateStart || filters.dueDateEnd) && (
                                    <Badge variant="secondary" className="gap-1">
                                        Date: {filters.dueDateStart ? format(filters.dueDateStart, 'MMM d') : 'Any'}
                                        {' - '}
                                        {filters.dueDateEnd ? format(filters.dueDateEnd, 'MMM d') : 'Any'}
                                        <X
                                            className="h-3 w-3 cursor-pointer"
                                            onClick={() => {
                                                updateFilter('dueDateStart', undefined);
                                                updateFilter('dueDateEnd', undefined);
                                            }}
                                        />
                                    </Badge>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// =============================================
// COMPACT INLINE FILTER BAR
// =============================================

interface InlineFilterBarProps {
    filters: StudentFilterState;
    onFiltersChange: (filters: StudentFilterState) => void;
    showStatus?: boolean;
    className?: string;
}

export function InlineFilterBar({
    filters,
    onFiltersChange,
    showStatus = true,
    className,
}: InlineFilterBarProps) {
    const updateFilter = <K extends keyof StudentFilterState>(
        key: K,
        value: StudentFilterState[K]
    ) => {
        onFiltersChange({ ...filters, [key]: value });
    };

    return (
        <div className={cn("flex flex-wrap items-center gap-3", className)}>
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-[300px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                    placeholder="Search..."
                    value={filters.searchQuery}
                    onChange={(e) => updateFilter('searchQuery', e.target.value)}
                    className="pl-9 h-9"
                />
            </div>

            {/* Status Filter */}
            {showStatus && (
                <Select
                    value={filters.assessmentStatus}
                    onValueChange={(value: AssessmentStatus | 'all') =>
                        updateFilter('assessmentStatus', value)
                    }
                >
                    <SelectTrigger className="w-[140px] h-9">
                        <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="not_submitted">Pending</SelectItem>
                        <SelectItem value="submitted">Submitted</SelectItem>
                        <SelectItem value="graded">Graded</SelectItem>
                    </SelectContent>
                </Select>
            )}

            {/* Sort */}
            <Select
                value={filters.sortField}
                onValueChange={(value: SortField) => updateFilter('sortField', value)}
            >
                <SelectTrigger className="w-[120px] h-9">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="date">By Date</SelectItem>
                    <SelectItem value="title">By Title</SelectItem>
                    <SelectItem value="grade">By Grade</SelectItem>
                </SelectContent>
            </Select>

            {/* Sort Order Toggle */}
            <Button
                variant="outline"
                size="sm"
                onClick={() =>
                    updateFilter('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')
                }
                className="h-9 w-9 p-0"
            >
                {filters.sortOrder === 'asc' ? (
                    <SortAsc className="h-4 w-4" />
                ) : (
                    <SortDesc className="h-4 w-4" />
                )}
            </Button>

            {/* Reset */}
            {hasActiveFilters(filters) && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onFiltersChange(defaultFilterState)}
                    className="h-9 px-2 text-gray-500"
                >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Reset
                </Button>
            )}
        </div>
    );
}

export default StudentFilter;
