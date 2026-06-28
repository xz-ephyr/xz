import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  MoreVerticalIcon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  Folder02Icon,
  PencilEdit02Icon,
  Delete02Icon,
  ArchiveIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Project, ChatSession } from '../../types/chat';
import { ChatSessionManager } from '../../services/ChatSessionManager';

interface ProjectItemProps {
  project: Project;
  onDelete: (id: string) => void;
}

const HugeiconRenderer = ({
  icon: Icon,
  size = 16,
  className,
}: {
  icon: any;
  size?: number;
  className?: string;
}) => (
  <HugeiconsIcon
    icon={Icon}
    size={size}
    color="currentColor"
    strokeWidth={1.5}
    className={className}
  />
);

export default function ProjectItem({ project, onDelete }: ProjectItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [showMenu, setShowMenu] = useState(false);
  const [sessionMenuId, setSessionMenuId] = useState<string | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const navigate = useNavigate();
  const { uuid } = useParams();

  useEffect(() => {
    let cancelled = false;
    const loadSessions = async () => {
      const allSessions = await ChatSessionManager.getAll(project.id);
      if (!cancelled) setSessions(allSessions);
    };
    loadSessions();

    const handleTitleChanged = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.projectId === project.id) {
        loadSessions();
      }
    };
    window.addEventListener('session-title-changed', handleTitleChanged);
    return () => {
      cancelled = true;
      window.removeEventListener('session-title-changed', handleTitleChanged);
    };
  }, [project.id]);

  const handleRenameSession = async (sessionId: string) => {
    if (editTitle.trim()) {
      await ChatSessionManager.rename(sessionId, editTitle.trim());
      window.dispatchEvent(new CustomEvent('session-title-changed', { detail: { projectId: project.id } }));
    }
    setEditingSessionId(null);
  };

  const handleArchiveSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    await ChatSessionManager.archive(sessionId);
    window.dispatchEvent(new CustomEvent('session-title-changed', { detail: { projectId: project.id } }));
    setSessionMenuId(null);
  };

  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this chat?')) {
      await ChatSessionManager.delete(sessionId);
      window.dispatchEvent(new CustomEvent('session-title-changed', { detail: { projectId: project.id } }));
    }
    setSessionMenuId(null);
  };

  const handleNewChat = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newSession = await ChatSessionManager.create('New conversation', undefined, project.id);
    const allSessions = await ChatSessionManager.getAll(project.id);
    setSessions(allSessions);
    const slug = project.name.toLowerCase().replace(/\s+/g, '-');
    navigate(`/project/${slug}/${newSession.id}`);
  };

  return (
    <div className="mb-1" onMouseLeave={() => setShowMenu(false)}>
      <div
        className="flex items-center gap-3 p-2 hover:bg-[#f2f3f6] rounded-[8px] cursor-pointer group relative"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <HugeiconRenderer icon={Folder02Icon} />
        <span className="text-sm font-semibold text-gray-700 flex-1 truncate">{project.name}</span>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleNewChat}
            className="p-1 hover:bg-[#e5e5e5] rounded-[6px]"
            title="New Chat"
            aria-label="New Chat"
          >
            <HugeiconRenderer icon={PencilEdit02Icon} size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1 hover:bg-[#e5e5e5] rounded-[6px]"
            title="Project options"
            aria-label="Project options"
          >
            <HugeiconRenderer icon={MoreVerticalIcon} size={14} />
          </button>
          {isExpanded ? (
            <HugeiconRenderer icon={ArrowDown01Icon} size={14} />
          ) : (
            <HugeiconRenderer icon={ArrowUp01Icon} size={14} />
          )}
        </div>

        {showMenu && (
            <div className="absolute right-0 top-full mt-1 w-32 bg-white border border-neutral-200 rounded-xl shadow-lg py-1 z-50">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(project.id);
                  setShowMenu(false);
                }}
                className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded-[8px] mx-1 flex items-center gap-2"
              >
              <HugeiconRenderer icon={Delete02Icon} size={14} />
              Delete Project
            </button>
          </div>
        )}
      </div>

      {isExpanded && (
        <div className="mt-1 space-y-1">
          {sessions.filter(s => !s.archived).map((session) => (
            <div
              key={session.id}
              className={`group relative flex items-center text-sm py-1 px-2 hover:bg-[#f2f3f6] rounded-[8px] cursor-pointer active:scale-[0.99] transition-transform ${uuid === session.id ? 'bg-[#f2f3f6] text-black font-medium' : 'text-gray-600'}`}
              onClick={() => {
                const slug = project.name.toLowerCase().replace(/\s+/g, '-');
                navigate(`/project/${slug}/${session.id}`);
              }}
            >
              {editingSessionId === session.id ? (
                <form
                  onSubmit={(e) => { e.preventDefault(); handleRenameSession(session.id); }}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 flex"
                >
                  <input
                    autoFocus
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={() => setEditingSessionId(null)}
                    className="w-full bg-white border border-neutral-300 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </form>
              ) : (
                <span className="flex-1 truncate">{session.title}</span>
              )}
              <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSessionMenuId(sessionMenuId === session.id ? null : session.id);
                  }}
                  className="p-0.5 hover:bg-neutral-200/60 rounded-[4px] text-neutral-400"
                  aria-label="Session actions"
                >
                  <HugeiconRenderer icon={MoreVerticalIcon} size={13} />
                </button>
                {sessionMenuId === session.id && (
                  <div
                    className="absolute right-0 top-full mt-0.5 w-32 bg-white border border-neutral-200 rounded-xl shadow-lg py-1 z-50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditTitle(session.title);
                        setEditingSessionId(session.id);
                        setSessionMenuId(null);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-50 flex items-center gap-2"
                    >
                      <HugeiconRenderer icon={PencilEdit02Icon} size={13} className="text-neutral-400" />
                      Rename
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleArchiveSession(e, session.id)}
                      className="w-full text-left px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-50 flex items-center gap-2"
                    >
                      <HugeiconRenderer icon={ArchiveIcon} size={13} className="text-neutral-400" />
                      Archive
                    </button>
                    <div className="h-px bg-neutral-100 my-1" />
                    <button
                      type="button"
                      onClick={(e) => handleDeleteSession(e, session.id)}
                      className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <HugeiconRenderer icon={Delete02Icon} size={13} className="text-red-400" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
