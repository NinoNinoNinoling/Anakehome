// ============================================================
// YouTube 플레이어 모듈
// ============================================================

import { playlistData } from '../data/playlist.js';
import { characterProfiles } from '../data/character.js';
import { ownerData } from '../data/owner.js';
import { config } from '../data/config.js';
import { state, players, timers, getDOM } from './store.js';
import { extractYouTubeId, formatTime, setStorage, renderIcons, showError, safeGet } from './utils.js';
import { renderPlaylist, loadSongUI, updatePlaylistActiveState } from './renderer.js';

// ============================================================
// 초기화
// ============================================================

/**
 * YouTube IFrame API 로드
 */
export function loadYouTubeAPI() {
    const tag = document.createElement('script');
    tag.src = config.api.youtubeIframe;
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}

/**
 * YouTube API Ready 콜백 등록
 */
export function setupYouTubeReady() {
    window.onYouTubeIframeAPIReady = function() {
        try {
            if (playlistData.length === 0) {
                console.warn('플레이리스트가 비어있습니다');
                return;
            }
            
            // 플레이리스트 데이터 가공
            playlistData.forEach(item => {
                const videoId = extractYouTubeId(item.link);
                item.youtubeId = videoId;
                item.cover = videoId
                    ? config.api.youtubeThumbnail(videoId)
                    : config.api.uiAvatars(item.title || 'Unknown');
            });

            // 메인 플레이어 생성
            players.main = new YT.Player('youtube-player-container', {
                height: String(config.player.height),
                width: String(config.player.width),
                videoId: playlistData[0].youtubeId,
                playerVars: {
                    ...config.player.playerVars,
                    'origin': window.location.origin // [수정] 보안 경고 방지
                },
                events: {
                    'onReady': onPlayerReady,
                    'onStateChange': onPlayerStateChange,
                    'onError': onPlayerError
                }
            });

            state.filteredPlaylist = [...playlistData];
            renderPlaylist();
            loadSongUI(0);
        } catch (error) {
            console.error('YouTube 플레이어 초기화 실패:', error);
            showError('플레이어 초기화 실패');
        }

        // 백그라운드 음악 초기화
        setTimeout(() => {
            try {
                initBackgroundPlayers();
                playBackgroundMusic(config.defaults.section);
            } catch (error) {
                console.error('백그라운드 플레이어 초기화 실패:', error);
            }
        }, config.timing.bgMusicInitDelay);
    };
}

function onPlayerError(event) {
    const errorCodes = {
        2: '잘못된 동영상 ID',
        5: 'HTML5 플레이어 오류',
        100: '동영상을 찾을 수 없음',
        101: '재생이 허용되지 않음',
        150: '재생이 허용되지 않음'
    };
    
    const message = errorCodes[event.data] || `알 수 없는 오류 (${event.data})`;
    console.error('YouTube Player Error:', message);
    showError(`재생 오류: ${message}`);
    
    // 다음 곡으로 자동 이동
    setTimeout(() => playNext(), 2000);
}

function onPlayerReady(event) {
    state.playerReady = true;
    
    // 저장된 볼륨 적용
    if (state.isMuted) {
        players.main.mute();
    } else {
        players.main.setVolume(state.volume);
    }
}

function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.PLAYING) {
        state.isPlaying = true;
        updatePlayButton();
        startProgressLoop();
    } else if (event.data === YT.PlayerState.PAUSED) {
        state.isPlaying = false;
        updatePlayButton();
        stopProgressLoop();
    } else if (event.data === YT.PlayerState.ENDED) {
        if (state.isRepeatOne) {
            players.main.seekTo(0);
            players.main.playVideo();
        } else {
            playNext();
        }
    }
}

// ============================================================
// 재생 제어
// ============================================================

export function togglePlay() {
    if (!players.main || !state.playerReady) return;
    state.isPlaying ? players.main.pauseVideo() : players.main.playVideo();
}

export function playSpecificSong(index) {
    if (index < 0 || index >= playlistData.length) {
        console.warn('잘못된 곡 인덱스:', index);
        return;
    }
    
    const song = playlistData[index];
    if (!song) {
        showError('곡 정보를 찾을 수 없습니다');
        return;
    }
    
    state.currentSongIndex = index;
    loadSongUI(index);
    
    if (players.main && state.playerReady && song.youtubeId) {
        players.main.loadVideoById(song.youtubeId);
        setTimeout(() => players.main.playVideo(), config.timing.videoLoadDelay);
        addToRecentPlays(song);
    } else if (!song.youtubeId) {
        showError('유효하지 않은 YouTube 링크입니다');
    }
}

