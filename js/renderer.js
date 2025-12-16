// ============================================================
// 렌더링 모듈
// ============================================================

import { playlistData } from '../data/playlist.js';
import { characterData } from '../data/character.js';
import { ownerData } from '../data/owner.js';
import { motifData } from '../data/motif.js';
import { state, getDOM } from './store.js';
import { renderIcons, safeGet } from './utils.js';

// ============================================================
// 플레이리스트 렌더링
// ============================================================

/**
 * 플레이리스트 렌더링
 */
export function renderPlaylist() {
    const dom = getDOM();
    const container = dom.playlist.container;
    if (!container) return;
    
    if (state.filteredPlaylist.length === 0) {
        container.innerHTML = `
            <div class="playlist-empty">
                <p>검색 결과가 없습니다</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    
    state.filteredPlaylist.forEach((song) => {
        const originalIndex = playlistData.indexOf(song);
        const isActive = originalIndex === state.currentSongIndex;
        const isCurrentlyPlaying = isActive && state.isPlaying;
        
        const div = document.createElement('div');
        div.className = `song-item ${isActive ? 'active' : ''}`;
        div.setAttribute('data-original-index', originalIndex);
        div.onclick = () => {
            // 동적 import로 순환 참조 방지
            import('./player.js').then(({ playSpecificSong }) => {
                playSpecificSong(originalIndex);
            });
        };
        
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
    
    scrollToCurrentSong();
}

/**
 * 검색어 하이라이트
 */
function highlightSearchText(text) {
    if (!state.searchQuery || !text) return text;
    const regex = new RegExp(`(${state.searchQuery})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
}

/**
 * 현재 재생 곡으로 스크롤
 */
export function scrollToCurrentSong() {
    const dom = getDOM();
    const container = dom.playlist.container;
    const activeItem = container?.querySelector('.song-item.active');
    if (activeItem) {
        activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

/**
 * 플레이리스트 활성 상태만 업데이트
 */
export function updatePlaylistActiveState() {
    document.querySelectorAll('.song-item').forEach(el => {
        const originalIndex = parseInt(el.getAttribute('data-original-index'));
        const isActive = originalIndex === state.currentSongIndex;
        const isCurrentlyPlaying = isActive && state.isPlaying;
        
        el.classList.toggle('active', isActive);
        
        const indicator = el.querySelector('.song-playing-indicator');
        if (indicator) {
            indicator.classList.toggle('playing', isCurrentlyPlaying);
        }
    });
    
    scrollToCurrentSong();
}

/**
 * 검색 결과 카운트 업데이트
 */
export function updateSearchResultCount() {
    const dom = getDOM();
    const countEl = dom.playlist.resultCount;
    if (!countEl) return;
    
    if (state.searchQuery) {
        countEl.textContent = `${state.filteredPlaylist.length}곡 검색됨`;
        countEl.style.display = 'block';
    } else {
        countEl.style.display = 'none';
    }
}

/**
 * 곡 UI 로드
 */
export function loadSongUI(index) {
    const song = playlistData[index];
    if (!song) {
        console.warn('곡 데이터 없음:', index);
        return;
    }
    
    const dom = getDOM();
    
    // 앨범 아트
    if (dom.player.albumArt) {
        dom.player.albumArt.src = song.cover || '';
        dom.player.albumArt.onerror = () => {
            dom.player.albumArt.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23333" width="100" height="100"/><text x="50" y="55" text-anchor="middle" fill="%23666" font-size="40">♪</text></svg>';
        };
    }
    
    // 제목
    if (dom.player.title) {
        dom.player.title.innerText = song.title || 'Unknown Title';
        dom.player.title.onclick = song.link ? () => window.open(song.link, '_blank') : null;
    }
    
    // 아티스트
    if (dom.player.artist) {
        dom.player.artist.innerText = song.artist || 'Unknown Artist';
    }
    
    // 배경 이미지
    if (dom.player.zone && song.cover) {
        dom.player.zone.style.setProperty('--player-bg-image', `url('${song.cover}')`);
    }
    
    // 해시태그
    if (dom.player.hashtags) {
        const tags = song.hashtags || [];
        dom.player.hashtags.innerHTML = tags.length > 0
            ? tags.map(t => `<span class="hashtag">${t}</span>`).join('')
            : '';
    }

    // 코멘트
    if (dom.player.comment) {
        const comment = (song.comment || '').trim();
        if (comment) {
            dom.player.comment.innerText = `"${comment}"`;
            dom.player.comment.style.display = 'block';
        } else {
            dom.player.comment.style.display = 'none';
        }
    }

    // 플레이리스트 활성 상태
    updatePlaylistActiveState();

    // 가사
    if (dom.player.lyrics) {
        const lyrics = (song.lyrics || '').trim();
        if (lyrics) {
            dom.player.lyrics.innerHTML = lyrics;
            dom.player.lyrics.style.display = 'block';
        } else {
            dom.player.lyrics.innerHTML = `<div style="margin-top:2rem; font-size:0.85rem; color:#666;">등록된 가사가 없습니다.</div>`;
            dom.player.lyrics.style.display = 'flex';
            dom.player.lyrics.style.flexDirection = 'column';
            dom.player.lyrics.style.justifyContent = 'center';
        }
    }
}

// ============================================================
// 캐릭터 프로필 렌더링
// ============================================================

export function renderCharacterProfile(age = state.currentAge) {
    const profile = safeGet(characterData, `profiles.${age}`);
    const common = safeGet(characterData, 'common', {});
    
    if (!profile) {
        console.warn('프로필 데이터 없음:', age);
        return;
    }

    const dom = getDOM();
    
    // data-age 속성
    const profileContainer = dom.character.profile();
    if (profileContainer) {
        profileContainer.setAttribute('data-age', age);
    }

    // 명제 섹션
    if (dom.character.propNumber) dom.character.propNumber.textContent = profile.proposition.number;
    if (dom.character.propKanji) dom.character.propKanji.textContent = `「 ${profile.proposition.kanji} 」`;
    if (dom.character.propDesc) {
        dom.character.propDesc.innerHTML = profile.proposition.description;
        dom.character.propDesc.classList.toggle('scripture-text', profile.proposition.isScripture);
    }

    // 한마디 섹션
    if (dom.character.quoteMain) dom.character.quoteMain.innerHTML = `" ${profile.quote.main} "`;
    if (dom.character.quoteSub) {
        dom.character.quoteSub.textContent = profile.quote.sub || '';
        dom.character.quoteSub.style.display = profile.quote.sub ? 'block' : 'none';
    }
    if (dom.character.quoteDesc) {
        dom.character.quoteDesc.innerHTML = profile.quote.description
            .map(line => line ? `<p>${line}</p>` : '<p>&nbsp;</p>')
            .join('');
    }

    // 캐릭터 이미지
    if (dom.character.avatar) {
        if (profile.image) {
            dom.character.avatar.src = profile.image;
            if (dom.character.avatarPlaceholder) {
                dom.character.avatarPlaceholder.style.display = 'none';
            }
        } else {
            dom.character.avatar.src = '';
            if (dom.character.avatarPlaceholder) {
                dom.character.avatarPlaceholder.style.display = 'block';
            }
        }
    }

    // 이미지 출처
    if (dom.character.avatarCredit) {
        if (profile.imageCredit?.text) {
            dom.character.avatarCredit.innerHTML = profile.imageCredit.url
                ? `illust by <a href="${profile.imageCredit.url}" target="_blank" rel="noopener noreferrer">${profile.imageCredit.text}</a>`
                : `illust by ${profile.imageCredit.text}`;
            dom.character.avatarCredit.classList.remove('placeholder');
        } else {
            dom.character.avatarCredit.innerHTML = `<span class="credit-placeholder">illust by —</span>`;
            dom.character.avatarCredit.classList.add('placeholder');
        }
        dom.character.avatarCredit.style.display = 'block';
    }

    // 이름
    if (dom.character.nameKr) dom.character.nameKr.textContent = profile.name.kr;
    if (dom.character.nameEn) dom.character.nameEn.textContent = profile.name.en;

    // 소속
    if (dom.character.affiliationBadge) {
        dom.character.affiliationBadge.setAttribute('data-type', profile.affiliation.type);
    }
    if (dom.character.affiliationName) {
        dom.character.affiliationName.textContent = profile.affiliation.name;
    }

    // 성격 태그
    if (dom.character.personalityTags) {
        dom.character.personalityTags.innerHTML = profile.personality.tags
            .map(tag => `<span class="personality-tag">${tag}</span>`)
            .join('');
    }

    // 성격 설명
    if (dom.character.personalityDesc) {
        dom.character.personalityDesc.innerHTML = profile.personality.description
            .map(line => `<p>${line}</p>`)
            .join('');
    }

    // BASIC INFO
    if (dom.character.basicInfo) {
        const basicInfo = [
            { label: '키 / 체중', value: `${profile.basic.height} / ${profile.basic.weight}` },
            { label: profile.basic.house ? '기숙사' : '진영', value: profile.basic.house || profile.basic.faction },
            { label: '국적', value: profile.basic.nationality },
            { label: '혈통', value: common.bloodStatus }
        ];
        dom.character.basicInfo.innerHTML = basicInfo.map(info =>
            `<div class="info-row">
                <span class="info-label">${info.label}</span>
                <span class="info-value">${info.value}</span>
            </div>`
        ).join('');
    }

    // BIRTH INFO
    if (dom.character.birthInfo) {
        const birthInfo = [
            { label: '생일', value: common.birthday },
            { label: '탄생화 / 탄생목', value: `${common.birthFlower} / ${common.birthTree}` },
            { label: '탄생석', value: common.birthStone },
            { label: '탄생색', value: common.birthColor.name, color: common.birthColor.hex }
        ];
        dom.character.birthInfo.innerHTML = birthInfo.map(info =>
            `<div class="info-row">
                <span class="info-label">${info.label}</span>
                <span class="info-value">
                    ${info.color ? `<span class="color-preview" style="background-color: ${info.color}"></span>` : ''}
                    ${info.value}
                </span>
            </div>`
        ).join('');
    }

    // MAGIC INFO
    if (dom.character.magicInfo) {
        const themeColor = profile.themeColorAccent || profile.themeColor;
        const moodSong = profile.magic.moodSong;
        const moodSongValue = moodSong.url
            ? `<a href="${moodSong.url}" target="_blank" rel="noopener noreferrer" class="mood-song-link">${moodSong.title} (${moodSong.artist})</a>`
            : `${moodSong.title} (${moodSong.artist})`;
        const magicInfo = [
            { label: '지팡이', value: `${common.wand.wood} / ${common.wand.core}` },
            { label: '길이 / 유연성', value: `${common.wand.length} / ${common.wand.flexibility}` },
            { label: '테마색', value: themeColor, color: themeColor },
            { label: '무드곡', value: moodSongValue, muted: true }
        ];
        dom.character.magicInfo.innerHTML = magicInfo.map(info =>
            `<div class="info-row">
                <span class="info-label">${info.label}</span>
                <span class="info-value${info.muted ? ' muted' : ''}">
                    ${info.color ? `<span class="color-preview" style="background-color: ${info.color}"></span>` : ''}
                    ${info.value}
                </span>
            </div>`
        ).join('');
    }

    // 관계
    if (dom.character.relationships) {
        if (profile.relationships?.length > 0) {
            dom.character.relationships.classList.toggle('single-row', profile.relationships.length <= 3);
            dom.character.relationships.innerHTML = profile.relationships.map(rel =>
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
            dom.character.relationships.classList.remove('single-row');
            dom.character.relationships.innerHTML = '<p class="relationships-empty">등록된 관계가 없습니다.</p>';
        }
    }

    renderIcons();
}

// ============================================================
// 오너 프로필 렌더링
// ============================================================

export function renderOwnerProfile() {
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

    // 그리드들
    const grids = [
        { id: 'owner-interests-grid', data: owner.ownerInfo },
        { id: 'owner-communication', data: owner.communication },
        { id: 'owner-mention', data: owner.mention },
        { id: 'owner-contact', data: owner.contact },
        { id: 'owner-fanwork', data: owner.fanwork }
    ];

    grids.forEach(({ id, data }) => {
        const grid = document.getElementById(id);
        if (grid && data) {
            grid.innerHTML = data.map(item =>
                `<div class="owner-info-item">
                    <span class="owner-info-label">${item.label}</span>
                    <span class="owner-info-value">${item.value}</span>
                </div>`
            ).join('');
        }
    });

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

    renderIcons();
}

// ============================================================
// 모티프 렌더링
// ============================================================

export function renderMotifPage() {
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

    renderIcons();
}
