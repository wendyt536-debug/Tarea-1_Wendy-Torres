interface Props {
  icon?: string;
  title: string;
  description?: string;
}

export default function EmptyState({ icon = "ri-inbox-line", title, description }: Props) {
  return (
    <div className="text-center py-14 px-6">
      <div className="w-14 h-14 mx-auto flex items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <i className={`${icon} text-2xl`}></i>
      </div>
      <h3 className="mt-4 text-base font-medium text-slate-900">{title}</h3>
      {description ? <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">{description}</p> : null}
    </div>
  );
}