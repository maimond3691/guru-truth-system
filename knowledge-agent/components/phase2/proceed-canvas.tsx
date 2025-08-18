import { Button } from '../ui/button';
import { useArtifact } from '@/hooks/use-artifact';

export function ProceedCanvas({ cta }: { cta: string }) {
  const { setArtifact } = useArtifact();
  try {
    const match = cta.match(/\[\[PROCEED_CANVAS\|(.+)\]\]/);
    const payload = match ? JSON.parse(match[1]) : null;
    if (!payload || !payload.id) return null;

    return (
      <div className="pt-2">
        <Button
          onClick={() =>
            setArtifact((curr) => ({
              ...curr,
              isVisible: true,
              documentId: payload.id,
              title: payload.title || 'Guru Canvas',
              kind: 'text',
              status: 'idle',
            }))
          }
        >
          Proceed
        </Button>
      </div>
    );
  } catch {
    return null;
  }
}
import { useArtifact } from '@/hooks/use-artifact';

export function ProceedCanvas({ cta }: { cta: string }) {
  const { setArtifact } = useArtifact();
  try {
    const match = cta.match(/\[\[PROCEED_CANVAS\|(.+)\]\]/);
    const payload = match ? JSON.parse(match[1]) : null;
    if (!payload || !payload.id) return null;

    return (
      <div className="pt-2">
        <Button
          onClick={() =>
            setArtifact((curr) => ({
              ...curr,
              isVisible: true,
              documentId: payload.id,
              title: payload.title || 'Guru Canvas',
              kind: 'text',
              status: 'idle',
            }))
          }
        >
          Proceed
        </Button>
      </div>
    );
  } catch {
    return null;
  }
}