export function playNext() {
    if (state.filteredPlaylist.length === 0) return;
    
    const currentInFiltered = state.filteredPlaylist.findIndex(
        s => playlistData.indexOf(s) === state.currentSongIndex
    );
    const nextFilteredIndex = (currentInFiltered + 1) % state.filteredPlaylist.length;
    const nextOriginalIndex = playlistData.indexOf(state.filteredPlaylist[nextFilteredIndex]);
    
    playSpecificSong(nextOriginalIndex);
}

export function playPrev() {
    if (state.filteredPlaylist.length === 0) return;
    
    const currentInFiltered = state.filteredPlaylist.findIndex(
        s => playlistData.indexOf(s) === state.currentSongIndex
    );
    const prevFilteredIndex = (currentInFiltered - 1 + state.filteredPlaylist.length) % state.filteredPlaylist.length;
    const prevOriginalIndex = playlistData.indexOf(state.filteredPlaylist[prevFilteredIndex]);
    
    playSpecificSong(prevOriginalIndex);
}

export function playShuffle() {
    if (state.filteredPlaylist.length === 0) return;
    
    const randomIndex = Math.floor(Math.random() * state.filteredPlaylist.length);
    const originalIndex = playlistData.indexOf(state.filteredPlaylist[randomIndex]);
    playSpecificSong(originalIndex);
}

export function toggleRepeat() {
    state.isRepeatOne = !state.isRepeatOne;
    updateRepeatButton();
}

export function seekTo(percent) {
    if (!players.main || !state.playerReady) return;
    players.main.seekTo(players.main.getDuration() * percent, true);
}

function addToRecentPlays(song) {
    state.recentPlays = state.recentPlays.filter(s => s.youtubeId !== song.youtubeId);
    state.recentPlays.unshift(song);
    if (state.recentPlays.length > 10) state.recentPlays.pop();
}

// ============================================================
// 볼륨 제어
// ============================================================

export function setVolume(value) {
    state.volume = Math.max(0, Math.min(100, value));
    
    if (players.main && state.playerReady) {
        if (state.isMuted) {
            players.main.mute();
        } else {
            players.main.unMute();
            players.main.setVolume(state.volume);
        }
    }
    
    updateVolumeUI();
    saveVolumeSettings();
}

export function toggleMute() {
    state.isMuted = !state.isMuted;
    
    if (players.main && state.playerReady) {
        if (state.isMuted) {
            players.main.mute();
        } else {
            players.main.unMute();
            players.main.setVolume(state.volume);
        }
    }
    
    updateVolumeUI();
    saveVolumeSettings();
}

function saveVolumeSettings() {
    setStorage('playerVolume', state.volume);
    setStorage('playerMuted', state.isMuted);
}

// ============================================================
// UI 업데이트
// ============================================================

export function updatePlayButton() {
    const dom = getDOM();
    const btn = dom.controls.playPause;
    if (!btn) return;
    
    btn.innerHTML = state.isPlaying 
        ? '<i data-lucide="pause" size="28"></i>' 
        : '<i data-lucide="play" size="28"></i>';
    renderIcons();
    updatePlaylistActiveState();
}

export function updateRepeatButton() {
    const dom = getDOM();
    const btn = dom.controls.repeat;
    if (!btn) return;
    
    if (state.isRepeatOne) {
        btn.innerHTML = '<i data-lucide="repeat-1" size="20"></i>';
        btn.classList.add('active');
    } else {
        btn.innerHTML = '<i data-lucide="repeat" size="20"></i>';
        btn.classList.remove('active');
    }
    renderIcons();
}

export function updateVolumeUI() {
    const dom = getDOM();
    const { volume: btn, volumeSlider: slider, volumeFill: fill } = dom.controls;
    
    if (slider) slider.value = state.volume;
    if (fill) fill.style.width = `${state.isMuted ? 0 : state.volume}%`;
    
    if (btn) {
        let iconName = 'volume-2';
        if (state.isMuted || state.volume === 0) {
            iconName = 'volume-x';
        } else if (state.volume < 50) {
            iconName = 'volume-1';
        }
        btn.innerHTML = `<i data-lucide="${iconName}" size="18"></i>`;
        btn.classList.toggle('muted', state.isMuted);
        renderIcons();
    }
}

