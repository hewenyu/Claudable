import { render, screen, fireEvent } from '@testing-library/react'
import { usePathname } from 'next/navigation'
import Header from '@/components/Header'
import ThemeProvider from '@/components/ThemeProvider'

// Mock usePathname hook
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}))

const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>

// Mock the Image component from Next.js
jest.mock('next/image', () => {
  return function MockImage({ src, alt, ...props }: any) {
    return <img src={src} alt={alt} {...props} />
  }
})

// Mock the ProjectSettings component
jest.mock('@/components/ProjectSettings', () => {
  return function MockProjectSettings({ isOpen, onClose, projectId, projectName, initialTab }: any) {
    return isOpen ? (
      <div data-testid="project-settings-modal">
        Project Settings Modal for {projectName}
      </div>
    ) : null
  }
})

// Mock the window.location
const mockLocation = {
  href: '',
}
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
})

describe('Header Component', () => {
  const renderHeader = () => {
    return render(
      <ThemeProvider>
        <Header />
      </ThemeProvider>
    )
  }

  beforeEach(() => {
    mockLocation.href = ''
    jest.clearAllMocks()
  })

  it('should not render on main page', () => {
    usePathname.mockReturnValue('/')
    
    const { container } = renderHeader()
    
    expect(container.firstChild).toBeNull()
  })

  it('should not render on chat pages', () => {
    usePathname.mockReturnValue('/test-project/chat')
    
    const { container } = renderHeader()
    
    expect(container.firstChild).toBeNull()
  })

  it('should render header on project pages', () => {
    usePathname.mockReturnValue('/test-project/page')
    
    renderHeader()
    
    expect(screen.getByAltText('Claudable')).toBeInTheDocument()
  })

  it('should show back button on project pages', () => {
    usePathname.mockReturnValue('/test-project/page')
    
    renderHeader()
    
    const backButton = screen.getByTitle('Back to projects')
    expect(backButton).toBeInTheDocument()
  })

  it('should not show back button on non-project pages', () => {
    usePathname.mockReturnValue('/some-other-page')
    
    renderHeader()
    
    const backButton = screen.queryByTitle('Back to projects')
    expect(backButton).not.toBeInTheDocument()
  })

  it('should navigate to home when back button is clicked', () => {
    usePathname.mockReturnValue('/test-project/page')
    
    renderHeader()
    
    const backButton = screen.getByTitle('Back to projects')
    fireEvent.click(backButton)
    
    expect(mockLocation.href).toBe('/')
  })

  it('should extract project ID correctly from pathname', () => {
    usePathname.mockReturnValue('/my-awesome-project/page')
    
    renderHeader()
    
    // Check that back button exists (indicating project ID was extracted)
    const backButton = screen.getByTitle('Back to projects')
    expect(backButton).toBeInTheDocument()
  })

  it('should render global settings button', () => {
    usePathname.mockReturnValue('/test-project/page')
    
    renderHeader()
    
    // Look for global settings button
    const settingsButton = screen.getByTitle('Global Settings')
    expect(settingsButton).toBeInTheDocument()
  })

  it('should handle invalid pathname gracefully', () => {
    usePathname.mockReturnValue('/invalid/path/structure/that/is/too/long')
    
    const { container } = renderHeader()
    
    // Should still render the header but without back button
    expect(container.firstChild).not.toBeNull()
    const backButton = screen.queryByTitle('Back to projects')
    expect(backButton).not.toBeInTheDocument()
  })

  it('should have correct CSS classes for responsive design', () => {
    usePathname.mockReturnValue('/test-project/page')
    
    renderHeader()
    
    const header = screen.getByRole('banner')
    expect(header).toHaveClass('bg-white', 'dark:bg-gray-900', 'border-b', 'border-gray-200', 'dark:border-gray-700')
  })
})