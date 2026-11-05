-- ============================================================
-- 省思袋（消费冷静期审批平台） Supabase 数据库一键建表脚本
-- 包含：审批单、投票、留言讨论、AI建议、预计使用时间、媒体文件、MBTI与星座、好物分享
-- 请在 Supabase 控制台的 SQL Editor 中粘贴并点击 Run 执行即可！
-- ============================================================

-- 1. 开启 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. 创建审批单表 (approvals)
CREATE TABLE IF NOT EXISTS approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  price NUMERIC NOT NULL CHECK (price >= 0),
  category TEXT NOT NULL CHECK (category IN ('穿搭', '数码', '游戏', '运动', '美妆', '家居', '其他')),
  reason TEXT NOT NULL,
  alternative TEXT DEFAULT '',
  mode TEXT NOT NULL DEFAULT 'public' CHECK (mode IN ('public', 'group')),
  cooling_hours INTEGER NOT NULL DEFAULT 24 CHECK (cooling_hours >= 1 AND cooling_hours <= 168),
  required_votes INTEGER NOT NULL DEFAULT 15 CHECK (required_votes >= 3 AND required_votes <= 50),
  max_voters INTEGER NOT NULL DEFAULT 15,
  expected_duration TEXT DEFAULT '',
  media_url TEXT DEFAULT '',
  media_type TEXT DEFAULT '',
  creator_gender TEXT DEFAULT '',
  creator_mbti TEXT DEFAULT '',
  creator_zodiac TEXT DEFAULT '',
  target_mbtis JSONB DEFAULT '[]'::jsonb,
  ai_weight INTEGER NOT NULL DEFAULT 20 CHECK (ai_weight >= 0 AND ai_weight <= 100),
  ai_verdict TEXT CHECK (ai_verdict IN ('buy', 'skip', 'think')),
  ai_reasons JSONB DEFAULT '[]'::jsonb,
  ai_generated_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  creator_id TEXT NOT NULL,
  creator_nickname TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  deadline TIMESTAMPTZ NOT NULL DEFAULT (timezone('utc'::text, now()) + interval '24 hours')
);

-- 增量兼容升级（若 approvals 表已存在时添加新列）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='approvals' AND column_name='cooling_hours') THEN
    ALTER TABLE approvals ADD COLUMN cooling_hours INTEGER NOT NULL DEFAULT 24;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='approvals' AND column_name='required_votes') THEN
    ALTER TABLE approvals ADD COLUMN required_votes INTEGER NOT NULL DEFAULT 15;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='approvals' AND column_name='ai_weight') THEN
    ALTER TABLE approvals ADD COLUMN ai_weight INTEGER NOT NULL DEFAULT 20;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='approvals' AND column_name='ai_verdict') THEN
    ALTER TABLE approvals ADD COLUMN ai_verdict TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='approvals' AND column_name='ai_reasons') THEN
    ALTER TABLE approvals ADD COLUMN ai_reasons JSONB DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='approvals' AND column_name='ai_generated_at') THEN
    ALTER TABLE approvals ADD COLUMN ai_generated_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='approvals' AND column_name='expected_duration') THEN
    ALTER TABLE approvals ADD COLUMN expected_duration TEXT DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='approvals' AND column_name='media_url') THEN
    ALTER TABLE approvals ADD COLUMN media_url TEXT DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='approvals' AND column_name='media_type') THEN
    ALTER TABLE approvals ADD COLUMN media_type TEXT DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='approvals' AND column_name='creator_gender') THEN
    ALTER TABLE approvals ADD COLUMN creator_gender TEXT DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='approvals' AND column_name='creator_mbti') THEN
    ALTER TABLE approvals ADD COLUMN creator_mbti TEXT DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='approvals' AND column_name='creator_zodiac') THEN
    ALTER TABLE approvals ADD COLUMN creator_zodiac TEXT DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='approvals' AND column_name='target_mbtis') THEN
    ALTER TABLE approvals ADD COLUMN target_mbtis JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- 3. 创建投票表 (votes)
