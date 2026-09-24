import { render, screen } from '@testing-library/react';
import App from './App';

test('renders channel header', () => {
  render(<App />);
  const heading = screen.getByText(/how money works/i);
  expect(heading).toBeInTheDocument();
});
