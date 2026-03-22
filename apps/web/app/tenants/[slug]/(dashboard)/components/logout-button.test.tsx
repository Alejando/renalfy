import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { logoutAction } from '../../../../actions/auth';
import { LogoutButton } from './logout-button';

vi.mock('../../../../actions/auth.js', () => ({
  logoutAction: vi.fn(),
}));

describe('LogoutButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(logoutAction).mockResolvedValue(undefined);
  });

  it('renders with default text and is enabled', () => {
    render(<LogoutButton />);

    const button = screen.getByRole('button', { name: 'Cerrar sesión' });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });

  it('calls logoutAction when clicked', () => {
    render(<LogoutButton />);

    fireEvent.click(screen.getByRole('button'));

    expect(vi.mocked(logoutAction)).toHaveBeenCalledOnce();
  });
});
