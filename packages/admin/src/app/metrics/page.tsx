'use client'
// Metrics Dashboard
import { Stat } from '@/app/stat';
import { Badge } from '@/components/badge';
import {
    Heading,
    Subheading
} from '@/components/heading';
import { Select } from '@/components/select';
import {
    Table,
    TableRow,
    TableBody,
    TableCell,
    TableHead,
    TableHeader
} from '@/components/table';
import {
    getAdminStats,
    type AdminStats
} from '@/data';
import {
    useState,
    useEffect
} from 'react';

export default function Metrics() {
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState('last_week')

  // Load initial metrics data
  useEffect(() => {
    async function loadInitialData() {
      try {
        setLoading(true)
        const adminData = await getAdminStats(period)
        setAdminStats(adminData)
      } catch (err: any) {
        setError(err.message || 'Failed to load metrics')
        console.error('Error loading metrics data:', err)
      } finally {
        setLoading(false)
      }
    }

    loadInitialData()
  }, [])

  // Load metrics when period changes
  useEffect(() => {
    async function loadMetricsForPeriod() {
      try {
        setStatsLoading(true)
        const adminData = await getAdminStats(period)
        setAdminStats(adminData)
      } catch (err: any) {
        setError(err.message || 'Failed to load metrics')
        console.error('Error loading metrics for period:', err)
      } finally {
        setStatsLoading(false)
      }
    }

    // Don't run on initial render, only when period actually changes
    if (adminStats) {
      loadMetricsForPeriod()
    }
  }, [period])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading metrics...</div>
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

  if (!adminStats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">No metrics data available</div>
      </div>
    )
  }

  return (
    <>
      <Heading>Metrics Dashboard</Heading>
      <div className="mt-8 flex items-end justify-between">
        <Subheading>Usage Analytics</Subheading>
        <div>
          <Select name="period" value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="last_week">Last week</option>
            <option value="last_two">Last two weeks</option>
            <option value="last_month">Last month</option>
            <option value="last_quarter">Last quarter</option>
          </Select>
        </div>
      </div>

      {/* Snippet Metrics */}
      <div className="mt-4 grid gap-8 sm:grid-cols-2 xl:grid-cols-4">
        <Stat 
          title="Total Snippets" 
          value={adminStats.snippets.total.toString()} 
          change={adminStats.comparison ? `${adminStats.comparison.totalSnippets.change >= 0 ? '+' : ''}${adminStats.comparison.totalSnippets.change.toFixed(1)}%` : undefined}
          period={period}
          loading={statsLoading}
        />
        <Stat 
          title="Categories" 
          value={adminStats.snippets.categories.toString()} 
          period={period}
          loading={statsLoading}
        />
        <Stat 
          title="Average Usage" 
          value={(adminStats.snippets.avgUsage || 0).toFixed(1)} 
          period={period}
          loading={statsLoading}
        />
        <Stat 
          title="Success Rate" 
          value={`${(adminStats.usage.successRate || 0).toFixed(1)}%`} 
          period={period}
          loading={statsLoading}
        />
      </div>

      {/* Usage Metrics */}
      <div className="mt-8 grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
        <Stat 
          title="Total Usage" 
          value={adminStats.usage.totalUsage.toString()} 
          change={adminStats.comparison ? `${adminStats.comparison.totalUsage.change >= 0 ? '+' : ''}${adminStats.comparison.totalUsage.change.toFixed(1)}%` : undefined}
          period={period}
          loading={statsLoading}
        />
        <Stat 
          title="Unique Users" 
          value={adminStats.usage.uniqueUsers.toString()} 
          period={period}
          loading={statsLoading}
        />
        <Stat 
          title="Avg Search Time" 
          value={`${(adminStats.usage.avgSearchTime || 0).toFixed(1)}ms`} 
          period={period}
          loading={statsLoading}
        />
      </div>

      {/* Categories Breakdown */}
      <Subheading className="mt-14">Categories Breakdown</Subheading>
      <Table className="mt-4 [--gutter:--spacing(6)] lg:[--gutter:--spacing(10)]">
        <TableHead>
          <TableRow>
            <TableHeader>Category</TableHeader>
            <TableHeader>Snippet Count</TableHeader>
            <TableHeader>Percentage</TableHeader>
            <TableHeader className="text-right">Usage</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {(adminStats.categories || []).map((category) => (
            <TableRow key={category.category}>
              <TableCell className="font-medium">{category.category}</TableCell>
              <TableCell>{category.count || 0}</TableCell>
              <TableCell>
                <Badge color="zinc">{(category.percentage || 0).toFixed(1)}%</Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="w-full bg-zinc-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${category.percentage || 0}%` }}
                  ></div>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Popular Snippets */}
      <Subheading className="mt-14">Popular Snippets</Subheading>
      <Table className="mt-4 [--gutter:--spacing(6)] lg:[--gutter:--spacing(10)]">
        <TableHead>
          <TableRow>
            <TableHeader>Name</TableHeader>
            <TableHeader>Prefix</TableHeader>
            <TableHeader>Category</TableHeader>
            <TableHeader>Language</TableHeader>
            <TableHeader className="text-right">Usage Count</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {(adminStats.popular || []).map((snippet: any) => (
            <TableRow key={snippet.id}>
              <TableCell className="font-medium">{snippet.name}</TableCell>
              <TableCell className="font-mono text-sm">{snippet.prefix}</TableCell>
              <TableCell>
                <Badge color="blue">{snippet.category}</Badge>
              </TableCell>
              <TableCell>
                {Array.isArray(snippet.scope) ? snippet.scope.join(', ') : snippet.scope}
              </TableCell>
              <TableCell className="text-right font-semibold">
                {snippet.usageCount || 0}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  )
}