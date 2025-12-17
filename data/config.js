// 앱 설정 (config)
export const config = {
  // ==========================================
  // 필드 정의 (편집기 & 렌더러 공용)
  // ==========================================
  fieldDefinitions: {
    // 공통 정보 필드 (common 객체)
    common: [
      { key: 'birthday', type: 'text', label: '생일' },
      { key: 'birthFlower', type: 'text', label: '탄생화' },
      { key: 'birthTree', type: 'text', label: '탄생목' },
      { key: 'birthStone', type: 'text', label: '탄생석' },
      { key: 'birthColor', type: 'color', label: '탄생색' },
      { 
        key: 'wand', 
        type: 'group', 
        label: '지팡이', 
        fields: [
          { key: 'wood', label: '목재' },
          { key: 'core', label: '심' },
          { key: 'length', label: '길이' },
          { key: 'flexibility', label: '유연성' }
        ]
      },
      { key: 'bloodStatus', type: 'text', label: '혈통' },
      { key: 'moehua', type: 'text', label: '모에화' }
    ],

    // 프로필별 필드
    profile: {
      // 기본 스탯
      basic: [
        { key: 'age', type: 'text', label: '나이' },
        { key: 'height', type: 'text', label: '키' },
        { key: 'weight', type: 'text', label: '체중' },
        { key: 'house', type: 'text', label: '소속' },
        { key: 'nationality', type: 'text', label: '국적' }
      ],
      // 추가 정보 (세계관별)
      magic: [
        { key: 'moodSong', type: 'song', label: '무드곡' }
      ]
    },

    // 정보 카드 구성 (대시보드 표시용)
    infoCards: [
      {
        id: 'basicInfo',
        title: 'BASIC INFO',
        rows: [
          { label: '키 / 체중', template: '{profile.basic.height} / {profile.basic.weight}' },
          { label: '소속', template: '{profile.basic.house}', fallback: '{profile.basic.faction}' },
          { label: '국적', template: '{profile.basic.nationality}' },
          { label: '혈통', template: '{common.bloodStatus}' }
        ]
      },
      {
        id: 'birthInfo',
        title: 'BIRTH INFO',
        rows: [
          { label: '생일', template: '{common.birthday}' },
          { label: '탄생화 / 탄생목', template: '{common.birthFlower} / {common.birthTree}' },
          { label: '탄생석', template: '{common.birthStone}' },
          { label: '탄생색', template: '{common.birthColor.name}', color: '{common.birthColor.hex}' }
        ]
      },
      {
        id: 'magicInfo',
        title: 'MAGIC INFO',
        rows: [
          { label: '지팡이', template: '{common.wand.wood} / {common.wand.core}' },
          { label: '길이 / 유연성', template: '{common.wand.length} / {common.wand.flexibility}' },
          { label: '테마색', template: '{profile.themeColor}', color: '{profile.themeColor}' },
          { label: '무드곡', template: '{profile.magic.moodSong}', type: 'song' }
        ]
      }
    ]
  },

  // ==========================================
  // 테마 설정 (색상)
  // ==========================================
  theme: {
    colors: {
      background: "#0a0a0c",
      secondary: "#111114",
      tertiary: "#1a1a1e",
      text: "#e8e6e3",
      highlight: "#B2B0E8",
      border: "rgba(255, 255, 255, 0.04)"
    }
  },

  features: {
    showAgeTabs: true,
    snowEffect: false
  },

  // ==========================================
  // 기존 설정 유지
  // ==========================================
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

  defaults: {
    age: 11,
    section: 'dashboard'
  },

  components: {
    dashboard: 'components/dashboard.html',
    playlist: 'components/playlist.html',
    motif: 'components/motif.html',
    guide: 'components/about.html'
  },

  timing: {
    bgMusicInitDelay: 1000,
    iconRenderDelay: 50,
    videoLoadDelay: 100,
    bgMusicSwitchDelay: 500
  },

  api: {
    youtubeIframe: 'https://www.youtube.com/iframe_api',
    youtubeThumbnail: (videoId) => `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    uiAvatars: (name, bg = '333', color = 'fff') =>
      `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${bg}&color=${color}`
  },

  bgMusicSections: ['dashboard'],
  keepBgMusicSections: ['motif', 'guide']
};
