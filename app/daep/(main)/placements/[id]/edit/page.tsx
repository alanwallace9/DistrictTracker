import { notFound } from 'next/navigation';
import { getPlacementForEdit, getOffenseCodesForForm } from '@/app/actions/daep/placements';
import { getAvailableRoomsForStudent } from '@/app/actions/daep/rooms';
import { EditPlacementForm } from '@/components/daep/placements/EditPlacementForm';

interface EditPlacementPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Edit Placement Page
 * Story 2-8: AC 2.8.1
 */
export default async function EditPlacementPage({ params }: EditPlacementPageProps) {
  const { id } = await params;

  // Fetch placement data
  const placement = await getPlacementForEdit(id);

  if (!placement) {
    notFound();
  }

  // Fetch form options in parallel
  const [availableRooms, offenseCodes] = await Promise.all([
    getAvailableRoomsForStudent(placement.school_id, placement.id),
    getOffenseCodesForForm(),
  ]);

  return (
    <div className="container max-w-4xl py-6">
      <EditPlacementForm
        placement={placement}
        availableRooms={availableRooms}
        offenseCodes={offenseCodes}
      />
    </div>
  );
}
