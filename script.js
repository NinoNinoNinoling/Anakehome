import { playlistData } from './data.js';
// [FIX] 경로 및 import 정리 (characterProfiles만 가져오면 됩니다)
import { characterProfiles } from './character.js'; 
import { ownerData } from './owner.js';
import { motifData } from './motif.js';

// 현재 선택된 나이
let currentAge = 11;

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
        loadComponent('section-dashboard', 'components/dashboard.html'),
        loadComponent('section-playlist', 'components/playlist.html'),
        loadComponent('section-motif', 'components/motif.html'),
        loadComponent('section-guide', 'components/about.html')
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

// 백그라운드 음악 플레이어
let bgPlayers = {};
let currentBgPlayer = null;
let bgPlayersReady = {};

const tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
const firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

window.onYouTubeIframeAPIReady = function() {
    if(playlistData.length > 0) {
        playlistData.forEach(item => {
            let videoId = extractYouTubeId(item.link);
            item.youtubeId = videoId;
            item.cover = videoId
                ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
                : `https://ui-avatars.com/api/?name=${encodeURIComponent(item.title)}&background=333&color=fff`;
        });

        player = new YT.Player('youtube-player-container', {
            height: '203',
            width: '360',
            videoId: playlistData[0].youtubeId,
            playerVars: { 'playsinline': 1, 'controls': 0, 'disablekb': 1, 'fs': 0, 'rel': 0, 'autoplay': 0 },
            events: {
                'onReady': onPlayerReady,
                'onStateChange': onPlayerStateChange
            }
        });
        
        // DOM 체크 후 렌더링
        renderPlaylist();
        loadSongUI(0);
    }

    // 백그라운드 음악 플레이어 초기화
    setTimeout(() => {
        initBackgroundPlayers();
        playBackgroundMusic('dashboard');
    }, 1000);
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
    if (!container) return; // 컴포넌트가 아직 로드되지 않은 경우 무시
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

    // 컴포넌트가 아직 로드되지 않은 경우 무시
    const albumArt = document.getElementById('main-album-art');
    if (!albumArt) return;

    // 기본 정보
    albumArt.src = song.cover;
    const titleEl = document.getElementById('main-title');
    if(titleEl) {
        titleEl.innerText = song.title;
        titleEl.onclick = () => window.open(song.link, '_blank');
    }
    
    const artistEl = document.getElementById('main-artist');
    if(artistEl) artistEl.innerText = song.artist || 'Unknown Artist';
    
    const playerZone = document.getElementById('player-zone');
    if(playerZone) playerZone.style.setProperty('--player-bg-image', `url('${song.cover}')`);
    
    const tagBox = document.getElementById('main-hashtags');
    if (tagBox) {
        tagBox.innerHTML = '';
        const tags = song.hashtags || [];
        if (tags.length > 0) {
            tagBox.innerHTML = tags.map(t => `<span class="hashtag">${t}</span>`).join('');
        }
    }

    const commentEl = document.getElementById('main-comment');
    if (commentEl) {
        if (song.comment && song.comment.trim() !== "") {
            commentEl.innerText = `"${song.comment}"`;
            commentEl.style.display = 'block';
        } else {
            commentEl.style.display = 'none';
        }
    }

    document.querySelectorAll('.song-item').forEach((el, i) => {
        el.classList.toggle('active', i === index);
    });

    const lyricsContent = document.getElementById('lyrics-content');
    if (lyricsContent) {
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
}

function playSpecificSong(index) {
    currentSongIndex = index;
    loadSongUI(index);
    if(player && playerReady && playlistData[index].youtubeId) {
        player.loadVideoById(playlistData[index].youtubeId);
        setTimeout(() => player.playVideo(), 100);
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
    if (!btn) return;
    btn.innerHTML = isPlaying ? '<i data-lucide="pause" size="28"></i>' : '<i data-lucide="play" size="28"></i>';
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function updateRepeatButton() {
    const btn = document.getElementById('btn-repeat');
    if (!btn) return;
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
            const barFill = document.getElementById('progress-bar-fill');
            const currTimeEl = document.getElementById('current-time');
            const totTimeEl = document.getElementById('total-time');
            
            if(barFill) barFill.style.width = `${percent}%`;
            if(currTimeEl) currTimeEl.innerText = formatTime(current);
            if(totTimeEl) totTimeEl.innerText = formatTime(duration);
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
    await loadAllComponents();
    setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, 100);

    // 플레이리스트 UI 초기화 (컴포넌트 로드 후)
    if (playlistData.length > 0) {
        renderPlaylist();
        loadSongUI(0);
    }

    // 캐릭터 프로필 렌더링
    renderCharacterProfile();
    renderOwnerProfile();
    renderMotifPage();
    setupAgeTabListeners();

    const menuItems = document.querySelectorAll('.menu-item[data-section]');
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            const sectionName = item.getAttribute('data-section');
            switchSection(sectionName);
        });
    });

    const btnPlay = document.getElementById('btn-play-pause');
    if(btnPlay) btnPlay.addEventListener('click', togglePlay);
    
    const btnNext = document.getElementById('btn-next');
    if(btnNext) btnNext.addEventListener('click', playNext);
    
    const btnPrev = document.getElementById('btn-prev');
    if(btnPrev) btnPrev.addEventListener('click', playPrev);
    
    const btnShuffle = document.getElementById('btn-shuffle');
    if(btnShuffle) btnShuffle.addEventListener('click', () => {
        playSpecificSong(Math.floor(Math.random() * playlistData.length));
    });
    
    const btnRepeat = document.getElementById('btn-repeat');
    if(btnRepeat) btnRepeat.addEventListener('click', () => {
        isRepeatOne = !isRepeatOne;
        updateRepeatButton();
    });
    
    const progressBg = document.getElementById('progress-bar-bg');
    if(progressBg) progressBg.addEventListener('click', (e) => {
        if(!player || !playerReady) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        player.seekTo(player.getDuration() * percent, true);
    });
});

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

    if (sectionName === 'dashboard' || sectionName === 'guide') {
        playBackgroundMusic(sectionName);
    } else {
        stopAllBackgroundMusic();
    }

    setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, 50);
}

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

