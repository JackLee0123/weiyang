import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ImageGallery } from './ImageGallery'

describe('ImageGallery', () => {
  it('renders thumbnails and opens the lightbox', () => {
    render(<ImageGallery images={['u1', 'u2', 'u3']} />)
    const thumbs = screen.getAllByRole('button', { name: /查看图片/ })
    expect(thumbs).toHaveLength(3)

    fireEvent.click(thumbs[0])
    expect(screen.getByAltText('图片预览')).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByAltText('图片预览')).not.toBeInTheDocument()
  })

  it('renders nothing without images', () => {
    const { container } = render(<ImageGallery images={[]} />)
    expect(container.innerHTML).toBe('')
  })
})
