import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('../../../../actions/receipts', () => ({
  updateReceiptStatusAction: vi.fn(),
}));

import { updateReceiptStatusAction } from '../../../../actions/receipts';
import { ReceiptStatusTransitionDrawer } from './receipt-status-transition-drawer';

describe('ReceiptStatusTransitionDrawer', () => {
  const onSuccess = vi.fn();
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when closed', () => {
    render(
      <ReceiptStatusTransitionDrawer
        open={false}
        onClose={onClose}
        onSuccess={onSuccess}
        receiptId="receipt-1"
        currentStatus="ACTIVE"
      />,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows FINISHED and CANCELLED buttons for ACTIVE status', () => {
    render(
      <ReceiptStatusTransitionDrawer
        open={true}
        onClose={onClose}
        onSuccess={onSuccess}
        receiptId="receipt-1"
        currentStatus="ACTIVE"
      />,
    );
    expect(screen.getByRole('button', { name: /finalizar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancelar recibo/i })).toBeInTheDocument();
  });

  it('shows only SETTLED button for FINISHED status', () => {
    render(
      <ReceiptStatusTransitionDrawer
        open={true}
        onClose={onClose}
        onSuccess={onSuccess}
        receiptId="receipt-1"
        currentStatus="FINISHED"
      />,
    );
    expect(screen.getByRole('button', { name: /liquidar/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /cancelar recibo/i })).not.toBeInTheDocument();
  });

  it('shows terminal message for SETTLED status', () => {
    render(
      <ReceiptStatusTransitionDrawer
        open={true}
        onClose={onClose}
        onSuccess={onSuccess}
        receiptId="receipt-1"
        currentStatus="SETTLED"
      />,
    );
    expect(screen.getByText(/no se pueden realizar más cambios/i)).toBeInTheDocument();
  });

  it('shows terminal message for CANCELLED status', () => {
    render(
      <ReceiptStatusTransitionDrawer
        open={true}
        onClose={onClose}
        onSuccess={onSuccess}
        receiptId="receipt-1"
        currentStatus="CANCELLED"
      />,
    );
    expect(screen.getByText(/no se pueden realizar más cambios/i)).toBeInTheDocument();
  });

  it('calls updateReceiptStatusAction and onSuccess when transitioning', async () => {
    vi.mocked(updateReceiptStatusAction).mockResolvedValue(null);

    render(
      <ReceiptStatusTransitionDrawer
        open={true}
        onClose={onClose}
        onSuccess={onSuccess}
        receiptId="receipt-1"
        currentStatus="ACTIVE"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /finalizar/i }));

    await waitFor(() => {
      expect(vi.mocked(updateReceiptStatusAction)).toHaveBeenCalledWith(
        'receipt-1',
        expect.any(FormData),
      );
    });
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('shows error message when transition fails', async () => {
    vi.mocked(updateReceiptStatusAction).mockResolvedValue({
      error: 'Transición inválida',
    });

    render(
      <ReceiptStatusTransitionDrawer
        open={true}
        onClose={onClose}
        onSuccess={onSuccess}
        receiptId="receipt-1"
        currentStatus="ACTIVE"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /finalizar/i }));

    await waitFor(() => {
      expect(screen.getByText(/transición inválida/i)).toBeInTheDocument();
    });
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
