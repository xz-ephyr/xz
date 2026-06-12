import ProjectItem from './ProjectItem';

interface ProjectsSectionProps {
  isCollapsed: boolean;
}

export default function ProjectsSection({ isCollapsed }: ProjectsSectionProps) {
  if (isCollapsed) return null;

  return (
    <>
      <div className="mt-6 flex justify-between items-center">
        <h2 className="text-sm font-bold text-gray-500 whitespace-nowrap">Projects</h2>
        <button className="text-gray-500 hover:text-black hover:bg-[#e5e5e5] active:bg-[#d4d4d4] p-1 rounded-[4px] transition-all active:scale-95">+</button>
      </div>

      <div className="mt-2">
        <ProjectItem name="Project Alpha" />
      </div>
    </>
  );
}
