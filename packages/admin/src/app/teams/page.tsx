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
    

      {/* Teams Display Section */}
      <div className="mt-8">
        {teams.length === 0 ? (
          <div className="text-center py-12 text-zinc-500">
            <p className="text-base/6 font-medium text-zinc-900 mb-2">No teams yet</p>
            <p className='text-sm/6'>Create your first team to get started.</p>
          </div>
        ) : (
          <div className="space-y-6 divide-y divide-zinc-200 dark:divide-zinc-700">
            {teams.map((team) => {
              const teamMembersCount = teamMembers.filter(member => member.teamId === team.id).length;
              const teamMembersList = teamMembers.filter(member => member.teamId === team.id);
              
              return (
                <div key={team.id}>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Subheading>{team.name}</Subheading>
                        <span className="text-sm text-zinc-500">({teamMembersCount} members)</span>
                      </div>
                    </div>
                    <Dropdown>
                      <DropdownButton plain aria-label="More options">
                        <EllipsisHorizontalIcon />
                      </DropdownButton>
                      <DropdownMenu anchor="bottom end">
                        {/* <DropdownItem onClick={() => {
                          setSelectedTeam(team);
                          setIsCreateMemberModalOpen(true);
                        }}>
                          Add Member
                        </DropdownItem>
                        <DropdownDivider /> */}
                        <DropdownItem onClick={() => handleDeleteTeam(team)}>
                          Delete Team
                        </DropdownItem>
                      </DropdownMenu>
                    </Dropdown>
                  </div>
                  
                  {teamMembersList.length > 0 ? (
                    <div className="space-y-3 text-sm/6">
                      {teamMembersList.map((member) => (
                        <div key={member.id} className="flex items-center justify-between gap-4 py-2">
                          <div className="flex min-w-0 items-center gap-3">
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
                    </div>
                  ) : (
                    <div className="py-4 text-zinc-500 text-sm">
                      <p className="mb-3">No members yet. Add your first team member to get started.</p>
                      <Button 
                        onClick={() => {
                          setSelectedTeam(team);
                          setIsCreateMemberModalOpen(true);
                        }}
                      >
                        Add member
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>


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
                onChange={(e) => setTeamName(e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1))}
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

            <Field className='flex flex-col space-y-2'>
              <Label>Avatar (optional)</Label>
              <div className="flex items-center gap-4">
                {memberAvatar && (
                  <div className="flex-shrink-0">
                    <img 
                      src={memberAvatar} 
                      alt="Avatar preview" 
                      className="size-9 rounded-full object-cover"
                      />
                  </div>
                )}
                <div className="flex-1">
                  <Input 
                    name="avatar" 
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    disabled={createMemberLoading}
                    />
                </div>
              </div>
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