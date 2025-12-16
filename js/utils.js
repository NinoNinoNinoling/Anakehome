// ============================================================
// 유틸리티 함수
// ============================================================

/**
 * 디바운스 함수
 * @param {Function} func - 실행할 함수
 * @param {number} wait - 대기 시간 (ms)
 */
export function debounce(func, wait) {
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

/**
 * 시간 포맷 (초 → M:SS)
 * @param {number} seconds
 * @returns {string}
 */
export function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' + s : s}`;
}

/**
 * YouTube URL에서 비디오 ID 추출
 * @param {string} url
 * @returns {string}
 */
export function extractYouTubeId(url) {
    try {
        const urlObj = new URL(url);
        if (urlObj.hostname.includes('youtube.com')) {
            return urlObj.searchParams.get('v');
        } else if (urlObj.hostname.includes('youtu.be')) {
            return urlObj.pathname.slice(1).split('?')[0];
        }
    } catch (e) {
        console.warn('Invalid YouTube URL:', url);
    }
    return '';
}

/**
 * 로딩 스피너 표시
 * @param {string} targetId - 대상 요소 ID
 * @param {string} message - 로딩 메시지
 */
export function showLoading(targetId, message = '로딩 중...') {
    const target = document.getElementById(targetId);
    if (!target) return;
    target.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            <span>${message}</span>
        </div>
    `;
}

/**
 * 로딩 스피너 제거
 * @param {string} targetId
 */
export function hideLoading(targetId) {
    const target = document.getElementById(targetId);
    if (!target) return;
    const spinner = target.querySelector('.loading-spinner');
    if (spinner) spinner.remove();
}

/**
 * Lucide 아이콘 렌더링 (디바운스 적용)
 */
let iconRenderTimeout = null;
export function renderIcons(delay = 50) {
    if (iconRenderTimeout) clearTimeout(iconRenderTimeout);
    iconRenderTimeout = setTimeout(() => {
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }, delay);
}

/**
 * localStorage 안전하게 읽기
 * @param {string} key
 * @param {*} defaultValue
 */
export function getStorage(key, defaultValue = null) {
    try {
        const value = localStorage.getItem(key);
        return value !== null ? JSON.parse(value) : defaultValue;
    } catch (e) {
        return defaultValue;
    }
}

/**
 * localStorage 안전하게 쓰기
 * @param {string} key
 * @param {*} value
 */
export function setStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        console.warn('localStorage write failed:', e);
    }
}

// ============================================================
// 에러 핸들링
// ============================================================

/**
 * 안전한 fetch 래퍼
 * @param {string} url
 * @param {Object} options
 * @returns {Promise<Response|null>}
 */
export async function safeFetch(url, options = {}) {
    try {
        const response = await fetch(url, {
            ...options,
            signal: AbortSignal.timeout(options.timeout || 10000)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return response;
    } catch (error) {
        if (error.name === 'AbortError') {
            console.error(`Fetch timeout: ${url}`);
        } else {
            console.error(`Fetch failed: ${url}`, error);
        }
        return null;
    }
}

/**
 * 안전한 프로퍼티 접근
 * @param {Object} obj
 * @param {string} path - 점 표기법 경로 (예: 'user.profile.name')
 * @param {*} defaultValue
 */
export function safeGet(obj, path, defaultValue = null) {
    try {
        return path.split('.').reduce((acc, key) => acc?.[key], obj) ?? defaultValue;
    } catch {
        return defaultValue;
    }
}

/**
 * 에러 토스트 표시
 * @param {string} message
 * @param {number} duration
 */
export function showError(message, duration = 3000) {
    // 기존 토스트 제거
    const existing = document.querySelector('.error-toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'error-toast';
    toast.innerHTML = `
        <i data-lucide="alert-circle" size="16"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(toast);
    
    renderIcons(0);
    
    // 페이드 인
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });
    
    // 자동 제거
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

/**
 * 데이터 유효성 검사
 * @param {*} data
 * @param {Object} schema - { field: { required: boolean, type: string } }
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateData(data, schema) {
    const errors = [];
    
    for (const [field, rules] of Object.entries(schema)) {
        const value = safeGet(data, field);
        
        if (rules.required && (value === null || value === undefined || value === '')) {
            errors.push(`${field} 필드가 필요합니다`);
            continue;
        }
        
        if (value !== null && value !== undefined && rules.type) {
            const actualType = Array.isArray(value) ? 'array' : typeof value;
            if (actualType !== rules.type) {
                errors.push(`${field} 필드는 ${rules.type} 타입이어야 합니다`);
            }
        }
    }
    
    return { valid: errors.length === 0, errors };
}
