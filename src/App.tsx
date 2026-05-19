import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UpdaterModal } from "@/components/UpdaterModal";

function App() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <UpdaterModal />
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome to xz</CardTitle>
          <CardDescription>
            A high-performance desktop application built with Tauri and React.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Get started by exploring the features or configuring your settings.
          </p>
          <div className="flex gap-2">
            <Button>Explore Features</Button>
            <Button variant="outline">Settings</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default App;
