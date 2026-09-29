import './Avatar.css';

const GRADIENTS = [
  ['#FF8A65', '#FF5270'],
  ['#4FC3F7', '#3D7BFF'],
  ['#81C784', '#26A69A'],
  ['#BA68C8', '#7E57C2'],
  ['#FFD54F', '#FFA726'],
  ['#64B5F6', '#9B4DFF'],
  ['#F06292', '#AB47BC'],
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function initials(name: string) {
  const letters = name
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('');
  return letters.toUpperCase() || '#';
}

export function Avatar({ name, seed, size = 48 }: { name: string; seed: string; size?: number }) {
  const [a, b] = GRADIENTS[hash(seed) % GRADIENTS.length];
  return (
    <div
      className="avatar"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: `linear-gradient(135deg, ${a}, ${b})`,
      }}
      aria-hidden
    >
      {initials(name)}
    </div>
  );
}
