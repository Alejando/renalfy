import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PlanResponse, LocationResponse, ServiceTypeResponse } from '@repo/types';

vi.mock('../../../../actions/plans', () => ({
  createPlanAction: vi.fn(),
  updatePlanAction: vi.fn(),
}));

import { createPlanAction, updatePlanAction } from '../../../../actions/plans';
import { PlanForm } from './plan-form';

const PATIENT_UUID = '11111111-1111-4111-a111-111111111111';
const LOCATION_UUID = '22222222-2222-4222-a222-222222222222';
const COMPANY_UUID = '33333333-3333-4333-a333-333333333333';
const SERVICE_TYPE_UUID = '44444444-4444-4444-8444-444444444444';
const PLAN_UUID = '55555555-5555-4555-a555-555555555555';
const TENANT_UUID = '66666666-6666-4666-a666-666666666666';

const mockPatients = [{ id: PATIENT_UUID, name: 'Juan Pérez' }];
const mockCompanies = [{ id: COMPANY_UUID, name: 'Seguros Vida Plena' }];
const mockServiceTypes: ServiceTypeResponse[] = [
  {
    id: SERVICE_TYPE_UUID,
    tenantId: TENANT_UUID,
    name: 'Hemodiálisis',
    description: null,
    price: 500,
    status: 'ACTIVE',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  },
];
const mockLocations: LocationResponse[] = [
  {
    id: LOCATION_UUID,
    tenantId: TENANT_UUID,
    name: 'Sucursal Centro',
    address: 'Calle 1',
    phone: null,
    status: 'ACTIVE',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  },
];

