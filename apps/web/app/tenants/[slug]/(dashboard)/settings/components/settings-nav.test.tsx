import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

import { usePathname } from 'next/navigation';
import { SettingsNav } from './settings-nav';

describe('SettingsNav', () => {
  it('renders all nav items', () => {
    vi.mocked(usePathname).mockReturnValue('/tenants/demo/settings/locations');
    render(<SettingsNav />);
    expect(screen.getByText('Sucursales')).toBeInTheDocument();
    expect(screen.getByText('Usuarios')).toBeInTheDocument();
  });

  it('marks the locations route as active when on locations', () => {
    vi.mocked(usePathname).mockReturnValue('/tenants/demo/settings/locations');
    render(<SettingsNav />);
    const activeLink = screen.getByText('Sucursales').closest('a');
    expect(activeLink).toHaveClass('text-primary');
  });

  it('marks the users route as active when on users', () => {
    vi.mocked(usePathname).mockReturnValue('/tenants/demo/settings/users');
    render(<SettingsNav />);
    const activeLink = screen.getByText('Usuarios').closest('a');
    expect(activeLink).toHaveClass('text-primary');
  });

  it('does not mark other items as active', () => {
    vi.mocked(usePathname).mockReturnValue('/tenants/demo/settings/locations');
    render(<SettingsNav />);
    const inactiveLink = screen.getByText('Usuarios').closest('a');
    expect(inactiveLink).not.toHaveClass('text-primary');
  });

  it('renders "Tipos de servicio" nav item', () => {
    vi.mocked(usePathname).mockReturnValue('/tenants/demo/settings/locations');
    render(<SettingsNav />);
    expect(screen.getByText('Tipos de servicio')).toBeInTheDocument();
  });

  it('marks service-types route as active when on service-types', () => {
    vi.mocked(usePathname).mockReturnValue('/tenants/demo/settings/service-types');
    render(<SettingsNav />);
    const activeLink = screen.getByText('Tipos de servicio').closest('a');
    expect(activeLink).toHaveClass('text-primary');
  });
});