CREATE TABLE IF NOT EXISTS votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_id UUID NOT NULL REFERENCES approvals(id) ON DELETE CASCADE,
  voter_id TEXT NOT NULL,
  voter_nickname TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('approve', 'reject', 'spectate')),
  owns_item BOOLEAN NOT NULL DEFAULT false, -- 是否已拥有此物品
  reason TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_voter_per_approval UNIQUE (approval_id, voter_id)
);

-- 增量兼容升级 votes 表
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='votes' AND column_name='owns_item') THEN
    ALTER TABLE votes ADD COLUMN owns_item BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- 4. 创建讨论留言表 (comments)
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_id UUID NOT NULL REFERENCES approvals(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  user_nickname TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. 创建好物分享表 (good_items)
CREATE TABLE IF NOT EXISTS good_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  reason TEXT NOT NULL,
  price NUMERIC DEFAULT NULL,
  image_url TEXT DEFAULT '',
  creator_id TEXT NOT NULL,
  creator_nickname TEXT NOT NULL,
  creator_gender TEXT DEFAULT '',
  creator_mbti TEXT DEFAULT '',
  creator_zodiac TEXT DEFAULT '',
  likes_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. 后端校验：触发器严防发起人给自己投票
CREATE OR REPLACE FUNCTION check_voter_not_creator()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM approvals 
    WHERE id = NEW.approval_id AND creator_id = NEW.voter_id
  ) THEN
    RAISE EXCEPTION '发起人不能给自己的审批单投票！';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_voter_not_creator ON votes;
CREATE TRIGGER trg_check_voter_not_creator
BEFORE INSERT ON votes
FOR EACH ROW EXECUTE FUNCTION check_voter_not_creator();

-- 7. 创建索引提升查询性能
CREATE INDEX IF NOT EXISTS idx_approvals_created_at ON approvals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_approvals_creator_id ON approvals(creator_id);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status);
CREATE INDEX IF NOT EXISTS idx_votes_approval_id ON votes(approval_id);
CREATE INDEX IF NOT EXISTS idx_comments_approval_id ON comments(approval_id);
CREATE INDEX IF NOT EXISTS idx_good_items_created_at ON good_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_good_items_creator_id ON good_items(creator_id);

-- 8. 配置行级安全策略 (RLS) - 允许匿名用户完整读取与交互
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE good_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view approvals" ON approvals;
CREATE POLICY "Public can view approvals" ON approvals FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can insert approvals" ON approvals;
CREATE POLICY "Public can insert approvals" ON approvals FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public can update approvals" ON approvals;
CREATE POLICY "Public can update approvals" ON approvals FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public can view votes" ON votes;
CREATE POLICY "Public can view votes" ON votes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can insert votes" ON votes;
CREATE POLICY "Public can insert votes" ON votes FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public can view comments" ON comments;
CREATE POLICY "Public can view comments" ON comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can insert comments" ON comments;
CREATE POLICY "Public can insert comments" ON comments FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public can view good_items" ON good_items;
CREATE POLICY "Public can view good_items" ON good_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can insert good_items" ON good_items;
CREATE POLICY "Public can insert good_items" ON good_items FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public can update good_items" ON good_items;
CREATE POLICY "Public can update good_items" ON good_items FOR UPDATE USING (true);

-- 9. 开启 Realtime 实时数据同步推送
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'approvals'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE approvals;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'votes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE votes;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'comments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE comments;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'good_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE good_items;
  END IF;
END $$;

-- 10. 写入 6 条审批单种子数据
DELETE FROM comments WHERE approval_id IN (
  SELECT id FROM approvals WHERE creator_id IN ('seed_user_1', 'seed_user_2', 'seed_user_3', 'seed_user_4', 'seed_user_5', 'seed_user_6')
);
DELETE FROM votes WHERE approval_id IN (
  SELECT id FROM approvals WHERE creator_id IN ('seed_user_1', 'seed_user_2', 'seed_user_3', 'seed_user_4', 'seed_user_5', 'seed_user_6')
);
DELETE FROM approvals WHERE creator_id IN ('seed_user_1', 'seed_user_2', 'seed_user_3', 'seed_user_4', 'seed_user_5', 'seed_user_6');

