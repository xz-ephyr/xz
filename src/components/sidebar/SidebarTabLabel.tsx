interface SidebarTabLabelProps {
  label: string;
  active: boolean;
}

export default function SidebarTabLabel({ label, active }: SidebarTabLabelProps) {
  return (
    <>
      <span className="text-sm font-medium whitespace-nowrap">{label}</span>
      {active && <div className="ml-auto w-1 h-[15px] bg-black rounded-[2px]" />}
    </>
  );
}
