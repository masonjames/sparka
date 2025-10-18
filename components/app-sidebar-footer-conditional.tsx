'use client';

import { SidebarFooter } from '@/components/ui/sidebar';
import { SidebarSeparator } from '@/components/ui/sidebar';
import { SidebarCredits } from '@/components/sidebar-credits';
import { useSidebar } from '@/components/ui/sidebar';

export function AppSidebarFooterConditional() {
  const { open, openMobile } = useSidebar();

  if (!(open || openMobile)) return null;

  return (
    <>
      <SidebarSeparator />
      <SidebarFooter className="shrink-0">
        <SidebarCredits />
      </SidebarFooter>
    </>
  );
}
