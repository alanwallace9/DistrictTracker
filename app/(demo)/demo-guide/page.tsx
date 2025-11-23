'use client';

import { useDemoRole } from '@/contexts/DemoRoleContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Eye, UserCog, Shield, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DemoGuidePage() {
  const router = useRouter();
  const { isDemoMode, demoRole, setDemoRole, availableRoles } = useDemoRole();

  const roleIcons = {
    viewer: Eye,
    campus_admin: UserCog,
    district_admin: Shield,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link href="/trespass">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-slate-900">Demo Environment Guide</h1>
          <p className="text-slate-600 mt-2">
            Learn how to use TrespassTracker with different user roles
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Welcome to the Demo!</CardTitle>
            <CardDescription>
              This demo environment lets you explore TrespassTracker with different permission levels
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-slate-900">Full CRUD Access</p>
                <p className="text-sm text-slate-600">
                  Create, read, update, and delete records to test all features
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-slate-900">Data Resets Nightly</p>
                <p className="text-sm text-slate-600">
                  All demo data resets at midnight CT, so feel free to experiment
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-slate-900">Role Switching</p>
                <p className="text-sm text-slate-600">
                  Use the role dropdown in the blue banner above to experience different permission levels
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Role Guides */}
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          {availableRoles.map((role) => {
            const Icon = roleIcons[role.value];
            const isCurrentRole = demoRole === role.value;

            return (
              <Card
                key={role.value}
                className={`cursor-pointer transition-all ${
                  isCurrentRole ? 'ring-2 ring-blue-600 bg-blue-50' : 'hover:shadow-lg'
                }`}
                onClick={() => setDemoRole(role.value)}
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isCurrentRole ? 'bg-blue-600' : 'bg-slate-900'
                      }`}
                    >
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{role.label}</CardTitle>
                      {isCurrentRole && (
                        <p className="text-xs text-blue-600 font-medium">Current Role</p>
                      )}
                    </div>
                  </div>
                  <CardDescription className="mt-2">{role.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {role.value === 'viewer' && (
                      <>
                        <div className="flex items-start gap-2">
                          <span className="text-green-600">✓</span>
                          <span>View all trespass records</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-green-600">✓</span>
                          <span>Search and filter records</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-red-600">✗</span>
                          <span>Cannot create or edit</span>
                        </div>
                      </>
                    )}
                    {role.value === 'campus_admin' && (
                      <>
                        <div className="flex items-start gap-2">
                          <span className="text-green-600">✓</span>
                          <span>All viewer permissions</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-green-600">✓</span>
                          <span>Create new records</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-green-600">✓</span>
                          <span>Edit existing records</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-green-600">✓</span>
                          <span>Upload photos/documents</span>
                        </div>
                      </>
                    )}
                    {role.value === 'district_admin' && (
                      <>
                        <div className="flex items-start gap-2">
                          <span className="text-green-600">✓</span>
                          <span>All campus admin permissions</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-green-600">✓</span>
                          <span>Delete records</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-green-600">✓</span>
                          <span>Bulk CSV upload</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-green-600">✓</span>
                          <span>Export to Excel/PDF</span>
                        </div>
                      </>
                    )}
                  </div>
                  {!isCurrentRole && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-4"
                      onClick={() => setDemoRole(role.value)}
                    >
                      Switch to {role.label}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Start */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Start Steps</CardTitle>
            <CardDescription>Follow these steps to get started with the demo</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                  1
                </span>
                <div>
                  <p className="font-medium text-slate-900">Choose a Role</p>
                  <p className="text-sm text-slate-600">
                    Use the role dropdown in the blue banner above to select a permission level
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                  2
                </span>
                <div>
                  <p className="font-medium text-slate-900">Explore the Dashboard</p>
                  <p className="text-sm text-slate-600">
                    Browse existing demo records, use search and filters
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                  3
                </span>
                <div>
                  <p className="font-medium text-slate-900">Test Features</p>
                  <p className="text-sm text-slate-600">
                    Create, edit, or delete records based on your role permissions
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                  4
                </span>
                <div>
                  <p className="font-medium text-slate-900">Ready to Go Live?</p>
                  <p className="text-sm text-slate-600">
                    <Link href="/signup" className="text-blue-600 hover:underline">
                      Create your own account
                    </Link>{' '}
                    to set up your district with real data
                  </p>
                </div>
              </li>
            </ol>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="mt-8 text-center">
          <Link href="/trespass">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
              Start Exploring the Demo
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
