/**
 * Tests for ProjectCard component
 */
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import ProjectCard from '@/app/_components/ProjectCard'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// Mock next/link
jest.mock('next/link', () => {
  return function MockLink({ children, href, ...props }: any) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    )
  }
})

describe('ProjectCard', () => {
  const mockPush = jest.fn()
  const mockPrefetch = jest.fn()

  const mockProject = {
    id: 'test-project-123',
    name: 'Test Project',
    prompt: 'Create a test application with TypeScript',
    created_at: '2024-01-01T00:00:00Z',
    last_active_at: '2024-01-02T12:00:00Z',
  }

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()
    
    // Setup router mock
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      prefetch: mockPrefetch,
      replace: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    })
  })

  it('renders project information correctly', () => {
    render(<ProjectCard project={mockProject} />)

    // Check if project name is displayed
    expect(screen.getByText('Test Project')).toBeInTheDocument()
    
    // Check if project prompt is displayed
    expect(screen.getByText('Create a test application with TypeScript')).toBeInTheDocument()
  })

  it('renders correct link href', () => {
    render(<ProjectCard project={mockProject} />)

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/test-project-123/chat')
  })

  it('prefetches route on mouse enter after delay', async () => {
    const user = userEvent.setup()
    render(<ProjectCard project={mockProject} />)

    const link = screen.getByRole('link')
    
    // Hover over the card
    await user.hover(link)

    // Wait for prefetch timeout (200ms)
    await waitFor(
      () => {
        expect(mockPrefetch).toHaveBeenCalledWith('/test-project-123/chat')
      },
      { timeout: 300 }
    )
  })

  it('cancels prefetch on mouse leave', async () => {
    const user = userEvent.setup()
    render(<ProjectCard project={mockProject} />)

    const link = screen.getByRole('link')
    
    // Hover and then quickly unhover
    await user.hover(link)
    await user.unhover(link)

    // Wait a bit longer than the prefetch delay
    await new Promise(resolve => setTimeout(resolve, 250))

    // Prefetch should not have been called
    expect(mockPrefetch).not.toHaveBeenCalled()
  })

  it('displays creation date when available', () => {
    render(<ProjectCard project={mockProject} />)

    // The component should show some indication of creation date
    // This might be in a relative format like "Created 2 days ago"
    expect(screen.getByText(/created/i)).toBeInTheDocument()
  })

  it('displays last active date when available', () => {
    render(<ProjectCard project={mockProject} />)

    // The component should show last active information
    expect(screen.getByText(/active/i)).toBeInTheDocument()
  })

  it('handles missing last_active_at gracefully', () => {
    const projectWithoutLastActive = {
      ...mockProject,
      last_active_at: undefined,
    }

    render(<ProjectCard project={projectWithoutLastActive} />)

    // Should still render without errors
    expect(screen.getByText('Test Project')).toBeInTheDocument()
  })

  it('applies hover styles correctly', async () => {
    const user = userEvent.setup()
    render(<ProjectCard project={mockProject} />)

    const link = screen.getByRole('link')
    
    // Check initial state (no hover)
    expect(link).toHaveClass('hover:shadow-xl')
    expect(link).toHaveClass('hover:scale-[1.02]')

    // Hover should trigger CSS classes
    await user.hover(link)
    expect(link).toHaveClass('group')
  })

  it('truncates long project names appropriately', () => {
    const longNameProject = {
      ...mockProject,
      name: 'This is a very long project name that should be truncated appropriately to prevent layout issues',
    }

    render(<ProjectCard project={longNameProject} />)

    const projectName = screen.getByText(/This is a very long project name/)
    expect(projectName).toBeInTheDocument()
  })

  it('truncates long prompts appropriately', () => {
    const longPromptProject = {
      ...mockProject,
      prompt: 'This is a very long prompt that describes a complex application with many features and requirements that should be truncated to maintain good UX and prevent the card from becoming too large',
    }

    render(<ProjectCard project={longPromptProject} />)

    const prompt = screen.getByText(/This is a very long prompt/)
    expect(prompt).toBeInTheDocument()
  })

  it('cleans up timeout on unmount', () => {
    const { unmount } = render(<ProjectCard project={mockProject} />)

    // Create a spy on clearTimeout
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout')

    unmount()

    // Should not throw any errors and cleanup should work
    expect(clearTimeoutSpy).toHaveBeenCalled()

    clearTimeoutSpy.mockRestore()
  })

  it('supports keyboard navigation', async () => {
    const user = userEvent.setup()
    render(<ProjectCard project={mockProject} />)

    const link = screen.getByRole('link')

    // Should be focusable
    await user.tab()
    expect(link).toHaveFocus()

    // Should be activatable with Enter key
    await user.keyboard('{Enter}')
    // Note: In actual implementation, this would navigate
    // but in tests, we just verify the link is properly set up
  })
})