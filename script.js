import { playlistData } from './data.js';
import { characterData } from './character.js';
import { ownerData } from './owner.js';

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
let recentPlays = [];

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
        renderPlaylist();
        loadSongUI(0);
    }
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
        setTimeout(() => player.playVideo(), 100);

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

    setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, 100);

    // 캐릭터 프로필 렌더링
    renderCharacterProfile();

    // 개인 프로필 렌더링
    renderOwnerProfile();

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

    // 아이콘 재렌더링
    setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, 50);
}

function renderCharacterProfile() {
    const char = characterData;

    // 프로필 헤더
    document.getElementById('char-main-img').src = char.profile.image;
    document.getElementById('char-name').textContent = char.profile.name;
    document.getElementById('char-name-en').textContent = char.profile.nameEn;
    document.getElementById('char-quote').textContent = `"${char.profile.quote}"`;
    document.getElementById('char-tags').innerHTML = char.profile.tags.map(tag =>
        `<span class="profile-tag">${tag}</span>`
    ).join('');

    // 기본 정보
    document.getElementById('basic-info-grid').innerHTML = char.basicInfo.map(info =>
        `<div class="info-item">
            <span class="info-label">${info.label}</span>
            <span class="info-value">${info.value}</span>
        </div>`
    ).join('');

    // 성격 & 특징
    document.getElementById('personality-desc').textContent = char.personality.description;
    document.getElementById('personality-traits').innerHTML = char.personality.traits.map(trait =>
        `<li>${trait}</li>`
    ).join('');

    // 배경 스토리
    document.getElementById('backstory-content').innerHTML = char.backstory.map(paragraph =>
        `<p>${paragraph}</p>`
    ).join('');

    // 갤러리
    document.getElementById('gallery-grid').innerHTML = char.gallery.map(item =>
        `<div class="gallery-item">
            <img src="${item.image}" alt="${item.alt}">
        </div>`
    ).join('');

    // 모티프
    document.getElementById('motif-grid').innerHTML = char.motifs.map(motif =>
        `<div class="motif-item">
            <div class="motif-image">
                <img src="${motif.image}" alt="${motif.title}">
            </div>
            <div class="motif-info">
                <h3>${motif.title}</h3>
                <p>${motif.description}</p>
            </div>
        </div>`
    ).join('');

    // 관련 링크
    document.getElementById('profile-links').innerHTML = char.links.map(link =>
        `<a href="${link.url}" class="profile-link">
            <i data-lucide="${link.icon}"></i>
            <span>${link.text}</span>
        </a>`
    ).join('');

    // 아이콘 재렌더링
    setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, 50);
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

    // 인용구
    const quote = document.getElementById('owner-quote');
    if (quote) quote.textContent = `"${owner.quote}"`;

    // 태그
    const tagsContainer = document.getElementById('owner-tags');
    if (tagsContainer) {
        tagsContainer.innerHTML = owner.tags.map(tag =>
            `<button class="owner-tag">${tag}</button>`
        ).join('');
    }

    // 설명
    const descriptionContainer = document.getElementById('owner-description');
    if (descriptionContainer) {
        descriptionContainer.innerHTML = owner.description.map(text =>
            `<p>${text}</p>`
        ).join('');
    }

    // 관심사
    const interestsGrid = document.getElementById('owner-interests-grid');
    if (interestsGrid) {
        interestsGrid.innerHTML = owner.interests.map(interest =>
            `<div class="interest-item">
                <span class="interest-label">${interest.label}</span>
                <span class="interest-value">${interest.value}</span>
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
    setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, 50);
}

