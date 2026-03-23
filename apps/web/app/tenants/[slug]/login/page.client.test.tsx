import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useActionState } from 'react';
import { LoginPageClient } from './page.client';
import type { AuthActionState } from '../../../actions/auth';

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  return { ...actual, useActionState: vi.fn() };
});

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('../../../actions/auth', () => ({
  loginAction: vi.fn(),
}));

describe('LoginPageClient', () => {
  const mockDispatch = vi.fn();

  beforeEach(() => {
    vi.mocked(useActionState<AuthActionState, FormData>).mockReturnValue([
      null,
      mockDispatch,
      false,
    ]);
  });

  it('renders email and password fields with a submit button', () => {
    render(<LoginPageClient slug="clinica-demo" />);

    expect(screen.getByLabelText(/correo electrónico/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeInTheDocument();
  });

  it('renders the remember-me checkbox', () => {
    render(<LoginPageClient slug="clinica-demo" />);

    expect(screen.getByRole('checkbox', { name: /recordar/i })).toBeInTheDocument();
  });

  it('renders the forgot-password link pointing to the forgot-password page', () => {
    render(<LoginPageClient slug="clinica-demo" />);

    expect(screen.getByRole('link', { name: /olvidaste/i })).toHaveAttribute(
      'href',
      '/forgot-password',
    );
  });

  it('shows an error alert when the action returns an error', () => {
    vi.mocked(useActionState<AuthActionState, FormData>).mockReturnValue([
      { error: 'Credenciales incorrectas. Verifica tu email y contraseña.' },
      mockDispatch,
      false,
    ]);

    render(<LoginPageClient slug="clinica-demo" />);

    expect(
      screen.getByText('Credenciales incorrectas. Verifica tu email y contraseña.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Error al iniciar sesión')).toBeInTheDocument();
  });

  it('disables the button and shows loading text while pending', () => {
    vi.mocked(useActionState<AuthActionState, FormData>).mockReturnValue([
      null,
      mockDispatch,
      true,
    ]);

    render(<LoginPageClient slug="clinica-demo" />);

    const button = screen.getByRole('button', { name: /iniciando sesión/i });
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
  });

  it('links to the privacy and home pages', () => {
    render(<LoginPageClient slug="clinica-demo" />);

    expect(screen.getByRole('link', { name: /privacidad/i })).toHaveAttribute(
      'href',
      '/privacidad',
    );
    expect(screen.getByRole('link', { name: /inicio/i })).toHaveAttribute('href', '/');
  });

  it('dispatches the form action when the user fills in valid data and submits', async () => {
    const user = userEvent.setup();
    render(<LoginPageClient slug="clinica-demo" />);

    await user.type(screen.getByLabelText(/correo electrónico/i), 'doc@clinic.com');
    await user.type(screen.getByLabelText(/contraseña/i), 'secret123');
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    expect(mockDispatch).toHaveBeenCalled();
  });

  it('does not show error alert when state is null', () => {
    render(<LoginPageClient slug="clinica-demo" />);

    expect(screen.queryByText(/error al iniciar sesión/i)).not.toBeInTheDocument();
  });
});
