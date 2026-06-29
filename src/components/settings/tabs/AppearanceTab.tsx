import { ZoomControl } from '../ZoomControl';

const SIDEBAR_STORAGE_KEY = 'sidebar_collapsed';

export function AppearanceTab() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-neutral-700">Sidebar on Startup</label>
        <select
          className="h-10 bg-neutral-50 rounded-[10px] px-3 text-sm outline-none w-full border border-neutral-200 focus:border-black transition-all appearance-none cursor-pointer"
          defaultValue={localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true' ? 'collapsed' : 'expanded'}
          onChange={(e) => {
            localStorage.setItem(SIDEBAR_STORAGE_KEY, String(e.target.value === 'collapsed'));
          }}
        >
          <option value="expanded">Expanded</option>
          <option value="collapsed">Collapsed</option>
        </select>
        <p className="text-xs text-neutral-500">
          Changes apply immediately on next load.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-neutral-700">Zoom Level</label>
        <ZoomControl />
      </div>
    </div>
  );
}
