import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ImageUpload } from './ImageUpload'
import { fileToDataUri } from '../lib/image'

vi.mock('../lib/image', () => ({
  fileToDataUri: vi.fn(),
  MAX_IMAGES: 3,
  MAX_IMAGE_BYTES: 8 * 1024 * 1024,
  MAX_CLIENT_DIMENSION: 1600,
}))

describe('ImageUpload', () => {
  it('adds an image and calls onChange with the data uri', async () => {
    vi.mocked(fileToDataUri).mockResolvedValue('data:image/jpeg;base64,abc')
    const onChange = vi.fn()
    const { container } = render(<ImageUpload images={[]} onChange={onChange} />)

    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['x'], 'photo.png', { type: 'image/png' })
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => expect(onChange).toHaveBeenCalledWith(['data:image/jpeg;base64,abc']))
  })

  it('hides the add button once three images are present', () => {
    const { queryByRole } = render(<ImageUpload images={['a', 'b', 'c']} onChange={() => {}} />)
    expect(queryByRole('button', { name: '添加图片' })).not.toBeInTheDocument()
  })

  it('removes an image and calls onChange', () => {
    const onChange = vi.fn()
    render(<ImageUpload images={['a', 'b']} onChange={onChange} />)
    fireEvent.click(screen.getAllByRole('button', { name: '移除图片' })[0])
    expect(onChange).toHaveBeenCalledWith(['b'])
  })
})
