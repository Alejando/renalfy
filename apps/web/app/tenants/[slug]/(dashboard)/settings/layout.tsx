import type { ReactNode } from 'react';
import { SettingsNav } from './components/settings-nav';

interface Props {
  children: ReactNode;
}

export default function SettingsLayout({ children }: Props) {
  return (
    <div className="flex gap-10">
      <aside className="w-48 shrink-0 pt-1">
        <SettingsNav />
      </aside>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
