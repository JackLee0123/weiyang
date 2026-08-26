import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FeedbackForm } from './FeedbackForm'

describe('FeedbackForm', () => {
  it('renders text, contact and submit controls', () => {
    render(<FeedbackForm />)
    expect(screen.getByText('问题反馈')).toBeInTheDocument()
    expect(screen.getByLabelText('反馈内容')).toBeInTheDocument()
    expect(screen.getByLabelText('联系方式（选填）')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '提交反馈' })).toBeInTheDocument()
  })

  it('warns when submitting empty content', () => {
    render(<FeedbackForm />)
    fireEvent.click(screen.getByRole('button', { name: '提交反馈' }))
    expect(screen.getByText('请填写反馈内容')).toBeInTheDocument()
  })
})