const mockPlan: PlanResponse = {
  id: PLAN_UUID,
  tenantId: TENANT_UUID,
  locationId: LOCATION_UUID,
  patientId: PATIENT_UUID,
  companyId: COMPANY_UUID,
  serviceTypeId: SERVICE_TYPE_UUID,
  userId: 'user-1',
  startDate: new Date('2026-01-01'),
  plannedSessions: 12,
  usedSessions: 4,
  amount: '5000.00',
  status: 'ACTIVE',
  notes: 'Notas de prueba',
  patientName: 'Juan Pérez',
  companyName: 'Seguros Vida Plena',
  serviceTypeName: 'Hemodiálisis',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const defaultProps = {
  onSuccess: vi.fn(),
  onClose: vi.fn(),
  patients: mockPatients,
  companies: mockCompanies,
  serviceTypes: mockServiceTypes,
  locations: mockLocations,
  userRole: 'OWNER' as const,
  userLocationId: null,
};

describe('PlanForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders required fields: paciente, fecha inicio, sesiones planeadas, monto', () => {
    render(<PlanForm {...defaultProps} />);
    expect(screen.getByLabelText(/paciente/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/fecha de inicio/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/sesiones planeadas/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/monto/i)).toBeInTheDocument();
  });

  it('renders optional fields: empresa, tipo de servicio, notas', () => {
    render(<PlanForm {...defaultProps} />);
    expect(screen.getByLabelText(/empresa/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/tipo de servicio/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/notas/i)).toBeInTheDocument();
  });

  it('shows "Crear Plan" button in create mode', () => {
    render(<PlanForm {...defaultProps} />);
    expect(screen.getByRole('button', { name: /crear plan/i })).toBeInTheDocument();
  });

  it('shows "Guardar Cambios" button in edit mode', () => {
    render(<PlanForm {...defaultProps} plan={mockPlan} />);
    expect(screen.getByRole('button', { name: /guardar cambios/i })).toBeInTheDocument();
  });

  it('shows validation error when patient is not selected on submit', async () => {
    render(<PlanForm {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /crear plan/i }));
    await waitFor(() => {
      // Some validation error should appear
      const errors = document.querySelectorAll('.text-destructive');
      expect(errors.length).toBeGreaterThan(0);
    });
    expect(vi.mocked(createPlanAction)).not.toHaveBeenCalled();
  });

  it('shows validation error when monto format is invalid', async () => {
    render(<PlanForm {...defaultProps} />);
    fireEvent.change(screen.getByLabelText(/paciente/i), {
      target: { value: PATIENT_UUID },
    });
    fireEvent.change(screen.getByLabelText(/fecha de inicio/i), {
      target: { value: '2026-01-01' },
    });
    fireEvent.change(screen.getByLabelText(/sesiones planeadas/i), {
      target: { value: '12' },
    });
    fireEvent.change(screen.getByLabelText(/monto/i), {
      target: { value: '1234.567' }, // invalid — too many decimals
    });
    fireEvent.click(screen.getByRole('button', { name: /crear plan/i }));
    await waitFor(() => {
      expect(screen.getByText(/formato de monto/i)).toBeInTheDocument();
    });
  });

  it('disables patientId field in edit mode', () => {
    render(<PlanForm {...defaultProps} plan={mockPlan} />);
    const patientSelect = screen.getByLabelText(/paciente/i);
    expect(patientSelect).toBeDisabled();
  });

  it('disables locationId field when user is MANAGER', () => {
    render(
      <PlanForm
        {...defaultProps}
        userRole="MANAGER"
        userLocationId={LOCATION_UUID}
      />,
    );
    const locationSelect = screen.getByLabelText(/sucursal/i);
    expect(locationSelect).toBeDisabled();
  });

  it('calls onClose when cancel button is clicked', () => {
    const onClose = vi.fn();
    render(<PlanForm {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls createPlanAction on valid submission (create mode)', async () => {
    const user = userEvent.setup();
    vi.mocked(createPlanAction).mockResolvedValueOnce(null);
    render(<PlanForm {...defaultProps} />);
    await user.selectOptions(screen.getByLabelText(/paciente/i), PATIENT_UUID);
    await user.clear(screen.getByLabelText(/monto/i));
    await user.type(screen.getByLabelText(/monto/i), '5000.00');
    await user.click(screen.getByRole('button', { name: /crear plan/i }));
    await waitFor(() => {
      expect(vi.mocked(createPlanAction)).toHaveBeenCalled();
    });
  });

  it('calls updatePlanAction on valid submission (edit mode)', async () => {
    const user = userEvent.setup();
    vi.mocked(updatePlanAction).mockResolvedValueOnce(null);
    render(<PlanForm {...defaultProps} plan={mockPlan} />);
    await user.clear(screen.getByLabelText(/monto/i));
    await user.type(screen.getByLabelText(/monto/i), '6000.00');
    await user.click(screen.getByRole('button', { name: /guardar cambios/i }));
    await waitFor(() => {
      expect(vi.mocked(updatePlanAction)).toHaveBeenCalled();
    });
  });

  it('calls onSuccess after successful create', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    vi.mocked(createPlanAction).mockResolvedValueOnce(null);
    render(<PlanForm {...defaultProps} onSuccess={onSuccess} />);
    await user.selectOptions(screen.getByLabelText(/paciente/i), PATIENT_UUID);
    await user.clear(screen.getByLabelText(/monto/i));
    await user.type(screen.getByLabelText(/monto/i), '5000.00');
    await user.click(screen.getByRole('button', { name: /crear plan/i }));
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('shows server error when action returns an error', async () => {
    const user = userEvent.setup();
    vi.mocked(createPlanAction).mockResolvedValueOnce({ error: 'Error del servidor' });
    render(<PlanForm {...defaultProps} />);
    await user.selectOptions(screen.getByLabelText(/paciente/i), PATIENT_UUID);
    await user.clear(screen.getByLabelText(/monto/i));
    await user.type(screen.getByLabelText(/monto/i), '5000.00');
    await user.click(screen.getByRole('button', { name: /crear plan/i }));
    await waitFor(() => {
      expect(screen.getByText(/error del servidor/i)).toBeInTheDocument();
    });
  });
});
