'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  getDAEPRooms,
  deactivateDAEPRoom,
  activateDAEPRoom,
  type DAEPRoom,
} from '@/app/actions/daep/rooms';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  RefreshCw,
  Search,
  Plus,
  Pencil,
  Users,
  Power,
  PowerOff,
  ArrowUpDown,
} from 'lucide-react';
import { AddRoomDialog } from './AddRoomDialog';
import { EditRoomDialog } from './EditRoomDialog';
import { StaffAssignmentSheet } from './StaffAssignmentSheet';

type SortKey = 'room_number' | 'room_name' | 'capacity' | 'active' | 'staff_count';

export default function DAEPRoomsPage() {
  const { toast } = useToast();
  const [rooms, setRooms] = useState<DAEPRoom[]>([]);
  const [filteredRooms, setFilteredRooms] = useState<DAEPRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({
    key: 'room_number',
    direction: 'asc',
  });

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [staffSheetOpen, setStaffSheetOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<DAEPRoom | null>(null);

  useEffect(() => {
    fetchRooms();
  }, []);

  useEffect(() => {
    filterAndSortRooms();
  }, [rooms, searchQuery, sortConfig]);

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const data = await getDAEPRooms();
      setRooms(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch rooms',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortRooms = () => {
    let filtered = rooms;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (room) =>
          room.room_number.toLowerCase().includes(query) ||
          room.room_name?.toLowerCase().includes(query) ||
          room.building_section?.toLowerCase().includes(query)
      );
    }

    const sorted = [...filtered].sort((a, b) => {
      const { key, direction } = sortConfig;
      const multiplier = direction === 'asc' ? 1 : -1;

      if (key === 'staff_count') {
        return ((a.staff?.length || 0) - (b.staff?.length || 0)) * multiplier;
      }

      const valueA = a[key as keyof DAEPRoom];
      const valueB = b[key as keyof DAEPRoom];

      if (typeof valueA === 'boolean' && typeof valueB === 'boolean') {
        return (valueA === valueB ? 0 : valueA ? -1 : 1) * multiplier;
      }

      if (typeof valueA === 'number' && typeof valueB === 'number') {
        return (valueA - valueB) * multiplier;
      }

      const stringA = String(valueA ?? '').toLowerCase();
      const stringB = String(valueB ?? '').toLowerCase();
      return stringA.localeCompare(stringB) * multiplier;
    });

    setFilteredRooms(sorted);
  };

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleEdit = (room: DAEPRoom) => {
    setSelectedRoom(room);
    setEditDialogOpen(true);
  };

  const handleStaff = (room: DAEPRoom) => {
    setSelectedRoom(room);
    setStaffSheetOpen(true);
  };

  const handleToggleActive = async (room: DAEPRoom) => {
    try {
      if (room.active) {
        await deactivateDAEPRoom(room.id);
        toast({ title: 'Success', description: `Room ${room.room_number} deactivated` });
      } else {
        await activateDAEPRoom(room.id);
        toast({ title: 'Success', description: `Room ${room.room_number} activated` });
      }
      fetchRooms();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update room status',
        variant: 'destructive',
      });
    }
  };

  const handleDialogSuccess = () => {
    fetchRooms();
  };

  const renderSortableHeader = (label: string, key: SortKey) => {
    const isActive = sortConfig.key === key;
    return (
      <button
        type="button"
        onClick={() => handleSort(key)}
        className="flex items-center gap-1 text-left text-sm font-semibold text-slate-600 hover:text-slate-900"
      >
        <span>{label}</span>
        {isActive ? (
          <span className="text-xs">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
        ) : (
          <ArrowUpDown className="w-3 h-3 text-slate-400" />
        )}
      </button>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Room Management</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Configure DAEP rooms and staff assignments
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchRooms}
            className="bg-white border border-slate-300"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setAddDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Room
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by room number, name, or building section..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-white border border-slate-300"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-4">Loading rooms...</p>
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-300 rounded-lg bg-slate-50">
          <p className="text-muted-foreground">
            {rooms.length === 0 ? 'No rooms configured yet' : 'No rooms match your search'}
          </p>
          {rooms.length === 0 && (
            <Button
              className="mt-4"
              onClick={() => setAddDialogOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Room
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-100">
                <tr>
                  <th className="text-left p-4">{renderSortableHeader('Room #', 'room_number')}</th>
                  <th className="text-left p-4">{renderSortableHeader('Name', 'room_name')}</th>
                  <th className="text-left p-4">Campus</th>
                  <th className="text-left p-4">{renderSortableHeader('Capacity', 'capacity')}</th>
                  <th className="text-left p-4">Building Section</th>
                  <th className="text-left p-4">{renderSortableHeader('Staff', 'staff_count')}</th>
                  <th className="text-left p-4">{renderSortableHeader('Status', 'active')}</th>
                  <th className="text-left p-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredRooms.map((room, index) => {
                  const rowBg = index % 2 === 0 ? 'bg-white' : 'bg-slate-50';
                  return (
                    <tr
                      key={room.id}
                      className={`${rowBg} hover:bg-slate-100 transition-colors`}
                    >
                      <td className="p-4 font-medium">{room.room_number}</td>
                      <td className="p-4 text-slate-600">{room.room_name || '—'}</td>
                      <td className="p-4 text-slate-600">{room.campus?.name || '—'}</td>
                      <td className="p-4">{room.capacity}</td>
                      <td className="p-4 text-slate-600">{room.building_section || '—'}</td>
                      <td className="p-4">
                        <Button
                          variant="link"
                          className="p-0 h-auto font-medium text-blue-600 hover:text-blue-800"
                          onClick={() => handleStaff(room)}
                        >
                          <Users className="w-4 h-4 mr-1" />
                          {room.staff?.length || 0}
                        </Button>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            room.active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {room.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(room)}
                          >
                            <Pencil className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant={room.active ? 'outline' : 'default'}
                            onClick={() => handleToggleActive(room)}
                          >
                            {room.active ? (
                              <>
                                <PowerOff className="w-3 h-3 mr-1" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <Power className="w-3 h-3 mr-1" />
                                Activate
                              </>
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredRooms.length} of {rooms.length} rooms
      </div>

      {/* Dialogs */}
      <AddRoomDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={handleDialogSuccess}
      />

      <EditRoomDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        room={selectedRoom}
        onSuccess={handleDialogSuccess}
      />

      <StaffAssignmentSheet
        open={staffSheetOpen}
        onOpenChange={setStaffSheetOpen}
        room={selectedRoom}
        onSuccess={handleDialogSuccess}
      />
    </div>
  );
}
