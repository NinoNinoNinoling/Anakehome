// 앱 설정 (config)
export const config = {
  // 플레이어 설정
  player: {
    width: 360,
    height: 203,
    defaultVolume: 20, // 배경 음악 볼륨 (%)
    playerVars: {
      playsinline: 1,
      controls: 0,
      disablekb: 1,
      fs: 0,
      rel: 0,
      autoplay: 0
    }
  },

  // 기본값
  defaults: {
    age: 11, // 기본 선택 나이
    section: 'dashboard' // 기본 섹션
  },

  // 컴포넌트 경로
  components: {
    dashboard: 'components/dashboard.html',
    playlist: 'components/playlist.html',
    motif: 'components/motif.html',
    guide: 'components/about.html'
  },

  // 타이밍 설정 (ms)
  timing: {
    bgMusicInitDelay: 1000, // 배경 음악 초기화 지연
    iconRenderDelay: 50,    // 아이콘 재렌더링 지연
    videoLoadDelay: 100,    // 비디오 로드 후 재생 지연
    bgMusicSwitchDelay: 500 // 배경 음악 전환 지연
  },

  // 외부 API
  api: {
    youtubeIframe: 'https://www.youtube.com/iframe_api',
    youtubeThumbnail: (videoId) => `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    uiAvatars: (name, bg = '333', color = 'fff') =>
      `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${bg}&color=${color}`
  },

  // 배경 음악이 재생되는 섹션 (자체 배경 음악 시작)
  bgMusicSections: ['dashboard'],

  // 기존 배경 음악을 유지하는 섹션
  keepBgMusicSections: ['motif', 'guide']
};
