import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the Fight Empire start screen', () => {
  render(<App />);
  const heading = screen.getByRole('heading', { name: /FIGHT EMPIRE/i });
  expect(heading).toBeInTheDocument();
});
