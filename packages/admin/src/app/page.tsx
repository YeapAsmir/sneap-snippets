'use client'
// Misc
import { Stat }                   from '@/app/stat';
import {
    Alert,
    AlertTitle,
    AlertActions,
    AlertDescription
}                                 from '@/components/alert';
import { Badge }                  from '@/components/badge';
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
import { Select }                 from '@/components/select';
import {
    Table,
    TableRow,
    TableBody,
    TableCell,
    TableHead,
    TableHeader
}                                 from '@/components/table';
import {
    getStats,
    getApiKeys,
    createApiKey,
    updateApiKey,
    deleteApiKey,
    getAdminStats,
    getTeamMembers
}                                 from '@/data';
import { EllipsisHorizontalIcon } from '@heroicons/react/16/solid';
import {
    useState,
    useEffect
}                                 from 'react';
import type {
    Stats,
    ApiKey,
    AdminStats,
    TeamMember
}                                 from '@/data';

export default function Home() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState('last_week')
  
  // Modal state for creating API key
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [userName, setUserName] = useState('')
  const [selectedTeamMember, setSelectedTeamMember] = useState<number | null>(null)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [createError, setCreateError] = useState<string | null>(null)
  
  // Alert state for API key deletion
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false)
  const [keyToDelete, setKeyToDelete] = useState<ApiKey | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  
  // Copy state
  const [copyCount, setCopyCount] = useState(0)
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null)

  // Load initial data (API keys and base stats) only once
  useEffect(() => {
    async function loadInitialData() {
      try {
        setLoading(true)
        const [keysData, adminData, statsData, membersData] = await Promise.all([
          getApiKeys(),
          getAdminStats(period),
          getStats(),
          getTeamMembers()
        ])
        setApiKeys(keysData)
        setAdminStats(adminData)
        setStats(statsData)
        setTeamMembers(membersData)
      } catch (err: any) {
        setError(err.message || 'Failed to load data')
        console.error('Error loading admin data:', err)
      } finally {
        setLoading(false)
      }
    }

    loadInitialData()
  }, []) // Only run once on mount

  // Load stats when period changes (but not on initial load)
  useEffect(() => {
    async function loadStatsForPeriod() {
      try {
        setStatsLoading(true)
        const adminData = await getAdminStats(period)
        setAdminStats(adminData)
      } catch (err: any) {
        setError(err.message || 'Failed to load statistics')
        console.error('Error loading stats for period:', err)
      } finally {
        setStatsLoading(false)
      }
    }

    // Don't run on initial render, only when period actually changes
    if (adminStats) {
      loadStatsForPeriod()
    }
  }, [period])

  // Handle copy timeout
  useEffect(() => {
    if (copyCount > 0) {
      let timeout = setTimeout(() => {
        setCopyCount(0)
        setCopiedKeyId(null)
      }, 1000)
      return () => {
        clearTimeout(timeout)
      }
    }
  }, [copyCount])

  // Handle API key creation
  const handleCreateApiKey = async () => {
    if (!selectedTeamMember) {
      setCreateError('Team member is required')
      return
    }

    try {
      setCreateLoading(true)
      setCreateError(null)
      
      // Find the selected team member to get their name
      const teamMember = teamMembers.find(member => member.id === selectedTeamMember)
      if (!teamMember) {
        setCreateError('Invalid team member selected')
        return
      }
      
      // Use team member name as username
      await createApiKey(teamMember.name, selectedTeamMember)
      
      // Refresh API keys list
      const keysData = await getApiKeys()
      setApiKeys(keysData)
      
      // Reset form
      setSelectedTeamMember(null)
      setIsCreateModalOpen(false)
      
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create API key')
    } finally {
      setCreateLoading(false)
    }
  }

  // Reset modal state when closing
  const handleCloseModal = () => {
    setIsCreateModalOpen(false)
    setSelectedTeamMember(null)
    setCreateError(null)
  }

  // Handle API key deletion - show alert
  const handleDeleteApiKey = async (apiKey: ApiKey) => {
    setKeyToDelete(apiKey)
    setIsDeleteAlertOpen(true)
  }

  // Confirm API key deletion
  const confirmDeleteApiKey = async () => {
    if (!keyToDelete) return

    try {
      setDeleteLoading(true)
      await deleteApiKey(keyToDelete.keyId)
      
      // Refresh API keys list
      const keysData = await getApiKeys()
      setApiKeys(keysData)
      
      // Close alert
      setIsDeleteAlertOpen(false)
      setKeyToDelete(null)
      
    } catch (err: any) {
      setError(err.message || 'Failed to delete API key')
    } finally {
      setDeleteLoading(false)
    }
  }

  // Cancel API key deletion
  const cancelDeleteApiKey = () => {
    setIsDeleteAlertOpen(false)
    setKeyToDelete(null)
  }

  // Copy keyId to clipboard
  const copyToClipboard = async (keyId: string) => {
    try {
      await navigator.clipboard.writeText(keyId)
      setCopiedKeyId(keyId)
      setCopyCount(copyCount + 1)
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
    }
  }

  // Handle API key toggle (activate/deactivate)
  const handleToggleApiKey = async (keyId: string, isActive: boolean) => {
    try {
      await updateApiKey(keyId, { isActive: !isActive })
      
      // Refresh API keys list
      const keysData = await getApiKeys()
      setApiKeys(keysData)
      
    } catch (err: any) {
      setError(err.message || 'Failed to update API key')
    }
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

  if (!adminStats || !stats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">No data available</div>
      </div>
    )
  }

  return (
    <>
      <Heading>Hello, Admin</Heading>
      <div className="mt-8 flex items-end justify-between">
        <Subheading>Overview</Subheading>
        <div>
          <Select name="period" value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="last_week">Last week</option>
            <option value="last_two">Last two weeks</option>
            <option value="last_month">Last month</option>
            <option value="last_quarter">Last quarter</option>
          </Select>
        </div>
      </div>
      <div className="mt-4 grid gap-8 sm:grid-cols-2 xl:grid-cols-4">
        <Stat 
          title="Total API Keys" 
          value={stats.totalKeys.toString()} 
          change={adminStats.comparison ? `${adminStats.comparison.totalKeys.change >= 0 ? '+' : ''}${adminStats.comparison.totalKeys.change.toFixed(1)}%` : undefined}
          period={period}
          loading={statsLoading}
        />
        <Stat 
          title="Active Keys" 
          value={stats.activeKeys.toString()} 
          change={adminStats.comparison ? `${adminStats.comparison.activeKeys.change >= 0 ? '+' : ''}${adminStats.comparison.activeKeys.change.toFixed(1)}%` : undefined}
          period={period}
          loading={statsLoading}
        />
        <Stat 
          title="Total Usage" 
          value={stats.totalUsage.toString()} 
          change={adminStats.comparison ? `${adminStats.comparison.totalUsage.change >= 0 ? '+' : ''}${adminStats.comparison.totalUsage.change.toFixed(1)}%` : undefined}
          period={period}
          loading={statsLoading}
        />
        <Stat 
          title="Total Snippets" 
          value={adminStats.snippets.total.toString()} 
          change={adminStats.comparison ? `${adminStats.comparison.totalSnippets.change >= 0 ? '+' : ''}${adminStats.comparison.totalSnippets.change.toFixed(1)}%` : undefined}
          period={period}
          loading={statsLoading}
        />
      </div>
      {/* <div className="mt-8 grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
        <Stat title="Unique Users" value={adminStats.usage.uniqueUsers.toString()} />
        <Stat title="Success Rate" value={`${adminStats.usage.successRate.toFixed(1)}%`} />
        <Stat title="Categories" value={adminStats.snippets.categories.toString()} />
      </div> */}
      <div className="mt-14 flex items-end justify-between">
        <Subheading>API Keys</Subheading>
        <Button type="button" onClick={() => setIsCreateModalOpen(true)}>
          Create API Key
        </Button>
      </div>
      <Table className="mt-4 [--gutter:--spacing(6)] lg:[--gutter:--spacing(10)]">
        <TableHead>
          <TableRow>
            <TableHeader>Creation date</TableHeader>
            <TableHeader>User</TableHeader>
            <TableHeader>Key</TableHeader>
            <TableHeader>Status</TableHeader>
            <TableHeader className="relative w-0">
            <span className="sr-only">Actions</span>
          </TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {apiKeys.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-zinc-500">
                No API keys yet. Create your first API key to get started.
              </TableCell>
            </TableRow>
          ) : (
            apiKeys.map((apiKey) => (
              <TableRow key={apiKey.keyId} title={`API Key ${apiKey.keyId}`}>
                <TableCell className="text-zinc-500">
                  {new Date(Number(apiKey.createdAt) * 1000).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </TableCell>
                <TableCell className="font-medium">{apiKey.userName}</TableCell>
                <TableCell className="font-mono text-sm">{apiKey.keyId}</TableCell>
                <TableCell>
                  <Badge color={apiKey.isActive ? 'lime' : 'red'}>
                    {apiKey.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell>
                <div className="-mx-3 -my-1.5 sm:-mx-2.5">
                  <Dropdown>
                    <DropdownButton plain aria-label="More options">
                      <EllipsisHorizontalIcon />
                    </DropdownButton>
                    <DropdownMenu anchor="bottom end">
                      <DropdownItem onClick={() => handleToggleApiKey(apiKey.keyId, apiKey.isActive)}>
                        {apiKey.isActive ? 'Disable' : 'Activate'}
                      </DropdownItem>
                      <DropdownItem onClick={() => handleDeleteApiKey(apiKey)}>
                        Delete
                      </DropdownItem>
                    </DropdownMenu>
                  </Dropdown>
                </div>
              </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Create API Key Modal */}
      <Dialog size="xl" open={isCreateModalOpen} onClose={handleCloseModal}>
        <DialogTitle>Create New API Key</DialogTitle>
        <DialogDescription>
          Generate a new API key for accessing the Sneap API. Select a team member to create the key for.
        </DialogDescription>
        <DialogBody>
          <div className="space-y-4">
            <Field>
              <Label>Team Member</Label>
              <Select
                name="teamMember"
                value={selectedTeamMember || ''}
                onChange={(e) => setSelectedTeamMember(e.target.value ? parseInt(e.target.value) : null)}
                disabled={createLoading}
              >
                <option value="">Select team member</option>
                {teamMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} {member.email && `(${member.email})`}
                  </option>
                ))}
              </Select>
            </Field>
            
            {createError && (
              <div className="text-red-600 text-sm mt-2">
                {createError}
              </div>
            )}
          </div>
        </DialogBody>
        <DialogActions>
          <Button plain onClick={handleCloseModal} disabled={createLoading}>
            Cancel
          </Button>
          <Button onClick={handleCreateApiKey} disabled={createLoading || !selectedTeamMember}>
            {createLoading ? (
              <div className="flex items-center">
                <svg className="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Creating...
              </div>
            ) : (
              'Create API Key'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete API Key Alert */}
      <Alert open={isDeleteAlertOpen} onClose={setIsDeleteAlertOpen}>
        <AlertTitle>Are you sure you want to delete this API key?</AlertTitle>
        <AlertDescription>
          This action will deactivate and archive the API key assigned to user {keyToDelete?.userName}.
          <Input readOnly value={keyToDelete?.keyId} className="my-3" />
          The key will be immediately disabled and removed from the active list while preserving historical data and metrics for archival purposes.
        </AlertDescription>
        <AlertActions>
          <Button plain onClick={cancelDeleteApiKey} disabled={deleteLoading}>
            Cancel
          </Button>
          <Button onClick={confirmDeleteApiKey} disabled={deleteLoading}>
            {deleteLoading ? (
              <div className="flex items-center">
                <svg className="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Deleting...
              </div>
            ) : (
              'Delete'
            )}
          </Button>
        </AlertActions>
      </Alert>
    </>
  )
}

