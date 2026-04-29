import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { PurchaseDetailResponse } from '@repo/types';
import { PurchaseDetailClient } from './purchase-detail-client';

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    back: vi.fn(),
  }),
}));

describe('PurchaseDetailClient', () => {
  const mockPurchase: PurchaseDetailResponse = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    tenantId: '550e8400-e29b-41d4-a716-446655440001',
    locationId: '550e8400-e29b-41d4-a716-446655440002',
    userId: '550e8400-e29b-41d4-a716-446655440003',
    supplierId: '550e8400-e29b-41d4-a716-446655440004',
    purchaseOrderId: '550e8400-e29b-41d4-a716-446655440005',
    date: new Date('2026-04-29'),
    amount: '5080.00',
    notes: 'Test notes',
    supplierName: 'Test Supplier',
    locationName: 'Clinic A',
    itemCount: 1,
    createdAt: new Date('2026-04-29'),
    items: [
      {
        id: '550e8400-e29b-41d4-a716-446655440006',
        purchaseId: '550e8400-e29b-41d4-a716-446655440000',
        productId: '550e8400-e29b-41d4-a716-446655440007',
        quantity: 10,
        quantityReceived: 10,
        unitsPerPackage: 100,
        unitPrice: '500.00',
        tax: '80.00',
        subtotal: '5080.00',
        createdAt: new Date('2026-04-29'),
        product: {
          id: '550e8400-e29b-41d4-a716-446655440007',
          name: 'Solución de diálisis',
          brand: 'Baxter',
        },
      },
    ],
    supplier: {
      id: '550e8400-e29b-41d4-a716-446655440004',
      name: 'Test Supplier',
      contact: 'John Doe',
      phone: '555-1234',
      email: 'test@supplier.com',
    },
    location: {
      id: '550e8400-e29b-41d4-a716-446655440002',
      name: 'Clinic A',
    },
  };

  describe('rendering', () => {
    it('should render page title', () => {
      render(<PurchaseDetailClient purchase={mockPurchase} />);
      expect(screen.getByText('Detalle de Compra')).toBeInTheDocument();
    });

    it('should display back button', () => {
      render(<PurchaseDetailClient purchase={mockPurchase} />);
      expect(screen.getByRole('button', { name: /volver/i })).toBeInTheDocument();
    });

    it('should display purchase order ID', () => {
      render(<PurchaseDetailClient purchase={mockPurchase} />);
      expect(
        screen.getByText('550e8400-e29b-41d4-a716-446655440005')
      ).toBeInTheDocument();
    });

    it('should display supplier name', () => {
      render(<PurchaseDetailClient purchase={mockPurchase} />);
      expect(screen.getByText('Test Supplier')).toBeInTheDocument();
    });

    it('should display location name', () => {
      render(<PurchaseDetailClient purchase={mockPurchase} />);
      expect(screen.getByText('Clinic A')).toBeInTheDocument();
    });

    it('should display formatted date', () => {
      render(<PurchaseDetailClient purchase={mockPurchase} />);
      // Date format may vary, so just check that some date text is present
      const dateText = screen.getByText(/\d+\/\d+\/\d+/);
      expect(dateText).toBeInTheDocument();
    });
  });

  describe('items table', () => {
    it('should render table with product headers', () => {
      render(<PurchaseDetailClient purchase={mockPurchase} />);
      expect(screen.getByText('Producto')).toBeInTheDocument();
      expect(screen.getByText('Ordenado')).toBeInTheDocument();
      expect(screen.getByText('Recibido')).toBeInTheDocument();
      expect(screen.getByText('Unidades/Empaque')).toBeInTheDocument();
      expect(screen.getByText('Precio')).toBeInTheDocument();
      expect(screen.getByText('Impuesto')).toBeInTheDocument();
      expect(screen.getByText('Subtotal')).toBeInTheDocument();
    });

    it('should display product name in table', () => {
      render(<PurchaseDetailClient purchase={mockPurchase} />);
      expect(screen.getByText('Solución de diálisis')).toBeInTheDocument();
    });

    it('should display item quantities', () => {
      render(<PurchaseDetailClient purchase={mockPurchase} />);
      const cells = screen.getAllByText('10');
      expect(cells.length).toBeGreaterThanOrEqual(2); // quantity and quantityReceived
    });

    it('should display item prices and tax', () => {
      render(<PurchaseDetailClient purchase={mockPurchase} />);
      expect(screen.getByText('$500.00')).toBeInTheDocument();
      expect(screen.getByText('$80.00')).toBeInTheDocument();
    });

    it('should display subtotal for each item', () => {
      render(<PurchaseDetailClient purchase={mockPurchase} />);
      const subtotalElements = screen.getAllByText('$5080.00');
      expect(subtotalElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('totals', () => {
    it('should display "Monto Total" label', () => {
      render(<PurchaseDetailClient purchase={mockPurchase} />);
      expect(screen.getByText('Monto Total:')).toBeInTheDocument();
    });

    it('should calculate and display total amount correctly', () => {
      render(<PurchaseDetailClient purchase={mockPurchase} />);
      // With one item of subtotal 5080.00, total should be 5080.00
      const totalElements = screen.getAllByText(/\$5080\.00/);
      expect(totalElements.length).toBeGreaterThanOrEqual(2); // item subtotal + total
    });

    it('should handle multiple items total calculation', () => {
      const firstItem = {
        id: '550e8400-e29b-41d4-a716-446655440006',
        purchaseId: '550e8400-e29b-41d4-a716-446655440000',
        productId: '550e8400-e29b-41d4-a716-446655440007',
        quantity: 10,
        quantityReceived: 10,
        unitsPerPackage: 100,
        unitPrice: '500.00',
        tax: '80.00',
        subtotal: '5080.00',
        createdAt: new Date('2026-04-29'),
        product: {
          id: '550e8400-e29b-41d4-a716-446655440007',
          name: 'Solución de diálisis',
          brand: 'Baxter',
        },
      };

      const secondItem = {
        id: '550e8400-e29b-41d4-a716-446655440008',
        purchaseId: '550e8400-e29b-41d4-a716-446655440000',
        productId: '550e8400-e29b-41d4-a716-446655440007',
        quantity: 10,
        quantityReceived: 10,
        unitsPerPackage: 100,
        unitPrice: '500.00',
        tax: '120.00',
        subtotal: '5120.00',
        createdAt: new Date('2026-04-29'),
        product: {
          id: '550e8400-e29b-41d4-a716-446655440007',
          name: 'Otro producto',
          brand: 'Baxter',
        },
      };

      const multiItemPurchase: PurchaseDetailResponse = {
        ...mockPurchase,
        itemCount: 2,
        amount: '10200.00',
        items: [firstItem, secondItem],
      };
      render(<PurchaseDetailClient purchase={multiItemPurchase} />);
      // Total of both items: 5080.00 + 5120.00 = 10200.00
      expect(screen.getByText('$10200.00')).toBeInTheDocument();
    });
  });

  describe('read-only behavior', () => {
    it('should not display edit or delete buttons', () => {
      render(<PurchaseDetailClient purchase={mockPurchase} />);
      expect(screen.queryByRole('button', { name: /editar/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /eliminar/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /borrar/i })).not.toBeInTheDocument();
    });
  });
});
