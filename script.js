import { playlistData } from './data/playlist.js';
import { characterData, characterProfiles } from './data/character.js';
import { ownerData } from './data/owner.js';
import { motifData } from './data/motif.js';
import { config } from './data/config.js';

// ============================================================
// [1] 상태 변수
// ============================================================
let currentAge = config.defaults.age;
let currentSongIndex = 0;
let isPlaying = false;
let player = null;
let progressInterval = null;
let playerReady = false;
let isRepeatOne = false;
let recentPlays = [];
let filteredPlaylist = [...playlistData]; // 검색용 필터링된 목록
let searchQuery = ''; // 현재 검색어

// 백그라운드 음악 플레이어
let bgPlayers = {};
let currentBgPlayer = null;
let bgPlayersReady = {};

// ============================================================
// [2] 유틸리티 함수
// ============================================================

// 디바운스 함수
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 로딩 스피너 표시
function showLoading(targetId, message = '로딩 중...') {
    const target = document.getElementById(targetId);
    if (!target) return;
    target.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            <span>${message}</span>
        </div>
    `;
}

// 로딩 스피너 제거
function hideLoading(targetId) {
    const target = document.getElementById(targetId);
    if (!target) return;
    const spinner = target.querySelector('.loading-spinner');
    if (spinner) spinner.remove();
}

// 시간 포맷
function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' + s : s}`;
}

// YouTube ID 추출
function extractYouTubeId(url) {
    try {
        const urlObj = new URL(url);
        if (urlObj.hostname.includes('youtube.com')) return urlObj.searchParams.get('v');
        else if (urlObj.hostname.includes('youtu.be')) return urlObj.pathname.slice(1).split('?')[0];
    } catch(e) {}
    return "";
}

// ============================================================
// [3] 컴포넌트 로더
// ============================================================
async function loadComponent(sectionId, componentPath) {
    showLoading(sectionId, '컴포넌트 로딩 중...');
    try {
        const response = await fetch(componentPath);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const html = await response.text();
        document.getElementById(sectionId).innerHTML = html;
    } catch (error) {
        console.error(`Failed to load ${componentPath}:`, error);
        document.getElementById(sectionId).innerHTML = `
            <div class="load-error">
                <p>컴포넌트 로드 실패</p>
                <button onclick="location.reload()">새로고침</button>
            </div>
        `;
    }
}

