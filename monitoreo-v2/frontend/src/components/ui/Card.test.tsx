import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Card } from './Card';

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Hello Card</Card>);
    expect(screen.getByText('Hello Card')).toBeInTheDocument();
  });

  it('renders title when provided', () => {
    render(<Card title="My Title">Content</Card>);
    expect(screen.getByText('My Title')).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    render(<Card subtitle="Sub text">Content</Card>);
    expect(screen.getByText('Sub text')).toBeInTheDocument();
  });

  it('renders action slot', () => {
    render(
      <Card action={<button>Action</button>}>Content</Card>,
    );
    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
  });

  it('applies default variant (shadow-sm + ring)', () => {
    const { container } = render(<Card>Content</Card>);
    expect(container.firstElementChild!.className).toContain('shadow-sm');
    expect(container.firstElementChild!.className).toContain('ring-1');
  });

  it('applies outlined variant', () => {
    const { container } = render(<Card variant="outlined">Content</Card>);
    expect(container.firstElementChild!.className).toContain('border');
  });

  it('applies elevated variant', () => {
    const { container } = render(<Card variant="elevated">Content</Card>);
    expect(container.firstElementChild!.className).toContain('shadow-md');
  });

  it('adds cursor-pointer when onClick is set', async () => {
    const onClick = vi.fn();
    const { container } = render(<Card onClick={onClick}>Click me</Card>);
    expect(container.firstElementChild!.className).toContain('cursor-pointer');
    await userEvent.click(container.firstElementChild!);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('removes padding when noPadding is true', () => {
    const { container } = render(<Card noPadding>Content</Card>);
    const contentDiv = container.querySelector('.p-4');
    expect(contentDiv).toBeNull();
  });
});
