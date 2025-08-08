import type React from "react";

export interface OnboardingData {
  name: string;
  goal: string;
  experience: string;
}

export interface Message {
  id: number;
  text?: string;
  component?: React.ReactNode;
  sender: "user" | "bot";
  timestamp: Date;
  type?: "text" | "component" | "mixed";
}

export interface LoginData {
  email: string;
  password: string;
}

export type AppState = "welcome" | "login" | "register" | "chat";

export interface SlideData {
  id: number;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  field: keyof OnboardingData;
  type: "input" | "select";
  options?: string[];
}

export interface ScreenProps {
  onStateChange: (state: AppState) => void;
  isLoading?: boolean;
}

export interface ChatMessageRequest {
  message: string;
}

export interface UploadFileResponse {
  success: boolean;
  status: number;
  data?: unknown;
  error?: string;
  message?: string;
  objectName?: string;
}
