// Misc
import { Badge }   from '@/components/badge';
import { Divider } from '@/components/divider';

export function Stat({ title, value, change, period, loading }: { title: string; value: string; change?: string; period?: string; loading?: boolean }) {
  const getPeriodText = (period?: string) => {
    switch (period) {
      case 'last_week': return 'from last week'
      case 'last_two': return 'from last two weeks'
      case 'last_month': return 'from last month'
      case 'last_quarter': return 'from last quarter'
      default: return 'from last period'
    }
  }

  return (
    <div className={ `flex justify-between items-center w-full inset-0 h-33` }>
      {loading ? (
        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        <div className='w-full'>
          <Divider />
          <div className="mt-6 text-lg/6 font-medium sm:text-sm/6">{title}</div>
          <div className="mt-3 text-3xl/8 font-semibold sm:text-2xl/8">{value}</div>
          <div className="mt-3 text-sm/6 sm:text-xs/6">
            <Badge color={change?.startsWith('+') ? 'lime' : 'pink'}>{change}</Badge>{' '}
            <span className="text-zinc-500">{getPeriodText(period)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