INSERT INTO approvals (
  id, title, price, category, reason, alternative, mode, 
  cooling_hours, required_votes, max_voters, expected_duration,
  creator_gender, creator_mbti, creator_zodiac, target_mbtis,
  ai_weight, ai_verdict, ai_reasons, ai_generated_at, status, 
  creator_id, creator_nickname, created_at, deadline
)
VALUES
  -- 1. 139元包包 (已驳回，AI 建议不买)
  (
    '11111111-1111-1111-1111-111111111111', '复古腋下法棍包', 139, '穿搭', 
    '刷小红书被种草了，配秋天的大衣感觉超级复古好看，只要一百多块！', 
    '家里已经有三个黑色腋下包了，只是五金颜色不太一样', 'public', 
    24, 10, 10, '1-3个月',
    '女生', 'INFP', '天秤座', '["INTJ", "ISTJ", "ENTJ"]'::jsonb,
    20, 'skip', '["家里有3个同色包还买，典型的同质化冲动消费！", "百元假皮背两月容易脱皮吃灰，不买立省100%。"]'::jsonb, 
    timezone('utc'::text, now() - interval '25 hours'), 'rejected', 
    'seed_user_1', '秋天想喝奶茶', 
    timezone('utc'::text, now() - interval '26 hours'), timezone('utc'::text, now() - interval '2 hours')
  ),
  
  -- 2. 二手索尼相机 8000元 (已通过，AI 建议买)
  (
    '22222222-2222-2222-2222-222222222222', '二手索尼 A7M3 全画幅微单 (快门2000)', 8000, '数码', 
    '准备接拍毕业照和客单接单摄影，算过账拍4场就能回本，二手价格比原价省了4000！', 
    '目前用手机拍，弱光和长焦虚化完全达不到商用要求', 'public', 
    24, 15, 15, '1年以上',
    '男生', 'INTJ', '处女座', '["ENTP", "INTP", "ESTJ"]'::jsonb,
    20, 'buy', '["属于生产力投资而非纯消费，有明确接单回本测算！", "二手残值保值率极高，快门2000成色优异，支持搞钱。"]'::jsonb, 
    timezone('utc'::text, now() - interval '24 hours'), 'approved', 
    'seed_user_2', '快门工匠阿伟', 
    timezone('utc'::text, now() - interval '25 hours'), timezone('utc'::text, now() - interval '1 hours')
  ),

  -- 3. 15元杨枝甘露 (进行中，12小时超短冷静期，AI 再想想)
  (
    '33333333-3333-3333-3333-333333333333', '七分甜超大杯杨枝甘露 (加多份啵啵)', 15, '其他', 
    '今天周五加班到八点半，心理防线崩溃，极度需要高糖多巴胺救命！！', 
    '工位抽屉里有免费的立顿茶包和白开水……', 'public', 
    12, 15, 15, '不到1个月',
    '女生', 'ENFP', '双子座', '["INFJ", "INTJ"]'::jsonb,
    20, 'think', '["情绪性补偿进食，喝完容易血糖过山车失眠长痘！", "加班辛苦确实需要慰藉，建议折中买个无糖水果。"]'::jsonb, 
    timezone('utc'::text, now() - interval '2 hours'), 'pending', 
    'seed_user_3', '周五只想下班', 
    timezone('utc'::text, now() - interval '3 hours'), timezone('utc'::text, now() + interval '9 hours')
  ),

  -- 4. 1300元演唱会内场票 (进行中，48小时冷静期，AI 建议买)
  (
    '44444444-4444-4444-4444-444444444444', '林俊杰 JJ20 巡演内场前排票', 1300, '其他', 
    '青春只有一次，喜欢的歌手可能过几年就不开巡演了！想去现场听生米大合唱', 
    '买看台票只要 380 元，或者在场馆外面听漏音', 'public', 
    48, 15, 15, '不到1个月',
    '女生', 'ISFP', '双鱼座', '["ENFJ", "ENTJ"]'::jsonb,
    30, 'buy', '["情绪价值拉满的体验型消费，不可复现的青春回忆！", "若预算不伤筋动骨，现场大合唱的震撼终身难忘。"]'::jsonb, 
    timezone('utc'::text, now() - interval '4 hours'), 'pending', 
    'seed_user_4', '江南夜游人', 
    timezone('utc'::text, now() - interval '5 hours'), timezone('utc'::text, now() + interval '43 hours')
  ),

  -- 5. 699元智能手表 (进行中，AI 建议不买)
  (
    '55555555-5555-5555-5555-555555555555', '运动心率智能手表 Watch GT', 699, '运动', 
    '打算下周开始每天跑步打卡，需要一个能测心率和 GPS 配速的专业手表', 
    '用手机 Keep 也能记录跑步，但是手机揣兜里晃荡难受', 'public', 
    24, 15, 15, '6-12个月',
    '男生', 'ISTP', '狮子座', '["ISTJ", "ESTJ"]'::jsonb,
    20, 'skip', '["典型‘装备先于行动’的借口陷阱，建议先坚持跑步一个月再买！", "手机手臂包20块钱就能解决晃荡问题，别把懒归咎于设备。"]'::jsonb, 
    timezone('utc'::text, now() - interval '7 hours'), 'pending', 
    'seed_user_5', '下周一定跑步', 
    timezone('utc'::text, now() - interval '8 hours'), timezone('utc'::text, now() + interval '16 hours')
  ),

  -- 6. 4999元游戏显卡 (进行中，72小时冷静期，AI 建议不买)
  (
    '66666666-6666-6666-6666-666666666666', 'RTX 4070 SUPER 12G 独立显卡', 4999, '游戏', 
    '手头的 1060 玩黑神话悟空卡成幻灯片，为了全高画质畅玩必须换显卡！', 
    '在网吧或者租云电脑玩通关，成本大概 150 元', 'public', 
    72, 15, 15, '1年以上',
    '男生', 'INTP', '水瓶座', '["ENTP", "INTJ"]'::jsonb,
    40, 'skip', '["为了通关单个游戏花5000块极不划算，云电脑150元即通关！", "当前显卡溢价周期，打完游戏大概率高位吃灰。"]'::jsonb, 
    timezone('utc'::text, now() - interval '10 hours'), 'pending', 
    'seed_user_6', '齐天大圣预备役', 
    timezone('utc'::text, now() - interval '12 hours'), timezone('utc'::text, now() + interval '60 hours')
  );

