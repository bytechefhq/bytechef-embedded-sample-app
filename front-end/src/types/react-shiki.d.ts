declare module "react-shiki" {
  import type { FC, ReactNode } from "react";

  export interface ShikiHighlighterProps {
    children?: ReactNode;
    language?: string;
    theme?: unknown;
    addDefaultStyles?: boolean;
    showLanguage?: boolean;
    defaultColor?: string;
    className?: string;
  }

  const ShikiHighlighter: FC<ShikiHighlighterProps>;
  export default ShikiHighlighter;
}
