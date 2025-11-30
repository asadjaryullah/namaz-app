import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Namaz Taxi',
    short_name: 'NamazTaxi',
    description: 'Gemeinsam zur Bashir Moschee',
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