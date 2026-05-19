import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUpdater } from "@/hooks/useUpdater";

export function UpdaterModal() {
  const { state, startUpdate, restart, dismiss } = useUpdater();

  if (state === 'idle' || state === 'checking') return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>
            {state === 'available' ? 'Update Available' : 
             state === 'downloading' ? 'Downloading Update...' : 'Update Ready'}
          </CardTitle>
          <CardDescription>
            {state === 'available' ? 'A new version of the app is available.' : 
             state === 'downloading' ? 'Please wait while the update downloads.' : 'Please restart to apply the update.'}
          </CardDescription>
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
