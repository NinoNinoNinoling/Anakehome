// ============================================================
// 앱 초기화 & 이벤트 핸들러
// ============================================================

import { playlistData } from '../data/playlist.js';
import { config } from '../data/config.js';
import { state, getDOM, refreshDOM } from './store.js';
import { showLoading, debounce, renderIcons, safeFetch, showError } from './utils.js';
import { renderPlaylist, updateSearchResultCount, renderCharacterProfile, renderOwnerProfile, renderMotifPage } from './renderer.js';
import { 
    loadYouTubeAPI, 
    setupYouTubeReady, 
    togglePlay, 
    playNext, 
    playPrev, 
    playShuffle, 
    toggleRepeat, 
    seekTo,
    setVolume,
    toggleMute,
    updateVolumeUI,
    playBackgroundMusic,
    stopAllBackgroundMusic,
    updateDashboardBgMusic
} from './player.js';

// ============================================================
// 컴포넌트 로더
// ============================================================

async function loadComponent(sectionId, componentPath) {
    showLoading(sectionId, '컴포넌트 로딩 중...');
    
    const response = await safeFetch(componentPath);
    
    if (response) {
        try {
            const html = await response.text();
            document.getElementById(sectionId).innerHTML = html;
        } catch (error) {
            console.error(`Failed to parse ${componentPath}:`, error);
            showComponentError(sectionId);
        }
    } else {
        showComponentError(sectionId);
    }
}

function showComponentError(sectionId) {
    document.getElementById(sectionId).innerHTML = `
        <div class="load-error">
            <i data-lucide="alert-triangle" size="32"></i>
            <p>컴포넌트 로드 실패</p>
            <button onclick="location.reload()">새로고침</button>
        </div>
    `;
    renderIcons();
}

async function loadAllComponents() {
    await Promise.all([
        loadComponent('section-dashboard', config.components.dashboard),
        loadComponent('section-playlist', config.components.playlist),
        loadComponent('section-motif', config.components.motif),
        loadComponent('section-guide', config.components.guide)
    ]);

    // DOM 캐시 갱신
    refreshDOM();
    renderIcons();
}

// ============================================================
// 섹션 전환
// ============================================================

function switchSection(sectionName) {
    const currentSection = document.querySelector('.content-section.active');
    const targetSection = document.getElementById(`section-${sectionName}`);
    
    if (!targetSection || currentSection === targetSection) return;
    
    // 메뉴 아이템 업데이트
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    const targetMenuItem = document.querySelector(`.menu-item[data-section="${sectionName}"]`);
    if (targetMenuItem) {
        targetMenuItem.classList.add('active');
    }
    
    // 애니메이션 적용
    if (currentSection) {
        currentSection.classList.add('section-exit');
        
        setTimeout(() => {
            currentSection.classList.remove('active', 'section-exit');
            targetSection.classList.add('active', 'section-enter');
            
            setTimeout(() => {
                targetSection.classList.remove('section-enter');
            }, 300);
        }, 150);
    } else {
        targetSection.classList.add('active');
    }

    // 배경 음악 처리
    if (config.bgMusicSections.includes(sectionName)) {
        playBackgroundMusic(sectionName);
    } else if (config.keepBgMusicSections?.includes(sectionName)) {
        // 유지
    } else {
        stopAllBackgroundMusic();
    }

    renderIcons();
}

// ============================================================
// 플레이리스트 검색
// ============================================================

function filterPlaylist(query) {
    state.searchQuery = query.toLowerCase().trim();
    
    if (!state.searchQuery) {
        state.filteredPlaylist = [...playlistData];
    } else {
        state.filteredPlaylist = playlistData.filter(song => {
            const title = (song.title || '').toLowerCase();
            const artist = (song.artist || '').toLowerCase();
            const hashtags = (song.hashtags || []).join(' ').toLowerCase();
            return title.includes(state.searchQuery) || 
                   artist.includes(state.searchQuery) || 
                   hashtags.includes(state.searchQuery);
        });
    }
    
    renderPlaylist();
    updateSearchResultCount();
}

function setupPlaylistSearch() {
    const dom = getDOM();
    const searchInput = dom.playlist.search;
    if (!searchInput) return;
    
    const debouncedFilter = debounce((e) => filterPlaylist(e.target.value), 300);
    searchInput.addEventListener('input', debouncedFilter);
    
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            searchInput.value = '';
            filterPlaylist('');
            searchInput.blur();
        }
    });
}

