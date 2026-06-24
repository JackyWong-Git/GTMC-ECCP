'use client';

import { useState } from 'react';
import {
  Search,
  Filter,
  Plus,
  MoreHorizontal,
  ArrowUpDown,
  ExternalLink,
  Flame,
  Clock,
  User,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type TopicStatus =
  | '选题评估'
  | '脚本生成中'
  | '待审核'
  | '拍摄中'
  | '已发布'
  | '已归档';

interface Topic {
  id: number;
  title: string;
  platform: string;
  heat: number;
  likes: number;
  comments: number;
  status: TopicStatus;
  assignee: string;
  publishDate: string;
  sourceUrl: string;
  tags: string[];
}

const statusConfig: Record<
  TopicStatus,
  { color: string; dot: string }
> = {
  选题评估: {
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
  },
  脚本生成中: {
    color: 'bg-violet-50 text-violet-700 border-violet-200',
    dot: 'bg-violet-500',
  },
  待审核: {
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
  },
  拍摄中: {
    color: 'bg-orange-50 text-orange-700 border-orange-200',
    dot: 'bg-orange-500',
  },
  已发布: {
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  已归档: {
    color: 'bg-slate-50 text-slate-600 border-slate-200',
    dot: 'bg-slate-400',
  },
};

const mockTopics: Topic[] = [
  {
    id: 1,
    title: '2024年最值得入手的智能家居设备',
    platform: '抖音',
    heat: 98000,
    likes: 12400,
    comments: 890,
    status: '脚本生成中',
    assignee: '张明',
    publishDate: '2024-12-20',
    sourceUrl: '#',
    tags: ['科技', '智能家居'],
  },
  {
    id: 2,
    title: '职场新人必看的10个沟通技巧',
    platform: '视频号',
    heat: 85000,
    likes: 9800,
    comments: 1200,
    status: '待审核',
    assignee: '李婷',
    publishDate: '2024-12-19',
    sourceUrl: '#',
    tags: ['职场', '沟通'],
  },
  {
    id: 3,
    title: '周末露营装备清单分享',
    platform: '抖音',
    heat: 72000,
    likes: 8500,
    comments: 670,
    status: '已发布',
    assignee: '王浩',
    publishDate: '2024-12-18',
    sourceUrl: '#',
    tags: ['户外', '露营'],
  },
  {
    id: 4,
    title: 'AI绘画工具横评：哪个最适合新手',
    platform: '视频号',
    heat: 68000,
    likes: 7200,
    comments: 540,
    status: '选题评估',
    assignee: '赵雪',
    publishDate: '2024-12-22',
    sourceUrl: '#',
    tags: ['AI', '工具'],
  },
  {
    id: 5,
    title: '一人食快手菜谱：15分钟搞定晚餐',
    platform: '抖音',
    heat: 92000,
    likes: 15600,
    comments: 2100,
    status: '拍摄中',
    assignee: '张明',
    publishDate: '2024-12-21',
    sourceUrl: '#',
    tags: ['美食', '快手菜'],
  },
  {
    id: 6,
    title: '2024年度最佳手机摄影技巧合集',
    platform: '抖音',
    heat: 56000,
    likes: 6800,
    comments: 430,
    status: '脚本生成中',
    assignee: '李婷',
    publishDate: '2024-12-23',
    sourceUrl: '#',
    tags: ['摄影', '手机'],
  },
  {
    id: 7,
    title: '居家健身：无器械全身训练计划',
    platform: '视频号',
    heat: 48000,
    likes: 5200,
    comments: 380,
    status: '已归档',
    assignee: '王浩',
    publishDate: '2024-12-15',
    sourceUrl: '#',
    tags: ['健身', '居家'],
  },
  {
    id: 8,
    title: '新手养猫指南：从选猫到日常护理',
    platform: '抖音',
    heat: 88000,
    likes: 11200,
    comments: 1500,
    status: '待审核',
    assignee: '赵雪',
    publishDate: '2024-12-24',
    sourceUrl: '#',
    tags: ['宠物', '养猫'],
  },
];

export default function TopicsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');

  const filteredTopics = mockTopics.filter((topic) => {
    const matchesSearch = topic.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' || topic.status === statusFilter;
    const matchesPlatform =
      platformFilter === 'all' || topic.platform === platformFilter;
    return matchesSearch && matchesStatus && matchesPlatform;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">选题池</h1>
          <p className="mt-1 text-sm text-slate-500">
            飞书多维表数据同步 · 共 {mockTopics.length} 个选题
          </p>
        </div>
        <Button className="gap-2 bg-[#0F172A] text-white hover:bg-slate-800">
          <Plus className="h-4 w-4" />
          手动添加选题
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="搜索选题名称..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setSearchQuery(e.target.value)
            }
            className="h-9 max-w-[320px] rounded-lg border-slate-200 bg-white pl-9 text-sm"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-[140px] rounded-lg border-slate-200 text-sm">
            <Filter className="mr-2 h-3.5 w-3.5 text-slate-400" />
            <SelectValue placeholder="全部状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="选题评估">选题评估</SelectItem>
            <SelectItem value="脚本生成中">脚本生成中</SelectItem>
            <SelectItem value="待审核">待审核</SelectItem>
            <SelectItem value="拍摄中">拍摄中</SelectItem>
            <SelectItem value="已发布">已发布</SelectItem>
            <SelectItem value="已归档">已归档</SelectItem>
          </SelectContent>
        </Select>
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="h-9 w-[140px] rounded-lg border-slate-200 text-sm">
            <SelectValue placeholder="全部平台" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部平台</SelectItem>
            <SelectItem value="抖音">抖音</SelectItem>
            <SelectItem value="视频号">视频号</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-100 hover:bg-transparent">
              <TableHead className="w-[300px] text-xs font-semibold text-slate-600">
                <div className="flex items-center gap-1">
                  选题名称
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </TableHead>
              <TableHead className="text-xs font-semibold text-slate-600">
                来源平台
              </TableHead>
              <TableHead className="text-xs font-semibold text-slate-600">
                <div className="flex items-center gap-1">
                  热度数据
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </TableHead>
              <TableHead className="text-xs font-semibold text-slate-600">
                状态
              </TableHead>
              <TableHead className="text-xs font-semibold text-slate-600">
                <div className="flex items-center gap-1">
                  负责人
                  <User className="h-3 w-3 text-slate-400" />
                </div>
              </TableHead>
              <TableHead className="text-xs font-semibold text-slate-600">
                <div className="flex items-center gap-1">
                  发布时间
                  <Clock className="h-3 w-3 text-slate-400" />
                </div>
              </TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTopics.map((topic) => {
              const config = statusConfig[topic.status];
              return (
                <TableRow
                  key={topic.id}
                  className="border-slate-50 transition-colors hover:bg-slate-50/50"
                >
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {topic.title}
                      </p>
                      <div className="mt-1 flex gap-1.5">
                        {topic.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="rounded-full border-slate-200 text-xs font-normal text-slate-600"
                    >
                      {topic.platform}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1 text-sm font-medium tabular-nums text-slate-800">
                        <Flame className="h-3.5 w-3.5 text-orange-400" />
                        {(topic.heat / 10000).toFixed(1)}w
                      </div>
                      <div className="flex gap-3 text-xs text-slate-400">
                        <span>赞 {topic.likes}</span>
                        <span>评论 {topic.comments}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.color}`}
                    >
                      <span
                        className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${config.dot}`}
                      />
                      {topic.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[10px] font-medium text-slate-600">
                        {topic.assignee[0]}
                      </div>
                      <span className="text-sm text-slate-600">
                        {topic.assignee}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm tabular-nums text-slate-500">
                      {topic.publishDate}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-slate-400 hover:text-slate-600"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-slate-400 hover:text-slate-600"
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {/* Table Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
          <p className="text-xs text-slate-400">
            显示 {filteredTopics.length} / {mockTopics.length} 条记录
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              disabled
            >
              上一页
            </Button>
            <span className="text-xs text-slate-500">1 / 1</span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              disabled
            >
              下一页
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
