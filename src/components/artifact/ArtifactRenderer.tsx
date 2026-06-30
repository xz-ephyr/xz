import { ARTIFACT_TYPE_LABELS } from '../../types/artifact';
import { CodePreview } from './CodePreview';
import { MarkdownPreview } from './MarkdownPreview';
import { MermaidPreview } from './MermaidPreview';
import { SvgPreview } from './SvgPreview';
import { HtmlPreview } from './HtmlPreview';
import { ReactPreview } from './ReactPreview';

export const ArtifactRenderer = ({ artifact, onRegenerate }: any) => {
  const handleFix = (error: string) => onRegenerate(`Fix this ${(ARTIFACT_TYPE_LABELS[artifact.type as keyof typeof ARTIFACT_TYPE_LABELS] || 'artifact').toLowerCase()} artifact (error: ${error}):\n\n${artifact.content}`);
  switch (artifact.type) {
    case 'markdown': return <MarkdownPreview content={artifact.content} />;
    case 'mermaid': return <MermaidPreview content={artifact.content} onError={handleFix} />;
    case 'svg': return <SvgPreview content={artifact.content} />;
    case 'html': return <HtmlPreview content={artifact.content} onError={handleFix} />;
    case 'react': return <ReactPreview content={artifact.content} onError={handleFix} />;
    default: return <CodePreview content={artifact.content} language={artifact.language} />;
  }
};

export function getFileExtension(artifact: any): string {
  switch (artifact.type) {
    case 'code': return artifact.language || 'txt';
    case 'html': return 'html';
    case 'react': return 'tsx';
    case 'svg': return 'svg';
    case 'mermaid': return 'mmd';
    case 'markdown': return 'md';
    default: return 'txt';
  }
}
