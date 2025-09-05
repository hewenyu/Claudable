/**
 * Tests for useProject hook
 */
import { renderHook, waitFor } from '@testing-library/react'
import { useProject } from '@/hooks/useProject'

// Mock fetch globally
const mockFetch = jest.fn()
global.fetch = mockFetch

describe('useProject', () => {
  const mockProjectId = 'test-project-123'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('initializes with correct default state', () => {
    const { result } = renderHook(() => useProject({ projectId: mockProjectId }))

    expect(result.current.project).toBeNull()
    expect(result.current.settings).toBeNull()
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('loads project and settings on mount', async () => {
    const mockProject = {
      id: mockProjectId,
      name: 'Test Project',
      description: 'A test project',
      status: 'active',
    }

    const mockSettings = {
      preferred_cli: 'claude',
      fallback_enabled: true,
    }

    // Mock both API calls
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockProject),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSettings),
      })

    const { result } = renderHook(() => useProject({ projectId: mockProjectId }))

    await waitFor(() => {
      expect(result.current.project).toEqual(mockProject)
      expect(result.current.settings).toEqual(mockSettings)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    expect(mockFetch).toHaveBeenCalledWith(`/api/projects/${mockProjectId}`)
    expect(mockFetch).toHaveBeenCalledWith(`/api/chat/${mockProjectId}/cli-preference`)
  })

  it('handles project load error', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
      })

    const { result } = renderHook(() => useProject({ projectId: mockProjectId }))

    await waitFor(() => {
      expect(result.current.project).toBeNull()
      expect(result.current.error).toBe('Failed to load project')
      expect(result.current.isLoading).toBe(false)
    })
  })

  it('updates CLI preference successfully', async () => {
    const mockResponse = {
      preferred_cli: 'cursor',
      fallback_enabled: false,
    }

    // Mock initial loads and then the update
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ preferred_cli: 'claude', fallback_enabled: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

    const { result } = renderHook(() => useProject({ projectId: mockProjectId }))

    // Wait for initial loads
    await waitFor(() => {
      expect(result.current.settings).toBeTruthy()
    })

    // Test the update
    const updateResult = await result.current.updateCLIPreference('cursor', false)

    expect(updateResult).toEqual(mockResponse)
    expect(mockFetch).toHaveBeenLastCalledWith(
      `/api/chat/${mockProjectId}/cli-preference`,
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferred_cli: 'cursor',
          fallback_enabled: false,
        }),
      })
    )
  })

  it('starts preview successfully', async () => {
    const mockPreviewResponse = {
      url: 'http://localhost:3001',
      port: 3001,
    }

    // Mock initial loads and then the preview start
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: mockProjectId, name: 'Test', status: 'idle' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPreviewResponse),
      })

    const { result } = renderHook(() => useProject({ projectId: mockProjectId }))

    // Wait for initial loads
    await waitFor(() => {
      expect(result.current.project).toBeTruthy()
    })

    // Test preview start
    const previewResult = await result.current.startPreview(3001)

    expect(previewResult).toEqual(mockPreviewResponse)
    expect(mockFetch).toHaveBeenLastCalledWith(
      `/api/projects/${mockProjectId}/preview/start`,
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port: 3001 }),
      })
    )
  })

  it('stops preview successfully', async () => {
    // Mock initial loads and then the preview stop
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ 
          id: mockProjectId, 
          name: 'Test', 
          status: 'preview_running',
          preview_url: 'http://localhost:3001'
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      })
      .mockResolvedValueOnce({
        ok: true,
      })

    const { result } = renderHook(() => useProject({ projectId: mockProjectId }))

    // Wait for initial loads
    await waitFor(() => {
      expect(result.current.project?.status).toBe('preview_running')
    })

    // Test preview stop
    await result.current.stopPreview()

    expect(mockFetch).toHaveBeenLastCalledWith(
      `/api/projects/${mockProjectId}/preview/stop`,
      expect.objectContaining({
        method: 'POST',
      })
    )

    // Verify project status was updated
    await waitFor(() => {
      expect(result.current.project?.status).toBe('idle')
    })
  })

  it('gets preview status', async () => {
    const mockStatus = {
      running: true,
      port: 3001,
      url: 'http://localhost:3001',
    }

    // Mock initial loads and then the status check
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStatus),
      })

    const { result } = renderHook(() => useProject({ projectId: mockProjectId }))

    // Wait for initial loads
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    const status = await result.current.getPreviewStatus()

    expect(status).toEqual(mockStatus)
    expect(mockFetch).toHaveBeenLastCalledWith(`/api/projects/${mockProjectId}/preview/status`)
  })

  it('handles CLI preference update error', async () => {
    // Mock initial loads and then a failed update
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

    const { result } = renderHook(() => useProject({ projectId: mockProjectId }))

    // Wait for initial loads
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Test failed update
    await expect(result.current.updateCLIPreference('cursor', false)).rejects.toThrow()
  })

  it('reloads data when projectId changes', () => {
    const { rerender } = renderHook(
      ({ projectId }) => useProject({ projectId }),
      {
        initialProps: { projectId: 'project-1' },
      }
    )

    // Mock responses for both project IDs
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    })

    // Change projectId
    rerender({ projectId: 'project-2' })

    // Should trigger new API calls for the new project
    expect(mockFetch).toHaveBeenCalledWith('/api/projects/project-2')
  })
})