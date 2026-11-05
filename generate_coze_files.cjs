const fs = require('fs');
const path = require('path');

const rootDir = __dirname;

// 1. 扣子插件 OpenAPI 规范（用于在扣子创建插件时直接导入）
const openapiSpec = {
  openapi: '3.0.0',
  info: {
    title: '省思袋冲动消费审批API',
    description: '省思袋全网审批流同步、消费数据查询与AI劝退决策插件',
    version: '1.0.0'
  },
  servers: [
    {
      url: 'https://sengsidai.netlify.app'
    }
  ],
  paths: {
    '/api/sync-data': {
      get: {
        operationId: 'getAllApprovalsAndGoodItems',
        summary: '获取全网最新的消费审批单与好物列表',
        description: '拉取省思袋全网当前正在冷静期的单子、已结算胜负战绩以及精选好物库',
        responses: {
          '200': {
            description: '成功返回全网数据'
          }
        }
      },
      post: {
        operationId: 'createApprovalOrVote',
        summary: '向全网广播发起一笔新审批或提交表态投票',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  type: { type: 'string', enum: ['create_approval', 'submit_vote'] },
                  payload: { type: 'object' }
                },
                required: ['type', 'payload']
              }
            }
          }
        },
        responses: {
          '200': {
            description: '提交成功'
          }
        }
      }
    }
  }
};

fs.writeFileSync(path.join(rootDir, 'coze_plugin_openapi.json'), JSON.stringify(openapiSpec, null, 2), 'utf8');

// 2. 扣子知识库文件（可在扣子知识库中一键上传）
const knowledgeDoc = `# 省思袋 (Wallet-Wait) 核心业务知识库与判定标准

## 一、平台定位与哲学
省思袋是一个专为年轻人打造的“冲动消费集体审批”平台。
核心理念是：“买前省思，不买立省 100%”。通过设立 1 小时、12 小时、24 小时冷静期，结合 AI 评委与网友表态，帮助用户拦截无意义消费。

## 二、AI 评审判定规则
1. 支出合理性评估：
   - 比较【预算金额】与【预计使用时长】。如果只用不到1个月却花费数百元，坚决劝退（skip）。
   - 生产力工具（如工作接单设备且有清晰回本测算）可予以理性放行（buy）。
2. 替代方案分析：
   - 如果用户现有物品已能满足需求（仅颜色、微小外观差异），判定为同质化情绪冲动，坚决驳回。
3. 票数折算机制：
   - AI 结果不模糊中立，仅有 buy（支持买）或 skip（反对买）。
   - AI 权重（默认 20%）将折算成 1~2 票人头票计入总票池。
4. 平票防冲动铁律：
   - 赞成与反对打平（50% vs 50%）时，一律判定为“驳回劝退”，守住钱包。
`;

fs.writeFileSync(path.join(rootDir, 'coze_knowledge_base.txt'), knowledgeDoc, 'utf8');

console.log('Generated coze_plugin_openapi.json and coze_knowledge_base.txt successfully!');
