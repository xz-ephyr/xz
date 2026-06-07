import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUpdater } from "@/hooks/useUpdater";
import { UpdaterState } from "@/lib/types";

const UPDATE_CONTENT: Record<Exclude<UpdaterState, 'idle' | 'checking'>, { title: string; description: string }> = {
  available: { title: 'Update Available', description: 'A new version of the app is available.' },
  downloading: { title: 'Downloading Update...', description: 'Please wait while the update downloads.' },
  ready: { title: 'Update Ready', description: 'Please restart to apply the update.' },
};

export function UpdaterModal() {
  const { state, startUpdate, restart, dismiss } = useUpdater();

  if (state === 'idle' || state === 'checking') return null;

  const content = UPDATE_CONTENT[state as Exclude<UpdaterState, 'idle' | 'checking'>];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{content.title}</CardTitle>
          <CardDescription>{content.description}</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          {state === 'available' && (
            <>
              <Button onClick={startUpdate}>Accept</Button>
              <Button variant="outline" onClick={dismiss}>Later</Button>
            </>
          )}
          {state === 'ready' && (
            <Button onClick={restart}>Restart Now</Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
