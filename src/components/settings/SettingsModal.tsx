import { useState, useRef, useEffect } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ViewIcon, ViewOffSlashIcon, Settings02Icon, Key01Icon, ZapIcon, Cancel01Icon,
  FolderLibraryIcon, GlobeIcon,
} from '@hugeicons/core-free-icons';
import { DatabaseService } from '../../services/DatabaseService';
import { useToast } from '../ui/Toast';
import { useZoomContext } from '../layout/ZoomProvider';
import { ModelSettingsForm } from './ModelSettingsForm';
import { useModelSettings } from '../../hooks/useModelSettings';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SIDEBAR_STORAGE_KEY = 'sidebar_collapsed';

const tabs = [
  { id: 'general', label: 'General', icon: Settings02Icon },
  { id: 'api-keys', label: 'API Keys', icon: Key01Icon },
  { id: 'web-search', label: 'Web & Search', icon: GlobeIcon },
  { id: 'appearance', label: 'Appearance', icon: ViewIcon },
  { id: 'behavior', label: 'Behavior', icon: ZapIcon },
  { id: 'storage', label: 'Storage', icon: FolderLibraryIcon },
] as const;

type TabId = (typeof tabs)[number]['id'];

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const {
    keys,
    setKeys,
    selectedModel,
    setSelectedModel,
    modelMode,
    setModelMode,
    saveSettings,
  } = useModelSettings();

  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [isSaving, setIsSaving] = useState(false);
  const [searchConfig, setSearchConfig] = useState<Record<string, string>>({});
  const [searchKeysLoaded, setSearchKeysLoaded] = useState(false);
  const [showSearchKeys, setShowSearchKeys] = useState<Record<string, boolean>>({});
  const { confirmAsync } = useToast();

  useEffect(() => {
    if (activeTab !== 'web-search' || searchKeysLoaded) return;
    const searchKeys = ['search-provider', 'search-api-key', 'search-exa-api-key', 'search-firecrawl-api-key', 'search-google-api-key', 'search-google-cx'];
    Promise.all(searchKeys.map(k => DatabaseService.getConfig(k).then(v => ({ key: k, value: v || '' }))))
      .then((entries) => {
        const map: Record<string, string> = {};
        entries.forEach(e => { map[e.key] = e.value; });
        setSearchConfig(map);
        setSearchKeysLoaded(true);
      })
      .catch(() => setSearchKeysLoaded(true));
  }, [activeTab, searchKeysLoaded]);

  const handleSaveApiKeys = async () => {
    setIsSaving(true);
    await saveSettings(keys, selectedModel, modelMode);
    setIsSaving(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/10 backdrop-blur-[4px] z-50">
      <div className="bg-white rounded-[16px] w-[min(1100px,95vw)] h-[85vh] min-h-[500px] shadow-2xl border border-neutral-100 flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between shrink-0">
          <h2 className="text-[18px] font-bold text-neutral-800 flex items-center gap-2">
            <HugeiconsIcon icon={Settings02Icon} size={20} className="text-neutral-500" />
            Settings
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={18} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <nav className="w-64 border-r border-neutral-100 p-3 space-y-1 shrink-0 overflow-y-auto thin-scrollbar">
            {tabs.map((tab) => {
              const isActive = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-3 py-2.5 rounded-[8px] cursor-pointer active:scale-[0.99] transition-transform w-full gap-3 ${
                    isActive ? 'bg-[#e5e5e5]' : 'hover:bg-[#f2f3f6]'
                  }`}
                >
                  <div className="shrink-0 flex items-center justify-center w-[18px] h-[18px]">
                    <HugeiconsIcon icon={tab.icon} size={18} color="currentColor" strokeWidth={1.5} />
                  </div>
                  <span className="text-sm font-medium">{tab.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="flex-1 p-6 overflow-y-auto thin-scrollbar">
            {activeTab === 'general' && <GeneralSettings />}
            {activeTab === 'api-keys' && (
              <div className="space-y-5">
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                  <p className="text-xs text-blue-700 leading-relaxed">
                    Enter your API keys for the providers you wish to use. The system will use these keys for routing and fallbacks.
                  </p>
                </div>
                <ModelSettingsForm
                  keys={keys}
                  setKeys={setKeys}
                  selectedModel={selectedModel}
                  setSelectedModel={setSelectedModel}
                  modelMode={modelMode}
                  setModelMode={setModelMode}
                  showSaveButton
                  onSave={handleSaveApiKeys}
                  isSaving={isSaving}
                />
              </div>
            )}
            {activeTab === 'web-search' && (
              <WebSearchSettings
                searchKeysLoaded={searchKeysLoaded}
                searchConfig={searchConfig}
                setSearchConfig={setSearchConfig}
                showSearchKeys={showSearchKeys}
                setShowSearchKeys={setShowSearchKeys}
                isSaving={isSaving}
                setIsSaving={setIsSaving}
              />
            )}
            {activeTab === 'appearance' && <AppearanceSettings />}
            {activeTab === 'behavior' && <BehaviorSettings />}
            {activeTab === 'storage' && <StorageSettings confirmAsync={confirmAsync} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function GeneralSettings() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-neutral-700">Default Page</label>
        <select
          className="h-10 bg-neutral-50 rounded-[10px] px-3 text-sm outline-none w-full border border-neutral-200 focus:border-black transition-all appearance-none cursor-pointer"
          defaultValue={localStorage.getItem('default_page') || 'chats'}
          onChange={(e) => localStorage.setItem('default_page', e.target.value)}
        >
          <option value="chats">Chats list</option>
          <option value="thread">New thread</option>
          <option value="last">Last open session</option>
        </select>
        <p className="text-xs text-neutral-500">Which page to show on launch.</p>
      </div>
      <ToggleSetting label="Message Timestamps" storageKey="show_timestamps" description="Show time stamps below chat messages." />
      <ToggleSetting label="Auto-save Drafts" storageKey="auto_drafts" description="Automatically save unsent messages as drafts." />
    </div>
  );
}

function ToggleSetting({ label, storageKey, description, defaultValue = 'true' }: { label: string, storageKey: string, description: string, defaultValue?: string }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <label className="text-sm font-semibold text-neutral-700">{label}</label>
        <p className="text-xs text-neutral-500 mt-0.5">{description}</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          className="sr-only peer"
          defaultChecked={localStorage.getItem(storageKey) !== (defaultValue === 'true' ? 'false' : 'true')}
          onChange={(e) => localStorage.setItem(storageKey, String(e.target.checked))}
        />
        <div className="w-9 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-black" />
      </label>
    </div>
  );
}

function WebSearchSettings({ searchKeysLoaded, searchConfig, setSearchConfig, showSearchKeys, setShowSearchKeys, isSaving, setIsSaving }: any) {
  return (
    <div className="space-y-5">
      {!searchKeysLoaded ? (
        <div className="flex items-center justify-center py-12 text-neutral-400 text-sm">Loading...</div>
      ) : (
        <>
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
            <p className="text-xs text-blue-700 leading-relaxed">
              Configure web search providers. At minimum, set a <strong>Search Provider</strong> (Tavily recommended).
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-neutral-700">Search Provider</label>
            <select
              className="h-10 bg-neutral-50 rounded-[10px] px-3 text-sm outline-none w-full border border-neutral-200 focus:border-black transition-all appearance-none cursor-pointer"
              value={searchConfig['search-provider'] || 'tavily'}
              onChange={(e) => setSearchConfig((p: any) => ({ ...p, 'search-provider': e.target.value }))}
            >
              <option value="tavily">Tavily (Recommended)</option>
              <option value="exa">Exa</option>
              <option value="firecrawl">Firecrawl</option>
              <option value="google">Google Custom Search</option>
            </select>
          </div>
          <div className="border-t border-neutral-100 pt-4 space-y-4">
             <SearchKeyInput label="Tavily API Key" configKey="search-api-key" id="tavily" searchConfig={searchConfig} setSearchConfig={setSearchConfig} showSearchKeys={showSearchKeys} setShowSearchKeys={setShowSearchKeys} />
             <SearchKeyInput label="Exa API Key" configKey="search-exa-api-key" id="exa" searchConfig={searchConfig} setSearchConfig={setSearchConfig} showSearchKeys={showSearchKeys} setShowSearchKeys={setShowSearchKeys} />
             <SearchKeyInput label="Firecrawl API Key" configKey="search-firecrawl-api-key" id="firecrawl" searchConfig={searchConfig} setSearchConfig={setSearchConfig} showSearchKeys={showSearchKeys} setShowSearchKeys={setShowSearchKeys} />
          </div>
          <div className="flex justify-end pt-2 border-t border-neutral-100">
            <button
              type="button"
              onClick={async () => {
                setIsSaving(true);
                await Promise.all(Object.entries(searchConfig).map(([k, v]) => DatabaseService.setConfig(k, v as string)));
                setIsSaving(false);
              }}
              disabled={isSaving}
              className="mt-4 px-6 py-2 text-sm font-bold text-white bg-black hover:bg-neutral-800 rounded-[10px] transition-all flex items-center gap-2 shadow-lg shadow-black/5 active:scale-[0.98] disabled:opacity-50"
            >
              {isSaving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Save Search Settings
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function SearchKeyInput({ label, configKey, id, searchConfig, setSearchConfig, showSearchKeys, setShowSearchKeys }: any) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[12px] font-medium text-neutral-600 ml-1">{label}</label>
      <div className="relative">
        <input
          type={showSearchKeys[id] ? 'text' : 'password'}
          className="h-9 bg-neutral-50 rounded-[8px] pl-3 pr-9 outline-none text-sm w-full border border-neutral-200 focus:border-neutral-400 transition-colors"
          placeholder={searchConfig[configKey] ? '••••••••••••••••' : `Enter ${label}`}
          value={searchConfig[configKey] || ''}
          onChange={(e) => setSearchConfig((p: any) => ({ ...p, [configKey]: e.target.value }))}
        />
        <button type="button" onClick={() => setShowSearchKeys((p: any) => ({ ...p, [id]: !p[id] }))} className="absolute right-2 top-2 text-neutral-400 hover:text-neutral-600 p-0.5">
          <HugeiconsIcon icon={showSearchKeys[id] ? ViewOffSlashIcon : ViewIcon} size={15} />
        </button>
      </div>
    </div>
  );
}

function AppearanceSettings() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-neutral-700">Sidebar on Startup</label>
        <select
          className="h-10 bg-neutral-50 rounded-[10px] px-3 text-sm outline-none w-full border border-neutral-200 focus:border-black transition-all appearance-none cursor-pointer"
          defaultValue={localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true' ? 'collapsed' : 'expanded'}
          onChange={(e) => localStorage.setItem(SIDEBAR_STORAGE_KEY, String(e.target.value === 'collapsed'))}
        >
          <option value="expanded">Expanded</option>
          <option value="collapsed">Collapsed</option>
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-neutral-700">Zoom Level</label>
        <ZoomControl />
      </div>
    </div>
  );
}

function BehaviorSettings() {
  return (
    <div className="space-y-6">
      <ToggleSetting label="Enable Thinking by Default" storageKey="thinking_default" description="Show reasoning traces on supported models." defaultValue="false" />
      <ToggleSetting label="Auto-create Artifacts" storageKey="auto_artifacts" description="Automatically preview UI code as artifacts." />
    </div>
  );
}

function StorageSettings({ confirmAsync }: { confirmAsync: any }) {
  return (
    <div className="space-y-6">
      <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100">
        <h4 className="text-sm font-semibold text-neutral-700 mb-2">Local Database</h4>
        <p className="text-xs text-neutral-500">Your projects, chats, and messages are stored locally in SQLite.</p>
      </div>
      <div className="flex flex-col gap-3">
        <button type="button" onClick={() => {
          const data: Record<string, string> = {};
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k) data[k] = localStorage.getItem(k) || '';
          }
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = 'raw-code-backup.json'; a.click();
          URL.revokeObjectURL(url);
        }} className="w-full px-4 py-2.5 text-sm font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-[10px] transition-colors text-left">
          Export All Data
        </button>
        <button type="button" onClick={async () => {
          if (await confirmAsync('Clear all chat history?')) {
            localStorage.removeItem('chat_sessions'); localStorage.removeItem('project_chat_sessions'); localStorage.removeItem('projects');
          }
        }} className="w-full px-4 py-2.5 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-[14px] transition-colors text-left">
          Clear Chat History
        </button>
      </div>
    </div>
  );
}

const ZOOM_PRESETS = [0.5, 0.65, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 2];
function ZoomControl() {
  const { zoom, setZoomLevel, resetZoom } = useZoomContext();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);
  return (
    <div className="relative" ref={dropdownRef}>
      <button type="button" onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 px-3 py-2 rounded-[10px] text-sm border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 transition-colors">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-neutral-500">
          <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.2" />
          <path d="M9 9L12.5 12.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M6 4V8M4 6H8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        {Math.round(zoom * 100)}%
      </button>
      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-44 bg-white border border-neutral-200 rounded-xl shadow-xl py-2 z-50">
          <div className="px-2 py-1 flex flex-col gap-0.5">
            {ZOOM_PRESETS.map((level) => (
              <button key={level} type="button" onClick={() => { setZoomLevel(level); setIsOpen(false); }} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${zoom === level ? 'bg-neutral-100 text-neutral-700 font-medium' : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-700'}`}>
                {Math.round(level * 100)}%
              </button>
            ))}
          </div>
          <div className="border-t border-neutral-100 mt-1 pt-1 px-2">
            <button type="button" onClick={() => { resetZoom(); setIsOpen(false); }} className="w-full text-left px-3 py-2 rounded-lg text-xs text-neutral-500 hover:bg-neutral-50 hover:text-neutral-700 transition-colors">
              Reset to 100%
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
