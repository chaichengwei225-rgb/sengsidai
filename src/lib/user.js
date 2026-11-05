import { NICKNAME_ADJECTIVES, NICKNAME_NOUNS } from './constants';

const USER_STORAGE_KEY = 'wallet_wait_user_profile';

// 生成随机匿名昵称
export function generateRandomNickname() {
  const adj = NICKNAME_ADJECTIVES[Math.floor(Math.random() * NICKNAME_ADJECTIVES.length)];
  const noun = NICKNAME_NOUNS[Math.floor(Math.random() * NICKNAME_NOUNS.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${adj}${noun}_${num}`;
}

// 生成随机用户唯一 ID
export function generateUserId() {
  return 'u_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

// 检查用户是否已完成首次性别、MBTI、星座设置
export function isProfileOnboarded(user) {
  return Boolean(user && user.gender && user.mbti && user.zodiac);
}

// 获取或初始化当前用户身份
export function getCurrentUser() {
  try {
    const cached = localStorage.getItem(USER_STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.id && parsed.nickname) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to parse user profile from localStorage', e);
  }

  // 首次生成
  const newUser = {
    id: generateUserId(),
    nickname: generateRandomNickname(),
    gender: '',
    mbti: '',
    zodiac: '',
    createdAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
  } catch (e) {
    console.error('Failed to save user profile', e);
  }

  return newUser;
}

// 更新当前用户资料（昵称、性别、MBTI、星座）
export function updateUserProfile(updates) {
  const current = getCurrentUser();
  const updated = {
    ...current,
    ...updates,
    nickname: updates.nickname !== undefined 
      ? ((updates.nickname || '').trim() || current.nickname || generateRandomNickname()) 
      : current.nickname,
  };
  try {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('wallet_wait_user_updated', { detail: updated }));
  } catch (e) {
    console.error('Failed to update user profile', e);
  }
  return updated;
}

// 更新当前用户昵称（兼容旧调用）
export function updateNickname(newNickname) {
  return updateUserProfile({ nickname: newNickname });
}

// 重置用户身份画像
export function resetUserProfile() {
  const newUser = {
    id: generateUserId(),
    nickname: generateRandomNickname(),
    gender: '保密',
    mbti: 'INTJ',
    zodiac: '天蝎座',
    createdAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
    window.dispatchEvent(new CustomEvent('wallet_wait_user_updated', { detail: newUser }));
  } catch (e) {
    console.error('Failed to reset user profile', e);
  }
  return newUser;
}
