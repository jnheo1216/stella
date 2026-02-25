import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Stella | 실시간 별자리 뷰어',
    template: '%s | Stella'
  },
  description: '모바일 센서와 드래그 제스처로 현재 위치의 밤하늘 별자리를 실시간으로 탐색하는 3D 별자리 뷰어',
  applicationName: 'Stella',
  keywords: ['Stella', '별자리', '천체', 'night sky', 'constellation', 'star map', '3D viewer'],
  authors: [{ name: 'Stella Team' }],
  creator: 'Stella Team',
  publisher: 'Stella Team',
  formatDetection: {
    telephone: false,
    email: false,
    address: false
  },
  alternates: {
    canonical: '/'
  },
  openGraph: {
    title: 'Stella | 실시간 별자리 뷰어',
    description: '센서와 드래그만으로 지금 이 순간의 밤하늘 별자리를 부드럽게 탐색하세요.',
    type: 'website',
    siteName: 'Stella',
    locale: 'ko_KR'
  },
  twitter: {
    card: 'summary',
    title: 'Stella | 실시간 별자리 뷰어',
    description: '모바일 센서와 데스크톱 드래그를 지원하는 실시간 3D 별자리 탐색기'
  },
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    shortcut: ['/favicon.svg']
  },
  manifest: '/manifest.webmanifest',
  category: 'education'
};

export const viewport: Viewport = {
  themeColor: '#071425',
  colorScheme: 'dark'
};

export default function RootLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
