import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlanStatusBadge } from './plan-status-badge';

describe('PlanStatusBadge', () => {
  it('renders "Activo" for ACTIVE status', () => {
    render(<PlanStatusBadge status="ACTIVE" />);
    expect(screen.getByText('Activo')).toBeInTheDocument();
  });

  it('renders "Inactivo" for INACTIVE status', () => {
    render(<PlanStatusBadge status="INACTIVE" />);
    expect(screen.getByText('Inactivo')).toBeInTheDocument();
  });

  it('renders "Agotado" for EXHAUSTED status', () => {
    render(<PlanStatusBadge status="EXHAUSTED" />);
    expect(screen.getByText('Agotado')).toBeInTheDocument();
  });

  it('applies teal classes for ACTIVE status', () => {
    render(<PlanStatusBadge status="ACTIVE" />);
    const badge = screen.getByText('Activo');
    expect(badge.className).toMatch(/teal/);
  });

  it('applies amber classes for EXHAUSTED status', () => {
    render(<PlanStatusBadge status="EXHAUSTED" />);
    const badge = screen.getByText('Agotado');
    expect(badge.className).toMatch(/amber/);
  });

  it('applies slate/gray classes for INACTIVE status', () => {
    render(<PlanStatusBadge status="INACTIVE" />);
    const badge = screen.getByText('Inactivo');
    expect(badge.className).toMatch(/slate|gray/);
  });

  it('accepts className prop', () => {
    render(<PlanStatusBadge status="ACTIVE" className="extra-class" />);
    const badge = screen.getByText('Activo');
    expect(badge.className).toContain('extra-class');
  });
});
