'use client'
// Misc
import {
    Alert,
    AlertTitle,
    AlertActions,
    AlertDescription
}                                 from '@/components/alert';
import { Avatar }                 from '@/components/avatar';
import { Button }                 from '@/components/button';
import {
    Dialog,
    DialogBody,
    DialogTitle,
    DialogActions,
    DialogDescription
}                                 from '@/components/dialog';
import {
    Dropdown,
    DropdownItem,
    DropdownMenu,
    DropdownButton
}                                 from '@/components/dropdown';
import {
    Field,
    Label
}                                 from '@/components/fieldset';
import {
    Heading,
    Subheading
}                                 from '@/components/heading';
import { Input }                  from '@/components/input';
import {
    getTeams,
    createTeam,
    deleteTeam,
    getTeamMembers,
    createTeamMember,
    deleteTeamMember
}                                 from '@/data';
import { getAvatarColors }        from '@/lib/utils';
import { EllipsisHorizontalIcon } from '@heroicons/react/16/solid';
import {
    useState,
    useEffect
}                                 from 'react';
import type {
    Team,
    TeamMember
}                                 from '@/data';

export default function Teams() {
  const [teams, setTeams] = useState<Team[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  
  // Modal state for creating team
  const [isCreateTeamModalOpen, setIsCreateTeamModalOpen] = useState(false)
  const [createTeamLoading, setCreateTeamLoading] = useState(false)
  const [teamName, setTeamName] = useState('')
  const [createTeamError, setCreateTeamError] = useState<string | null>(null)
  
  // Modal state for creating team member
  const [isCreateMemberModalOpen, setIsCreateMemberModalOpen] = useState(false)
  const [createMemberLoading, setCreateMemberLoading] = useState(false)
  const [memberName, setMemberName] = useState('')
  const [memberEmail, setMemberEmail] = useState('')
  const [memberAvatar, setMemberAvatar] = useState<string | null>(null)
  const [createMemberError, setCreateMemberError] = useState<string | null>(null)
  
  // Alert state for team deletion
  const [isDeleteTeamAlertOpen, setIsDeleteTeamAlertOpen] = useState(false)
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null)
  const [deleteTeamLoading, setDeleteTeamLoading] = useState(false)
  
  // Alert state for team member deletion
  const [isDeleteMemberAlertOpen, setIsDeleteMemberAlertOpen] = useState(false)
  const [memberToDelete, setMemberToDelete] = useState<TeamMember | null>(null)
  const [deleteMemberLoading, setDeleteMemberLoading] = useState(false)

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
  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        setCreateMemberError('Avatar file size must be less than 2MB');
        return;
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        setCreateMemberError('Please select a valid image file');
        return;
      }

      try {
        const base64 = await fileToBase64(file);
        setMemberAvatar(base64);
        setCreateMemberError(null);
      } catch (error) {
        setCreateMemberError('Failed to process image file');
      }
    }
  };

  // Load teams and team members
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const [teamsData, membersData] = await Promise.all([
          getTeams(),
          getTeamMembers()
        ])
        setTeams(teamsData)
        setTeamMembers(membersData)
        
        // Select first team by default
        if (teamsData.length > 0 && !selectedTeam) {
          setSelectedTeam(teamsData[0])
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load data')
        console.error('Error loading data:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Get members for selected team
  const selectedTeamMembers = selectedTeam 
    ? teamMembers.filter(member => member.teamId === selectedTeam.id)
    : []

  // Handle team creation
  const handleCreateTeam = async () => {
    if (!teamName.trim()) {
      setCreateTeamError('Team name is required')
      return
    }

    try {
      setCreateTeamLoading(true)
      setCreateTeamError(null)
      
      const newTeam = await createTeam({ name: teamName.trim() })
      
      // Refresh teams list
      const teamsData = await getTeams()
      setTeams(teamsData)
      
      // Select the new team
      setSelectedTeam(newTeam)
      
      // Reset form
      setTeamName('')
      setIsCreateTeamModalOpen(false)
      
    } catch (err: any) {
      setCreateTeamError(err.message || 'Failed to create team')
    } finally {
      setCreateTeamLoading(false)
    }
  }

  // Handle team member creation
  const handleCreateTeamMember = async () => {
    if (!memberName.trim()) {
      setCreateMemberError('Name is required')
      return
    }
    
    if (!selectedTeam) {
      setCreateMemberError('Please select a team first')
      return
    }

    try {
      setCreateMemberLoading(true)
      setCreateMemberError(null)
      
      const memberData: any = { 
        name: memberName.trim(),
        teamId: selectedTeam.id
      }
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
      setIsCreateMemberModalOpen(false)
      
    } catch (err: any) {
      setCreateMemberError(err.message || 'Failed to create team member')
    } finally {
      setCreateMemberLoading(false)
    }
  }

  // Handle team deletion
  const handleDeleteTeam = async (team: Team) => {
    setTeamToDelete(team)
    setIsDeleteTeamAlertOpen(true)
  }

  const confirmDeleteTeam = async () => {
    if (!teamToDelete) return

    try {
      setDeleteTeamLoading(true)
      await deleteTeam(teamToDelete.id)
      
      // Refresh teams list
      const teamsData = await getTeams()
      setTeams(teamsData)
      
      // Select first available team or clear selection
      if (selectedTeam?.id === teamToDelete.id) {
        setSelectedTeam(teamsData.length > 0 ? teamsData[0] : null)
      }
      
      // Refresh members
      const membersData = await getTeamMembers()
      setTeamMembers(membersData)
      
      // Close alert
      setIsDeleteTeamAlertOpen(false)
      setTeamToDelete(null)
      
    } catch (err: any) {
      setError(err.message || 'Failed to delete team')
    } finally {
      setDeleteTeamLoading(false)
    }
  }

  // Handle team member deletion
  const handleDeleteTeamMember = async (member: TeamMember) => {
    setMemberToDelete(member)
    setIsDeleteMemberAlertOpen(true)
  }

  const confirmDeleteTeamMember = async () => {
    if (!memberToDelete) return

    try {
      setDeleteMemberLoading(true)
      await deleteTeamMember(memberToDelete.id)
      
      // Refresh team members list
      const membersData = await getTeamMembers()
      setTeamMembers(membersData)
      
      // Close alert
      setIsDeleteMemberAlertOpen(false)
      setMemberToDelete(null)
      
    } catch (err: any) {
      setError(err.message || 'Failed to delete team member')
    } finally {
      setDeleteMemberLoading(false)
    }
  }

  // Reset modals
  const handleCloseCreateTeamModal = () => {
    setIsCreateTeamModalOpen(false)
    setTeamName('')
    setCreateTeamError(null)
  }

  const handleCloseCreateMemberModal = () => {
    setIsCreateMemberModalOpen(false)
    setMemberName('')
    setMemberEmail('')
    setMemberAvatar(null)
    setCreateMemberError(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <svg className="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
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
      <div className="flex w-full flex-wrap items-end justify-between gap-4 border-b border-zinc-950/10 pb-6 dark:border-white/10">
      <Heading>Team management</Heading>
      <Button onClick={() => setIsCreateTeamModalOpen(true)}>
        Create Team
      </Button>
    </div>
    

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {teams.map((team) => {
          const isSelected = selectedTeam?.id === team.id
          return (
            <div
              key={team.id}
              className={`relative rounded-lg border-2 transition-all duration-200 hover:shadow-md cursor-pointer ${
                isSelected 
                  ? 'border-blue-500 bg-blue-50 shadow-sm ring-1 ring-blue-200' 
                  : 'border-zinc-200 bg-white hover:border-zinc-300'
              }`}
              onClick={() => setSelectedTeam(team)}
            >
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${isSelected ? 'bg-blue-500' : 'bg-zinc-300'}`} />
                    <h3 className={`font-medium ${isSelected ? 'text-blue-900' : 'text-zinc-900'}`}>
                      {team.name}
                    </h3>
                  </div>
                  <Dropdown>
                    <DropdownButton plain className="text-zinc-400 hover:text-zinc-600">
                      <EllipsisHorizontalIcon className="size-4" />
                    </DropdownButton>
                    <DropdownMenu anchor="bottom end">
                      <DropdownItem onClick={() => handleDeleteTeam(team)}>
                        Delete Team
                      </DropdownItem>
                    </DropdownMenu>
                  </Dropdown>
                </div>
                <div className="mt-2 text-sm text-zinc-500">
                  {teamMembers.filter(member => member.teamId === team.id).length} members
                </div>
              </div>
            </div>
          )
        })}
        
        {teams.length === 0 && (
          <div className="col-span-full text-center py-12 text-zinc-500">
            <div className="mx-auto w-12 h-12 bg-zinc-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p className="text-lg font-medium text-zinc-900 mb-2">No teams yet</p>
            <p>Create your first team to get started.</p>
          </div>
        )}
      </div>

      {/* Team Members Section */}
      {selectedTeam && (
        <>
          <div className="mt-8 flex items-end justify-between">
            <Subheading>{selectedTeam.name} Members</Subheading>
            <Button type="button" onClick={() => setIsCreateMemberModalOpen(true)}>
              Add Team Member
            </Button>
          </div>

          <div className="mt-4 space-y-4">
            {selectedTeamMembers.map((member) => (
              <div key={member.id} className="flex items-center justify-between gap-4 py-4 border-b border-zinc-950/5">
                <div className="flex min-w-0 items-center gap-2">
                  <Avatar 
                    src={member.avatar}
                    initials={member.avatar ? undefined : member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    alt={member.name}
                    className={`size-6 outline-0 border-0 ${!member.avatar ? getAvatarColors(member.name) : ''}`}
                  />
                  <div className="min-w-0">
                    <div className="font-medium text-zinc-900">{member.name}</div>
                    {member.email && (
                      <div className="text-sm text-zinc-500">{member.email}</div>
                    )}
                  </div>
                </div>
                <div className="flex min-w-fit justify-end gap-2">
                  <Button plain onClick={() => handleDeleteTeamMember(member)} className="text-sm text-red-600">
                    Delete
                  </Button>
                </div>
              </div>
            ))}
            
            {selectedTeamMembers.length === 0 && (
              <div className="text-center py-8 text-zinc-500">
                No team members yet. Add your first team member to get started.
              </div>
            )}
          </div>
        </>
      )}

      {/* Create Team Modal */}
      <Dialog size="xl" open={isCreateTeamModalOpen} onClose={handleCloseCreateTeamModal}>
        <DialogTitle>Create New Team</DialogTitle>
        <DialogDescription>
          Create a new team to organize your members.
        </DialogDescription>
        <DialogBody>
          <div className="space-y-4">
            <Field>
              <Label>Team Name *</Label>
              <Input 
                name="name" 
                placeholder="Enter team name" 
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                disabled={createTeamLoading}
              />
            </Field>
            
            {createTeamError && (
              <div className="text-red-600 text-sm mt-2">
                {createTeamError}
              </div>
            )}
          </div>
        </DialogBody>
        <DialogActions>
          <Button plain onClick={handleCloseCreateTeamModal} disabled={createTeamLoading}>
            Cancel
          </Button>
          <Button onClick={handleCreateTeam} disabled={createTeamLoading || !teamName.trim()}>
            {createTeamLoading ? 'Creating...' : 'Create Team'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Team Member Modal */}
      <Dialog size="xl" open={isCreateMemberModalOpen} onClose={handleCloseCreateMemberModal}>
        <DialogTitle>Add New Team Member</DialogTitle>
        <DialogDescription>
          Add a new member to {selectedTeam?.name}. You can add their details and optionally upload an avatar.
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
                disabled={createMemberLoading}
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
                disabled={createMemberLoading}
              />
            </Field>

            <Field>
              <Label>Avatar (optional)</Label>
              <Input 
                name="avatar" 
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                disabled={createMemberLoading}
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
            
            {createMemberError && (
              <div className="text-red-600 text-sm mt-2">
                {createMemberError}
              </div>
            )}
          </div>
        </DialogBody>
        <DialogActions>
          <Button plain onClick={handleCloseCreateMemberModal} disabled={createMemberLoading}>
            Cancel
          </Button>
          <Button onClick={handleCreateTeamMember} disabled={createMemberLoading || !memberName.trim()}>
            {createMemberLoading ? 'Adding...' : 'Add Member'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Team Alert */}
      <Alert open={isDeleteTeamAlertOpen} onClose={setIsDeleteTeamAlertOpen}>
        <AlertTitle>Are you sure you want to delete this team?</AlertTitle>
        <AlertDescription>
          This action will permanently remove {teamToDelete?.name} and all its members. 
          Any API keys associated with team members will remain but will no longer be linked to team members.
        </AlertDescription>
        <AlertActions>
          <Button plain onClick={() => setIsDeleteTeamAlertOpen(false)} disabled={deleteTeamLoading}>
            Cancel
          </Button>
          <Button onClick={confirmDeleteTeam} disabled={deleteTeamLoading}>
            {deleteTeamLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </AlertActions>
      </Alert>

      {/* Delete Team Member Alert */}
      <Alert open={isDeleteMemberAlertOpen} onClose={setIsDeleteMemberAlertOpen}>
        <AlertTitle>Are you sure you want to delete this team member?</AlertTitle>
        <AlertDescription>
          This action will permanently remove {memberToDelete?.name} from the team. 
          Any API keys associated with this member will remain but will no longer be linked to a team member.
        </AlertDescription>
        <AlertActions>
          <Button plain onClick={() => setIsDeleteMemberAlertOpen(false)} disabled={deleteMemberLoading}>
            Cancel
          </Button>
          <Button onClick={confirmDeleteTeamMember} disabled={deleteMemberLoading}>
            {deleteMemberLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </AlertActions>
      </Alert>
    </>
  )
}