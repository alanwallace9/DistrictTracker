import { DemoRoleProvider } from '@/contexts/DemoRoleContext';
import { ReactNode } from 'react';

export default function DemoLayout({ children }: { children: ReactNode }) {
  return (
    <DemoRoleProvider>
      {children}
    </DemoRoleProvider>
  );
}
