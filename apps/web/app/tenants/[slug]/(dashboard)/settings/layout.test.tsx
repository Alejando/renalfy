import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('./components/settings-nav', () => ({
  SettingsNav: () => <nav data-testid="settings-nav" />,
}));

import SettingsLayout from './layout';

describe('SettingsLayout', () => {
  it('renders the settings nav and children', () => {
    render(
      <SettingsLayout>
        <div data-testid="page-content">content</div>
      </SettingsLayout>,
    );
    expect(screen.getByTestId('settings-nav')).toBeInTheDocument();
    expect(screen.getByTestId('page-content')).toBeInTheDocument();
  });
});
