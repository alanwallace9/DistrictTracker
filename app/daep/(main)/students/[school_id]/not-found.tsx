import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { UserX, ArrowLeft } from 'lucide-react';

export default function StudentNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted">
        <UserX className="w-8 h-8 text-muted-foreground" />
      </div>
      <h1 className="text-2xl font-semibold">Student Not Found</h1>
      <p className="text-muted-foreground text-center max-w-md">
        The student you&apos;re looking for doesn&apos;t exist or you don&apos;t have permission to view their profile.
      </p>
      <Link href="/daep/students">
        <Button variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Students
        </Button>
      </Link>
    </div>
  );
}