async function loadAllComponents() {
    await Promise.all([
        loadComponent('section-dashboard', config.components.dashboard),
        loadComponent('section-playlist', config.components.playlist),
        loadComponent('section-motif', config.components.motif),
        loadComponent('section-guide', config.components.guide)
    ]);

    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

// ============================================================
// [4] YouTube 플레이어
// ============================================================
const tag = document.createElement('script');
tag.src = config.api.youtubeIframe;
const firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

window.onYouTubeIframeAPIReady = function() {
    if(playlistData.length > 0) {
        playlistData.forEach(item => {
            let videoId = extractYouTubeId(item.link);
            item.youtubeId = videoId;
            item.cover = videoId
                ? config.api.youtubeThumbnail(videoId)
                : config.api.uiAvatars(item.title);
        });

        player = new YT.Player('youtube-player-container', {
            height: String(config.player.height),
            width: String(config.player.width),
            videoId: playlistData[0].youtubeId,
            playerVars: config.player.playerVars,
            events: {
                'onReady': onPlayerReady,
                'onStateChange': onPlayerStateChange
            }
        });
        
        filteredPlaylist = [...playlistData];
        renderPlaylist();
        loadSongUI(0);
    }

    setTimeout(() => {
        initBackgroundPlayers();
        playBackgroundMusic(config.defaults.section);
    }, config.timing.bgMusicInitDelay);
}

function onPlayerReady(event) { playerReady = true; }

function onPlayerStateChange(event) {
    if (event.data == YT.PlayerState.PLAYING) {
        isPlaying = true;
        updatePlayButton();
        startProgressLoop();
    } else if (event.data == YT.PlayerState.PAUSED) {
        isPlaying = false;
        updatePlayButton();
        stopProgressLoop();
    } else if (event.data == YT.PlayerState.ENDED) {
        if (isRepeatOne) {
            player.seekTo(0);
            player.playVideo();
        } else {
            playNext();
        }
    }
}

// ============================================================
// [5] 플레이리스트 렌더링 & 검색
// ============================================================

// 검색 필터링
function filterPlaylist(query) {
    searchQuery = query.toLowerCase().trim();
    
    if (!searchQuery) {
        filteredPlaylist = [...playlistData];
    } else {
        filteredPlaylist = playlistData.filter(song => {
            const title = (song.title || '').toLowerCase();
            const artist = (song.artist || '').toLowerCase();
            const hashtags = (song.hashtags || []).join(' ').toLowerCase();
            return title.includes(searchQuery) || 
                   artist.includes(searchQuery) || 
                   hashtags.includes(searchQuery);
        });
    }
    
    renderPlaylist();
    updateSearchResultCount();
}

// 검색 결과 카운트 업데이트
function updateSearchResultCount() {
    const countEl = document.getElementById('search-result-count');
    if (!countEl) return;
    
    if (searchQuery) {
        countEl.textContent = `${filteredPlaylist.length}곡 검색됨`;
        countEl.style.display = 'block';
    } else {
        countEl.style.display = 'none';
    }
}

// 플레이리스트 렌더링
function renderPlaylist() {
    const container = document.getElementById('playlist-container');
    if (!container) return;
    
    if (filteredPlaylist.length === 0) {
        container.innerHTML = `
            <div class="playlist-empty">
                <p>검색 결과가 없습니다</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    filteredPlaylist.forEach((song, filteredIndex) => {
        const originalIndex = playlistData.indexOf(song);
        const isActive = originalIndex === currentSongIndex;
        const isCurrentlyPlaying = isActive && isPlaying;
        
        const div = document.createElement('div');
        div.className = `song-item ${isActive ? 'active' : ''}`;
        div.setAttribute('data-original-index', originalIndex);
        div.onclick = () => playSpecificSong(originalIndex);
        
        div.innerHTML = `
            <div class="song-playing-indicator ${isCurrentlyPlaying ? 'playing' : ''}">
                <span></span><span></span><span></span>
            </div>
            <img src="${song.cover}" alt="${song.title}" loading="lazy">
            <div class="song-info">
                <h4>${highlightSearchText(song.title)}</h4>
                <p>${highlightSearchText(song.artist || 'Unknown Artist')}</p>
            </div>
        `;
        container.appendChild(div);
    });
    
    // 현재 재생 곡으로 스크롤
    scrollToCurrentSong();
}

// 검색어 하이라이트
function highlightSearchText(text) {
    if (!searchQuery || !text) return text;
    const regex = new RegExp(`(${searchQuery})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
}

// 현재 재생 곡으로 스크롤
function scrollToCurrentSong() {
    const container = document.getElementById('playlist-container');
    const activeItem = container?.querySelector('.song-item.active');
    if (activeItem) {
        activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// 검색 입력 이벤트 설정
function setupPlaylistSearch() {
    const searchInput = document.getElementById('playlist-search');
    if (!searchInput) return;
    
    const debouncedFilter = debounce((e) => filterPlaylist(e.target.value), 300);
    searchInput.addEventListener('input', debouncedFilter);
    
    // ESC로 검색 초기화
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            searchInput.value = '';
            filterPlaylist('');
            searchInput.blur();
        }
    });
}

// ============================================================
// [6] 곡 UI 및 재생 제어
// ============================================================
function loadSongUI(index) {
    if(!playlistData[index]) return;
    const song = playlistData[index];
    
    document.getElementById('main-album-art').src = song.cover;
    const titleEl = document.getElementById('main-title');
    titleEl.innerText = song.title;
    titleEl.onclick = () => window.open(song.link, '_blank');
    document.getElementById('main-artist').innerText = song.artist || 'Unknown Artist';
    document.getElementById('player-zone').style.setProperty('--player-bg-image', `url('${song.cover}')`);
    
    const tagBox = document.getElementById('main-hashtags');
    tagBox.innerHTML = '';
    const tags = song.hashtags || [];
    if (tags.length > 0) {
        tagBox.innerHTML = tags.map(t => `<span class="hashtag">${t}</span>`).join('');
    }

    const commentEl = document.getElementById('main-comment');
    if (song.comment && song.comment.trim() !== "") {
        commentEl.innerText = `"${song.comment}"`;
        commentEl.style.display = 'block';
    } else {
        commentEl.style.display = 'none';
    }

    // 플레이리스트 내 활성 상태 업데이트
    updatePlaylistActiveState();

    const lyricsContent = document.getElementById('lyrics-content');
    if (song.lyrics && song.lyrics.trim() !== "") {
        lyricsContent.innerHTML = song.lyrics;
        lyricsContent.style.display = 'block'; 
    } else {
        lyricsContent.innerHTML = `<div style="margin-top:2rem; font-size:0.85rem; color:#666;">등록된 가사가 없습니다.</div>`;
        lyricsContent.style.display = 'flex';
        lyricsContent.style.flexDirection = 'column';
        lyricsContent.style.justifyContent = 'center';
    }
}

// 플레이리스트 활성 상태만 업데이트 (재렌더링 없이)
function updatePlaylistActiveState() {
    document.querySelectorAll('.song-item').forEach(el => {
        const originalIndex = parseInt(el.getAttribute('data-original-index'));
        const isActive = originalIndex === currentSongIndex;
        const isCurrentlyPlaying = isActive && isPlaying;
        
        el.classList.toggle('active', isActive);
        
        const indicator = el.querySelector('.song-playing-indicator');
        if (indicator) {
            indicator.classList.toggle('playing', isCurrentlyPlaying);
        }
    });
    
    scrollToCurrentSong();
}

function playSpecificSong(index) {
    currentSongIndex = index;
    loadSongUI(index);
    if(player && playerReady && playlistData[index].youtubeId) {
        player.loadVideoById(playlistData[index].youtubeId);
        setTimeout(() => player.playVideo(), config.timing.videoLoadDelay);
        addToRecentPlays(playlistData[index]);
    }
}

function togglePlay() {
    if (!player || !playerReady) return;
    isPlaying ? player.pauseVideo() : player.playVideo();
}

function playNext() {
    // 필터링된 목록 내에서 다음 곡
    if (filteredPlaylist.length === 0) return;
    
    const currentInFiltered = filteredPlaylist.findIndex(s => playlistData.indexOf(s) === currentSongIndex);
    let nextFilteredIndex = (currentInFiltered + 1) % filteredPlaylist.length;
    const nextOriginalIndex = playlistData.indexOf(filteredPlaylist[nextFilteredIndex]);
    
    playSpecificSong(nextOriginalIndex);
}

function playPrev() {
    if (filteredPlaylist.length === 0) return;
    
    const currentInFiltered = filteredPlaylist.findIndex(s => playlistData.indexOf(s) === currentSongIndex);
    let prevFilteredIndex = (currentInFiltered - 1 + filteredPlaylist.length) % filteredPlaylist.length;
    const prevOriginalIndex = playlistData.indexOf(filteredPlaylist[prevFilteredIndex]);
    
    playSpecificSong(prevOriginalIndex);
}

function addToRecentPlays(song) {
    recentPlays = recentPlays.filter(s => s.youtubeId !== song.youtubeId);
    recentPlays.unshift(song);
    if (recentPlays.length > 10) recentPlays.pop();
}

function updatePlayButton() {
    const btn = document.getElementById('btn-play-pause');
    btn.innerHTML = isPlaying ? '<i data-lucide="pause" size="28"></i>' : '<i data-lucide="play" size="28"></i>';
    if (typeof lucide !== 'undefined') lucide.createIcons();
    
    // 플레이리스트 재생 인디케이터 업데이트
    updatePlaylistActiveState();
}

function updateRepeatButton() {
    const btn = document.getElementById('btn-repeat');
    if (isRepeatOne) {
        btn.innerHTML = '<i data-lucide="repeat-1" size="20"></i>';
        btn.classList.add('active');
    } else {
        btn.innerHTML = '<i data-lucide="repeat" size="20"></i>';
        btn.classList.remove('active');
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ============================================================
// [7] 프로그레스 바
// ============================================================
function startProgressLoop() {
    stopProgressLoop();
    progressInterval = setInterval(() => {
        if(!player || !player.getCurrentTime) return;
        const current = player.getCurrentTime();
        const duration = player.getDuration();
        if(duration > 0) {
            const percent = (current / duration) * 100;
            document.getElementById('progress-bar-fill').style.width = `${percent}%`;
            document.getElementById('current-time').innerText = formatTime(current);
            document.getElementById('total-time').innerText = formatTime(duration);
        }
    }, 500);
}

function stopProgressLoop() { 
    if(progressInterval) clearInterval(progressInterval); 
}

// ============================================================
// [8] 키보드 단축키
// ============================================================
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // 입력 필드에서는 단축키 비활성화
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        
        switch(e.key) {
            case ' ': // Space - 재생/일시정지
                e.preventDefault();
                togglePlay();
                break;
            case 'ArrowRight': // → 다음 곡
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    playNext();
                }
                break;
            case 'ArrowLeft': // ← 이전 곡
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    playPrev();
                }
                break;
            case 'm': // M - 음소거 토글
            case 'M':
                if (player && playerReady) {
                    player.isMuted() ? player.unMute() : player.mute();
                }
                break;
            case '/': // / - 검색 포커스
                e.preventDefault();
                const searchInput = document.getElementById('playlist-search');
                if (searchInput) searchInput.focus();
                break;
        }
    });
}

