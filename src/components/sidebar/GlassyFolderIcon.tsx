// Your rules resume

export default function GlassyFolderIcon() {
  return (
    <div className="w-7 h-5 relative">
      {/* Folder Tab */}
      <div className="absolute -top-1 left-0 w-3 h-1.5 bg-blue-400 rounded-t-sm" />
      {/* Main Body with Gradient */}
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-400 to-blue-600 rounded-r-md rounded-bl-sm shadow-sm overflow-hidden">
        {/* Glassy reflection overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent" />
      </div>
    </div>
  );
}