-- 11. 插入投票数据
INSERT INTO votes (approval_id, voter_id, voter_nickname, type, owns_item, reason, created_at)
VALUES
  -- 1. 包包: 7 驳回 1 通过
  ('11111111-1111-1111-1111-111111111111', 'v_01', '理性穿搭博主', 'reject', true, '你不是写了家里有三个了吗！一百多的假皮背两次就脱皮吃灰！', timezone('utc'::text, now() - interval '24 hours')),
  ('11111111-1111-1111-1111-111111111111', 'v_02', '断舍离大队长', 'reject', true, '不买立省100%，别给家里制造塑料垃圾了。', timezone('utc'::text, now() - interval '23 hours')),
  ('11111111-1111-1111-1111-111111111111', 'v_03', '存钱买房中', 'reject', false, '快醒醒，秋天的大衣随便配哪个黑色包都好看，没人盯着你五金看！', timezone('utc'::text, now() - interval '22 hours')),
  ('11111111-1111-1111-1111-111111111111', 'v_04', '拔草小能手', 'reject', true, '廉价感严重，相信我，买回来一次都不会背出门。', timezone('utc'::text, now() - interval '20 hours')),
  ('11111111-1111-1111-1111-111111111111', 'v_05', '钱包守护者', 'reject', false, '139 块去吃顿好吃的羊肉火锅不香吗？', timezone('utc'::text, now() - interval '18 hours')),
  ('11111111-1111-1111-1111-111111111111', 'v_06', '极简生活家', 'reject', true, '衣柜都要爆炸了还买，驳回！', timezone('utc'::text, now() - interval '16 hours')),
  ('11111111-1111-1111-1111-111111111111', 'v_07', '清醒打工人', 'reject', false, '冲动消费鉴定完毕，狠狠省下！', timezone('utc'::text, now() - interval '14 hours')),
  ('11111111-1111-1111-1111-111111111111', 'v_08', '好看就冲', 'approve', false, '一百多块千金难买心头好，买来搭衣服也行', timezone('utc'::text, now() - interval '12 hours')),

  -- 2. 相机: 7 通过 2 驳回
  ('22222222-2222-2222-2222-222222222222', 'v_11', '自由摄影师', 'approve', true, '生产力工具能接单变现，快门才2000非常香，支持搞钱！', timezone('utc'::text, now() - interval '24 hours')),
  ('22222222-2222-2222-2222-222222222222', 'v_12', '投资型选手', 'approve', false, '能产生现金流的消费不叫消费叫投资，只要肯勤奋接单稳赚！', timezone('utc'::text, now() - interval '23 hours')),
  ('22222222-2222-2222-2222-222222222222', 'v_13', '数码老玩家', 'approve', true, 'A7M3保值率高，就算不拍了卖掉也亏不了多少，批准！', timezone('utc'::text, now() - interval '21 hours')),
  ('22222222-2222-2222-2222-222222222222', 'v_14', '打工搞钱人', 'approve', false, '支持有技术追求的年轻人搞副业！', timezone('utc'::text, now() - interval '19 hours')),
  ('22222222-2222-2222-2222-222222222222', 'v_15', '器材党退烧', 'approve', true, '价格划算，成色好的话赶紧入。', timezone('utc'::text, now() - interval '17 hours')),
  ('22222222-2222-2222-2222-222222222222', 'v_16', '学长阿健', 'approve', false, '拍毕业照需求很大，提前在学校大群宣传，绝对能挣回来。', timezone('utc'::text, now() - interval '15 hours')),
  ('22222222-2222-2222-2222-222222222222', 'v_17', '支持买单侠', 'approve', false, '批准！年轻人就是要敢想敢干！', timezone('utc'::text, now() - interval '13 hours')),
  ('22222222-2222-2222-2222-222222222222', 'v_18', '谨慎观望者', 'reject', true, '二手相机暗病多，CMOS坏点你看得懂吗？容易被坑。', timezone('utc'::text, now() - interval '10 hours')),
  ('22222222-2222-2222-2222-222222222222', 'v_19', '理性保守派', 'reject', false, '万一接不到单子直接砸手里8000块，风险太大。', timezone('utc'::text, now() - interval '8 hours')),

  -- 3. 杨枝甘露: 5 票
  ('33333333-3333-3333-3333-333333333333', 'v_21', '控糖达人', 'reject', false, '15块钱买一杯糖水，喝完血糖飙升晚上失眠长痘！', timezone('utc'::text, now() - interval '2 hours')),
  ('33333333-3333-3333-3333-333333333333', 'v_22', '省钱小能手', 'reject', false, '下班赶紧回家睡觉，睡着了就不想吃了！', timezone('utc'::text, now() - interval '2 hours')),
  ('33333333-3333-3333-3333-333333333333', 'v_23', '健康守护员', 'reject', false, '波霸热量炸弹，喝完跑五公里都消耗不掉！', timezone('utc'::text, now() - interval '1 hours')),
  ('33333333-3333-3333-3333-333333333333', 'v_24', '开心最重要', 'approve', false, '周五都加班到这个点了，喝杯奶茶怎么了！对自己好点！', timezone('utc'::text, now() - interval '1 hours')),
  ('33333333-3333-3333-3333-333333333333', 'v_25', '同病相怜同事', 'approve', true, '加份啵啵咬一咬发泄一下，准了！', timezone('utc'::text, now() - interval '30 minutes')),

  -- 4. 演唱会票: 4 票
  ('44444444-4444-4444-4444-444444444444', 'v_31', '听歌小能手', 'approve', false, '千金难买青春回忆，JJ现场超级稳，冲内场不后悔！', timezone('utc'::text, now() - interval '4 hours')),
  ('44444444-4444-4444-4444-444444444444', 'v_32', '现场氛围狂', 'approve', true, '内场视角无敌，一生能看几次！', timezone('utc'::text, now() - interval '3 hours')),
  ('44444444-4444-4444-4444-444444444444', 'v_33', '穷鬼套餐代言人', 'reject', false, '1300看台380完全够了，大屏幕都一样看，省下900干啥不行！', timezone('utc'::text, now() - interval '2 hours')),
  ('44444444-4444-4444-4444-444444444444', 'v_34', '清醒钱包', 'reject', false, '内场后面一排都是人头，还不如看台视野好，驳回！', timezone('utc'::text, now() - interval '1 hours')),

  -- 5. 智能手表: 3 票
  ('55555555-5555-5555-5555-555555555555', 'v_41', '跑步三年老炮', 'reject', true, '相信我，“下周一定跑步”的人买了手表99%三个月后在闲鱼。先坚持跑一个月手机记录再买！', timezone('utc'::text, now() - interval '6 hours')),
  ('55555555-5555-5555-5555-555555555555', 'v_42', '反差萌', 'reject', false, '买前全副武装，买后在抽屉落灰。驳回！', timezone('utc'::text, now() - interval '5 hours')),
  ('55555555-5555-5555-5555-555555555555', 'v_43', '运动爱好者', 'approve', false, '买个装备增加动力也挺好，希望能坚持下来！', timezone('utc'::text, now() - interval '3 hours')),

  -- 6. 游戏显卡: 3 票
  ('66666666-6666-6666-6666-666666666666', 'v_51', '悟空通关玩家', 'reject', false, '网吧通关只要一百多，为了玩一个游戏花五千换显卡血亏，现在显卡还溢价！', timezone('utc'::text, now() - interval '10 hours')),
  ('66666666-6666-6666-6666-666666666666', 'v_52', '云电脑玩家', 'reject', false, '开一个月云游戏会员20块钱，千兆网速流畅得很，别当韭菜！', timezone('utc'::text, now() - interval '8 hours')),
  ('66666666-6666-6666-6666-666666666666', 'v_53', '4K画质党', 'approve', true, '4070S性能通吃未来三年3A大作，早买早享受！', timezone('utc'::text, now() - interval '5 hours'));

