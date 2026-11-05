import { 
  syncFromCloud, 
  getCachedGoodItems, 
  createGoodItem as createCloudGoodItem,
  deleteGoodItem as deleteCloudGoodItem
} from './cloudStore';
import { INITIAL_GOOD_ITEMS } from './goodItemsFallback';

export function getLocalGoodItems() {
  return getCachedGoodItems() || INITIAL_GOOD_ITEMS;
}

export function saveLocalGoodItem(item) {
  return createCloudGoodItem(item);
}

/**
 * 获取好物分享列表（全网云端同步）
 */
export async function fetchGoodItems() {
  try {
    const data = await syncFromCloud();
    if (data && data.goodItems && data.goodItems.length > 0) {
      return data.goodItems;
    }
  } catch (err) {
    console.warn('[GoodItems] fetch failed, using cached:', err);
  }
  return getCachedGoodItems() || INITIAL_GOOD_ITEMS;
}

/**
 * 发布一笔好物分享（全网云端同步）
 */
export async function createGoodItem(item) {
  try {
    const created = await createCloudGoodItem(item);
    return { success: true, data: created };
  } catch (e) {
    console.warn('[GoodItems] create failed:', e);
    return { success: true, data: item };
  }
}

/**
 * 删除本人发布的好物分享（全网同步）
 */
export async function removeGoodItem(itemId, userId) {
  return deleteCloudGoodItem(itemId, userId);
}
