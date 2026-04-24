import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const StockQuantityAdjustmentObjectSchema = z
  .object({
    adjustmentType: z.enum(['SET', 'DELTA']),
    quantity: z.number().int().min(0).optional(),
    delta: z.number().int().optional(),
  })
  .refine(
    (data) => {
      if (data.adjustmentType === 'SET') {
        return data.quantity !== undefined && data.delta === undefined;
      }
      return data.delta !== undefined && data.quantity === undefined;
    },
    {
      message:
        'SET type requires quantity; DELTA type requires delta; fields are mutually exclusive',
    },
  );

export class StockQuantityAdjustmentDto extends createZodDto(
  StockQuantityAdjustmentObjectSchema,
) {}
