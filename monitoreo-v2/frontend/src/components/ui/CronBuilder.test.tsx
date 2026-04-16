import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CronBuilder } from './CronBuilder';

describe('CronBuilder', () => {
  it('renders preset buttons', () => {
    render(<CronBuilder value="" onChange={() => {}} />);
    expect(screen.getByText('Cada hora')).toBeInTheDocument();
    expect(screen.getByText('Diario 8:00')).toBeInTheDocument();
    expect(screen.getByText('Semanal lunes')).toBeInTheDocument();
    expect(screen.getByText('Mensual dia 1')).toBeInTheDocument();
  });

  it('calls onChange with preset value on click', async () => {
    const onChange = vi.fn();
    render(<CronBuilder value="" onChange={onChange} />);
    await userEvent.click(screen.getByText('Cada hora'));
    expect(onChange).toHaveBeenCalledWith('0 * * * *');
  });

  it('calls onChange for daily preset', async () => {
    const onChange = vi.fn();
    render(<CronBuilder value="" onChange={onChange} />);
    await userEvent.click(screen.getByText('Diario 8:00'));
    expect(onChange).toHaveBeenCalledWith('0 8 * * *');
  });

  it('calls onChange for weekly preset', async () => {
    const onChange = vi.fn();
    render(<CronBuilder value="" onChange={onChange} />);
    await userEvent.click(screen.getByText('Semanal lunes'));
    expect(onChange).toHaveBeenCalledWith('0 8 * * 1');
  });

  it('calls onChange for monthly preset', async () => {
    const onChange = vi.fn();
    render(<CronBuilder value="" onChange={onChange} />);
    await userEvent.click(screen.getByText('Mensual dia 1'));
    expect(onChange).toHaveBeenCalledWith('0 8 1 * *');
  });

  it('shows description for hourly cron', () => {
    render(<CronBuilder value="0 * * * *" onChange={() => {}} />);
    expect(screen.getByText('Cada hora, al minuto 0')).toBeInTheDocument();
  });

  it('shows description for daily cron', () => {
    render(<CronBuilder value="0 8 * * *" onChange={() => {}} />);
    expect(screen.getByText('Todos los dias a las 08:00')).toBeInTheDocument();
  });

  it('shows description for weekly cron', () => {
    render(<CronBuilder value="0 8 * * 1" onChange={() => {}} />);
    expect(screen.getByText('Cada lunes a las 08:00')).toBeInTheDocument();
  });

  it('shows description for monthly cron', () => {
    render(<CronBuilder value="0 8 1 * *" onChange={() => {}} />);
    expect(screen.getByText('El dia 1 de cada mes a las 08:00')).toBeInTheDocument();
  });

  it('shows description for custom every-5-minutes cron', () => {
    render(<CronBuilder value="*/5 * * * *" onChange={() => {}} />);
    expect(screen.getByText('cada 5 minutos')).toBeInTheDocument();
  });

  it('shows description for custom time + day', () => {
    render(<CronBuilder value="30 14 * * 5" onChange={() => {}} />);
    expect(screen.getByText(/14:30.*viernes/)).toBeInTheDocument();
  });

  it('shows invalid message for bad cron', () => {
    render(<CronBuilder value="bad" onChange={() => {}} />);
    expect(screen.getByText('Expresion cron invalida')).toBeInTheDocument();
  });

  it('renders custom input that updates on change', async () => {
    const onChange = vi.fn();
    render(<CronBuilder value="0 * * * *" onChange={onChange} />);
    const input = screen.getByDisplayValue('0 * * * *');
    await userEvent.clear(input);
    await userEvent.type(input, '*/10 * * * *');
    expect(onChange).toHaveBeenCalled();
  });

  it('highlights active preset button', () => {
    render(<CronBuilder value="0 * * * *" onChange={() => {}} />);
    const btn = screen.getByText('Cada hora');
    expect(btn.className).toContain('bg-[var(--color-primary');
  });
});