-- 12. 插入好物分享种子数据
DELETE FROM good_items WHERE creator_id IN ('seed_good_1', 'seed_good_2', 'seed_good_3');

INSERT INTO good_items (
  id, title, reason, price, image_url, creator_id, creator_nickname, creator_gender, creator_mbti, creator_zodiac, likes_count, created_at
)
VALUES
  (
    'a1111111-1111-1111-1111-111111111111',
    '倍思 65W 氮化镓三口快充充电头',
    '出差和日常通勤只带这一个头就够了，笔记本电脑、手机、耳机同时充，再也不用背砖头一样的原装充电器了！用了快一年发热也很低，性价比极高。',
    99,
    'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=600&q=80',
    'seed_good_1',
    '数码极简控',
    '男生',
    'INTJ',
    '摩羯座',
    28,
    timezone('utc'::text, now() - interval '2 days')
  ),
  (
    'a2222222-2222-2222-2222-222222222222',
    '象印 480ml 不锈钢弹盖保温杯',
    '重量超轻，单手一键弹开特别方便。保温效果绝了，早上倒的热水到下午还是温热的，冬天多喝热水幸福感爆棚，已经用了三年依然如新。',
    159,
    'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80',
    'seed_good_2',
    '养生少女阿喵',
    '女生',
    'ISFJ',
    '金牛座',
    45,
    timezone('utc'::text, now() - interval '1 days')
  ),
  (
    'a3333333-3333-3333-3333-333333333333',
    '宜家 贝达/奥维特 储物挂篮与理线带',
    '租房神物！桌面各种充电线、插排全都能收纳悬挂起来，台面瞬间清爽 10 倍，心情大好，几十块钱解决凌乱难题。',
    29.9,
    'https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&w=600&q=80',
    'seed_good_3',
    '收纳魔法师',
    '女生',
    'ENFP',
    '巨蟹座',
    36,
    timezone('utc'::text, now() - interval '8 hours')
  );
