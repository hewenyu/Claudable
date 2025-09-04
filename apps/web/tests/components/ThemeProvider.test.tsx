import { render, screen, act } from '@testing-library/react'
import { useTheme } from '@/components/ThemeProvider'
import ThemeProvider from '@/components/ThemeProvider'

// Test component to use the theme hook
function TestComponent() {
  const { theme, toggle, setTheme } = useTheme()
  
  return (
    <div>
      <span data-testid="current-theme">{theme}</span>
      <button data-testid="toggle-theme" onClick={toggle}>
        Toggle Theme
      </button>
      <button data-testid="set-light" onClick={() => setTheme('light')}>
        Set Light
      </button>
      <button data-testid="set-dark" onClick={() => setTheme('dark')}>
        Set Dark
      </button>
    </div>
  )
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    // Clear document classes
    document.documentElement.classList.remove('dark')
  })

  it('should provide default light theme', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    expect(screen.getByTestId('current-theme')).toHaveTextContent('light')
  })

  it('should read theme from localStorage', () => {
    localStorage.setItem('theme', 'dark')

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    expect(screen.getByTestId('current-theme')).toHaveTextContent('dark')
  })

  it('should toggle theme from light to dark', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    const toggleButton = screen.getByTestId('toggle-theme')
    
    // Initial state should be light
    expect(screen.getByTestId('current-theme')).toHaveTextContent('light')
    
    // Toggle to dark
    act(() => {
      toggleButton.click()
    })
    
    expect(screen.getByTestId('current-theme')).toHaveTextContent('dark')
  })

  it('should toggle theme from dark to light', () => {
    localStorage.setItem('theme', 'dark')

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    const toggleButton = screen.getByTestId('toggle-theme')
    
    // Initial state should be dark (from localStorage)
    expect(screen.getByTestId('current-theme')).toHaveTextContent('dark')
    
    // Toggle to light
    act(() => {
      toggleButton.click()
    })
    
    expect(screen.getByTestId('current-theme')).toHaveTextContent('light')
  })

  it('should set theme directly to light', () => {
    localStorage.setItem('theme', 'dark')

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    const setLightButton = screen.getByTestId('set-light')
    
    // Initial state should be dark
    expect(screen.getByTestId('current-theme')).toHaveTextContent('dark')
    
    // Set to light
    act(() => {
      setLightButton.click()
    })
    
    expect(screen.getByTestId('current-theme')).toHaveTextContent('light')
  })

  it('should set theme directly to dark', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    const setDarkButton = screen.getByTestId('set-dark')
    
    // Initial state should be light
    expect(screen.getByTestId('current-theme')).toHaveTextContent('light')
    
    // Set to dark
    act(() => {
      setDarkButton.click()
    })
    
    expect(screen.getByTestId('current-theme')).toHaveTextContent('dark')
  })

  it('should apply dark class to document when theme is dark', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    const setDarkButton = screen.getByTestId('set-dark')
    
    // Set to dark theme
    act(() => {
      setDarkButton.click()
    })
    
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('should remove dark class from document when theme is light', () => {
    localStorage.setItem('theme', 'dark')

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    const setLightButton = screen.getByTestId('set-light')
    
    // Set to light theme
    act(() => {
      setLightButton.click()
    })
    
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('should persist theme changes to localStorage', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    const setDarkButton = screen.getByTestId('set-dark')
    
    // Set to dark theme
    act(() => {
      setDarkButton.click()
    })
    
    expect(localStorage.getItem('theme')).toBe('dark')
  })

  it('should throw error when useTheme is used outside provider', () => {
    // Suppress console.error for this test
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
    
    expect(() => {
      render(<TestComponent />)
    }).toThrow('useTheme must be used within ThemeProvider')
    
    consoleError.mockRestore()
  })
})