// [FIX] 데이터 구조에 맞게 완전히 재작성된 렌더링 함수
function renderCharacterProfile(age = currentAge) {
    // 1. 올바른 변수(characterProfiles) 사용
    const data = characterProfiles[age];
    if (!data) return;

    // data-age 업데이트
    const profileContainer = document.querySelector('.character-profile');
    if (profileContainer) {
        profileContainer.setAttribute('data-age', age);
    }

    // 2. 명제 및 캐치프레이즈 (profile 객체 사용)
    const propNumber = document.getElementById('prop-number');
    const propKanji = document.getElementById('prop-kanji');
    const propDesc = document.getElementById('prop-desc');

    if (propNumber && data.profile.catchphrase) propNumber.textContent = data.profile.catchphrase.top;
    if (propKanji && data.profile.catchphrase) propKanji.textContent = data.profile.catchphrase.main;
    if (propDesc && data.profile.catchphrase) {
        propDesc.innerHTML = data.profile.catchphrase.bottom;
        if (data.profile.catchphrase.isScripture) {
            propDesc.classList.add('scripture-text');
        } else {
            propDesc.classList.remove('scripture-text');
        }
    }

    // 3. 한마디 (Quote)
    const quoteMain = document.getElementById('quote-main');
    if (quoteMain) quoteMain.innerHTML = `"${data.profile.quote}"`;

    // 4. 캐릭터 이미지
    const charAvatar = document.getElementById('char-avatar');
    const avatarPlaceholder = document.getElementById('avatar-placeholder');
    if (charAvatar) {
        if (data.profile.image) {
            charAvatar.src = data.profile.image;
            charAvatar.style.display = 'block';
            if (avatarPlaceholder) avatarPlaceholder.style.display = 'none';
        } else {
            charAvatar.style.display = 'none';
            if (avatarPlaceholder) avatarPlaceholder.style.display = 'block';
        }
    }

    // 이미지 출처
    const avatarCredit = document.getElementById('avatar-credit');
    if (avatarCredit && data.profile.imageCredit) {
        const credit = data.profile.imageCredit;
        if (credit.startsWith('http')) {
            avatarCredit.innerHTML = `illust by <a href="${credit}" target="_blank">Link</a>`;
        } else {
            avatarCredit.textContent = `illust by ${credit}`;
        }
        avatarCredit.style.display = 'block';
    }

    // 5. 이름
    const nameKr = document.getElementById('char-name-kr');
    const nameEn = document.getElementById('char-name-en');
    if (nameKr) nameKr.textContent = data.profile.name;
    if (nameEn) nameEn.textContent = data.profile.nameEn;

    // 6. 태그 및 설명
    const personalityTags = document.getElementById('personality-tags');
    if (personalityTags && data.profile.tags) {
        personalityTags.innerHTML = data.profile.tags.map(tag =>
            `<span class="personality-tag">${tag}</span>`
        ).join('');
    }

    const personalityDesc = document.getElementById('personality-desc');
    if (personalityDesc && data.personality) {
        // 줄바꿈 문자(\n)를 <br>로 변환하거나 p태그로 감싸기
        personalityDesc.innerText = data.personality.description;
    }

    // [FIX] 배열 데이터를 그대로 매핑 (일일이 지정하지 않음)
    
    // 7. BASIC INFO
    const basicInfoContent = document.getElementById('basic-info-content');
    if (basicInfoContent && data.basicInfo) {
        basicInfoContent.innerHTML = data.basicInfo.map(info =>
            `<div class="info-row">
                <span class="info-label">${info.label}</span>
                <span class="info-value">${info.value}</span>
            </div>`
        ).join('');
    }

    // 8. BIRTH INFO
    const birthInfoContent = document.getElementById('birth-info-content');
    if (birthInfoContent && data.birthInfo) {
        birthInfoContent.innerHTML = data.birthInfo.map(info =>
            `<div class="info-row">
                <span class="info-label">${info.label}</span>
                <span class="info-value">${info.value}</span>
            </div>`
        ).join('');
    }

    // 9. MAGIC INFO / BACKSTORY
    // 데이터에 magicInfo가 없으므로 backstory를 대신 표시하거나 처리
    const magicInfoContent = document.getElementById('magic-info-content');
    if (magicInfoContent) {
        if(data.backstory) {
             magicInfoContent.innerHTML = data.backstory.map(text => 
                `<p style="margin-bottom:8px; font-size:0.9rem; color:#555;">${text}</p>`
             ).join('');
        } else {
            magicInfoContent.innerHTML = '';
        }
    }

    // 10. 관계 섹션
    const relationshipsGrid = document.getElementById('relationships-grid');
    if (relationshipsGrid) {
        if (data.relationships && data.relationships.length > 0) {
            if (data.relationships.length <= 3) {
                relationshipsGrid.classList.add('single-row');
            } else {
                relationshipsGrid.classList.remove('single-row');
            }
            relationshipsGrid.innerHTML = data.relationships.map(rel =>
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
    setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, 50);
}

function renderOwnerProfile() {
    const owner = ownerData;
    if (!owner) return; // 방어 코드

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

    setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, 50);
}

function initBackgroundPlayers() {
    const char = characterProfiles[currentAge];
    if (char && char.bgMusic && char.bgMusic.youtubeId) {
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
                    event.target.setVolume(20); 
                }
            }
        });
    }

    if (ownerData && ownerData.bgMusic && ownerData.bgMusic.youtubeId) {
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
                    event.target.setVolume(20); 
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
    if (char && char.bgMusic && char.bgMusic.youtubeId && bgPlayers['dashboard']) {
        if (bgPlayersReady['dashboard']) {
            bgPlayers['dashboard'].pauseVideo();
        }

        bgPlayers['dashboard'].loadVideoById({
            videoId: char.bgMusic.youtubeId,
            startSeconds: 0
        });

        if (currentBgPlayer === 'dashboard') {
            setTimeout(() => {
                bgPlayers['dashboard'].playVideo();
            }, 500);
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

    setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, 50);
}