// ============================================================
// 프로그레스 바
// ============================================================

export function startProgressLoop() {
    stopProgressLoop();
    
    timers.progress = setInterval(() => {
        if (!players.main || !players.main.getCurrentTime) return;
        
        const current = players.main.getCurrentTime();
        const duration = players.main.getDuration();
        
        if (duration > 0) {
            const dom = getDOM();
            const percent = (current / duration) * 100;
            
            if (dom.player.progressFill) {
                dom.player.progressFill.style.width = `${percent}%`;
            }
            if (dom.player.currentTime) {
                dom.player.currentTime.innerText = formatTime(current);
            }
            if (dom.player.totalTime) {
                dom.player.totalTime.innerText = formatTime(duration);
            }
        }
    }, 500);
}

export function stopProgressLoop() {
    if (timers.progress) {
        clearInterval(timers.progress);
        timers.progress = null;
    }
}

// ============================================================
// 백그라운드 음악
// ============================================================

function initBackgroundPlayers() {
    const char = characterProfiles[state.currentAge];
    
    // 대시보드 배경 음악
    if (char?.bgMusic?.youtubeId) {
        players.bg['dashboard'] = new YT.Player('bg-player-dashboard', {
            height: '0',
            width: '0',
            videoId: char.bgMusic.youtubeId,
            playerVars: {
                autoplay: 0,
                controls: 0,
                loop: 1,
                playlist: char.bgMusic.youtubeId,
                'origin': window.location.origin // [수정] 보안 경고 방지
            },
            events: {
                onReady: (event) => {
                    state.bgPlayersReady['dashboard'] = true;
                    event.target.setVolume(config.player.defaultVolume);
                }
            }
        });
    }

    // 가이드 배경 음악
    if (ownerData?.bgMusic?.youtubeId) {
        players.bg['guide'] = new YT.Player('bg-player-guide', {
            height: '0',
            width: '0',
            videoId: ownerData.bgMusic.youtubeId,
            playerVars: {
                autoplay: 0,
                controls: 0,
                loop: 1,
                playlist: ownerData.bgMusic.youtubeId,
                'origin': window.location.origin // [수정] 보안 경고 방지
            },
            events: {
                onReady: (event) => {
                    state.bgPlayersReady['guide'] = true;
                    event.target.setVolume(config.player.defaultVolume);
                }
            }
        });
    }
}

export function playBackgroundMusic(sectionName) {
    stopAllBackgroundMusic();
    
    if (players.bg[sectionName] && state.bgPlayersReady[sectionName]) {
        players.bg[sectionName].playVideo();
        state.currentBgPlayer = sectionName;
    }
}

export function stopAllBackgroundMusic() {
    Object.keys(players.bg).forEach(key => {
        if (players.bg[key] && state.bgPlayersReady[key]) {
            players.bg[key].pauseVideo();
        }
    });
    state.currentBgPlayer = null;
}

export function updateDashboardBgMusic(age) {
    // [수정] 플레이어가 준비되지 않았거나 함수가 없으면 실행 중단 (오류 방지)
    if (!players.bg['dashboard'] || typeof players.bg['dashboard'].cuePlaylist !== 'function') {
        return;
    }

    const char = characterProfiles[age];
    
    if (char?.bgMusic?.youtubeId && players.bg['dashboard']) {
        if (state.bgPlayersReady['dashboard']) {
            players.bg['dashboard'].pauseVideo();
        }

        players.bg['dashboard'].cuePlaylist({
            playlist: [char.bgMusic.youtubeId],
            index: 0,
            startSeconds: 0
        });
        players.bg['dashboard'].setLoop(true);

        if (state.currentBgPlayer === 'dashboard') {
            setTimeout(() => {
                // [추가] 실행 시점에도 다시 한번 확인
                if (players.bg['dashboard'] && typeof players.bg['dashboard'].playVideo === 'function') {
                    players.bg['dashboard'].playVideo();
                }
            }, config.timing.bgMusicSwitchDelay);
        }
    }
}
