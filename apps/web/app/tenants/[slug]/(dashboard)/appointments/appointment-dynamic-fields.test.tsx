import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import type { TemplateField } from '@repo/types';
import { AppointmentDynamicFields } from './appointment-dynamic-fields';

function Wrapper({ fields }: { fields: TemplateField[] }) {
  const { register, formState: { errors } } = useForm();
  return <AppointmentDynamicFields fields={fields} register={register} errors={errors} />;
}

describe('AppointmentDynamicFields', () => {
  it('renders nothing when fields array is empty', () => {
    const { container } = render(<Wrapper fields={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders a text field', () => {
    const fields: TemplateField[] = [
      { key: 'weight', label: 'Peso (kg)', type: 'text', required: true },
    ];
    render(<Wrapper fields={fields} />);
    expect(screen.getByLabelText(/peso \(kg\)/i)).toBeInTheDocument();
  });

  it('renders a number field', () => {
    const fields: TemplateField[] = [
      { key: 'bp_systolic', label: 'Presión sistólica', type: 'number', required: true },
    ];
    render(<Wrapper fields={fields} />);
    expect(screen.getByLabelText(/presión sistólica/i)).toBeInTheDocument();
  });

  it('renders a boolean field as checkbox', () => {
    const fields: TemplateField[] = [
      { key: 'is_fistula_ok', label: 'Fístula OK', type: 'boolean', required: false },
    ];
    render(<Wrapper fields={fields} />);
    expect(screen.getByRole('checkbox', { name: /fístula ok/i })).toBeInTheDocument();
  });

  it('renders a select field with options', () => {
    const fields: TemplateField[] = [
      {
        key: 'access_type',
        label: 'Tipo de acceso',
        type: 'select',
        required: true,
        options: ['Fístula', 'Catéter'],
      },
    ];
    render(<Wrapper fields={fields} />);
    expect(screen.getByLabelText(/tipo de acceso/i)).toBeInTheDocument();
    expect(screen.getByText('Fístula')).toBeInTheDocument();
    expect(screen.getByText('Catéter')).toBeInTheDocument();
  });

  it('shows required asterisk for required fields', () => {
    const fields: TemplateField[] = [
      { key: 'weight', label: 'Peso', type: 'text', required: true },
    ];
    render(<Wrapper fields={fields} />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });
});
