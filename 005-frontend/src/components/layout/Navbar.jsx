const Navbar = ({ toggleSidebar }) => {
  return (
    <header className="h-16 bg-canvas border-b border-hairline px-4 md:px-6 flex items-center justify-end sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <div className="h-6 w-px bg-hairline mx-1"></div>
      </div>
    </header>
  );
};

export default Navbar;
