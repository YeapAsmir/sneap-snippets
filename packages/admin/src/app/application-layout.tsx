'use client'
// Misc
import Logo                        from '@/components/logo';
import {
    Dropdown,
    DropdownItem,
    DropdownMenu,
    DropdownLabel,
    DropdownButton
}                                  from '@/components/dropdown';
import {
    Navbar,
    NavbarItem,
    NavbarSpacer,
    NavbarSection
}                                  from '@/components/navbar';
import {
    Sidebar,
    SidebarBody,
    SidebarItem,
    SidebarLabel,
    SidebarFooter,
    SidebarHeader,
    SidebarSection
}                                  from '@/components/sidebar';
import { SidebarLayout }           from '@/components/sidebar-layout';
import {
    ChevronUpIcon,
    ArrowRightStartOnRectangleIcon
}                                  from '@heroicons/react/16/solid';
import {
    HomeIcon,
    UsersIcon,
    Cog6ToothIcon
}                                  from '@heroicons/react/20/solid';
import { usePathname }             from 'next/navigation';

function AccountDropdownMenu({ anchor }: { anchor: 'top start' | 'bottom end' }) {
  const handleSignOut = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminRefreshToken');
      window.location.href = '/login';
    }
  };

  return (
    <DropdownMenu className="min-w-64" anchor={anchor}>
      <DropdownItem onClick={handleSignOut}>
        <ArrowRightStartOnRectangleIcon />
        <DropdownLabel>Sign out</DropdownLabel>
      </DropdownItem>
    </DropdownMenu>
  )
}

export function ApplicationLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let pathname = usePathname()

  return (
    <SidebarLayout
      navbar={
        <Navbar>
          <NavbarSpacer />
          <NavbarSection>
            <Dropdown>
              <DropdownButton as={NavbarItem}>
                <Logo size={32} className="shrink-0" />
              </DropdownButton>
              <AccountDropdownMenu anchor="bottom end" />
            </Dropdown>
          </NavbarSection>
        </Navbar>
      }
      sidebar={
        <Sidebar>
          <SidebarHeader>
            <div className="cursor-default flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left text-base/6 font-medium text-zinc-950 sm:py-2 sm:text-sm/5 *:data-[slot=icon]:size-6 *:data-[slot=icon]:shrink-0 *:data-[slot=icon]:fill-zinc-500 sm:*:data-[slot=icon]:size-5 *:last:data-[slot=icon]:ml-auto *:last:data-[slot=icon]:size-5 sm:*:last:data-[slot=icon]:size-4 *:data-[slot=avatar]:-m-0.5 *:data-[slot=avatar]:size-7 sm:*:data-[slot=avatar]:size-6 data-hover:bg-zinc-950/5 data-hover:*:data-[slot=icon]:fill-zinc-950 data-active:bg-zinc-950/5 data-active:*:data-[slot=icon]:fill-zinc-950 data-current:*:data-[slot=icon]:fill-zinc-950">
              <Logo size={24} className="shrink-0" />
                <SidebarLabel>Sneap</SidebarLabel>
            </div>
          </SidebarHeader>

          <SidebarBody>
            <SidebarSection>
              <SidebarItem href="/" current={pathname === '/'}>
                <HomeIcon />
                <SidebarLabel>Home</SidebarLabel>
              </SidebarItem>
              {/* <SidebarItem href="/metrics" current={pathname.startsWith('/metrics')}>
                <ChartBarSquareIcon />
                <SidebarLabel>Metrics</SidebarLabel>
              </SidebarItem> */}
              <SidebarItem href="/teams" current={pathname.startsWith('/teams')}>
                <UsersIcon />
                <SidebarLabel>Teams</SidebarLabel>
              </SidebarItem>
              <SidebarItem href="/settings" current={pathname.startsWith('/settings')}>
                <Cog6ToothIcon />
                <SidebarLabel>Settings</SidebarLabel>
              </SidebarItem>
            </SidebarSection>
          </SidebarBody>

          <SidebarFooter className="max-lg:hidden">
            <Dropdown>
              <DropdownButton as={SidebarItem}>
                <span className="flex min-w-0 items-center gap-3">
                  <span className="min-w-0">
                    <span className="block truncate text-sm/5 font-medium text-zinc-950">Admin</span>
                  </span>
                </span>
                <ChevronUpIcon />
              </DropdownButton>
              <AccountDropdownMenu anchor="top start" />
            </Dropdown>
          </SidebarFooter>
        </Sidebar>
      }
    >
      {children}
    </SidebarLayout>
  )
}