// ============================================================
// [9] 섹션 전환
// ============================================================
function switchSection(sectionName) {
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });

    const targetSection = document.getElementById(`section-${sectionName}`);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    const targetMenuItem = document.querySelector(`.menu-item[data-section="${sectionName}"]`);
    if (targetMenuItem) {
        targetMenuItem.classList.add('active');
    }

    if (config.bgMusicSections.includes(sectionName)) {
        playBackgroundMusic(sectionName);
    } else if (config.keepBgMusicSections && config.keepBgMusicSections.includes(sectionName)) {
        // 유지
    } else {
        stopAllBackgroundMusic();
    }

    setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, config.timing.iconRenderDelay);
}

// ============================================================
// [10] 나이 탭 & 캐릭터 프로필
// ============================================================
function setupAgeTabListeners() {
    const ageTabs = document.querySelectorAll('.age-tab');
    ageTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const selectedAge = parseInt(tab.getAttribute('data-age'));
            currentAge = selectedAge;

            ageTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const profileContainer = document.querySelector('.character-profile');
            if (profileContainer) {
                profileContainer.setAttribute('data-age', selectedAge);
            }

            renderCharacterProfile(selectedAge);
            updateDashboardBgMusic(selectedAge);
        });
    });
}

function renderCharacterProfile(age = currentAge) {
    const profile = characterData.profiles[age];
    const common = characterData.common;

    if (!profile) return;

    const profileContainer = document.querySelector('.character-profile');
    if (profileContainer) {
        profileContainer.setAttribute('data-age', age);
    }

    // 명제 섹션
    const propNumber = document.getElementById('prop-number');
    const propKanji = document.getElementById('prop-kanji');
    const propDesc = document.getElementById('prop-desc');

    if (propNumber) propNumber.textContent = profile.proposition.number;
    if (propKanji) propKanji.textContent = `「 ${profile.proposition.kanji} 」`;
    if (propDesc) {
        propDesc.innerHTML = profile.proposition.description;
        if (profile.proposition.isScripture) {
            propDesc.classList.add('scripture-text');
        } else {
            propDesc.classList.remove('scripture-text');
        }
    }

    // 한마디 섹션
    const quoteMain = document.getElementById('quote-main');
    const quoteSub = document.getElementById('quote-sub');
    const quoteDesc = document.getElementById('quote-desc');

    if (quoteMain) quoteMain.innerHTML = `" ${profile.quote.main} "`;
    if (quoteSub) {
        quoteSub.textContent = profile.quote.sub || '';
        quoteSub.style.display = profile.quote.sub ? 'block' : 'none';
    }
    if (quoteDesc) {
        quoteDesc.innerHTML = profile.quote.description.map(line =>
            line ? `<p>${line}</p>` : '<p>&nbsp;</p>'
        ).join('');
    }

    // 캐릭터 이미지
    const charAvatar = document.getElementById('char-avatar');
    const avatarPlaceholder = document.getElementById('avatar-placeholder');
    if (charAvatar) {
        if (profile.image) {
            charAvatar.src = profile.image;
            if (avatarPlaceholder) avatarPlaceholder.style.display = 'none';
        } else {
            charAvatar.src = '';
            if (avatarPlaceholder) avatarPlaceholder.style.display = 'block';
        }
    }

    // 이미지 출처
    const avatarCredit = document.getElementById('avatar-credit');
    if (avatarCredit) {
        if (profile.imageCredit && profile.imageCredit.text) {
            if (profile.imageCredit.url) {
                avatarCredit.innerHTML = `illust by <a href="${profile.imageCredit.url}" target="_blank" rel="noopener noreferrer">${profile.imageCredit.text}</a>`;
            } else {
                avatarCredit.textContent = `illust by ${profile.imageCredit.text}`;
            }
            avatarCredit.classList.remove('placeholder');
        } else {
            avatarCredit.innerHTML = `<span class="credit-placeholder">illust by —</span>`;
            avatarCredit.classList.add('placeholder');
        }
        avatarCredit.style.display = 'block';
    }

    // 이름 섹션
    const nameKr = document.getElementById('char-name-kr');
    const nameEn = document.getElementById('char-name-en');

    if (nameKr) nameKr.textContent = profile.name.kr;
    if (nameEn) nameEn.textContent = profile.name.en;

    // 소속 뱃지
    const affiliationBadge = document.getElementById('affiliation-badge');
    const affiliationName = document.getElementById('affiliation-name');

    if (affiliationBadge) {
        affiliationBadge.setAttribute('data-type', profile.affiliation.type);
    }
    if (affiliationName) {
        affiliationName.textContent = profile.affiliation.name;
    }

    // 성격 태그
    const personalityTags = document.getElementById('personality-tags');
    if (personalityTags) {
        personalityTags.innerHTML = profile.personality.tags.map(tag =>
            `<span class="personality-tag">${tag}</span>`
        ).join('');
    }

    // 성격 설명
    const personalityDesc = document.getElementById('personality-desc');
    if (personalityDesc) {
        personalityDesc.innerHTML = profile.personality.description.map(line =>
            `<p>${line}</p>`
        ).join('');
    }

    // BASIC INFO 카드
    const basicInfoContent = document.getElementById('basic-info-content');
    if (basicInfoContent) {
        const basicInfo = [
            { label: '키 / 체중', value: `${profile.basic.height} / ${profile.basic.weight}` },
            { label: profile.basic.house ? '기숙사' : '진영', value: profile.basic.house || profile.basic.faction },
            { label: '국적', value: profile.basic.nationality },
            { label: '혈통', value: common.bloodStatus }
        ];

        basicInfoContent.innerHTML = basicInfo.map(info =>
            `<div class="info-row">
                <span class="info-label">${info.label}</span>
                <span class="info-value">${info.value}</span>
            </div>`
        ).join('');
    }

    // BIRTH INFO 카드
    const birthInfoContent = document.getElementById('birth-info-content');
    if (birthInfoContent) {
        const birthInfo = [
            { label: '생일', value: common.birthday },
            { label: '탄생화 / 탄생목', value: `${common.birthFlower} / ${common.birthTree}` },
            { label: '탄생석', value: common.birthStone },
            { label: '탄생색', value: common.birthColor.name, color: common.birthColor.hex }
        ];

        birthInfoContent.innerHTML = birthInfo.map(info =>
            `<div class="info-row">
                <span class="info-label">${info.label}</span>
                <span class="info-value">
                    ${info.color ? `<span class="color-preview" style="background-color: ${info.color}"></span>` : ''}
                    ${info.value}
                </span>
            </div>`
        ).join('');
    }

    // MAGIC INFO 카드
    const magicInfoContent = document.getElementById('magic-info-content');
    if (magicInfoContent) {
        const themeColor = profile.themeColorAccent || profile.themeColor;
        const moodSong = profile.magic.moodSong;
        const moodSongValue = moodSong.url
            ? `<a href="${moodSong.url}" target="_blank" rel="noopener noreferrer" class="mood-song-link">${moodSong.title} (${moodSong.artist})</a>`
            : `${moodSong.title} (${moodSong.artist})`;
        const magicInfo = [
            { label: '지팡이', value: `${common.wand.wood} / ${common.wand.core}` },
            { label: '길이 / 유연성', value: `${common.wand.length} / ${common.wand.flexibility}` },
            { label: '테마색', value: themeColor, color: themeColor },
            { label: '무드곡', value: moodSongValue, muted: true, isHtml: true }
        ];

        magicInfoContent.innerHTML = magicInfo.map(info =>
            `<div class="info-row">
                <span class="info-label">${info.label}</span>
                <span class="info-value${info.muted ? ' muted' : ''}">
                    ${info.color ? `<span class="color-preview" style="background-color: ${info.color}"></span>` : ''}
                    ${info.value}
                </span>
            </div>`
        ).join('');
    }

    // 관계 섹션
    const relationshipsGrid = document.getElementById('relationships-grid');
    if (relationshipsGrid) {
        if (profile.relationships && profile.relationships.length > 0) {
            if (profile.relationships.length <= 3) {
                relationshipsGrid.classList.add('single-row');
            } else {
                relationshipsGrid.classList.remove('single-row');
            }

            relationshipsGrid.innerHTML = profile.relationships.map(rel =>
                `<div class="relationship-card">
                    <div class="relationship-avatar">
                        <span>${rel.initial || rel.name.charAt(0)}</span>
                    </div>
                    <div class="relationship-info">
                        <div class="relationship-name">${rel.name}</div>
                        ${rel.description ? `<div class="relationship-description">${rel.description}</div>` : ''}
                        ${rel.detail ? `<div class="relationship-detail">${rel.detail}</div>` : ''}
                        ${rel.quote ? `<div class="relationship-quote">"${rel.quote}"</div>` : ''}
                    </div>
                </div>`
            ).join('');
        } else {
            relationshipsGrid.classList.remove('single-row');
            relationshipsGrid.innerHTML = '<p class="relationships-empty">등록된 관계가 없습니다.</p>';
        }
    }

    setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, config.timing.iconRenderDelay);
}

