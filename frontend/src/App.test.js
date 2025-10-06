import React from 'react';
import { render, screen } from '@testing-library/react';

// Simple test to verify React Testing Library is working
test('renders basic test', () => {
  render(<div>Test Content</div>);
  const testElement = screen.getByText(/Test Content/i);
  expect(testElement).toBeInTheDocument();
});
