import { useState, useRef, useEffect } from "react";
import type { User } from "@/types/intake";

interface ActionsMenuProps {
  user: User;
  isSelf: boolean;
  onEdit: () => void;
  onResetPassword: () => void;
  onToggleActive: () => void;
  onViewIntakes: () => void;
}

export default function ActionsMenu({
  user,
  isSelf,
  onEdit,
  onResetPassword,
  onToggleActive,
  onViewIntakes,
}: ActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(user.email);
      setOpen(false);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer transition"
      >
        <i className="ri-more-2-fill text-lg"></i>
      </button>

      {open ? (
        <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-slate-200 rounded-lg shadow-lg z-30 py-1">
          <button
            type="button"
            onClick={() => { setOpen(false); onEdit(); }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer whitespace-nowrap text-left"
          >
            <i className="ri-edit-line text-slate-400 w-4 text-center"></i>
            Edit User
          </button>
          <button
            type="button"
            onClick={() => { setOpen(false); onResetPassword(); }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer whitespace-nowrap text-left"
          >
            <i className="ri-key-2-line text-slate-400 w-4 text-center"></i>
            Reset Password
          </button>
          <button
            type="button"
            onClick={() => { setOpen(false); onToggleActive(); }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer whitespace-nowrap text-left"
          >
            <i className={`${user.active ? "ri-toggle-line" : "ri-toggle-fill"} text-slate-400 w-4 text-center`}></i>
            {user.active ? "Deactivate User" : "Activate User"}
          </button>
          <div className="border-t border-slate-100 my-1"></div>
          <button
            type="button"
            onClick={copyEmail}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer whitespace-nowrap text-left"
          >
            <i className="ri-file-copy-line text-slate-400 w-4 text-center"></i>
            Copy Email
          </button>
          <button
            type="button"
            onClick={() => { setOpen(false); onViewIntakes(); }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer whitespace-nowrap text-left"
          >
            <i className="ri-file-list-3-line text-slate-400 w-4 text-center"></i>
            View Assigned Intakes
          </button>
        </div>
      ) : null}
    </div>
  );
}