// ============================================================
// 볼륨 컨트롤
// ============================================================

function setupVolumeControl() {
    const dom = getDOM();
    const slider = dom.controls.volumeSlider;
    const muteBtn = dom.controls.volume;
    
    if (slider) {
        slider.value = state.volume;
        
        slider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value, 10);
            if (state.isMuted && value > 0) {
                state.isMuted = false;
            }
            setVolume(value);
        });
    }
    
    if (muteBtn) {
        muteBtn.addEventListener('click', toggleMute);
    }
    
    updateVolumeUI();
}

// ============================================================
// 가사 토글
// ============================================================

function setupLyricsToggle() {
    const lyricsSection = document.querySelector('.zone-lyrics');
    const lyricsTitle = document.querySelector('.lyrics-title');
    
    if (!lyricsSection || !lyricsTitle) return;
    
    lyricsTitle.innerHTML = `
        <span>Lyrics / Info</span>
        <button class="lyrics-toggle-btn" id="btn-lyrics-toggle">
            <i data-lucide="chevron-down" size="16"></i>
        </button>
    `;
    
    const toggleBtn = document.getElementById('btn-lyrics-toggle');
    let isCollapsed = false;
    
    toggleBtn.addEventListener('click', () => {
        isCollapsed = !isCollapsed;
        lyricsSection.classList.toggle('collapsed', isCollapsed);
        toggleBtn.innerHTML = `<i data-lucide="${isCollapsed ? 'chevron-up' : 'chevron-down'}" size="16"></i>`;
        renderIcons();
    });
    
    renderIcons();
}

// ============================================================
// 나이 탭
// ============================================================

function setupAgeTabListeners() {
    const dom = getDOM();
    const ageTabs = dom.character.ageTabs();
    
    ageTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const selectedAge = parseInt(tab.getAttribute('data-age'));
            if (selectedAge === state.currentAge) return;
            
            state.currentAge = selectedAge;

            ageTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const profileContainer = dom.character.profile();
            if (profileContainer) {
                profileContainer.classList.add('switching');
                profileContainer.setAttribute('data-age', selectedAge);
                
                setTimeout(() => {
                    renderCharacterProfile(selectedAge);
                    profileContainer.classList.remove('switching');
                }, 150);
            } else {
                renderCharacterProfile(selectedAge);
            }

            updateDashboardBgMusic(selectedAge);
        });
    });
}

// ============================================================
// 키보드 단축키
// ============================================================

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        
        switch(e.key) {
            case ' ':
                e.preventDefault();
                togglePlay();
                break;
            case 'ArrowRight':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    playNext();
                }
                break;
            case 'ArrowLeft':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    playPrev();
                }
                break;
            case 'm':
            case 'M':
                toggleMute();
                break;
            case '/':
                e.preventDefault();
                const dom = getDOM();
                if (dom.playlist.search) dom.playlist.search.focus();
                break;
        }
    });
}

// ============================================================
// 플레이어 컨트롤 이벤트
// ============================================================

function setupPlayerControls() {
    const dom = getDOM();
    
    dom.controls.playPause?.addEventListener('click', togglePlay);
    dom.controls.next?.addEventListener('click', playNext);
    dom.controls.prev?.addEventListener('click', playPrev);
    dom.controls.shuffle?.addEventListener('click', playShuffle);
    dom.controls.repeat?.addEventListener('click', toggleRepeat);
    
    dom.player.progressBg?.addEventListener('click', (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        seekTo(percent);
    });
}

// ============================================================
// 메뉴 이벤트
// ============================================================

function setupMenuListeners() {
    const dom = getDOM();
    const menuItems = dom.menu.items();
    
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            const sectionName = item.getAttribute('data-section');
            switchSection(sectionName);
        });
    });
}

// ============================================================
// 초기화
// ============================================================

export async function initApp() {
    // YouTube API 로드
    loadYouTubeAPI();
    setupYouTubeReady();
    
    // 컴포넌트 로드
    await loadAllComponents();
    
    renderIcons();

    // 렌더링
    renderCharacterProfile();
    renderOwnerProfile();
    renderMotifPage();
    
    // 이벤트 설정
    setupAgeTabListeners();
    setupPlaylistSearch();
    setupVolumeControl();
    setupLyricsToggle();
    setupKeyboardShortcuts();
    setupPlayerControls();
    setupMenuListeners();
}
