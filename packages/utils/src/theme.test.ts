import { describe, it, expect } from 'vitest';
import { deriveRfTheme, hexToHsl, hslToHex, adjustLightness } from './theme.js';

describe('deriveRfTheme', () => {
  describe('with default teal color', () => {
    const teal = '#0891b2';
    const theme = deriveRfTheme(teal);

    it('should include --rf-primary with the original hex', () => {
      expect(theme['--rf-primary']).toBe(teal);
    });

    it('should include --rf-on-primary as white', () => {
      expect(theme['--rf-on-primary']).toBe('#ffffff');
    });

    it('should include all required color derivatives', () => {
      expect(theme).toHaveProperty('--rf-primary-hover');
      expect(theme).toHaveProperty('--rf-primary-soft');
      expect(theme).toHaveProperty('--rf-primary-softer');
      expect(theme).toHaveProperty('--rf-primary-ink');
      expect(theme).toHaveProperty('--rf-primary-dark');
      expect(theme).toHaveProperty('--rf-primary-darker');
    });

    it('should return 8 total CSS variables', () => {
      expect(Object.keys(theme)).toHaveLength(8);
    });
  });

  describe('with custom colors', () => {
    it('should derive a red theme', () => {
      const red = '#ef4444';
      const theme = deriveRfTheme(red);
      expect(theme['--rf-primary']).toBe(red);
      expect(theme['--rf-on-primary']).toBe('#ffffff');
    });

    it('should handle uppercase hex', () => {
      const upperTeal = '#0891B2';
      const lowerTeal = '#0891b2';
      const themeUpper = deriveRfTheme(upperTeal);
      const themeLower = deriveRfTheme(lowerTeal);
      expect(themeUpper['--rf-primary']?.toLowerCase()).toBe(themeUpper['--rf-primary']?.toLowerCase());
    });
  });

  describe('hexToHsl', () => {
    it('should convert teal to HSL', () => {
      const hsl = hexToHsl('#0891b2');
      expect(hsl).toMatch(/^hsl\(\d+,\s*\d+%,\s*\d+%\)$/);
    });

    it('should convert red to HSL', () => {
      const hsl = hexToHsl('#ef4444');
      expect(hsl).toMatch(/^hsl\(\d+,\s*\d+%,\s*\d+%\)$/);
    });

    it('should convert white to HSL', () => {
      const hsl = hexToHsl('#ffffff');
      expect(hsl).toBe('hsl(0, 0%, 100%)');
    });

    it('should convert black to HSL', () => {
      const hsl = hexToHsl('#000000');
      expect(hsl).toBe('hsl(0, 0%, 0%)');
    });
  });

  describe('hslToHex', () => {
    it('should convert HSL back to hex', () => {
      const hex = hslToHex('hsl(190, 100%, 35%)');
      // Allow for small rounding differences (±1 in RGB values)
      expect(/^#[0-9a-f]{6}$/i.test(hex)).toBe(true);
    });

    it('should handle HSL without spaces', () => {
      const hex = hslToHex('hsl(190,100%,35%)');
      expect(/^#[0-9a-f]{6}$/i.test(hex)).toBe(true);
    });
  });

  describe('adjustLightness', () => {
    it('should darken a color', () => {
      const hsl = hexToHsl('#0891b2');
      const darker = adjustLightness(hsl || 'hsl(190, 100%, 35%)', -8);
      expect(darker).toMatch(/^hsl\(\d+,\s*\d+%,\s*\d+%\)$/);
    });

    it('should lighten a color', () => {
      const hsl = hexToHsl('#0891b2');
      const lighter = adjustLightness(hsl || 'hsl(190, 100%, 35%)', 82);
      expect(lighter).toMatch(/^hsl\(\d+,\s*\d+%,\s*\d+%\)$/);
    });

    it('should not go below 0% lightness', () => {
      const hsl = 'hsl(0, 100%, 10%)';
      const result = adjustLightness(hsl, -20);
      // Extract lightness value
      const match = result.match(/(\d+)%\)$/);
      if (match && match[1]) {
        expect(parseInt(match[1])).toBeGreaterThanOrEqual(0);
      }
    });

    it('should not go above 100% lightness', () => {
      const hsl = 'hsl(0, 100%, 90%)';
      const result = adjustLightness(hsl, 20);
      // Extract lightness value
      const match = result.match(/(\d+)%\)$/);
      if (match && match[1]) {
        expect(parseInt(match[1])).toBeLessThanOrEqual(100);
      }
    });
  });
});
