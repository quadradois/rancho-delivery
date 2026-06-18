import { ImageResponse } from 'next/og';

// Convenção do App Router: este arquivo vira a og:image das páginas sob /marketing.
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'FoodFlow — sistema de delivery com IA';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background: 'linear-gradient(135deg, #1a1410 0%, #2a1d12 100%)',
          color: '#ffffff',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', fontSize: 120, fontWeight: 800, color: '#f97316' }}>
          FoodFlow
        </div>
        <div style={{ display: 'flex', fontSize: 44, marginTop: 24, lineHeight: 1.3 }}>
          O sistema de delivery com IA que vende por você
        </div>
        <div style={{ display: 'flex', fontSize: 30, marginTop: 28, color: '#d6c9bd' }}>
          Cardápio, pedidos e entregas num lugar só — com a AURA.
        </div>
      </div>
    ),
    { ...size },
  );
}
