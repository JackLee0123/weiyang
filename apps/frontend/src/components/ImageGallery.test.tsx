import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
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

  it('does not open the surrounding item when clicking a thumbnail or the backdrop', () => {
    const onParentClick = vi.fn()
    render(
      <div onClick={onParentClick}>
        <ImageGallery images={['u1', 'u2']} />
      </div>,
    )

    fireEvent.click(screen.getAllByRole('button', { name: /查看图片/ })[0])
    expect(onParentClick).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('presentation'))
    expect(screen.queryByAltText('图片预览')).not.toBeInTheDocument()
    expect(onParentClick).not.toHaveBeenCalled()
  })
})
