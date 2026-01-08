import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Ride 2 Salah - Bashier Moschee',
    short_name: 'Ride2Salah',
    description: 'Gemeinsam zur Bashier Moschee',
    start_url: '/',
    display: 'standalone', // Das entfernt die Browser-Leisten!
    background_color: '#f8fafc',
    theme_color: '#0f172a',
    icons: [
      {
        src: '/icon.png',
        sizes: 'any',
        type: 'image/png',
      },
    ],
  }
}