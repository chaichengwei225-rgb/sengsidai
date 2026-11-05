import React, { useState } from 'react';
import { Sparkles, Check, User, Dices } from 'lucide-react';
import { GENDER_OPTIONS, MBTI_OPTIONS, ZODIAC_OPTIONS } from '../lib/constants';
import { updateUserProfile, generateRandomNickname } from '../lib/user';

export default function OnboardingModal({ user, onComplete }) {
  const activeUser = user || {};
  const [nickname, setNickname] = useState(activeUser.nickname || generateRandomNickname());
  const [gender, setGender] = useState(activeUser.gender || '');
  const [mbti, setMbti] = useState(activeUser.mbti || '');
  const [zodiac, setZodiac] = useState(activeUser.zodiac || '');
  const [errorMsg, setErrorMsg] = useState('');

  const isReady = Boolean(gender && mbti && zodiac);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!gender || !mbti || !zodiac) {
      setErrorMsg('请完整选择性别、MBTI 和星座，以便生成您的省思档案！');
      return;
    }

    const updated = updateUserProfile({
      nickname: nickname.trim(),
      gender,
      mbti,
      zodiac,
    });

    if (onComplete) {
      onComplete(updated);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-amber-100 my-auto text-left max-h-[92vh] overflow-y-auto no-scrollbar">
        {/* 头部标题 */}
        <div className="text-center mb-5">
          <div className="w-14 h-14 mx-auto rounded-3xl bg-gradient-to-tr from-amber-400 to-yellow-300 flex items-center justify-center text-3xl shadow-md mb-2">
            👛
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            欢迎来到省思袋 ✋
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            建立您的专属匿名档案。让懂你的同频网友和 AI 在冷静期里为你把关每一笔开销！
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 mb-4 rounded-2xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-medium">
            ⚠️ {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 昵称 */}
          <div className="bg-amber-50/50 p-3.5 rounded-2xl border border-amber-100">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-amber-600" />
                <span>您的匿名昵称</span>
              </label>
              <button
                type="button"
                onClick={() => setNickname(generateRandomNickname())}
                className="text-[11px] font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
              >
                <Dices className="w-3 h-3" />
                <span>换一个</span>
              </button>
            </div>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-hidden focus:border-amber-400"
              placeholder="请输入您的昵称"
            />
          </div>

          {/* 1. 性别 */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-2">
              1. 您的性别 <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {GENDER_OPTIONS.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGender(g)}
                  className={`py-2 px-3 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    gender === g
                      ? 'bg-amber-500 text-white shadow-xs glow-amber ring-2 ring-amber-300'
                      : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-amber-50/60'
                  }`}
                >
                  {gender === g && <Check className="w-3 h-3 stroke-[3]" />}
                  <span>{g}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. MBTI */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800">
                2. 您的 MBTI 人格类型 <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] font-mono font-bold text-amber-700">
                {mbti ? `已选: ${mbti}` : '请点击选择'}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5 max-h-36 overflow-y-auto p-1 bg-slate-50/80 rounded-2xl border border-slate-200/80">
              {MBTI_OPTIONS.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setMbti(type)}
                  className={`py-1.5 rounded-xl text-xs font-mono font-bold transition cursor-pointer ${
                    mbti === type
                      ? 'bg-amber-500 text-white shadow-xs ring-2 ring-amber-300'
                      : 'bg-white text-slate-700 border border-slate-200/70 hover:bg-amber-100/60'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* 3. 星座 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800">
                3. 您的星座 <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] font-bold text-amber-700">
                {zodiac ? `已选: ${zodiac}` : '请点击选择'}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5 max-h-36 overflow-y-auto p-1 bg-slate-50/80 rounded-2xl border border-slate-200/80">
              {ZODIAC_OPTIONS.map((z) => (
                <button
                  key={z}
                  type="button"
                  onClick={() => setZodiac(z)}
                  className={`py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    zodiac === z
                      ? 'bg-amber-500 text-white shadow-xs ring-2 ring-amber-300'
                      : 'bg-white text-slate-700 border border-slate-200/70 hover:bg-amber-100/60'
                  }`}
                >
                  {z}
                </button>
              ))}
            </div>
          </div>

          {/* 底部确认按钮 */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={!isReady}
              className={`w-full py-3.5 rounded-2xl text-xs font-black text-white shadow-lg transition flex items-center justify-center gap-1.5 ${
                isReady
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 glow-amber cursor-pointer active:scale-98'
                  : 'bg-slate-300 cursor-not-allowed opacity-60'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>{isReady ? '完成设置，进入省思袋' : '请先选齐性别、MBTI与星座'}</span>
            </button>
            <p className="text-[10px] text-center text-slate-400 mt-2">
              选好的资料将保存在您的本机，后续可随时在“我的”页面修改。
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