// ============================================================
// [11] 오너 프로필
// ============================================================
function renderOwnerProfile() {
    const owner = ownerData;

    const profileImg = document.getElementById('owner-profile-img');
    if (profileImg) profileImg.src = owner.profileImage;

    const mascotImg = document.getElementById('owner-mascot-img');
    if (mascotImg) mascotImg.src = owner.mascotImage;

    const nameDisplay = document.getElementById('owner-name-display');
    if (nameDisplay) nameDisplay.textContent = owner.nameStyle;

    const quote = document.getElementById('owner-quote');
    if (quote) quote.textContent = owner.quote;

    const tagsContainer = document.getElementById('owner-tags');
    if (tagsContainer) {
        tagsContainer.innerHTML = owner.tags.map(tag =>
            `<span class="owner-tag">${tag}</span>`
        ).join('');
    }

    const descriptionContainer = document.getElementById('owner-description');
    if (descriptionContainer) {
        descriptionContainer.innerHTML = owner.description.map(text =>
            `<p>${text}</p>`
        ).join('');
    }

    const ownerInfoGrid = document.getElementById('owner-interests-grid');
    if (ownerInfoGrid && owner.ownerInfo) {
        ownerInfoGrid.innerHTML = owner.ownerInfo.map(item =>
            `<div class="owner-info-item">
                <span class="owner-info-label">${item.label}</span>
                <span class="owner-info-value">${item.value}</span>
            </div>`
        ).join('');
    }

    const communicationGrid = document.getElementById('owner-communication');
    if (communicationGrid && owner.communication) {
        communicationGrid.innerHTML = owner.communication.map(item =>
            `<div class="owner-info-item">
                <span class="owner-info-label">${item.label}</span>
                <span class="owner-info-value">${item.value}</span>
            </div>`
        ).join('');
    }

    const mentionGrid = document.getElementById('owner-mention');
    if (mentionGrid && owner.mention) {
        mentionGrid.innerHTML = owner.mention.map(item =>
            `<div class="owner-info-item">
                <span class="owner-info-label">${item.label}</span>
                <span class="owner-info-value">${item.value}</span>
            </div>`
        ).join('');
    }

    const contactGrid = document.getElementById('owner-contact');
    if (contactGrid && owner.contact) {
        contactGrid.innerHTML = owner.contact.map(item =>
            `<div class="owner-info-item">
                <span class="owner-info-label">${item.label}</span>
                <span class="owner-info-value">${item.value}</span>
            </div>`
        ).join('');
    }

    const fanworkGrid = document.getElementById('owner-fanwork');
    if (fanworkGrid && owner.fanwork) {
        fanworkGrid.innerHTML = owner.fanwork.map(item =>
            `<div class="owner-info-item">
                <span class="owner-info-label">${item.label}</span>
                <span class="owner-info-value">${item.value}</span>
            </div>`
        ).join('');
    }

    const linksContainer = document.getElementById('owner-links');
    if (linksContainer) {
        linksContainer.innerHTML = owner.links.map(link =>
            `<a href="${link.url}" class="owner-link" target="_blank" rel="noopener noreferrer">
                <i data-lucide="${link.icon}"></i>
                <span>${link.text}</span>
            </a>`
        ).join('');
    }

    setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, config.timing.iconRenderDelay);
}

