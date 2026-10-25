"use client";

import {
  Anchor, ArrowLeftRight, Banknote, Bell, Blocks, BookOpen, Bot, Box, Briefcase, Building2, Calendar, ChartColumn, ChartLine, ChartPie,
  Circle, CircleDollarSign, Cloud, Code, Coins, Compass, Cpu, Crown, Database, Droplet, Droplets, Factory, FileText, Flag, Flame, Gavel,
  Gem, Gift, Globe, Hammer, Handshake, Heart, Hexagon, Hourglass, KeyRound, Landmark, Layers, Leaf, Lightbulb, Link, Lock, type LucideIcon,
  Map, Moon, Network, Percent, PiggyBank, Puzzle, RefreshCw, Repeat, Rocket, Scale, Server, Shield, ShieldCheck, ShoppingCart, Shuffle,
  Sparkles, Sprout, Square, Star, Store, Sun, Target, Terminal, TrendingUp, Triangle, Trophy, Umbrella, Users, Vault, Vote, Wallet, Waves,
  Workflow, Wrench, Zap,
} from "lucide-react";

import { type ShapeIconName } from "@/content/kits/shape-icons";
import type { ProjectKit, ShapeColor, ShapeId } from "@/lib/kits";
import { cn } from "@/lib/utils";

/** The lucide component of every shape icon name (M177). */
export const SHAPE_ICONS: Record<ShapeIconName, LucideIcon> = {
  box: Box, layers: Layers, blocks: Blocks, hexagon: Hexagon, triangle: Triangle, circle: Circle, square: Square, coins: Coins, wallet: Wallet,
  landmark: Landmark, "piggy-bank": PiggyBank, banknote: Banknote, "circle-dollar-sign": CircleDollarSign, "trending-up": TrendingUp,
  "chart-line": ChartLine, "chart-column": ChartColumn, "chart-pie": ChartPie, percent: Percent, scale: Scale, shield: Shield,
  "shield-check": ShieldCheck, lock: Lock, "key-round": KeyRound, vault: Vault, building: Building2, briefcase: Briefcase, gem: Gem,
  droplet: Droplet, droplets: Droplets, waves: Waves, flame: Flame, zap: Zap, rocket: Rocket, target: Target, compass: Compass, globe: Globe,
  map: Map, anchor: Anchor, repeat: Repeat, "arrow-left-right": ArrowLeftRight, shuffle: Shuffle, "refresh-cw": RefreshCw, link: Link,
  network: Network, workflow: Workflow, cpu: Cpu, database: Database, server: Server, code: Code, terminal: Terminal, bot: Bot,
  sparkles: Sparkles, star: Star, heart: Heart, leaf: Leaf, sprout: Sprout, sun: Sun, moon: Moon, cloud: Cloud, umbrella: Umbrella, gift: Gift,
  trophy: Trophy, crown: Crown, flag: Flag, bell: Bell, lightbulb: Lightbulb, puzzle: Puzzle, hammer: Hammer, wrench: Wrench, factory: Factory,
  store: Store, "shopping-cart": ShoppingCart, users: Users, handshake: Handshake, vote: Vote, gavel: Gavel, "file-text": FileText,
  "book-open": BookOpen, calendar: Calendar, hourglass: Hourglass,
};

/** The CSS colour of a shape colour, from its theme token. */
export function shapeColorValue(color: ShapeColor): string {
  return `rgb(var(--shape-${color}))`;
}

/** A shape's icon in its colour (M177); a shape with no style shows a grey box. */
export function ShapeGlyph({ kit, shape, className }: { kit: Pick<ProjectKit, "shapeStyles"> | undefined; shape: ShapeId; className?: string }) {
  const style = kit?.shapeStyles?.[shape];
  const Icon = SHAPE_ICONS[(style?.icon ?? "box") as ShapeIconName] ?? Box;
  return <Icon aria-hidden className={cn("h-3.5 w-3.5 shrink-0", className)} style={{ color: shapeColorValue(style?.color ?? "grey") }} />;
}
