import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { 
  Sparkles, Globe, Lock, ArrowLeft, Send, Bot, 
  AlertTriangle, Upload, X, Film, Image as ImageIcon, Tag, ChevronDown, ChevronUp, Clock
} from 'lucide-react';
import { 
  CATEGORIES, GENDER_OPTIONS, MBTI_OPTIONS, MBTI_GROUPS, 
  ZODIAC_OPTIONS, EXPECTED_DURATIONS 
} from '../lib/constants';
import { getCurrentUser } from '../lib/user';
import { getSupabase } from '../lib/supabase';
import { createApproval } from '../lib/cloudStore';
import { generateInitialAiAdvice } from '../lib/ai';
import confetti from 'canvas-confetti';

export default function CreatePage() {
  const [, setLocation] = useLocation();
  const currentUser = getCurrentUser();

  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('数码');
  const [reason, setReason] = useState('');
  const [alternative, setAlternative] = useState('');
  const [mode, setMode] = useState('public'); // 'public' | 'group'

  // 媒体上传与预览（支持图片或视频）
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState('image'); // 'image' | 'video'

  // 预计使用多长时间（界面内直选，严禁弹窗）
  const [expectedDuration, setExpectedDuration] = useState('');
  const [customDurationInput, setCustomDurationInput] = useState('');
  const [isCustomDuration, setIsCustomDuration] = useState(false);

  // 发起人当次身份设定（默认带上自己的性别、MBTI、星座）
  const [creatorGender, setCreatorGender] = useState(currentUser.gender || '保密');
  const [creatorMbti, setCreatorMbti] = useState(currentUser.mbti || 'INTJ');
  const [creatorZodiac, setCreatorZodiac] = useState(currentUser.zodiac || '天蝎座');

  // 希望哪些 MBTI 的人来给建议（默认不全选，支持分组收起与一键全部）
  const [targetMbtis, setTargetMbtis] = useState([]);
  const [openMbtiGroup, setOpenMbtiGroup] = useState('分析家 (NT)');

  // 冷静期时长（小时）：12, 24, 48, 72 或自定义 1-168
  const [coolingHours, setCoolingHours] = useState(24);
  const [customCooling, setCustomCooling] = useState(false);
  const [customCoolingInput, setCustomCoolingInput] = useState('');

  // 需要表态人数：5, 10, 15, 20, 30 或自定义 3-50
  const [requiredVotes, setRequiredVotes] = useState(15);
  const [customVotes, setCustomVotes] = useState(false);
  const [customVotesInput, setCustomVotesInput] = useState('');

  // AI 建议权重：0% - 100%，默认 20%
  const [aiWeight, setAiWeight] = useState(20);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 媒体文件选取处理
  const handleMediaChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      setErrorMsg('上传文件过大，请控制在 20MB 以内');
      return;
    }

    const isVideo = file.type.startsWith('video');
    setMediaType(isVideo ? 'video' : 'image');

    const reader = new FileReader();
    reader.onload = (event) => {
      setMediaUrl(event.target?.result || '');
      setErrorMsg('');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveMedia = () => {
    setMediaUrl('');
  };

  // 快速填入示范
  const fillSample = () => {
    setTitle('降噪头戴式蓝牙耳机 WH-1000XM5');
    setPrice('1899');
    setCategory('数码');
    setReason('办公室同事敲机械键盘太吵，急需物理降噪与白噪音隔绝，拯救注意力。');
    setAlternative('目前有一副入耳式AirPods，但戴超过两小时耳朵发胀疼。');
    setMode('public');
    setExpectedDuration('1年以上');
    setIsCustomDuration(false);
    setCoolingHours(24);
    setCustomCooling(false);
    setRequiredVotes(15);
    setCustomVotes(false);
    setAiWeight(20);
    setCreatorGender(currentUser.gender || '男');
    setCreatorMbti(currentUser.mbti || 'INTP');
    setCreatorZodiac(currentUser.zodiac || '天蝎座');
    setTargetMbtis(['INTJ', 'INTP', 'ENTJ', 'ENTP']);
  };

  const calculatedAiVotes = Math.round((aiWeight / 100) * requiredVotes);

  // 表单直接提交（无弹窗）
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!title.trim()) {
      setErrorMsg('请填写想买的商品名称');
      return;
    }
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice < 0) {
      setErrorMsg('请填写正确的商品价格（不能为负数）');
      return;
    }
    if (!reason.trim()) {
      setErrorMsg('请写下购买理由，让网友或朋友帮审');
      return;
    }

    // 预计使用时间校验（必选）
    let finalDuration = expectedDuration;
    if (isCustomDuration) {
      if (!customDurationInput.trim()) {
        setErrorMsg('请填写自定义的预计使用时间（例如：2年、6个月、500次）');
        return;
      }
      finalDuration = customDurationInput.trim();
    }
    if (!finalDuration) {
      setErrorMsg('请选择或输入这件商品的预计使用时间');
      return;
    }

    setSubmitting(true);

    const finalHours = customCooling 
      ? Math.max(1, Math.min(168, parseInt(customCoolingInput, 10) || 24))
      : coolingHours;

    const finalVotes = customVotes
      ? Math.max(3, Math.min(50, parseInt(customVotesInput, 10) || 15))
      : requiredVotes;

    const now = new Date();
    const deadline = new Date(now.getTime() + finalHours * 3600 * 1000).toISOString();

    const initialAi = generateInitialAiAdvice({
      title: title.trim(),
      price: parseFloat(price),
      reason: reason.trim(),
      alternative: alternative.trim(),
      creator_mbti: creatorMbti,
    });

    const newApproval = {
      title: title.trim(),
      price: parseFloat(price),
      category,
      reason: reason.trim(),
      alternative: alternative.trim(),
      mode,
      media_url: mediaUrl || null,
      media_type: mediaType || 'image',
      expected_duration: finalDuration,
      creator_gender: creatorGender,
      creator_mbti: creatorMbti,
      creator_zodiac: creatorZodiac,
      target_mbtis: targetMbtis.length > 0 ? targetMbtis : [],
      cooling_hours: finalHours,
      required_votes: finalVotes,
      max_voters: finalVotes,
      ai_weight: Math.max(0, Math.min(100, parseInt(aiWeight, 10) || 0)),
      ai_verdict: initialAi.verdict,
      ai_reasons: initialAi.reasons,
      ai_generated_at: initialAi.generated_at,
      status: 'pending',
      creator_id: currentUser.id,
      creator_nickname: currentUser.nickname,
      created_at: now.toISOString(),
      deadline,
    };

    try {
      const created = await createApproval(newApproval);
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      setLocation(`/approval/${created.id}?created=1`);
    } catch (err) {
      console.error('Failed to create approval:', err);
      setErrorMsg(`提交失败: ${err.message || '网络连接异常'}`);
    } finally {
      setSubmitting(false);
    }
  };

  // MBTI 多选辅助函数
  const toggleMbti = (type) => {
    if (targetMbtis.includes(type)) {
      setTargetMbtis(targetMbtis.filter(t => t !== type));
    } else {
      setTargetMbtis([...targetMbtis, type]);
    }
  };

  const toggleAllMbti = () => {
    if (targetMbtis.length === MBTI_OPTIONS.length) {
      setTargetMbtis([]);
    } else {
      setTargetMbtis([...MBTI_OPTIONS]);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-32 md:pb-16 text-left animate-fadeIn">
      {/* 顶部标题栏 */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 font-medium py-1 px-2.5 rounded-xl hover:bg-white transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>返回</span>
        </button>
        <button
          onClick={fillSample}
          className="text-xs font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200/80 px-3 py-1 rounded-full transition flex items-center gap-1 active:scale-95 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>一键填入示范</span>
        </button>
      </div>

      <div className="bg-white rounded-3xl p-5 sm:p-8 border border-amber-100 shadow-md">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">📝</span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">发起一笔消费审批</h1>
          </div>
          <p className="text-xs text-slate-500">
            给自己定制冷静期。AI建议与清醒网友共同把关，对抗冲动消费！
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 mb-5 rounded-2xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-medium">
            ⚠️ {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 商品名称 */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              想买什么？ <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="例如：索尼头戴耳机、秋款复古大衣、RTX 4070显卡..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-900 focus:outline-hidden focus:border-amber-400 focus:bg-white transition"
            />
          </div>

          {/* 价格与分类 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                预算金额 (¥) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-3 text-slate-400 font-bold text-sm">¥</span>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0"
                  placeholder="0.00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-8 pr-4 py-3 text-sm font-mono text-slate-900 focus:outline-hidden focus:border-amber-400 focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                商品分类 <span className="text-rose-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-900 focus:outline-hidden focus:border-amber-400 focus:bg-white transition"
              >
                {CATEGORIES.filter(c => c.id !== 'all').map(c => (
                  <option key={c.id} value={c.name}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 核心必选：预计使用多长时间（无弹窗，界面内直接选择） */}
          <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>预计使用多长时间？</span>
                <span className="text-rose-500 font-bold">*</span>
              </label>
              <span className="text-xs font-black text-amber-800 font-mono">
                {isCustomDuration ? (customDurationInput || '自定义填写') : (expectedDuration || '未选')}
              </span>
            </div>

            {/* 预设选项 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {EXPECTED_DURATIONS.map((dur) => (
                <button
                  key={dur}
                  type="button"
                  onClick={() => {
                    setExpectedDuration(dur);
                    setIsCustomDuration(false);
                    setErrorMsg('');
                  }}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center cursor-pointer ${
                    !isCustomDuration && expectedDuration === dur
                      ? 'bg-amber-500 text-white shadow-2xs'
                      : 'bg-white text-slate-700 border border-amber-200/80 hover:bg-amber-100/60'
                  }`}
                >
                  {dur}
                </button>
              ))}

              {/* 自定义选项按钮 */}
              <button
                type="button"
                onClick={() => {
                  setIsCustomDuration(true);
                  setErrorMsg('');
                }}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center cursor-pointer ${
                  isCustomDuration
                    ? 'bg-amber-500 text-white shadow-2xs'
                    : 'bg-white text-slate-700 border border-amber-200/80 hover:bg-amber-100/60'
                }`}
              >
                ✏️ 自定义时间
              </button>
            </div>

            {/* 自定义输入框 */}
            {isCustomDuration && (
              <div className="pt-1.5 space-y-1">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="输入数字与单位，例如：2年、8个月、500次..."
                    value={customDurationInput}
                    onChange={(e) => setCustomDurationInput(e.target.value)}
                    className="flex-1 bg-white border border-amber-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-amber-500"
                    autoFocus
                  />
                </div>
                <p className="text-[10px] text-amber-700">
                  支持任意数字与单位，如“3年”、“半年”、“使用300次以上”等。
                </p>
              </div>
            )}
          </div>

          {/* 图片 / 视频上传与预览 */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              上传商品实拍、截图或视频 <span className="text-slate-400 font-normal">(选填，支持预览)</span>
            </label>

            {mediaUrl ? (
              <div className="relative rounded-2xl overflow-hidden border border-amber-200/80 bg-slate-50 p-2">
                {mediaType === 'video' ? (
                  <video src={mediaUrl} controls className="w-full max-h-56 rounded-xl object-contain bg-black" />
                ) : (
                  <img src={mediaUrl} alt="预览图片" className="w-full max-h-56 object-contain rounded-xl" />
                )}
                <button
                  type="button"
                  onClick={handleRemoveMedia}
                  className="absolute top-4 right-4 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition cursor-pointer"
                  title="移除媒体"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="cursor-pointer border-2 border-dashed border-slate-200 hover:border-amber-400 bg-slate-50/70 hover:bg-amber-50/40 p-4 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition">
                <div className="flex items-center gap-2 text-amber-600">
                  <ImageIcon className="w-5 h-5" />
                  <Film className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-700">点击上传截图、照片或视频</span>
                <span className="text-[10px] text-slate-400">发布前可实时预览，详情页中完整展示</span>
                <input
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={handleMediaChange}
                />
              </label>
            )}
          </div>

          {/* 购买理由 */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              购买理由（为什么想买？能解决什么核心问题？） <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder="请真诚剖析你的心动原因。如果是情绪上头，也请如实坦白，让 AI 与网友帮你灭火！"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm text-slate-900 focus:outline-hidden focus:border-amber-400 focus:bg-white transition resize-none"
            />
          </div>

          {/* 替代方案 */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">
                现有替代方案 / 平替现状 <span className="text-slate-400 font-normal">(选填)</span>
              </label>
              <span className="text-[11px] text-amber-700">家里有没有类似闲置？</span>
            </div>
            <input
              type="text"
              placeholder="例如：家里已有旧款可用、租借、或者二手能省多少..."
              value={alternative}
              onChange={(e) => setAlternative(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-900 focus:outline-hidden focus:border-amber-400 focus:bg-white transition"
            />
          </div>

          {/* 发起人画像设置（性别、MBTI、星座）—— 优化手机排版，不再三列拥挤 */}
          <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-1">
              <label className="text-xs font-bold text-slate-800">
                👤 发起人画像 <span className="text-[11px] text-slate-400 font-normal">(默认使用个人资料，可当次微调)</span>
              </label>
              <span className="text-[11px] font-mono font-bold text-amber-800">
                {creatorGender} · {creatorMbti} · {creatorZodiac}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex items-center justify-between sm:block bg-white sm:bg-transparent p-2 sm:p-0 rounded-xl border border-amber-200/50 sm:border-0">
                <span className="text-xs font-medium text-slate-600 sm:text-[10px] sm:text-slate-500 sm:mb-1 block whitespace-nowrap">
                  性别
                </span>
                <select
                  value={creatorGender}
                  onChange={(e) => setCreatorGender(e.target.value)}
                  className="w-36 sm:w-full bg-slate-50 sm:bg-white border border-amber-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800"
                >
                  {GENDER_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>

              <div className="flex items-center justify-between sm:block bg-white sm:bg-transparent p-2 sm:p-0 rounded-xl border border-amber-200/50 sm:border-0">
                <span className="text-xs font-medium text-slate-600 sm:text-[10px] sm:text-slate-500 sm:mb-1 block whitespace-nowrap">
                  MBTI
                </span>
                <select
                  value={creatorMbti}
                  onChange={(e) => setCreatorMbti(e.target.value)}
                  className="w-36 sm:w-full bg-slate-50 sm:bg-white border border-amber-200 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-slate-800"
                >
                  {MBTI_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              <div className="flex items-center justify-between sm:block bg-white sm:bg-transparent p-2 sm:p-0 rounded-xl border border-amber-200/50 sm:border-0">
                <span className="text-xs font-medium text-slate-600 sm:text-[10px] sm:text-slate-500 sm:mb-1 block whitespace-nowrap">
                  星座
                </span>
                <select
                  value={creatorZodiac}
                  onChange={(e) => setCreatorZodiac(e.target.value)}
                  className="w-36 sm:w-full bg-slate-50 sm:bg-white border border-amber-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800"
                >
                  {ZODIAC_OPTIONS.map(z => <option key={z} value={z}>{z}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* 希望哪些 MBTI 的人来给建议（默认不全选，分组折叠，不占半屏） */}
          <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-amber-600" />
                <span>希望哪些 MBTI 的人来给建议？</span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleAllMbti}
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border transition cursor-pointer ${
                    targetMbtis.length === MBTI_OPTIONS.length
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {targetMbtis.length === MBTI_OPTIONS.length ? '已选全部' : '全选 / 不限'}
                </button>
                <span className="text-[11px] text-amber-700 font-mono font-bold">
                  {targetMbtis.length === 0 ? '不限' : `已选 ${targetMbtis.length} 个`}
                </span>
              </div>
            </div>

            {/* 4 大族群分组折叠选择器 */}
            <div className="space-y-1.5 pt-1">
              {MBTI_GROUPS.filter(g => g.label !== '全部').map((grp) => {
                const isOpen = openMbtiGroup === grp.label;
                const selectedInGroup = grp.types.filter(t => targetMbtis.includes(t)).length;
                return (
                  <div key={grp.label} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setOpenMbtiGroup(isOpen ? '' : grp.label)}
                      className="w-full px-3 py-2 text-xs font-bold text-slate-700 flex items-center justify-between hover:bg-slate-50 transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span>{grp.label}</span>
                        {selectedInGroup > 0 && (
                          <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-md font-mono">
                            {selectedInGroup}/{grp.types.length}
                          </span>
                        )}
                      </div>
                      {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </button>

                    {isOpen && (
                      <div className="p-2.5 pt-1 bg-slate-50/50 border-t border-slate-100 grid grid-cols-4 gap-1.5">
                        {grp.types.map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => toggleMbti(type)}
                            className={`py-1.5 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                              targetMbtis.includes(type)
                                ? 'bg-amber-500 text-white shadow-2xs'
                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 自定义冷静期时长 */}
          <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800">
                冷静期时长：
              </label>
              <span className="text-xs font-black text-amber-700 font-mono">
                {customCooling ? `${customCoolingInput || 24} 小时 (自定义)` : `${coolingHours} 小时`}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              {[12, 24, 48, 72].map(h => (
                <button
                  key={h}
                  type="button"
                  onClick={() => {
                    setCoolingHours(h);
                    setCustomCooling(false);
                  }}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    !customCooling && coolingHours === h
                      ? 'bg-amber-500 text-white shadow-2xs'
                      : 'bg-white text-slate-600 border border-amber-200/70 hover:bg-amber-100/50'
                  }`}
                >
                  {h}小时{h === 24 ? ' (推荐)' : ''}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCustomCooling(true)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  customCooling
                    ? 'bg-amber-500 text-white shadow-2xs'
                    : 'bg-white text-slate-600 border border-amber-200/70 hover:bg-amber-100/50'
                }`}
              >
                自定义
              </button>
            </div>
            {customCooling && (
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="number"
                  min="1"
                  max="168"
                  placeholder="输入 1-168 小时"
                  value={customCoolingInput}
                  onChange={(e) => setCustomCoolingInput(e.target.value)}
                  className="w-36 bg-white border border-amber-300 rounded-xl px-3 py-1.5 text-xs font-mono text-slate-800 focus:outline-hidden"
                />
                <span className="text-[11px] text-slate-500">小时 (最长可达 7 天)</span>
              </div>
            )}
          </div>

          {/* 自定义需要表态人数 */}
          <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800">
                需要几人表态：
              </label>
              <span className="text-xs font-black text-amber-700 font-mono">
                {customVotes ? `${customVotesInput || 15} 人 (自定义)` : `${requiredVotes} 人`}
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap mb-2">
              {[5, 10, 15, 20, 30].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => {
                    setRequiredVotes(n);
                    setCustomVotes(false);
                  }}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    !customVotes && requiredVotes === n
                      ? 'bg-amber-500 text-white shadow-2xs'
                      : 'bg-white text-slate-600 border border-amber-200/70 hover:bg-amber-100/50'
                  }`}
                >
                  {n}人{n === 15 ? ' (默认)' : ''}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCustomVotes(true)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  customVotes
                    ? 'bg-amber-500 text-white shadow-2xs'
                    : 'bg-white text-slate-600 border border-amber-200/70 hover:bg-amber-100/50'
                }`}
              >
                自定义
              </button>
            </div>
            {customVotes && (
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="number"
                  min="3"
                  max="50"
                  placeholder="输入 3-50 人"
                  value={customVotesInput}
                  onChange={(e) => setCustomVotesInput(e.target.value)}
                  className="w-36 bg-white border border-amber-300 rounded-xl px-3 py-1.5 text-xs font-mono text-slate-800 focus:outline-hidden"
                />
                <span className="text-[11px] text-slate-500">人 (3 到 50 人均可)</span>
              </div>
            )}
            <p className="text-[11px] text-slate-400 mt-1">
              💡 注：达到设定人数或冷静期到期后将按当时票数定结果，无需死等凑够全部人数。
            </p>
          </div>

          {/* AI 建议权重滑块（分行说明，清晰不重叠） */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 p-4 rounded-2xl border border-amber-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Bot className="w-4 h-4 text-amber-600" />
                <label className="text-xs font-bold text-slate-800">AI建议权重</label>
              </div>
              <span className={`text-xs font-mono font-black px-2 py-0.5 rounded-md ${
                aiWeight > 50 
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'bg-amber-200 text-amber-900'
              }`}>
                {aiWeight}% {aiWeight === 0 ? '(仅供参考)' : `(折算 ${calculatedAiVotes} 票)`}
              </span>
            </div>

            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={aiWeight}
              onChange={(e) => setAiWeight(parseInt(e.target.value, 10))}
              className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-200 rounded-lg"
            />

            {/* 说明文字独立分行排开，手机上清晰易读 */}
            <div className="space-y-1 pt-1 text-[11px] text-slate-500">
              <div className="flex items-center justify-between py-0.5 border-b border-amber-100/50">
                <span className="font-mono font-bold text-slate-700 shrink-0">0%</span>
                <span className="text-slate-500 text-right">仅展示 AI 建议与分析，不折算票数</span>
              </div>
              <div className="flex items-center justify-between py-0.5 border-b border-amber-100/50 text-amber-800 font-medium">
                <span className="font-mono font-bold text-amber-900 shrink-0">20% (推荐)</span>
                <span className="text-right">折算部分权重票，与清醒网友共同把关</span>
              </div>
              <div className="flex items-center justify-between py-0.5">
                <span className="font-mono font-bold text-slate-700 shrink-0">100%</span>
                <span className="text-slate-500 text-right">完全由 AI 裁决主导</span>
              </div>
            </div>

            {aiWeight > 50 && (
              <div className="mt-2 p-2 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-1.5 text-xs text-rose-700 font-bold">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>⚠️ AI建议权重超过 50%，AI建议将占主导！</span>
              </div>
            )}
          </div>

          {/* 审批公开模式 */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              审批公开模式
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode('public')}
                className={`p-3.5 rounded-2xl border text-left transition flex items-start gap-2.5 cursor-pointer ${
                  mode === 'public'
                    ? 'border-amber-500 bg-amber-50/70 text-amber-950 ring-2 ring-amber-400/30'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Globe className={`w-5 h-5 shrink-0 mt-0.5 ${mode === 'public' ? 'text-amber-600' : 'text-slate-400'}`} />
                <div>
                  <div className="text-xs font-bold">全网广场公开</div>
                  <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                    展示在广场，全网清醒网友与AI建议共同把关
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMode('group')}
                className={`p-3.5 rounded-2xl border text-left transition flex items-start gap-2.5 cursor-pointer ${
                  mode === 'group'
                    ? 'border-purple-500 bg-purple-50/70 text-purple-950 ring-2 ring-purple-400/30'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Lock className={`w-5 h-5 shrink-0 mt-0.5 ${mode === 'group' ? 'text-purple-600' : 'text-slate-400'}`} />
                <div>
                  <div className="text-xs font-bold">专属密友审批群</div>
                  <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                    仅通过专属链接/口令查看与投票
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* 匿名身份提示 */}
          <div className="text-[11px] text-slate-400 bg-amber-50/50 p-3 rounded-2xl border border-amber-100/60 leading-relaxed">
            💡 将以您的当前匿名身份 <span className="font-bold text-amber-900">@{currentUser.nickname}</span> 发布。发起后不可给自己的审批单投票。
          </div>

          {/* 提交按钮（居中、适度留白、宽度适中、绝不拉满贴边） */}
          <div className="flex justify-center pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full max-w-xs sm:max-w-sm py-3.5 px-6 mx-auto bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-white font-black text-sm rounded-2xl shadow-lg glow-amber flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <span>正在发起审批并开启冷静期...</span>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>立即发布审批 · 开启冷静期</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