// ============================================================
// [12] 백그라운드 음악
// ============================================================
function initBackgroundPlayers() {
    const char = characterProfiles[currentAge];
    if (char.bgMusic && char.bgMusic.youtubeId) {
        bgPlayers['dashboard'] = new YT.Player('bg-player-dashboard', {
            height: '0',
            width: '0',
            videoId: char.bgMusic.youtubeId,
            playerVars: {
                autoplay: 0,
                controls: 0,
                loop: 1,
                playlist: char.bgMusic.youtubeId
            },
            events: {
                onReady: (event) => {
                    bgPlayersReady['dashboard'] = true;
                    event.target.setVolume(config.player.defaultVolume);
                }
            }
        });
    }

    if (ownerData.bgMusic && ownerData.bgMusic.youtubeId) {
        bgPlayers['guide'] = new YT.Player('bg-player-guide', {
            height: '0',
            width: '0',
            videoId: ownerData.bgMusic.youtubeId,
            playerVars: {
                autoplay: 0,
                controls: 0,
                loop: 1,
                playlist: ownerData.bgMusic.youtubeId
            },
            events: {
                onReady: (event) => {
                    bgPlayersReady['guide'] = true;
                    event.target.setVolume(config.player.defaultVolume);
                }
            }
        });
    }
}

