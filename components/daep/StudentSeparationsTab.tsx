'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Plus, Loader2, AlertTriangle } from 'lucide-react';
import { SeparationCard } from './SeparationCard';
import { AddSeparationDialog } from './AddSeparationDialog';
import { getStudentSeparations, type StudentSeparation } from '@/app/actions/daep/rooms';

interface Props {
  schoolId: string;
  studentName: string;
}

export function StudentSeparationsTab({ schoolId, studentName }: Props) {
  const [separations, setSeparations] = useState<StudentSeparation[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const fetchSeparations = async () => {
    try {
      const data = await getStudentSeparations(schoolId);
      setSeparations(data);
    } catch (err) {
      console.error('Failed to fetch separations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSeparations();
  }, [schoolId]);

  const handleSeparationChange = () => {
    fetchSeparations();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Users className="w-5 h-5" />
          Student Separations
          {separations.length > 0 && (
            <span className="text-xs text-muted-foreground font-normal">
              ({separations.length})
            </span>
          )}
        </CardTitle>
        <Button onClick={() => setAddDialogOpen(true)} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Separation
        </Button>
      </CardHeader>
      <CardContent>
        {separations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No active separations</p>
            <p className="text-sm mt-1">
              Add a separation if this student needs to be kept apart from another student.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {separations.map((separation) => (
              <SeparationCard
                key={separation.id}
                separation={separation}
                onRemove={handleSeparationChange}
              />
            ))}
          </div>
        )}
      </CardContent>

      {/* Add Separation Dialog */}
      <AddSeparationDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        studentId={schoolId}
        studentName={studentName}
        onSuccess={handleSeparationChange}
      />
    </Card>
  );
}
