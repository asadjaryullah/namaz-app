'use client';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  return (
    <main style={{ textAlign: 'center' }}>
      <div style={{ marginBottom: 32 }}>
        <Image
          src="/way2bashier.png"   // liegt in /public
          alt="Namaz Taxi Logo"
          width={220}
          height={220}
          priority
          style={{ objectFit: 'contain' }}
        />
        <h1>Namaz Taxi</h1>
        <p style={{ color: '#444', marginTop: -8 }}>
          Zur Moschee – gemeinsam & pünktlich zum Gebet.
        </p>
      </div>

      <button
        onClick={() => router.push('/select-prayer')}
        style={{ padding: '14px 28px', borderRadius: 14 }}
      >
        Beginnen ➜
      </button>

      <div style={{ marginTop: 14 }}>
        <a
          onClick={() => router.push('/login')}
          style={{ color: '#0a58ca', textDecoration: 'underline', cursor: 'pointer' }}
        >
          oder anmelden
        </a>
      </div>
    </main>
  );
}