function playBackgroundMusic(sectionName) {
    stopAllBackgroundMusic();
    if (bgPlayers[sectionName] && bgPlayersReady[sectionName]) {
        bgPlayers[sectionName].playVideo();
        currentBgPlayer = sectionName;
    }
}

function stopAllBackgroundMusic() {
    Object.keys(bgPlayers).forEach(key => {
        if (bgPlayers[key] && bgPlayersReady[key]) {
            bgPlayers[key].pauseVideo();
        }
    });
    currentBgPlayer = null;
}

function updateDashboardBgMusic(age) {
    const char = characterProfiles[age];
    if (char.bgMusic && char.bgMusic.youtubeId && bgPlayers['dashboard']) {
        if (bgPlayersReady['dashboard']) {
            bgPlayers['dashboard'].pauseVideo();
        }

        bgPlayers['dashboard'].cuePlaylist({
            playlist: [char.bgMusic.youtubeId],
            index: 0,
            startSeconds: 0
        });
        bgPlayers['dashboard'].setLoop(true);

        if (currentBgPlayer === 'dashboard') {
            setTimeout(() => {
                bgPlayers['dashboard'].playVideo();
            }, config.timing.bgMusicSwitchDelay);
        }
    }
}

// ============================================================
// [13] 모티프 페이지
// ============================================================
function renderMotifPage() {
    const motifGrid = document.getElementById('motif-main-grid');
    if (!motifGrid) return;

    motifGrid.innerHTML = motifData.map(motif =>
        `<div class="motif-main-item">
            <div class="motif-main-image">
                ${motif.image
                    ? `<img src="${motif.image}" alt="${motif.title}">`
                    : `<div class="motif-placeholder"><span>${motif.title.charAt(0)}</span></div>`
                }
            </div>
            <div class="motif-main-info">
                <h3>${motif.title}</h3>
                ${motif.source ? `<span class="motif-source">${motif.source}</span>` : ''}
                ${motif.description ? `<p>${motif.description}</p>` : ''}
            </div>
        </div>`
    ).join('');

    setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, config.timing.iconRenderDelay);
}

