import { render } from '@testing-library/react'
import { MotionDiv, MotionSpan, MotionH2, MotionH3, MotionP, MotionButton } from '@/lib/motion'

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: 'div',
    span: 'span',
    h2: 'h2',
    h3: 'h3',
    p: 'p',
    button: 'button',
  },
}))

describe('Motion Components', () => {
  it('should render MotionDiv', () => {
    const { container } = render(
      <MotionDiv data-testid="motion-div">Test Content</MotionDiv>
    )
    
    expect(container.querySelector('[data-testid="motion-div"]')).toBeInTheDocument()
  })

  it('should render MotionSpan', () => {
    const { container } = render(
      <MotionSpan data-testid="motion-span">Test Content</MotionSpan>
    )
    
    expect(container.querySelector('[data-testid="motion-span"]')).toBeInTheDocument()
  })

  it('should render MotionH2', () => {
    const { container } = render(
      <MotionH2 data-testid="motion-h2">Test Content</MotionH2>
    )
    
    expect(container.querySelector('[data-testid="motion-h2"]')).toBeInTheDocument()
  })

  it('should render MotionH3', () => {
    const { container } = render(
      <MotionH3 data-testid="motion-h3">Test Content</MotionH3>
    )
    
    expect(container.querySelector('[data-testid="motion-h3"]')).toBeInTheDocument()
  })

  it('should render MotionP', () => {
    const { container } = render(
      <MotionP data-testid="motion-p">Test Content</MotionP>
    )
    
    expect(container.querySelector('[data-testid="motion-p"]')).toBeInTheDocument()
  })

  it('should render MotionButton', () => {
    const { container } = render(
      <MotionButton data-testid="motion-button">Test Content</MotionButton>
    )
    
    expect(container.querySelector('[data-testid="motion-button"]')).toBeInTheDocument()
  })

  it('should pass through props correctly', () => {
    const { container } = render(
      <MotionDiv 
        data-testid="motion-div-with-props"
        className="test-class"
        id="test-id"
      >
        Test Content
      </MotionDiv>
    )
    
    const element = container.querySelector('[data-testid="motion-div-with-props"]')
    expect(element).toHaveClass('test-class')
    expect(element).toHaveAttribute('id', 'test-id')
  })

  it('should handle button props correctly', () => {
    const handleClick = jest.fn()
    const { container } = render(
      <MotionButton 
        data-testid="motion-button-with-props"
        onClick={handleClick}
        disabled={true}
        type="submit"
      >
        Click Me
      </MotionButton>
    )
    
    const button = container.querySelector('[data-testid="motion-button-with-props"]')
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('type', 'submit')
  })
})