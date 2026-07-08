import { NextResponse } from 'next/server';
import { saveWorkflow, generateId, generateModuleId } from '@/lib/workflow-store';
import { getTemplateById } from '@/lib/workflow-templates';
import type { WorkflowDefinition } from '@/lib/workflow-store';

/**
 * POST /api/workflows/clone
 * 从模板克隆工作流
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { templateId, name } = body;

    if (!templateId) {
      return NextResponse.json(
        { success: false, error: '缺少模板 ID' },
        { status: 400 }
      );
    }

    // 获取模板
    const template = getTemplateById(templateId);
    if (!template) {
      return NextResponse.json(
        { success: false, error: '模板不存在' },
        { status: 404 }
      );
    }

    // 将模板模块转换为工作流模块格式
    const modules = template.modules.map((mod) => ({
      id: generateModuleId(),
      type: mod.type as 'llm_analysis' | 'llm_generate' | 'llm_summary' | 'web_search' | 'data_fetch' | 'knowledge_save' | 'knowledge_search' | 'condition' | 'transform',
      name: mod.name,
      description: mod.description,
      config: mod.config || {},
      modelId: mod.modelId,
      prompt: mod.prompt,
      enabled: mod.enabled,
    }));

    // 创建工作流
    const now = new Date().toISOString();
    const workflow: WorkflowDefinition = {
      id: generateId(),
      name: name || `${template.name}（副本）`,
      description: template.description,
      status: 'draft',
      trigger: 'manual',
      schedule: '',
      modules,
      createdAt: now,
      updatedAt: now,
      runCount: 0,
      successCount: 0,
    };

    await saveWorkflow(workflow);

    return NextResponse.json({
      success: true,
      data: workflow,
      message: `已从模板「${template.name}」创建工作流`,
    });
  } catch (error) {
    console.error('Clone workflow error:', error);
    return NextResponse.json(
      { success: false, error: '克隆工作流失败' },
      { status: 500 }
    );
  }
}
