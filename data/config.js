// 앱 설정 (config)
export const config = {
  // ==========================================
  // [NEW] 테마 및 기능 설정 (여기서 색상을 바꿉니다)
  // ==========================================
  theme: {
    colors: {
      background: "#0a0a0c",       // 메인 배경색 (--bg-color)
      secondary: "#111114",        // 보조 배경색 (--bg-secondary)
      tertiary: "#1a1a1e",         // 카드/팝업 배경색 (--bg-tertiary)
      text: "#e8e6e3",             // 기본 글자색 (--text-color)
      highlight: "#B2B0E8",        // 강조 색상 (--highlight-color) ★ 중요!
      border: "rgba(255, 255, 255, 0.04)" // 테두리 색상 (--border-color)
    }
  },

  features: {
    showAgeTabs: true,    // 나이 탭 표시 여부
    snowEffect: false     // (추후 확장용) 눈 내리는 효과
  },

  // ==========================================
  // 기존 설정 유지
  // ==========================================
  
  // 플레이어 설정
  player: {
    width: 360,
    height: 203,
    defaultVolume: 20,
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
    age: 11,
    section: 'dashboard'
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
    bgMusicInitDelay: 1000,
    iconRenderDelay: 50,
    videoLoadDelay: 100,
    bgMusicSwitchDelay: 500
  },

  // 외부 API
  api: {
    youtubeIframe: 'https://www.youtube.com/iframe_api',
    youtubeThumbnail: (videoId) => `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    uiAvatars: (name, bg = '333', color = 'fff') =>
      `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${bg}&color=${color}`
  },

  // 배경 음악이 재생되는 섹션
  bgMusicSections: ['dashboard'],

  // 기존 배경 음악을 유지하는 섹션
  keepBgMusicSections: ['motif', 'guide']
};
