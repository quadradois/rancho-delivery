import { describe, it, expect, vi, beforeEach } from 'vitest';
import { geocodificarReverso } from '../../../agentes/tools/geocoder';
import axios from 'axios';

vi.mock('axios');

describe('geocodificarReverso', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retorna endereço formatado com dados do Nominatim', async () => {
    vi.mocked(axios.get).mockResolvedValue({
      data: {
        address: {
          road: 'Rua das Flores',
          house_number: '123',
          suburb: 'Setor Bueno',
          city: 'Goiânia',
          state: 'Goiás',
          postcode: '74230-010',
        },
        display_name: 'Rua das Flores, 123, Setor Bueno, Goiânia',
      },
    });

    const r = await geocodificarReverso(-16.6869, -49.2648);

    expect(r).not.toBeNull();
    expect(r!.bairro).toBe('Setor Bueno');
    expect(r!.cep).toBe('74230010');
    expect(r!.enderecoFormatado).toContain('Rua das Flores');
    expect(r!.enderecoFormatado).toContain('Setor Bueno');
  });

  it('retorna null quando Nominatim falha', async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error('timeout'));

    const r = await geocodificarReverso(-16.6869, -49.2648);
    expect(r).toBeNull();
  });

  it('retorna null quando address está vazio', async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: {} });

    const r = await geocodificarReverso(-16.6869, -49.2648);
    expect(r).toBeNull();
  });
});
