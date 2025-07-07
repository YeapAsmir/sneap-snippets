'use client'
// Misc
import {
    Alert,
    AlertTitle,
    AlertActions,
    AlertDescription
}                          from '@/components/alert';
import { Button }          from '@/components/button';
import {
    Dialog,
    DialogBody,
    DialogTitle,
    DialogActions,
    DialogDescription
}                          from '@/components/dialog';
import {
    Dropdown,
    DropdownItem,
    DropdownMenu,
    DropdownButton
}                          from '@/components/dropdown';
import {
    Field,
    Label
}                          from '@/components/fieldset';
import {
    Heading,
    Subheading
}                          from '@/components/heading';
import { Input }           from '@/components/input';
import {
    getTeamMembers,
    createTeamMember,
    updateTeamMember,
    deleteTeamMember
}                          from '@/data';
import {
    useState,
    useEffect
}                          from 'react';
import type { TeamMember } from '@/data';

export default function Teams() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Modal state for creating team member
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [memberName, setMemberName] = useState('')
  const [memberEmail, setMemberEmail] = useState('')
  const [memberAvatar, setMemberAvatar] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  
  // Modal state for editing team member
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editAvatar, setEditAvatar] = useState<string | null>(null)
  const [editError, setEditError] = useState<string | null>(null)
  
  // Alert state for team member deletion
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false)
  const [memberToDelete, setMemberToDelete] = useState<TeamMember | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  // Handle avatar file selection
  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        if (isEdit) {
          setEditError('Avatar file size must be less than 2MB');
        } else {
          setCreateError('Avatar file size must be less than 2MB');
        }
        return;
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        if (isEdit) {
          setEditError('Please select a valid image file');
        } else {
          setCreateError('Please select a valid image file');
        }
        return;
      }

      try {
        const base64 = await fileToBase64(file);
        if (isEdit) {
          setEditAvatar(base64);
          setEditError(null);
        } else {
          setMemberAvatar(base64);
          setCreateError(null);
        }
      } catch (error) {
        if (isEdit) {
          setEditError('Failed to process image file');
        } else {
          setCreateError('Failed to process image file');
        }
      }
    }
  };

  // Load team members
  useEffect(() => {
    async function loadTeamMembers() {
      try {
        setLoading(true)
        const membersData = await getTeamMembers()
        setTeamMembers(membersData)
      } catch (err: any) {
        setError(err.message || 'Failed to load team members')
        console.error('Error loading team members:', err)
      } finally {
        setLoading(false)
      }
    }

    loadTeamMembers()
  }, [])

  // Handle team member creation
  const handleCreateTeamMember = async () => {
    if (!memberName.trim()) {
      setCreateError('Name is required')
      return
    }

    try {
      setCreateLoading(true)
      setCreateError(null)
      
      const memberData: any = { name: memberName.trim() }
      if (memberEmail.trim()) {
        memberData.email = memberEmail.trim()
      }
      if (memberAvatar) {
        memberData.avatar = memberAvatar
      }
      
      await createTeamMember(memberData)
      
      // Refresh team members list
      const membersData = await getTeamMembers()
      setTeamMembers(membersData)
      
      // Reset form
      setMemberName('')
      setMemberEmail('')
      setMemberAvatar(null)
      setIsCreateModalOpen(false)
      
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create team member')
    } finally {
      setCreateLoading(false)
    }
  }

  // Reset create modal state when closing
  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false)
    setMemberName('')
    setMemberEmail('')
    setMemberAvatar(null)
    setCreateError(null)
  }

  // Handle team member editing
  const handleEditTeamMember = (member: TeamMember) => {
    setEditingMember(member)
    setEditName(member.name)
    setEditEmail(member.email || '')
    setEditAvatar(member.avatar || null)
    setIsEditModalOpen(true)
  }

  const handleUpdateTeamMember = async () => {
    if (!editingMember || !editName.trim()) {
      setEditError('Name is required')
      return
    }

    try {
      setEditLoading(true)
      setEditError(null)
      
      const updates: any = { name: editName.trim() }
      if (editEmail.trim()) {
        updates.email = editEmail.trim()
      } else {
        updates.email = null
      }
      if (editAvatar) {
        updates.avatar = editAvatar
      }
      
      await updateTeamMember(editingMember.id, updates)
      
      // Refresh team members list
      const membersData = await getTeamMembers()
      setTeamMembers(membersData)
      
      // Close modal
      setIsEditModalOpen(false)
      setEditingMember(null)
      
    } catch (err: any) {
      setEditError(err.message || 'Failed to update team member')
    } finally {
      setEditLoading(false)
    }
  }

  // Reset edit modal state when closing
  const handleCloseEditModal = () => {
    setIsEditModalOpen(false)
    setEditingMember(null)
    setEditName('')
    setEditEmail('')
    setEditAvatar(null)
    setEditError(null)
  }

  // Handle team member deletion - show alert
  const handleDeleteTeamMember = async (member: TeamMember) => {
    setMemberToDelete(member)
    setIsDeleteAlertOpen(true)
  }

  // Confirm team member deletion
  const confirmDeleteTeamMember = async () => {
    if (!memberToDelete) return

    try {
      setDeleteLoading(true)
      await deleteTeamMember(memberToDelete.id)
      
      // Refresh team members list
      const membersData = await getTeamMembers()
      setTeamMembers(membersData)
      
      // Close alert
      setIsDeleteAlertOpen(false)
      setMemberToDelete(null)
      
    } catch (err: any) {
      setError(err.message || 'Failed to delete team member')
    } finally {
      setDeleteLoading(false)
    }
  }

  // Cancel team member deletion
  const cancelDeleteTeamMember = () => {
    setIsDeleteAlertOpen(false)
    setMemberToDelete(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600">Error: {error}</div>
      </div>
    )
  }

  return (
    <>
      <Heading>Team Management</Heading>
      <div className="mt-8 flex items-end justify-between">
        <Subheading>Team Members</Subheading>
        <Button type="button" onClick={() => setIsCreateModalOpen(true)}>
          Add Team Member
        </Button>
      </div>

      <div className="mt-4 space-y-4">
        {teamMembers.map((member) => (
          <div key={member.id} className="flex items-center justify-between gap-4 py-4 border-b border-zinc-950/5">
            <div className="flex min-w-0 items-center gap-2">
              <span className="relative size-6 shrink-0 inline-grid align-middle [--avatar-radius:20%] *:col-start-1 *:row-start-1 outline -outline-offset-1 outline-black/10 rounded-full *:rounded-full">
                {member.avatar ? (
                  <img className="size-full" src={member.avatar} alt={member.name} />
                ) : (
                  <div className="size-full bg-zinc-300 flex items-center justify-center text-xs font-medium text-zinc-700">
                    {member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </div>
                )}
              </span>
              <div className="min-w-0">
                <div className="font-medium text-zinc-900">{member.name}</div>
              </div>
            </div>
            <div className="flex min-w-fit justify-end gap-2">
              {/* <Button plain onClick={() => handleEditTeamMember(member)} className="text-sm">
                Edit
              </Button> */}
              <Button plain onClick={() => handleDeleteTeamMember(member)} className="text-sm text-red-600">
                Delete
              </Button>
            </div>
          </div>
        ))}
        
        {teamMembers.length === 0 && (
          <div className="text-center py-8 text-zinc-500">
            No team members yet. Add your first team member to get started.
          </div>
        )}
      </div>

      {/* Create Team Member Modal */}
      <Dialog size="xl" open={isCreateModalOpen} onClose={handleCloseCreateModal}>
        <DialogTitle>Add New Team Member</DialogTitle>
        <DialogDescription>
          Add a new member to your team. You can add their details and optionally upload an avatar.
        </DialogDescription>
        <DialogBody>
          <div className="space-y-4">
            <Field>
              <Label>Name *</Label>
              <Input 
                name="name" 
                placeholder="Enter full name" 
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                disabled={createLoading}
              />
            </Field>
            
            <Field>
              <Label>Email (optional)</Label>
              <Input 
                name="email" 
                type="email"
                placeholder="Enter email address" 
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
                disabled={createLoading}
              />
            </Field>

            <Field>
              <Label>Avatar (optional)</Label>
              <Input 
                name="avatar" 
                type="file"
                accept="image/*"
                onChange={(e) => handleAvatarChange(e, false)}
                disabled={createLoading}
              />
              {memberAvatar && (
                <div className="mt-2">
                  <img 
                    src={memberAvatar} 
                    alt="Avatar preview" 
                    className="w-16 h-16 rounded-full object-cover"
                  />
                </div>
              )}
            </Field>
            
            {createError && (
              <div className="text-red-600 text-sm mt-2">
                {createError}
              </div>
            )}
          </div>
        </DialogBody>
        <DialogActions>
          <Button plain onClick={handleCloseCreateModal} disabled={createLoading}>
            Cancel
          </Button>
          <Button onClick={handleCreateTeamMember} disabled={createLoading || !memberName.trim()}>
            {createLoading ? 'Adding...' : 'Add Member'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Team Member Modal */}
      <Dialog size="xl" open={isEditModalOpen} onClose={handleCloseEditModal}>
        <DialogTitle>Edit Team Member</DialogTitle>
        <DialogDescription>
          Update the details for {editingMember?.name}.
        </DialogDescription>
        <DialogBody>
          <div className="space-y-4">
            <Field>
              <Label>Name *</Label>
              <Input 
                name="name" 
                placeholder="Enter full name" 
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                disabled={editLoading}
              />
            </Field>
            
            <Field>
              <Label>Email (optional)</Label>
              <Input 
                name="email" 
                type="email"
                placeholder="Enter email address" 
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                disabled={editLoading}
              />
            </Field>

            <Field>
              <Label>Avatar (optional)</Label>
              <Input 
                name="avatar" 
                type="file"
                accept="image/*"
                onChange={(e) => handleAvatarChange(e, true)}
                disabled={editLoading}
              />
              {editAvatar && (
                <div className="mt-2">
                  <img 
                    src={editAvatar} 
                    alt="Avatar preview" 
                    className="w-16 h-16 rounded-full object-cover"
                  />
                </div>
              )}
            </Field>
            
            {editError && (
              <div className="text-red-600 text-sm mt-2">
                {editError}
              </div>
            )}
          </div>
        </DialogBody>
        <DialogActions>
          <Button plain onClick={handleCloseEditModal} disabled={editLoading}>
            Cancel
          </Button>
          <Button onClick={handleUpdateTeamMember} disabled={editLoading || !editName.trim()}>
            {editLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Team Member Alert */}
      <Alert open={isDeleteAlertOpen} onClose={setIsDeleteAlertOpen}>
        <AlertTitle>Are you sure you want to delete this team member?</AlertTitle>
        <AlertDescription>
          This action will permanently remove {memberToDelete?.name} from your team. 
          Any API keys associated with this member will remain but will no longer be linked to a team member.
        </AlertDescription>
        <AlertActions>
          <Button plain onClick={cancelDeleteTeamMember} disabled={deleteLoading}>
            Cancel
          </Button>
          <Button onClick={confirmDeleteTeamMember} disabled={deleteLoading}>
            {deleteLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </AlertActions>
      </Alert>
    </>
  )
}