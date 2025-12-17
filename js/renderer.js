// ============================================================
// 렌더링 모듈
// ============================================================

import { playlistData } from '../data/playlist.js';
import { characterData } from '../data/character.js';
import { ownerData } from '../data/owner.js';
import { motifData } from '../data/motif.js';
import { config } from '../data/config.js';
import { state, getDOM } from './store.js';
import { renderIcons, safeGet } from './utils.js';

// ============================================================
// 플레이리스트 렌더링
// ============================================================

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

function highlightSearchText(text) {
    if (!state.searchQuery || !text) return text;
    const regex = new RegExp(`(${state.searchQuery})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
}

export function scrollToCurrentSong() {
    const dom = getDOM();
    const container = dom.playlist.container;
    const activeItem = container?.querySelector('.song-item.active');
    if (activeItem) {
        activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

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

export function loadSongUI(index) {
    const song = playlistData[index];
    if (!song) return;
    
    const dom = getDOM();
    
    if (dom.player.albumArt) {
        dom.player.albumArt.src = song.cover || '';
        dom.player.albumArt.onerror = () => {
            dom.player.albumArt.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23333" width="100" height="100"/><text x="50" y="55" text-anchor="middle" fill="%23666" font-size="40">♪</text></svg>';
        };
    }
    
    if (dom.player.title) {
        dom.player.title.innerText = song.title || 'Unknown Title';
        dom.player.title.onclick = song.link ? () => window.open(song.link, '_blank') : null;
    }
    
    if (dom.player.artist) {
        dom.player.artist.innerText = song.artist || 'Unknown Artist';
    }
    
    if (dom.player.zone && song.cover) {
        dom.player.zone.style.setProperty('--player-bg-image', `url('${song.cover}')`);
    }
    
    if (dom.player.hashtags) {
        const tags = song.hashtags || [];
        dom.player.hashtags.innerHTML = tags.length > 0
            ? tags.map(t => `<span class="hashtag">${t}</span>`).join('')
            : '';
    }

    if (dom.player.comment) {
        const comment = (song.comment || '').trim();
        if (comment) {
            dom.player.comment.innerText = `"${comment}"`;
            dom.player.comment.style.display = 'block';
        } else {
            dom.player.comment.style.display = 'none';
        }
    }

    updatePlaylistActiveState();

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
// 나이 탭 렌더링
// ============================================================

export function renderAgeTabs() {
    const container = document.getElementById('age-tabs-container');
    if (!container) return;
    
    const profiles = characterData.profiles;
    const ages = Object.keys(profiles);
    
    if (ages.length === 0) {
        container.style.display = 'none';
        return;
    }
    
    if (ages.length === 1) {
        container.parentElement.style.display = 'none';
        state.currentAge = ages[0];
        return;
    }
    
    container.innerHTML = ages.map((age, index) => {
        const profile = profiles[age];
        const label = profile.tabLabel || `${age}세`;
        const isActive = age === String(state.currentAge) || (index === 0 && !state.currentAge);
        
        return `<button class="age-tab ${isActive ? 'active' : ''}" data-age="${age}">${label}</button>`;
    }).join('');
    
    if (!state.currentAge || !profiles[state.currentAge]) {
        state.currentAge = ages[0];
    }
}

// ============================================================
// 정보 카드 동적 렌더링 (config 기반)
// ============================================================

/**
 * 템플릿 문자열에서 값 추출
 * '{common.birthday}' → '11월 29일'
 */
function resolveTemplate(template, profile, common) {
    if (!template) return '';
    
    return template.replace(/\{([^}]+)\}/g, (match, path) => {
        const parts = path.split('.');
        let value;
        
        if (parts[0] === 'common') {
            value = safeGet(common, parts.slice(1).join('.'));
        } else if (parts[0] === 'profile') {
            value = safeGet(profile, parts.slice(1).join('.'));
        }
        
        // moodSong 특수 처리
        if (value && typeof value === 'object') {
            if (value.title && value.artist) {
                return `${value.title} (${value.artist})`;
            }
            if (value.name) return value.name;
        }
        
        return value || '';
    });
}

/**
 * 정보 카드 렌더링
 */
function renderInfoCards(age, profile, common) {
    const dom = getDOM();
    const cardDefs = config.fieldDefinitions?.infoCards;
    
    // fieldDefinitions가 없으면 기존 방식 사용
    if (!cardDefs) {
        renderInfoCardsLegacy(age, profile, common);
        return;
    }
    
    const containers = {
        basicInfo: dom.character.basicInfo,
        birthInfo: dom.character.birthInfo,
        magicInfo: dom.character.magicInfo
    };
    
    cardDefs.forEach(cardDef => {
        const container = containers[cardDef.id];
        if (!container) return;
        
        // 카드 타이틀 업데이트
        const titleEl = container.closest('.info-card')?.querySelector('.info-card-title');
        if (titleEl) titleEl.textContent = cardDef.title;
        
        // 행 렌더링
        const rowsHtml = cardDef.rows.map(row => {
            let value = resolveTemplate(row.template, profile, common);
            
            // fallback 처리
            if (!value && row.fallback) {
                value = resolveTemplate(row.fallback, profile, common);
            }
            
            // 색상 프리뷰
            let colorHtml = '';
            if (row.color) {
                const colorValue = resolveTemplate(row.color, profile, common);
                if (colorValue) {
                    colorHtml = `<span class="color-preview" style="background-color: ${colorValue}"></span>`;
                }
            }
            
            // 무드곡 링크 처리
            if (row.type === 'song') {
                const moodSong = safeGet(profile, 'magic.moodSong');
                if (moodSong?.url) {
                    value = `<a href="${moodSong.url}" target="_blank" rel="noopener noreferrer" class="mood-song-link">${moodSong.title} (${moodSong.artist})</a>`;
                }
            }
            
            const mutedClass = row.type === 'song' ? ' muted' : '';
            
            return `
                <div class="info-row">
                    <span class="info-label">${row.label}</span>
                    <span class="info-value${mutedClass}">${colorHtml}${value}</span>
                </div>
            `;
        }).join('');
        
        container.innerHTML = rowsHtml;
    });
}

/**
 * 기존 방식 (fieldDefinitions 없을 때)
 */
function renderInfoCardsLegacy(age, profile, common) {
    const dom = getDOM();
    const labels = config.labels || {};
    const cardTitles = document.querySelectorAll('.info-card-title');
    
    // 1. BASIC INFO
    if (cardTitles[0]) cardTitles[0].textContent = labels.basicInfo || 'BASIC INFO';
    if (dom.character.basicInfo) {
        const basicInfo = [
            { label: labels.heightWeight || '키 / 체중', value: `${profile.basic?.height || ''} / ${profile.basic?.weight || ''}` },
            { label: labels.affiliation || (profile.basic?.house ? '기숙사' : '진영'), value: profile.basic?.house || profile.basic?.faction || '' },
            { label: labels.nationality || '국적', value: profile.basic?.nationality || '' },
            { label: labels.blood || '혈통', value: common.bloodStatus || '' }
        ];
        dom.character.basicInfo.innerHTML = basicInfo.map(info =>
            `<div class="info-row">
                <span class="info-label">${info.label}</span>
                <span class="info-value">${info.value}</span>
            </div>`
        ).join('');
    }

    // 2. BIRTH INFO
    if (cardTitles[1]) cardTitles[1].textContent = labels.birthInfo || 'BIRTH INFO';
    if (dom.character.birthInfo) {
        const birthInfo = [
            { label: labels.birthday || '생일', value: common.birthday || '' },
            { label: labels.birthFlowerTree || '탄생화 / 탄생목', value: `${common.birthFlower || ''} / ${common.birthTree || ''}` },
            { label: labels.birthStone || '탄생석', value: common.birthStone || '' },
            { label: labels.birthColor || '탄생색', value: common.birthColor?.name || '', color: common.birthColor?.hex }
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

    // 3. MAGIC INFO
    if (cardTitles[2]) cardTitles[2].textContent = labels.magicInfo || 'MAGIC INFO';
    if (dom.character.magicInfo) {
        const themeColor = profile.themeColorAccent || profile.themeColor;
        const moodSong = profile.magic?.moodSong || {};
        const moodSongValue = moodSong.url
            ? `<a href="${moodSong.url}" target="_blank" rel="noopener noreferrer" class="mood-song-link">${moodSong.title || ''} (${moodSong.artist || ''})</a>`
            : `${moodSong.title || ''} (${moodSong.artist || ''})`;
            
        const magicInfo = [
            { label: labels.wand || '지팡이', value: `${common.wand?.wood || ''} / ${common.wand?.core || ''}` },
            { label: labels.wandLength || '길이 / 유연성', value: `${common.wand?.length || ''} / ${common.wand?.flexibility || ''}` },
            { label: labels.themeColor || '테마색', value: themeColor || '', color: themeColor },
            { label: labels.moodSong || '무드곡', value: moodSongValue, muted: true }
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
}

// ============================================================
// 캐릭터 프로필 렌더링
// ============================================================

export function renderCharacterProfile(age = state.currentAge) {
    const profile = safeGet(characterData, `profiles.${age}`);
    const common = safeGet(characterData, 'common', {});
    
    if (!profile) return;

    const dom = getDOM();
    
    const profileContainer = dom.character.profile();
    if (profileContainer) {
        profileContainer.setAttribute('data-age', age);
    }

    // 명제 섹션
    if (dom.character.propNumber) dom.character.propNumber.textContent = profile.proposition?.number || '';
    if (dom.character.propKanji) dom.character.propKanji.textContent = profile.proposition?.kanji ? `「 ${profile.proposition.kanji} 」` : '';
    if (dom.character.propDesc) {
        dom.character.propDesc.innerHTML = profile.proposition?.description || '';
        dom.character.propDesc.classList.toggle('scripture-text', profile.proposition?.isScripture);
    }

    // 한마디
    if (dom.character.quoteMain) dom.character.quoteMain.innerHTML = profile.quote?.main ? `" ${profile.quote.main} "` : '';
    if (dom.character.quoteSub) {
        dom.character.quoteSub.textContent = profile.quote?.sub || '';
        dom.character.quoteSub.style.display = profile.quote?.sub ? 'block' : 'none';
    }
    if (dom.character.quoteDesc) {
        dom.character.quoteDesc.innerHTML = (profile.quote?.description || [])
            .map(line => line ? `<p>${line}</p>` : '<p>&nbsp;</p>')
            .join('');
    }

    // 아바타
    if (dom.character.avatar) {
        if (profile.image) {
            dom.character.avatar.src = profile.image;
            if (dom.character.avatarPlaceholder) dom.character.avatarPlaceholder.style.display = 'none';
        } else {
            dom.character.avatar.src = '';
            if (dom.character.avatarPlaceholder) dom.character.avatarPlaceholder.style.display = 'block';
        }
    }

    // 크레딧
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

    // 이름 & 소속
    if (dom.character.nameKr) dom.character.nameKr.textContent = profile.name?.kr || '';
    if (dom.character.nameEn) dom.character.nameEn.textContent = profile.name?.en || '';
    
    // NAME 라벨 업데이트
    const nameLabel = document.querySelector('.name-label');
    if (nameLabel) nameLabel.textContent = config.labels?.name || 'NAME';

    if (dom.character.affiliationBadge) {
        dom.character.affiliationBadge.setAttribute('data-type', profile.affiliation?.type || 'house');
    }
    if (dom.character.affiliationName) {
        dom.character.affiliationName.textContent = profile.affiliation?.name || '';
    }

    // 성격
    if (dom.character.personalityTags) {
        dom.character.personalityTags.innerHTML = (profile.personality?.tags || [])
            .map(tag => `<span class="personality-tag">${tag}</span>`)
            .join('');
    }
    if (dom.character.personalityDesc) {
        dom.character.personalityDesc.innerHTML = (profile.personality?.description || [])
            .map(line => `<p>${line}</p>`)
            .join('');
    }

    // ★ 정보 카드 렌더링 (config 기반 또는 기존 방식)
    renderInfoCards(age, profile, common);

    // 관계
    if (dom.character.relationships) {
        const relationships = profile.relationships || [];
        if (relationships.length === 0) {
            dom.character.relationships.innerHTML = '<p class="no-relationships">등록된 관계가 없습니다.</p>';
        } else {
            dom.character.relationships.innerHTML = relationships.map(rel => `
                <div class="relationship-card">
                    <div class="rel-avatar">${rel.initial || rel.name?.charAt(0) || '?'}</div>
                    <div class="rel-info">
                        <div class="rel-name">${rel.name || ''}</div>
                        <div class="rel-detail">${rel.detail || ''}</div>
                    </div>
                </div>
            `).join('');
        }
    }
}

// ============================================================
// 오너 프로필 렌더링
// ============================================================

export function renderOwnerProfile() {
    const dom = getDOM();
    
    // 프로필 이미지
    const profileImg = document.getElementById('owner-profile-img');
    if (profileImg && ownerData.profileImage) {
        profileImg.src = ownerData.profileImage;
    }
    
    // 마스코트 이미지
    const mascotImg = document.getElementById('owner-mascot-img');
    if (mascotImg && ownerData.mascotImage) {
        mascotImg.src = ownerData.mascotImage;
    }
    
    // 이름
    const nameEl = document.getElementById('owner-name');
    if (nameEl) {
        nameEl.innerHTML = ownerData.nameStyle || ownerData.name || '';
    }
    
    // 인용구
    const quoteEl = document.getElementById('owner-quote');
    if (quoteEl && ownerData.quote) {
        quoteEl.textContent = ownerData.quote;
    }
    
    // 설명
    const descEl = document.getElementById('owner-description');
    if (descEl && ownerData.description) {
        descEl.innerHTML = ownerData.description.map(line => `<p>${line}</p>`).join('');
    }
    
    // 태그
    const tagsEl = document.getElementById('owner-tags');
    if (tagsEl && ownerData.tags) {
        tagsEl.innerHTML = ownerData.tags.map(tag => `<span class="owner-tag">${tag}</span>`).join('');
    }
    
    // 정보 그리드들
    const grids = ['ownerInfo', 'communication', 'mention', 'contact', 'fanwork'];
    grids.forEach(gridKey => {
        const container = document.getElementById(`owner-${gridKey}-grid`);
        if (container && ownerData[gridKey]) {
            container.innerHTML = ownerData[gridKey].map(item => `
                <div class="owner-info-row">
                    <span class="owner-info-label">${item.label}</span>
                    <span class="owner-info-value">${item.value}</span>
                </div>
            `).join('');
        }
    });
    
    // 링크
    const linksEl = document.getElementById('owner-links');
    if (linksEl && ownerData.links) {
        linksEl.innerHTML = ownerData.links.map(link => `
            <a href="${link.url}" target="_blank" rel="noopener noreferrer" class="owner-link">
                <i data-lucide="${link.icon || 'link'}"></i>
                <span>${link.text}</span>
            </a>
        `).join('');
        renderIcons();
    }
}

// ============================================================
// 모티프 페이지 렌더링
// ============================================================

export function renderMotifPage() {
    const container = document.getElementById('motif-grid');
    if (!container || !motifData) return;
    
    container.innerHTML = motifData.map(item => `
        <div class="motif-card">
            <div class="motif-image-wrapper">
                <img src="${item.image}" alt="${item.title}" loading="lazy">
            </div>
            <div class="motif-content">
                <h3 class="motif-title">${item.title}</h3>
                ${item.source ? `<p class="motif-source">${item.source}</p>` : ''}
                ${item.description ? `<p class="motif-description">${item.description}</p>` : ''}
            </div>
        </div>
    `).join('');
}
