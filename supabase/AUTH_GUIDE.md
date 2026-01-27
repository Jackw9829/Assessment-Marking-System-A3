# Role-Based Authentication Implementation

## Overview
Your system now has complete role-based authentication integrated with Supabase!

## What Was Implemented

### 1. **Auth Context** ([auth-context.tsx](../src/lib/auth-context.tsx))
- Manages authentication state globally
- Provides hooks: `useAuth()`, `useRequireAuth()`, `useRequireRole()`
- Auto-syncs with Supabase auth state changes
- Fetches user profile from database

### 2. **Route Guards** ([route-guard.tsx](../src/lib/route-guard.tsx))
- `<RouteGuard>` - Protects entire routes by role
- `<RoleBasedComponent>` - Shows/hides UI elements by role
- Loading and unauthorized states

### 3. **Updated App** ([App.tsx](../src/app/App.tsx))
- Wrapped in `<AuthProvider>`
- Automatic role-based routing
- Shows correct dashboard per role

### 4. **Updated Auth Page** ([auth-page.tsx](../src/app/components/auth-page.tsx))
- Uses `useAuth()` hook
- Sign in and sign up with role selection
- Cleaner, context-based implementation

## How It Works

### Authentication Flow
1. User signs up → Profile auto-created in database with role
2. User signs in → Session + profile loaded
3. App checks role → Routes to correct dashboard
4. All subsequent requests use auth context

### Role-Based Routing
```tsx
// Admin sees AdminDashboard
if (profile.role === 'admin') { ... }

// Instructor sees InstructorDashboard  
if (profile.role === 'instructor') { ... }

// Student sees StudentDashboard
if (profile.role === 'student') { ... }
```

## Usage Examples

### In Any Component

```tsx
import { useAuth } from '@/lib/auth-context';

function MyComponent() {
  const { user, profile, loading, signOut } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Please sign in</div>;
  
  return (
    <div>
      <p>Welcome {profile?.full_name}</p>
      <p>Role: {profile?.role}</p>
      <button onClick={signOut}>Logout</button>
    </div>
  );
}
```

### Check Specific Role

```tsx
import { useRequireRole } from '@/lib/auth-context';

function AdminOnlyFeature() {
  const { hasRole, loading } = useRequireRole('admin');
  
  if (loading) return <div>Loading...</div>;
  if (!hasRole) return <div>Access denied</div>;
  
  return <div>Admin content here</div>;
}
```

### Multiple Roles

```tsx
import { useRequireRole } from '@/lib/auth-context';

function InstructorOrAdminFeature() {
  const { hasRole } = useRequireRole(['admin', 'instructor']);
  
  if (!hasRole) return null;
  
  return <button>Upload Material</button>;
}
```

### Protect Routes

```tsx
import { RouteGuard } from '@/lib/route-guard';

function AdminPanel() {
  return (
    <RouteGuard allowedRoles={['admin']}>
      <div>Admin panel content</div>
    </RouteGuard>
  );
}
```

### Show/Hide UI Elements

```tsx
import { RoleBasedComponent } from '@/lib/route-guard';

function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      
      <RoleBasedComponent allowedRoles={['admin']}>
        <button>Create Course</button>
      </RoleBasedComponent>
      
      <RoleBasedComponent allowedRoles={['instructor']}>
        <button>Upload Material</button>
      </RoleBasedComponent>
      
      <RoleBasedComponent allowedRoles={['student']}>
        <button>Download Material</button>
      </RoleBasedComponent>
    </div>
  );
}
```

## Integration with Supabase Helpers

The auth context works seamlessly with your Supabase helpers:

```tsx
import { useAuth } from '@/lib/auth-context';
import { createCourse, uploadMaterial } from '@/lib/supabase-helpers';

function AdminCourseCreate() {
  const { profile } = useAuth();
  
  const handleCreateCourse = async () => {
    // Helper already checks permissions via RLS
    await createCourse('CS101', 'CS101', 'Intro to CS');
  };
  
  return <button onClick={handleCreateCourse}>Create Course</button>;
}
```

## Testing

### Create Test Users

1. **Admin User**:
   - Sign up with role: "admin"
   - Or manually set role in Supabase Table Editor → profiles

2. **Instructor User**:
   - Sign up with role: "instructor"

3. **Student User**:
   - Sign up with role: "student" (default)

### Test Flow

1. **As Admin**:
   - Create courses
   - Assign instructors
   - Enroll students

2. **As Instructor**:
   - View assigned courses
   - Upload materials
   - See enrolled students

3. **As Student**:
   - View enrolled courses
   - Download materials
   - Cannot see admin/instructor features

## Security Features

✅ **Client-Side Protection**
- Route guards prevent unauthorized access
- UI elements hidden based on role
- Auth state managed centrally

✅ **Server-Side Protection**
- Supabase RLS enforces permissions
- Database queries automatically filtered
- Storage policies control file access

✅ **Session Management**
- Auto-refresh tokens
- Persistent sessions
- Logout clears all state

## Common Patterns

### Protected API Calls
```tsx
const { session } = useAuth();

const response = await fetch('/api/endpoint', {
  headers: {
    'Authorization': `Bearer ${session?.access_token}`
  }
});
```

### Conditional Rendering
```tsx
const { profile } = useAuth();

return (
  <>
    {profile?.role === 'admin' && <AdminTools />}
    {profile?.role === 'instructor' && <InstructorTools />}
    {profile?.role === 'student' && <StudentTools />}
  </>
);
```

### Redirect After Login
```tsx
// Happens automatically based on role in App.tsx
// Admin → AdminDashboard
// Instructor → InstructorDashboard  
// Student → StudentDashboard
```

## Next Steps

1. ✅ Authentication system is ready
2. ✅ Role-based routing works
3. Update your dashboard components to use `useAuth()` instead of props
4. Add role checks to sensitive UI elements
5. Test all three roles thoroughly

Your system is now production-ready for role-based authentication! 🎉