// ============================================================
// [14] 초기화
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
    await loadAllComponents();

    setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, config.timing.iconRenderDelay);

    renderCharacterProfile();
    renderOwnerProfile();
    renderMotifPage();
    setupAgeTabListeners();
    setupPlaylistSearch();
    setupKeyboardShortcuts();

    // 섹션 전환 이벤트
    const menuItems = document.querySelectorAll('.menu-item[data-section]');
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            const sectionName = item.getAttribute('data-section');
            switchSection(sectionName);
        });
    });

    // 플레이어 컨트롤
    document.getElementById('btn-play-pause').addEventListener('click', togglePlay);
    document.getElementById('btn-next').addEventListener('click', playNext);
    document.getElementById('btn-prev').addEventListener('click', playPrev);
    document.getElementById('btn-shuffle').addEventListener('click', () => {
        const randomIndex = Math.floor(Math.random() * filteredPlaylist.length);
        const originalIndex = playlistData.indexOf(filteredPlaylist[randomIndex]);
        playSpecificSong(originalIndex);
    });
    document.getElementById('btn-repeat').addEventListener('click', () => {
        isRepeatOne = !isRepeatOne;
        updateRepeatButton();
    });
    document.getElementById('progress-bar-bg').addEventListener('click', (e) => {
        if(!player || !playerReady) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        player.seekTo(player.getDuration() * percent, true);
    });
});
