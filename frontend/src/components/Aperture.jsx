export default function Aperture({ size = 30, speed = '9s', filled = true }) {
  const ringThickness = size >= 60 ? 2 : 2;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <div
        style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          border: `${ringThickness}px solid #26262E`
        }}
      />
      <div
        style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          border: `${ringThickness}px solid transparent`,
          borderTopColor: '#E91E8C', borderRightColor: '#E91E8C',
          animation: `cc-spin ${speed} linear infinite`
        }}
      />
      {filled && (
        <div
          style={{
            position: 'absolute', inset: size * 0.35, borderRadius: '50%',
            background: '#E91E8C'
          }}
        />
      )}
    </div>
  );
}