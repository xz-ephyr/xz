export const PluginsPage = () => (
  <div className="flex-1 bg-white overflow-y-auto thin-scrollbar">
    <div className="mx-auto px-6 py-12" style={{ maxWidth: 'min(1200px, 100%)' }}>
      <div
        className="w-full h-[250px] rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white"
      >
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight">Plugins</h1>
          <p className="mt-2 text-lg text-white/80">Extend your AI with powerful plugins</p>
        </div>
      </div>

      <div className="mt-8">
        <p className="text-neutral-500">Plugin marketplace coming soon.</p>
      </div>
    </div>
  </div>
);
