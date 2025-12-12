import { playlistData } from './data/playlist.js';
import { characterData, characterProfiles } from './data/character.js';
import { ownerData } from './data/owner.js';
import { motifData } from './data/motif.js';
import { config } from './data/config.js';

// 현재 선택된 나이
let currentAge = config.defaults.age;

// 컴포넌트 로더
async function loadComponent(sectionId, componentPath) {
    try {
        const response = await fetch(componentPath);
        const html = await response.text();
        document.getElementById(sectionId).innerHTML = html;
    } catch (error) {
        console.error(`Failed to load ${componentPath}:`, error);
    }
}

// 초기 컴포넌트 로드
async function loadAllComponents() {
    await Promise.all([
        loadComponent('section-dashboard', config.components.dashboard),
        loadComponent('section-playlist', config.components.playlist),
        loadComponent('section-motif', config.components.motif),
        loadComponent('section-guide', config.components.guide)
    ]);

    // 컴포넌트 로드 후 아이콘 초기화
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

let currentSongIndex = 0;
let isPlaying = false;
let player = null;
let progressInterval = null;
let playerReady = false;
let isRepeatOne = false;
let recentPlays = [];

// 백그라운드 음악 플레이어
let bgPlayers = {};
let currentBgPlayer = null;
let bgPlayersReady = {};

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
        renderPlaylist();
        loadSongUI(0);
    }

    // 백그라운드 음악 플레이어 초기화
    setTimeout(() => {
        initBackgroundPlayers();
        // 대시보드가 기본 활성화되어 있으므로 배경 음악 재생
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

function extractYouTubeId(url) {
    try {
        const urlObj = new URL(url);
        if (urlObj.hostname.includes('youtube.com')) return urlObj.searchParams.get('v');
        else if (urlObj.hostname.includes('youtu.be')) return urlObj.pathname.slice(1).split('?')[0];
    } catch(e) {}
    return "";
}

function renderPlaylist() {
    const container = document.getElementById('playlist-container');
    container.innerHTML = '';
    playlistData.forEach((song, index) => {
        const div = document.createElement('div');
        div.className = `song-item ${index === currentSongIndex ? 'active' : ''}`;
        div.onclick = () => playSpecificSong(index);
        div.innerHTML = `
            <img src="${song.cover}" alt="${song.title}" loading="lazy">
            <div class="song-info">
                <h4>${song.title}</h4>
                <p>${song.artist || 'Unknown Artist'}</p>
            </div>
        `;
        container.appendChild(div);
    });
}

function loadSongUI(index) {
    if(!playlistData[index]) return;
    const song = playlistData[index];
    
    // 기본 정보
    document.getElementById('main-album-art').src = song.cover;
    const titleEl = document.getElementById('main-title');
    titleEl.innerText = song.title;
    titleEl.onclick = () => window.open(song.link, '_blank');
    document.getElementById('main-artist').innerText = song.artist || 'Unknown Artist';
    document.getElementById('player-zone').style.setProperty('--player-bg-image', `url('${song.cover}')`);
    
    // [NEW] 해시태그 처리
    const tagBox = document.getElementById('main-hashtags');
    tagBox.innerHTML = '';
    const tags = song.hashtags || [];
    if (tags.length > 0) {
        tagBox.innerHTML = tags.map(t => `<span class="hashtag">${t}</span>`).join('');
    }

    // [NEW] 코멘트 처리
    const commentEl = document.getElementById('main-comment');
    if (song.comment && song.comment.trim() !== "") {
        commentEl.innerText = `"${song.comment}"`;
        commentEl.style.display = 'block';
    } else {
        commentEl.style.display = 'none';
    }

    document.querySelectorAll('.song-item').forEach((el, i) => {
        el.classList.toggle('active', i === index);
    });

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

function playSpecificSong(index) {
    currentSongIndex = index;
    loadSongUI(index);
    if(player && playerReady && playlistData[index].youtubeId) {
        player.loadVideoById(playlistData[index].youtubeId);
        setTimeout(() => player.playVideo(), config.timing.videoLoadDelay);

        // 최근 재생 목록에 추가
        addToRecentPlays(playlistData[index]);
    }
}

function togglePlay() {
    if (!player || !playerReady) return;
    isPlaying ? player.pauseVideo() : player.playVideo();
}

function playNext() {
    currentSongIndex = (currentSongIndex + 1) % playlistData.length;
    playSpecificSong(currentSongIndex);
}

function playPrev() {
    currentSongIndex = (currentSongIndex - 1 + playlistData.length) % playlistData.length;
    playSpecificSong(currentSongIndex);
}

function updatePlayButton() {
    const btn = document.getElementById('btn-play-pause');
    btn.innerHTML = isPlaying ? '<i data-lucide="pause" size="28"></i>' : '<i data-lucide="play" size="28"></i>';
    if (typeof lucide !== 'undefined') lucide.createIcons();
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

function stopProgressLoop() { if(progressInterval) clearInterval(progressInterval); }

function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' + s : s}`;
}

document.addEventListener('DOMContentLoaded', async () => {
    // 컴포넌트 로드
    await loadAllComponents();

    setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, config.timing.iconRenderDelay);

    // 캐릭터 프로필 렌더링
    renderCharacterProfile();

    // 개인 프로필 렌더링
    renderOwnerProfile();

    // 모티프 렌더링
    renderMotifPage();

    // 나이 선택 탭 이벤트 리스너
    setupAgeTabListeners();

    // 섹션 전환 기능
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
        playSpecificSong(Math.floor(Math.random() * playlistData.length));
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

function switchSection(sectionName) {
    // 모든 섹션 숨기기
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });

    // 모든 메뉴 아이템 비활성화
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });

    // 선택된 섹션 표시
    const targetSection = document.getElementById(`section-${sectionName}`);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    // 선택된 메뉴 아이템 활성화
    const targetMenuItem = document.querySelector(`.menu-item[data-section="${sectionName}"]`);
    if (targetMenuItem) {
        targetMenuItem.classList.add('active');
    }

    // 배경 음악 재생 (config에 정의된 섹션에서만 재생)
    if (config.bgMusicSections.includes(sectionName)) {
        playBackgroundMusic(sectionName);
    } else {
        stopAllBackgroundMusic();
    }

    // 아이콘 재렌더링
    setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, config.timing.iconRenderDelay);
}

