import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppointmentStatusBadge } from './appointment-status-badge';

describe('AppointmentStatusBadge', () => {
  it('renders SCHEDULED with correct label', () => {
    render(<AppointmentStatusBadge status="SCHEDULED" />);
    expect(screen.getByText('Programada')).toBeInTheDocument();
  });

  it('renders IN_PROGRESS with correct label', () => {
    render(<AppointmentStatusBadge status="IN_PROGRESS" />);
    expect(screen.getByText('En curso')).toBeInTheDocument();
  });

  it('renders COMPLETED with correct label', () => {
    render(<AppointmentStatusBadge status="COMPLETED" />);
    expect(screen.getByText('Completada')).toBeInTheDocument();
  });

  it('renders CANCELLED with correct label', () => {
    render(<AppointmentStatusBadge status="CANCELLED" />);
    expect(screen.getByText('Cancelada')).toBeInTheDocument();
  });

  it('renders NO_SHOW with correct label', () => {
    render(<AppointmentStatusBadge status="NO_SHOW" />);
    expect(screen.getByText('No se presentó')).toBeInTheDocument();
  });

  it('accepts a className prop', () => {
    render(<AppointmentStatusBadge status="SCHEDULED" className="test-class" />);
    const badge = screen.getByText('Programada');
    expect(badge.className).toContain('test-class');
  });
});
