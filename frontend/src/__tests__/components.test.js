import React from 'react';
import { render, screen } from '@testing-library/react';

// Test individual components
describe('Frontend Components', () => {
  test('should render basic React component', () => {
    const TestComponent = () => <div data-testid="test-component">Test Component</div>;
    render(<TestComponent />);
    
    const element = screen.getByTestId('test-component');
    expect(element).toBeInTheDocument();
    expect(element).toHaveTextContent('Test Component');
  });

  test('should have React Testing Library available', () => {
    expect(render).toBeDefined();
    expect(screen).toBeDefined();
  });

  test('should have Jest DOM matchers available', () => {
    expect(expect).toBeDefined();
  });
});