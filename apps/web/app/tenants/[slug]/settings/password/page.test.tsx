import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useActionState } from 'react';
import ChangePasswordPage from './page';
import type { AuthActionState } from '../../../../actions/auth';

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  return { ...actual, useActionState: vi.fn() };
});

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('../../../../actions/auth', () => ({
  changePasswordAction: vi.fn(),
}));

describe('ChangePasswordPage', () => {
  const mockDispatch = vi.fn();

  beforeEach(() => {
    vi.mocked(useActionState<AuthActionState, FormData>).mockReturnValue([
      null,
      mockDispatch,
      false,
    ]);
  });

  it('renders current password, new password, and confirm fields', () => {
    render(<ChangePasswordPage />);

    expect(screen.getByLabelText('Contraseña actual')).toBeInTheDocument();
    expect(screen.getByLabelText('Nueva contraseña')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirmar nueva contraseña')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /actualizar contraseña/i })).toBeInTheDocument();
  });

  it('shows an error message when the action returns an error', () => {
    vi.mocked(useActionState<AuthActionState, FormData>).mockReturnValue([
      { error: 'La contraseña actual es incorrecta.' },
      mockDispatch,
      false,
    ]);

    render(<ChangePasswordPage />);

    expect(screen.getByText('La contraseña actual es incorrecta.')).toBeInTheDocument();
  });

  it('disables the submit button while pending', () => {
    vi.mocked(useActionState<AuthActionState, FormData>).mockReturnValue([
      null,
      mockDispatch,
      true,
    ]);

    render(<ChangePasswordPage />);

    const button = screen.getByRole('button', { name: /actualizando/i });
    expect(button).toBeDisabled();
  });

  it('shows the password strength indicator when typing a new password', () => {
    render(<ChangePasswordPage />);

    const newPasswordInput = screen.getByLabelText('Nueva contraseña');
    fireEvent.change(newPasswordInput, { target: { value: 'abc' } });

    expect(screen.getByText('Débil')).toBeInTheDocument();
  });

  it('links back to the dashboard', () => {
    render(<ChangePasswordPage />);

    expect(screen.getByRole('link', { name: /volver al dashboard/i })).toHaveAttribute(
      'href',
      '/dashboard',
    );
  });

  it('toggles visibility on the current password field', () => {
    render(<ChangePasswordPage />);

    const input = screen.getByLabelText('Contraseña actual');
    expect(input).toHaveAttribute('type', 'password');

    fireEvent.click(screen.getByRole('button', { name: /mostrar contraseña actual/i }));
    expect(input).toHaveAttribute('type', 'text');

    fireEvent.click(screen.getByRole('button', { name: /ocultar contraseña actual/i }));
    expect(input).toHaveAttribute('type', 'password');
  });

  it('toggles visibility on the new password field', () => {
    render(<ChangePasswordPage />);

    const input = screen.getByLabelText('Nueva contraseña');
    expect(input).toHaveAttribute('type', 'password');

    fireEvent.click(screen.getByRole('button', { name: /mostrar nueva contraseña/i }));
    expect(input).toHaveAttribute('type', 'text');
  });

  it('toggles visibility on the confirm password field', () => {
    render(<ChangePasswordPage />);

    const input = screen.getByLabelText(/confirmar nueva contraseña/i);
    expect(input).toHaveAttribute('type', 'password');

    fireEvent.click(screen.getByRole('button', { name: /mostrar confirmar contraseña/i }));
    expect(input).toHaveAttribute('type', 'text');
  });

  it('shows "Las contraseñas no coinciden" when action returns that error', () => {
    // This error originates from the ChangePasswordSchema .refine() on the server action.
    // The page renders whatever error the action state contains.
    vi.mocked(useActionState<AuthActionState, FormData>).mockReturnValue([
      { error: 'Las contraseñas no coinciden' },
      mockDispatch,
      false,
    ]);

    render(<ChangePasswordPage />);

    expect(screen.getByText('Las contraseñas no coinciden')).toBeInTheDocument();
  });

  it('does not call the dispatch when submit is skipped (button is disabled while pending)', () => {
    vi.mocked(useActionState<AuthActionState, FormData>).mockReturnValue([
      null,
      mockDispatch,
      true,
    ]);

    render(<ChangePasswordPage />);

    const button = screen.getByRole('button', { name: /actualizando/i });
    expect(button).toBeDisabled();
    // The disabled button cannot trigger further dispatches
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('dispatches the form action when the user fills in valid data and submits', async () => {
    const user = userEvent.setup();
    render(<ChangePasswordPage />);

    await user.type(screen.getByLabelText('Contraseña actual'), 'oldpass123');
    await user.type(screen.getByLabelText('Nueva contraseña'), 'newpass456');
    await user.type(screen.getByLabelText('Confirmar nueva contraseña'), 'newpass456');
    await user.click(screen.getByRole('button', { name: /actualizar contraseña/i }));

    expect(mockDispatch).toHaveBeenCalled();
  });
});
