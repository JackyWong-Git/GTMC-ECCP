/**
 * 视频转文字 API
 * 
 * 功能：
 * 1. 下载视频（支持抖音分享链接解析）
 * 2. FFmpeg 提取音频
 * 3. AI 语音识别转文字
 * 
 * 参考：douyin-mcp-server 的视频转文字流程
 */

import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const execAsync = promisify(exec);

// 临时文件目录
const TEMP_DIR = '/tmp/video-transcript';

// 确保临时目录存在
async function ensureTempDir() {
  if (!existsSync(TEMP_DIR)) {
    await mkdir(TEMP_DIR, { recursive: true });
  }
}

/**
 * 解析抖音分享链接获取视频 URL
 */
async function resolveDouyinUrl(shareUrl: string): Promise<string> {
  // 如果是完整的抖音视频链接，直接返回
  if (shareUrl.includes('douyin.com/video/') || shareUrl.includes('iesdouyin.com')) {
    return shareUrl;
  }
  
  // 如果是短链接，需要解析重定向
  try {
    const response = await fetch(shareUrl, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
      }
    });
    return response.url;
  } catch {
    return shareUrl;
  }
}

/**
 * 下载视频文件
 */
async function downloadVideo(videoUrl: string, outputPath: string): Promise<void> {
  const response = await fetch(videoUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': 'https://www.douyin.com/'
    }
  });
  
  if (!response.ok) {
    throw new Error(`视频下载失败: ${response.status}`);
  }
  
  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(outputPath, buffer);
}

/**
 * 使用 FFmpeg 提取音频
 */
async function extractAudio(videoPath: string, audioPath: string): Promise<void> {
  const command = `ffmpeg -i "${videoPath}" -vn -acodec pcm_s16le -ar 16000 -ac 1 "${audioPath}" -y`;
  
  try {
    await execAsync(command, { timeout: 120000 });
  } catch (error) {
    console.error('FFmpeg 提取音频失败:', error);
    throw new Error('音频提取失败');
  }
}

/**
 * 使用 Doubao API 进行语音识别
 */
async function transcribeAudio(audioPath: string): Promise<string> {
  const apiKey = process.env.LLM_API_KEY || process.env.DOUBAO_API_KEY;
  const baseUrl = process.env.LLM_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3';
  
  if (!apiKey) {
    throw new Error('LLM API Key 未配置');
  }
  
  // 读取音频文件
  const audioBuffer = await readFile(audioPath);
  const base64Audio = audioBuffer.toString('base64');
  
  // 使用 Doubao 的语音识别 API
  // 注意：这里使用的是大模型的多模态能力来模拟语音识别
  // 实际生产环境建议使用专业的 ASR 服务（如讯飞、阿里云语音识别）
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'doubao-seed-2-0-lite',
      messages: [
        {
          role: 'system',
          content: '你是一个专业的语音转文字助手。请将提供的音频内容转换为文字。'
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: '请将这段音频中的语音内容转换为文字，保持原文的口语化表达。'
            },
            {
              type: 'audio',
              audio: `data:audio/wav;base64,${base64Audio}`
            }
          ]
        }
      ],
      max_tokens: 4000
    })
  });
  
  if (!response.ok) {
    // 如果大模型不支持音频，返回提示信息
    console.warn('大模型不支持音频输入，使用备用方案');
    return '[语音识别服务暂不可用，请配置专业的 ASR 服务（如讯飞、阿里云语音识别）]';
  }
  
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

/**
 * 备用方案：使用视频标题和描述生成模拟文案
 */
function generateMockTranscript(title: string, description: string): string {
  return `[视频标题] ${title}\n\n[视频描述] ${description}\n\n[注意] 语音识别服务暂不可用。如需完整的视频转文字功能，请配置专业的 ASR 服务（如讯飞语音识别、阿里云语音识别等）。`;
}

export async function POST(request: NextRequest) {
  const requestId = `vt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  
  try {
    const body = await request.json();
    const { url, videoUrl, title, description, useMock = false } = body;
    
    // 支持直接传入视频 URL 或分享链接
    const sourceUrl = videoUrl || url;
    
    if (!sourceUrl) {
      return NextResponse.json(
        { error: '请提供视频 URL 或抖音分享链接' },
        { status: 400 }
      );
    }
    
    console.log(`[${requestId}] 开始处理视频转文字: ${sourceUrl}`);
    
    // 如果使用 mock 模式或无法下载视频
    if (useMock) {
      const mockTranscript = generateMockTranscript(
        title || '未知标题',
        description || '无描述'
      );
      
      return NextResponse.json({
        success: true,
        data: {
          transcript: mockTranscript,
          sourceUrl,
          title: title || '未知标题',
          duration: 0,
          wordCount: mockTranscript.length,
          isMock: true
        }
      });
    }
    
    // 确保临时目录存在
    await ensureTempDir();
    
    const videoPath = path.join(TEMP_DIR, `${requestId}.mp4`);
    const audioPath = path.join(TEMP_DIR, `${requestId}.wav`);
    
    try {
      // 1. 解析 URL（如果是抖音分享链接）
      const resolvedUrl = await resolveDouyinUrl(sourceUrl);
      console.log(`[${requestId}] 解析后的 URL: ${resolvedUrl}`);
      
      // 2. 下载视频
      console.log(`[${requestId}] 开始下载视频...`);
      await downloadVideo(resolvedUrl, videoPath);
      console.log(`[${requestId}] 视频下载完成`);
      
      // 3. 提取音频
      console.log(`[${requestId}] 开始提取音频...`);
      await extractAudio(videoPath, audioPath);
      console.log(`[${requestId}] 音频提取完成`);
      
      // 4. 语音识别
      console.log(`[${requestId}] 开始语音识别...`);
      const transcript = await transcribeAudio(audioPath);
      console.log(`[${requestId}] 语音识别完成，字数: ${transcript.length}`);
      
      return NextResponse.json({
        success: true,
        data: {
          transcript,
          sourceUrl: resolvedUrl,
          title: title || '未知标题',
          duration: 0, // TODO: 从视频元数据获取
          wordCount: transcript.length,
          isMock: false
        }
      });
      
    } finally {
      // 清理临时文件
      try {
        if (existsSync(videoPath)) await unlink(videoPath);
        if (existsSync(audioPath)) await unlink(audioPath);
      } catch (cleanupError) {
        console.error(`[${requestId}] 清理临时文件失败:`, cleanupError);
      }
    }
    
  } catch (error) {
    console.error(`[${requestId}] 视频转文字失败:`, error);
    
    // 如果失败，返回 mock 结果
    const body = await request.json().catch(() => ({}));
    const mockTranscript = generateMockTranscript(
      body.title || '未知标题',
      body.description || '无描述'
    );
    
    return NextResponse.json({
      success: true,
      data: {
        transcript: mockTranscript,
        sourceUrl: body.url || body.videoUrl || '',
        title: body.title || '未知标题',
        duration: 0,
        wordCount: mockTranscript.length,
        isMock: true,
        error: error instanceof Error ? error.message : '未知错误'
      }
    });
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      service: 'video-transcript',
      description: '视频转文字 API',
      features: [
        '支持抖音分享链接解析',
        'FFmpeg 提取音频',
        'AI 语音识别转文字',
        '支持备用 mock 模式'
      ],
      usage: {
        method: 'POST',
        body: {
          url: '抖音分享链接或视频 URL',
          videoUrl: '直接视频 URL（可选）',
          title: '视频标题（可选）',
          description: '视频描述（可选）',
          useMock: '是否使用 mock 模式（可选，默认 false）'
        }
      }
    }
  });
}
