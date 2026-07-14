import { useState } from "react";
import type { IntakeComment, CommentType } from "@/types/intake";
import { formatDateTime } from "@/lib/calculations";

interface Props {
  comments: IntakeComment[];
  canPost: boolean;
  onAdd: (body: string, type: CommentType) => void;
}

const COMMENT_TYPES: { key: CommentType; label: string; icon: string; color: string }[] = [
  { key: "internal", label: "Internal", icon: "ri-lock-line", color: "text-slate-600 bg-slate-50 ring-slate-200" },
  { key: "follow-up", label: "Follow-up", icon: "ri-mail-send-line", color: "text-sky-700 bg-sky-50 ring-sky-200" },
  { key: "timeline", label: "Timeline", icon: "ri-history-line", color: "text-brand-700 bg-brand-50 ring-brand-200" },
];

const TYPE_META: Record<CommentType, { label: string; icon: string; color: string; dot: string }> = {
  assignment: {
    label: "Assignment",
    icon: "ri-user-add-line",
    color: "bg-amber-50 text-amber-800 ring-amber-200",
    dot: "bg-amber-500",
  },
  internal: {
    label: "Internal",
    icon: "ri-lock-line",
    color: "bg-slate-100 text-slate-700 ring-slate-200",
    dot: "bg-slate-400",
  },
  "follow-up": {
    label: "Follow-up",
    icon: "ri-mail-send-line",
    color: "bg-sky-50 text-sky-700 ring-sky-200",
    dot: "bg-sky-500",
  },
  timeline: {
    label: "Timeline",
    icon: "ri-history-line",
    color: "bg-brand-50 text-brand-700 ring-brand-200",
    dot: "bg-brand-500",
  },
};

export default function CommentsTimeline({ comments, canPost, onAdd }: Props) {
  const [type, setType] = useState<CommentType>("internal");
  const [body, setBody] = useState("");

  const submit = () => {
    if (!body.trim()) return;
    onAdd(body.trim(), type);
    setBody("");
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200">
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Comments & History</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Ticket-style log — comments are never overwritten.
          </p>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
          {comments.length} entries
        </span>
      </div>

      {canPost ? (
        <div className="p-4 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {COMMENT_TYPES.map((t) => (
              <button
                type="button"
                key={t.key}
                onClick={() => setType(t.key)}
                className={`text-xs px-2.5 py-1 rounded-full ring-1 cursor-pointer whitespace-nowrap ${
                  type === t.key ? t.color : "text-slate-500 bg-white ring-slate-200 hover:bg-slate-50"
                }`}
              >
                <i className={`${t.icon} mr-1`}></i>
                {t.label}
              </button>
            ))}
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Add a comment, follow-up note, or timeline update…"
            className="w-full text-sm px-3 py-2 rounded-md bg-white border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none resize-none"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-slate-400">{body.length}/500</span>
            <button
              type="button"
              onClick={submit}
              disabled={!body.trim()}
              className="text-sm px-4 py-2 rounded-md bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap flex items-center gap-1.5"
            >
              <i className="ri-send-plane-fill"></i>Post comment
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 border-b border-slate-100 text-xs text-slate-500 bg-slate-50 flex items-center gap-2">
          <i className="ri-eye-line"></i>
          You have read-only access to this intake — you can view comments but not post new ones.
        </div>
      )}

      <div className="p-5">
        {comments.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">No comments yet.</p>
        ) : (
          <ol className="relative border-l border-slate-200 ml-3 space-y-5">
            {comments.map((c) => {
              const meta = TYPE_META[c.type];
              return (
                <li key={c.id} className="ml-5">
                  <span
                    className={`absolute -left-[7px] w-3.5 h-3.5 rounded-full ring-4 ring-white ${meta.dot}`}
                  ></span>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ring-1 ${meta.color}`}>
                      <i className={meta.icon}></i>
                      {meta.label}
                    </span>
                    <span className="text-xs font-medium text-slate-800">{c.userName}</span>
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs text-slate-500">{c.userRole}</span>
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs text-slate-500">{formatDateTime(c.createdAt)}</span>
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{c.body}</p>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}