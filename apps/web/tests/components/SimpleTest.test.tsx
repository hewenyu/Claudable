import { render, screen } from '@testing-library/react'
import ThemeProvider from '@/components/ThemeProvider'

describe('Simple Component Test', () => {
  it('should render ThemeProvider with children', () => {
    render(
      <ThemeProvider>
        <div data-testid="test-child">Test Content</div>
      </ThemeProvider>
    )

    expect(screen.getByTestId('test-child')).toBeInTheDocument()
    expect(screen.getByTestId('test-child')).toHaveTextContent('Test Content')
  })
})