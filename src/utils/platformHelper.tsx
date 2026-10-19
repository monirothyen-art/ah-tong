import React from 'react';
import {
  Shield,
  Send,
  Globe,
  Share2,
  Mail,
  Video,
  Building,
  Github,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { PlatformType } from '../types/account';

export interface PlatformMeta {
  name: string;
  nameKh: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ReactNode;
  defaultUrl: string;
}

export function getPlatformMeta(platform: PlatformType, customName?: string): PlatformMeta {
  switch (platform) {
    case 'facebook':
      return {
        name: customName || 'Facebook',
        nameKh: 'ហ្វេសប៊ុក (Facebook)',
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/20',
        icon: (
          <span className="font-bold text-sm tracking-tight text-blue-400 font-sans">
            fb
          </span>
        ),
        defaultUrl: 'https://facebook.com',
      };
    case 'telegram':
      return {
        name: customName || 'Telegram',
        nameKh: 'តេឡេក្រាម (Telegram)',
        color: 'text-sky-400',
        bgColor: 'bg-sky-500/10',
        borderColor: 'border-sky-500/20',
        icon: <Send className="w-4 h-4 text-sky-400" />,
        defaultUrl: 'https://web.telegram.org',
      };
    case 'tiktok':
      return {
        name: customName || 'TikTok',
        nameKh: 'ធីកតុក (TikTok)',
        color: 'text-rose-400',
        bgColor: 'bg-rose-500/10',
        borderColor: 'border-rose-500/20',
        icon: (
          <span className="font-extrabold text-xs tracking-wider text-rose-400 font-sans">
            TT
          </span>
        ),
        defaultUrl: 'https://tiktok.com',
      };
    case 'google':
      return {
        name: customName || 'Google',
        nameKh: 'ហ្គូហ្គល (Google)',
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/10',
        borderColor: 'border-amber-500/20',
        icon: <Mail className="w-4 h-4 text-amber-400" />,
        defaultUrl: 'https://accounts.google.com',
      };
    case 'twitter':
      return {
        name: customName || 'X / Twitter',
        nameKh: 'អិច (X / Twitter)',
        color: 'text-neutral-200',
        bgColor: 'bg-neutral-800',
        borderColor: 'border-neutral-700',
        icon: <span className="font-black text-sm text-neutral-100 font-sans">𝕏</span>,
        defaultUrl: 'https://x.com',
      };
    case 'instagram':
      return {
        name: customName || 'Instagram',
        nameKh: 'អ៊ិនស្តាក្រាម (Instagram)',
        color: 'text-pink-400',
        bgColor: 'bg-pink-500/10',
        borderColor: 'border-pink-500/20',
        icon: (
          <span className="font-bold text-xs tracking-tight text-pink-400 font-sans">
            IG
          </span>
        ),
        defaultUrl: 'https://instagram.com',
      };
    case 'youtube':
      return {
        name: customName || 'YouTube',
        nameKh: 'យូធូប (YouTube)',
        color: 'text-red-500',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/20',
        icon: <Video className="w-4 h-4 text-red-500" />,
        defaultUrl: 'https://youtube.com',
      };
    case 'banking':
      return {
        name: customName || 'Banking / Payment',
        nameKh: 'ធនាគារ (ABA, Wing, etc.)',
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/20',
        icon: <Building className="w-4 h-4 text-emerald-400" />,
        defaultUrl: 'https://payway.ababank.com',
      };
    case 'github':
      return {
        name: customName || 'GitHub',
        nameKh: 'ហ្គីតហាប់ (GitHub)',
        color: 'text-neutral-200',
        bgColor: 'bg-neutral-800',
        borderColor: 'border-neutral-700',
        icon: <Github className="w-4 h-4 text-neutral-200" />,
        defaultUrl: 'https://github.com',
      };
    case 'discord':
      return {
        name: customName || 'Discord',
        nameKh: 'ឌីស្កត (Discord)',
        color: 'text-indigo-400',
        bgColor: 'bg-indigo-500/10',
        borderColor: 'border-indigo-500/20',
        icon: <MessageSquare className="w-4 h-4 text-indigo-400" />,
        defaultUrl: 'https://discord.com',
      };
    default:
      return {
        name: customName || 'Custom Account',
        nameKh: 'គណនីផ្សេងៗ',
        color: 'text-neutral-300',
        bgColor: 'bg-neutral-800',
        borderColor: 'border-neutral-700',
        icon: <Globe className="w-4 h-4 text-neutral-300" />,
        defaultUrl: '',
      };
  }
}
