// ============================================================
// 렌더러 - 정보 카드 동적 렌더링 (config 기반)
// ============================================================

import { config } from '../data/config.js';
import { characterData } from '../data/character.js';
import { state, getDOM } from './store.js';
import { safeGet } from './utils.js';

/**
 * 템플릿 문자열에서 값 추출
 * '{common.birthday}' → '11월 29일'
 * '{profile.basic.height} / {profile.basic.weight}' → '130cm / 25kg'
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
 * 정보 카드 동적 렌더링
 */
export function renderInfoCards(age = state.currentAge) {
    const profile = safeGet(characterData, `profiles.${age}`);
    const common = safeGet(characterData, 'common', {});
    const cardDefs = config.fieldDefinitions?.infoCards;
    
    if (!profile || !cardDefs) return;
    
    const dom = getDOM();
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

// ============================================================
// 기존 renderCharacterProfile에서 infoCards 부분을 이 함수로 대체
// ============================================================

/**
 * 캐릭터 프로필 렌더링 (수정본)
 * - 기존 하드코딩된 infoCards 로직 → renderInfoCards() 호출로 변경
 */
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

    // ★ 정보 카드 - config 기반 동적 렌더링
    renderInfoCards(age);

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