function setupAgeTabListeners() {
    const ageTabs = document.querySelectorAll('.age-tab');
    ageTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const selectedAge = parseInt(tab.getAttribute('data-age'));
            currentAge = selectedAge;

            // 탭 활성화 상태 변경
            ageTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // data-age 속성 업데이트 (테마 색상 변경용)
            const profileContainer = document.querySelector('.character-profile');
            if (profileContainer) {
                profileContainer.setAttribute('data-age', selectedAge);
            }

            // 프로필 다시 렌더링
            renderCharacterProfile(selectedAge);

            // 배경 음악 업데이트
            updateDashboardBgMusic(selectedAge);
        });
    });
}

function renderCharacterProfile(age = currentAge) {
    const profile = characterData.profiles[age];
    const common = characterData.common;

    if (!profile) return;

    // data-age 속성 업데이트
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
            // 이미지 URL이 있으면 표시
            charAvatar.src = profile.image;
            if (avatarPlaceholder) avatarPlaceholder.style.display = 'none';
        } else {
            // 이미지가 없으면 플레이스홀더 표시
            charAvatar.src = '';
            if (avatarPlaceholder) avatarPlaceholder.style.display = 'block';
        }
    }

    // 이미지 출처
    const avatarCredit = document.getElementById('avatar-credit');
    if (avatarCredit) {
        if (profile.imageCredit && profile.imageCredit.text) {
            // 출처 데이터가 있는 경우
            if (profile.imageCredit.url) {
                avatarCredit.innerHTML = `illust by <a href="${profile.imageCredit.url}" target="_blank" rel="noopener noreferrer">${profile.imageCredit.text}</a>`;
            } else {
                avatarCredit.textContent = `illust by ${profile.imageCredit.text}`;
            }
            avatarCredit.classList.remove('placeholder');
        } else {
            // 출처 데이터가 없는 경우 placeholder 표시
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
        const magicInfo = [
            { label: '지팡이', value: `${common.wand.wood} / ${common.wand.core}` },
            { label: '길이 / 유연성', value: `${common.wand.length} / ${common.wand.flexibility}` },
            { label: '테마색', value: themeColor, color: themeColor },
            { label: '무드곡', value: `${profile.magic.moodSong.title} (${profile.magic.moodSong.artist})`, muted: true }
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
            // 관계가 3개 이하면 single-row 클래스 추가
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
                        <div class="relationship-description">${rel.description || ''}</div>
                    </div>
                </div>`
            ).join('');
        } else {
            relationshipsGrid.classList.remove('single-row');
            relationshipsGrid.innerHTML = '<p class="relationships-empty">등록된 관계가 없습니다.</p>';
        }
    }

    // 아이콘 재렌더링
    setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, config.timing.iconRenderDelay);
}

function renderOwnerProfile() {
    const owner = ownerData;

    // 프로필 이미지
    const profileImg = document.getElementById('owner-profile-img');
    if (profileImg) profileImg.src = owner.profileImage;

    // 마스코트 이미지
    const mascotImg = document.getElementById('owner-mascot-img');
    if (mascotImg) mascotImg.src = owner.mascotImage;

    // 이름
    const nameDisplay = document.getElementById('owner-name-display');
    if (nameDisplay) nameDisplay.textContent = owner.nameStyle;

    // 인용구 (보조문구)
    const quote = document.getElementById('owner-quote');
    if (quote) quote.textContent = owner.quote;

    // 태그
    const tagsContainer = document.getElementById('owner-tags');
    if (tagsContainer) {
        tagsContainer.innerHTML = owner.tags.map(tag =>
            `<span class="owner-tag">${tag}</span>`
        ).join('');
    }

    // 설명
    const descriptionContainer = document.getElementById('owner-description');
    if (descriptionContainer) {
        descriptionContainer.innerHTML = owner.description.map(text =>
            `<p>${text}</p>`
        ).join('');
    }

    // 오너 정보
    const ownerInfoGrid = document.getElementById('owner-interests-grid');
    if (ownerInfoGrid && owner.ownerInfo) {
        ownerInfoGrid.innerHTML = owner.ownerInfo.map(item =>
            `<div class="owner-info-item">
                <span class="owner-info-label">${item.label}</span>
                <span class="owner-info-value">${item.value}</span>
            </div>`
        ).join('');
    }

    // 교류 정보
    const communicationGrid = document.getElementById('owner-communication');
    if (communicationGrid && owner.communication) {
        communicationGrid.innerHTML = owner.communication.map(item =>
            `<div class="owner-info-item">
                <span class="owner-info-label">${item.label}</span>
                <span class="owner-info-value">${item.value}</span>
            </div>`
        ).join('');
    }

    // 챙김 & 언급
    const mentionGrid = document.getElementById('owner-mention');
    if (mentionGrid && owner.mention) {
        mentionGrid.innerHTML = owner.mention.map(item =>
            `<div class="owner-info-item">
                <span class="owner-info-label">${item.label}</span>
                <span class="owner-info-value">${item.value}</span>
            </div>`
        ).join('');
    }

    // 연락 & 조율
    const contactGrid = document.getElementById('owner-contact');
    if (contactGrid && owner.contact) {
        contactGrid.innerHTML = owner.contact.map(item =>
            `<div class="owner-info-item">
                <span class="owner-info-label">${item.label}</span>
                <span class="owner-info-value">${item.value}</span>
            </div>`
        ).join('');
    }

    // 연성 정보
    const fanworkGrid = document.getElementById('owner-fanwork');
    if (fanworkGrid && owner.fanwork) {
        fanworkGrid.innerHTML = owner.fanwork.map(item =>
            `<div class="owner-info-item">
                <span class="owner-info-label">${item.label}</span>
                <span class="owner-info-value">${item.value}</span>
            </div>`
        ).join('');
    }

    // 링크
    const linksContainer = document.getElementById('owner-links');
    if (linksContainer) {
        linksContainer.innerHTML = owner.links.map(link =>
            `<a href="${link.url}" class="owner-link" target="_blank" rel="noopener noreferrer">
                <i data-lucide="${link.icon}"></i>
                <span>${link.text}</span>
            </a>`
        ).join('');
    }

    // 아이콘 재렌더링
    setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, config.timing.iconRenderDelay);
}

// 백그라운드 음악 플레이어 초기화
function initBackgroundPlayers() {
    // 대시보드 (현재 나이에 따라 동적으로 변경)
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

    // 오너 섹션
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

// 백그라운드 음악 재생
function playBackgroundMusic(sectionName) {
    // 모든 배경 음악 정지
    stopAllBackgroundMusic();

    // 해당 섹션의 배경 음악 재생
    if (bgPlayers[sectionName] && bgPlayersReady[sectionName]) {
        bgPlayers[sectionName].playVideo();
        currentBgPlayer = sectionName;
    }
}

// 모든 배경 음악 정지
function stopAllBackgroundMusic() {
    Object.keys(bgPlayers).forEach(key => {
        if (bgPlayers[key] && bgPlayersReady[key]) {
            bgPlayers[key].pauseVideo();
        }
    });
    currentBgPlayer = null;
}

// 나이 변경 시 대시보드 배경 음악 업데이트
function updateDashboardBgMusic(age) {
    const char = characterProfiles[age];
    if (char.bgMusic && char.bgMusic.youtubeId && bgPlayers['dashboard']) {
        // 기존 플레이어 정지
        if (bgPlayersReady['dashboard']) {
            bgPlayers['dashboard'].pauseVideo();
        }

        // 새 비디오 로드
        bgPlayers['dashboard'].loadVideoById({
            videoId: char.bgMusic.youtubeId,
            startSeconds: 0
        });

        // 대시보드가 활성화되어 있으면 재생
        if (currentBgPlayer === 'dashboard') {
            setTimeout(() => {
                bgPlayers['dashboard'].playVideo();
            }, config.timing.bgMusicSwitchDelay);
        }
    }
}

function renderMotifPage() {
    const motifGrid = document.getElementById('motif-main-grid');
    if (!motifGrid) return;

    motifGrid.innerHTML = motifData.map(motif =>
        `<div class="motif-main-item">
            <div class="motif-main-image">
                <img src="${motif.image}" alt="${motif.title}">
            </div>
            <div class="motif-main-info">
                <h3>${motif.title}</h3>
                <p>${motif.description}</p>
            </div>
        </div>`
    ).join('');

    // 아이콘 재렌더링
    setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, config.timing.iconRenderDelay);
}
