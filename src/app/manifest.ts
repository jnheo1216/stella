import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Stella - 실시간 별자리 뷰어',
    short_name: 'Stella',
    description: '현재 위치의 밤하늘 별자리를 모바일 센서/드래그로 탐색하는 인터랙티브 3D 뷰어',
    start_url: '/',
    display: 'standalone',
    background_color: '#02040a',
    theme_color: '#071425',
    lang: 'ko-KR',
    categories: ['education', 'utilities'],
    icons: [
      {
        src: '/favicon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any'
      }
    ]
  };
}
