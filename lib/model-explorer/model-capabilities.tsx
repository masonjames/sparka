'use client';

import type { ComponentType, SVGProps } from 'react';
import {
  Brain,
  PlugZap,
  Type as TypeIcon,
  Image as ImageIcon,
  Video as VideoIcon,
  FileText,
  Mic,
  Thermometer,
} from 'lucide-react';

export type CapabilityKey =
  | 'text'
  | 'image'
  | 'pdf'
  | 'audio'
  | 'video'
  | 'reasoning'
  | 'tools'
  | 'temperature';

export type CapabilityEntry = {
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
};

export const MODEL_CAPABILITIES: Record<CapabilityKey, CapabilityEntry> = {
  text: { label: 'Text', Icon: TypeIcon },
  image: { label: 'Image', Icon: ImageIcon },
  pdf: { label: 'PDF', Icon: FileText },
  audio: { label: 'Audio', Icon: Mic },
  video: { label: 'Video', Icon: VideoIcon },
  reasoning: { label: 'Reasoning', Icon: Brain },
  tools: { label: 'Tools', Icon: PlugZap },
  temperature: { label: 'Temperature', Icon: Thermometer },
};
