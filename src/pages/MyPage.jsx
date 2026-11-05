import React, { useState } from 'react';
import { User, Edit2, Dices, Check, Sparkles, Database, Shield, RefreshCw } from 'lucide-react';
import { getCurrentUser, updateUserProfile, generateRandomNickname, resetUserProfile } from '../lib/user';
import { GENDER_OPTIONS, MBTI_OPTIONS, ZODIAC_OPTIONS } from '../lib/constants';

export default function MyPage({ onOpenConfig }) {
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());

  // 个人资料编辑表单状态
  const [editNick, setEditNick] = useState(currentUser.nickname);
  const [editGender, setEditGender] = useState(currentUser.gender || '保密');
  const [editMbti, setEditMbti] = useState(currentUser.mbti || 'INTJ');
  const [editZodiac, setEditZodiac] = useState(currentUser.zodiac || '天蝎座');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // 保存个人资料
  const handleSaveProfile = (e) => {
    e?.preventDefault();
    if (!editNick.trim()) return;

    const updated = updateUserProfile({
      nickname: editNick.trim(),
      gender: editGender,
      mbti: editMbti,
      zodiac: editZodiac,
    });
    setCurrentUser(updated);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleRandomNick = () => {
    const random = generateRandomNickname();
    setEditNick(random);
  };

  const handleReset = () => {
    if (window.confirm('确定要重置当前匿名身份画像吗？将为您重新生成全新随机昵称与身份。')) {
      const reset = resetUserProfile();
      setCurrentUser(reset);
      setEditNick(reset.nickname);
      setEditGender(reset.gender || '保密');
      setEditMbti(reset.mbti || 'INTJ');
      setEditZodiac(reset.zodiac || '天蝎座');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    }
  };

  return (
    <div className="space-y-6 pb-28 text-left max-w-2xl mx-auto animate-fadeIn">
      {/* 顶部个人身份名片 */}
      <div className="bg-gradient-to-br from-amber-500 via-amber-400 to-yellow-400 rounded-3xl p-6 sm:p-8 text-white shadow-xl glow-amber relative overflow-hidden">
        <div className="relative z-10 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-3xl shadow-inner border border-white/30">
              👤
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-black text-xl sm:text-2xl text-white">
                  @{currentUser.nickname}
                </h1>
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">
                  匿名极简ID
                </span>
              </div>
              <p className="text-xs text-amber-100 font-mono mt-0.5 opacity-90">
                用户标识：{currentUser.id.slice(0, 16)}...
              </p>

              {/* 画像徽章标签 */}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-lg bg-white/20 backdrop-blur-md text-xs font-bold text-white">
                  {currentUser.gender || '保密'}
                </span>
                <span className="px-2.5 py-0.5 rounded-lg bg-white/20 backdrop-blur-md text-xs font-mono font-bold text-white">
                  {currentUser.mbti || 'INTJ'}
                </span>
                <span className="px-2.5 py-0.5 rounded-lg bg-white/20 backdrop-blur-md text-xs font-bold text-white">
                  {currentUser.zodiac || '天蝎座'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 装饰水印 */}
        <div className="absolute -right-4 -bottom-6 text-9xl opacity-15 pointer-events-none select-none">
          👝
        </div>
      </div>

      {/* 核心板块：个人资料与画像编辑 */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-amber-100 shadow-sm text-left space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
              <Edit2 className="w-4 h-4 text-amber-600" />
              <span>编辑个人画像与资料</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              修改您在省思袋广场发表审批、参与表态时的展示昵称与个性画像
            </p>
          </div>
          {saveSuccess && (
            <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200 animate-fadeIn flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> 已保存
            </span>
          )}
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          {/* 昵称 */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">展示昵称</label>
              <button
                type="button"
                onClick={handleRandomNick}
                className="text-xs text-amber-700 hover:text-amber-800 flex items-center gap-1 font-bold cursor-pointer"
              >
                <Dices className="w-3.5 h-3.5" />
                <span>随机趣味昵称</span>
              </button>
            </div>
            <input
              type="text"
              value={editNick}
              onChange={(e) => setEditNick(e.target.value)}
              placeholder="请输入您的昵称"
              maxLength={20}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-hidden focus:border-amber-400"
            />
          </div>

          {/* 性别单选 */}
          <div>
            <label className="text-xs font-bold text-slate-700 mb-1.5 block">性别偏好</label>
            <div className="grid grid-cols-3 gap-2.5">
              {GENDER_OPTIONS.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setEditGender(g)}
                  className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    editGender === g
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* MBTI 与 星座 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1.5 block">MBTI 人格画像</label>
              <select
                value={editMbti}
                onChange={(e) => setEditMbti(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-hidden focus:border-amber-400"
              >
                {MBTI_OPTIONS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 mb-1.5 block">所属星座</label>
              <select
                value={editZodiac}
                onChange={(e) => setEditZodiac(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-hidden focus:border-amber-400"
              >
                {ZODIAC_OPTIONS.map((z) => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 保存按钮 */}
          <button
            type="submit"
            className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-white font-black text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5 active:scale-98 cursor-pointer mt-2"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>保存资料更新</span>
          </button>
        </form>
      </div>

      {/* 偏好与系统设置 */}
      <div className="bg-white rounded-3xl p-6 border border-amber-100 shadow-sm text-left space-y-4">
        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
          <Database className="w-4 h-4 text-slate-600" />
          <span>系统与设置</span>
        </h2>

        <div className="space-y-3 text-xs">
          {/* 数据库配置入口 */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
            <div>
              <div className="font-bold text-slate-800">自定义数据库连接 (Supabase)</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                可接入您自己的私有 Supabase 实例与 Realtime 实时订阅频道
              </div>
            </div>
            <button
              onClick={() => onOpenConfig && onOpenConfig()}
              className="px-3 py-1.5 bg-white border border-slate-300 hover:border-amber-400 text-slate-700 font-bold rounded-xl shadow-2xs transition cursor-pointer shrink-0 ml-2"
            >
              配置数据库
            </button>
          </div>

          {/* 重置匿名身份 */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
            <div>
              <div className="font-bold text-slate-800">重置身份画像标识</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                清除本地当前身份缓存，重新初始化随机昵称
              </div>
            </div>
            <button
              onClick={handleReset}
              className="px-3 py-1.5 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold rounded-xl shadow-2xs transition cursor-pointer shrink-0 ml-2"
            >
              重置身份
            </button>
          </div>
        </div>

        {/* 隐私与存储说明 */}
        <div className="p-3.5 bg-amber-50/60 rounded-2xl border border-amber-100 text-[11px] text-amber-900/80 leading-relaxed flex items-start gap-2">
          <Shield className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">匿名与数据说明：</span>
            本站采用极简匿名机制，无需注册手机号或密码。您的画像与本地操作均保存在当前浏览器，并已全网自动联网同步！
          </div>
        </div>
      </div>
    </div>
  );
}
